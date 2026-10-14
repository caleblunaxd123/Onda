using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Onda.Domain;
using Onda.Infrastructure;
namespace Onda.Api;

/// <summary>Command used by current clients. Legacy clients keep calling SendMessage(id, text).</summary>
public sealed record SendChatCommand(string? Text, Guid? ReplyToId = null, Guid[]? AttachmentIds = null);
public sealed record EditChatCommand(Guid MessageId, string? Text);
public sealed record ChatTarget(Guid MessageId);
public sealed record ReactChatCommand(Guid MessageId, string? Emoji);
public sealed record ChatPage(RoomMessage[] Items, bool HasMore);
public sealed record TypingEvent(Guid SenderId, string Sender);

/// <summary>
/// Persistent room chat. Every mutation runs under the room lock taken by the hub; the row version is also an
/// optimistic concurrency token. Payloads never store the quoted text of a reply: quotes are hydrated on read,
/// so editing or deleting the original is reflected everywhere and deleted text is not kept in other messages.
/// </summary>
public sealed class RoomChatService(OndaDbContext db, TimeProvider clock, RoomPresence presence, RoomUploadStore files)
{
    public const int MaxText = 2000;
    public const int LegacyMaxText = 300;
    public const int MaxAttachments = 3;
    public const int PageSize = 50;
    public const int HistorySize = 100;
    public static readonly TimeSpan EditWindow = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan Retention = TimeSpan.FromDays(30);
    public const string DeletedText = "Mensaje eliminado";

    private static RoomMessage Read(RoomChatEntry row) => JsonSerializer.Deserialize<RoomMessage>(row.Payload)! with {Revision = row.Version};
    private static string Store(RoomMessage message) => JsonSerializer.Serialize(message with {Reply = null, Revision = 0});
    public static MessageReply Quote(RoomMessage m) => m.Deleted
        ? new(m.Id, m.Sender, DeletedText, true, m.SenderId)
        : new(m.Id, m.Sender, StickerLabel(m.Text) ?? (m.Text.Length > 0 ? m.Text[..Math.Min(160, m.Text.Length)] : AttachmentLabel(m.Attachments)), false, m.SenderId);
    public static string? StickerLabel(string text) => text switch
    {
        "[[onda:sticker:temazo]]" => "Sticker: ¡Qué temazo!", "[[onda:sticker:fiesta]]" => "Sticker: ¡Vamos!",
        "[[onda:sticker:amor]]" => "Sticker: Me encanta", "[[onda:sticker:risa]]" => "Sticker: No puedo más",
        "[[onda:sticker:chill]]" => "Sticker: Modo relax", "[[onda:sticker:aplausos]]" => "Sticker: ¡Bravo!", _ => null,
    };
    private static string AttachmentLabel(ChatAttachment[]? items) => items?.FirstOrDefault() switch
    {
        {Kind: "image"} => "Foto", {Kind: "audio"} => "Nota de voz", {Name: { } name} => name, _ => "Adjunto",
    };
    /// <summary>Removes control characters except line breaks/tabs and collapses runs of blank lines.</summary>
    public static string Clean(string? value)
    {
        var text = new string((value ?? "").Where(c => !char.IsControl(c) || c is '\n' or '\t').ToArray()).Replace("\r", "").Trim();
        while (text.Contains("\n\n\n")) text = text.Replace("\n\n\n", "\n\n");
        return text;
    }

    private async Task<RoomMessage[]> HydrateAsync(Guid room, RoomMessage[] messages, CancellationToken ct)
    {
        var ids = messages.Select(x => x.ReplyToId).OfType<Guid>().Distinct().ToArray();
        if (ids.Length == 0) return messages;
        var quotes = (await db.RoomChatEntries.AsNoTracking().Where(x => x.RoomId == room && ids.Contains(x.Id)).ToArrayAsync(ct))
            .ToDictionary(x => x.Id, x => Quote(Read(x)));
        // A reply to a message that no longer exists (retention, account deletion) shows a neutral tombstone.
        return messages.Select(m => m.ReplyToId is { } id ? m with {Reply = quotes.GetValueOrDefault(id, new(id, "", DeletedText, true))} : m).ToArray();
    }

    public async Task<RoomMessage[]> HistoryAsync(Guid room, CancellationToken ct)
    {
        var rows = await db.RoomChatEntries.AsNoTracking().Where(x => x.RoomId == room)
            .OrderByDescending(x => x.At).ThenByDescending(x => x.Id).Take(HistorySize).ToArrayAsync(ct);
        var result = await HydrateAsync(room, rows.Select(Read).ToArray(), ct);
        return result.Concat(presence.Messages(room).Where(x => x.Kind == "system"))
            .OrderBy(x => x.At).ThenBy(x => x.Id).TakeLast(HistorySize).ToArray();
    }

    /// <summary>Older messages before a known one, for explicit "load earlier" paging.</summary>
    public async Task<ChatPage> OlderAsync(Guid room, Guid before, CancellationToken ct)
    {
        var anchor = await db.RoomChatEntries.AsNoTracking().Where(x => x.Id == before && x.RoomId == room).Select(x => (DateTimeOffset?)x.At).SingleOrDefaultAsync(ct);
        if (anchor is null) return new([], false);
        var rows = await db.RoomChatEntries.AsNoTracking().Where(x => x.RoomId == room && x.At < anchor)
            .OrderByDescending(x => x.At).ThenByDescending(x => x.Id).Take(PageSize + 1).ToArrayAsync(ct);
        var page = await HydrateAsync(room, rows.Take(PageSize).Select(Read).Reverse().ToArray(), ct);
        return new(page, rows.Length > PageSize);
    }

    public async Task<RoomMessage> SendAsync(Guid room, Guid account, string name, SendChatCommand draft, CancellationToken ct, int maxText = MaxText)
    {
        if (draft.Text is { } raw && raw.Length > maxText || draft.AttachmentIds is {Length: > MaxAttachments})
            throw new HubException($"Usa hasta {maxText:N0} caracteres y {MaxAttachments} adjuntos por mensaje.");
        var text = Clean(draft.Text); var ids = (draft.AttachmentIds ?? []).Distinct().ToArray();
        if (ids.Length > 0 && !files.Enabled) throw new HubException("La subida de archivos está desactivada. Usa mensajes, emojis y stickers.");
        if (text.Length == 0 && ids.Length == 0) throw new HubException("Escribe algo o añade un adjunto.");
        MessageReply? reply = null;
        if (draft.ReplyToId is { } target)
        {
            var row = await db.RoomChatEntries.AsNoTracking().SingleOrDefaultAsync(x => x.Id == target && x.RoomId == room, ct);
            if (row is null || Read(row).Deleted) throw new HubException("Ese mensaje ya no está disponible para responder.");
            reply = Quote(Read(row));
        }
        // Only the uploader's own, not-yet-sent files from this room can be attached.
        var uploads = await db.RoomUploads.Where(x => ids.Contains(x.Id) && x.RoomId == room && x.UploaderId == account && x.MessageId == null).ToArrayAsync(ct);
        if (uploads.Length != ids.Length) throw new HubException("Un adjunto ya se envió, venció o no pertenece a esta sala.");
        var id = Guid.NewGuid();
        var attachments = ids.Select(x => RoomUploadStore.View(uploads.Single(u => u.Id == x))).ToArray();
        var message = new RoomMessage(id, account, name, text, "text", clock.GetUtcNow(), draft.ReplyToId, reply, Reactions: [], Attachments: attachments, Revision: 1);
        db.RoomChatEntries.Add(new() {Id = id, RoomId = room, SenderId = account, At = message.At, Version = 1, Payload = Store(message)});
        foreach (var upload in uploads) upload.MessageId = id;
        await db.SaveChangesAsync(ct);
        return message;
    }

    private async Task<(RoomChatEntry Row, RoomMessage Message)> LoadAsync(Guid room, Guid id, CancellationToken ct)
    {
        var row = await db.RoomChatEntries.SingleOrDefaultAsync(x => x.Id == id && x.RoomId == room, ct) ?? throw new HubException("Ese mensaje ya no está disponible.");
        return (row, Read(row));
    }

    private async Task<RoomMessage> SaveAsync(Guid room, RoomChatEntry row, RoomMessage message, CancellationToken ct)
    {
        row.Payload = Store(message); row.Version++;
        try {await db.SaveChangesAsync(ct);}
        catch (DbUpdateConcurrencyException) {throw new HubException("El mensaje cambió al mismo tiempo. Inténtalo de nuevo.");}
        return (await HydrateAsync(room, [message with {Revision = row.Version}], ct))[0];
    }

    public async Task<RoomMessage> EditAsync(Guid room, Guid account, EditChatCommand command, CancellationToken ct)
    {
        var (row, message) = await LoadAsync(room, command.MessageId, ct);
        if (row.SenderId != account || message.Deleted || clock.GetUtcNow() - row.At > EditWindow)
            throw new HubException("Solo puedes editar tus mensajes durante los primeros 15 minutos.");
        var text = Clean(command.Text);
        if (command.Text is {Length: > MaxText} || text.Length == 0 && (message.Attachments?.Length ?? 0) == 0)
            throw new HubException("Escribe un texto de hasta 2.000 caracteres.");
        if (text == message.Text) return (await HydrateAsync(room, [message], ct))[0];
        return await SaveAsync(room, row, message with {Text = text, EditedAt = clock.GetUtcNow()}, ct);
    }

    /// <summary>Delete for everyone: the author, or the room owner as moderator. Attachments and reactions are removed.</summary>
    public async Task<RoomMessage> DeleteAsync(Guid room, Guid account, bool owner, ChatTarget command, CancellationToken ct)
    {
        var (row, message) = await LoadAsync(room, command.MessageId, ct);
        if (row.SenderId != account && !owner) throw new HubException("Solo puedes borrar tus mensajes; el anfitrión puede moderar la sala.");
        if (message.Deleted) return message;
        var uploads = await db.RoomUploads.Where(x => x.MessageId == command.MessageId && x.RoomId == room).ToArrayAsync(ct);
        db.RoomUploads.RemoveRange(uploads);
        // Text is a readable tombstone so earlier clients, which do not know the Deleted flag, also hide the content.
        var deleted = message with {Text = DeletedText, Deleted = true, Pinned = false, Reactions = [], Attachments = [], ReplyToId = null, EditedAt = null};
        var result = await SaveAsync(room, row, deleted, ct);
        foreach (var upload in uploads) files.Delete(upload.Id);
        return result;
    }

    public async Task<RoomMessage?> PinnedAsync(Guid room, CancellationToken ct)
    {
        var row = await db.RoomChatEntries.AsNoTracking().Where(x => x.RoomId == room && x.Payload.Contains("\"Pinned\":true"))
            .OrderByDescending(x => x.At).FirstOrDefaultAsync(ct);
        if (row is null || Read(row).Deleted) return null;
        return (await HydrateAsync(room, [Read(row)], ct))[0];
    }
    public async Task<RoomMessage[]> PinAsync(Guid room, bool controller, ChatTarget command, CancellationToken ct)
    {
        if (!controller) throw new HubException("El anfitrión o un coanfitrión puede fijar mensajes.");
        var (row, message) = await LoadAsync(room, command.MessageId, ct);
        if (message.Deleted) throw new HubException("No puedes fijar un mensaje eliminado.");
        var rows = await db.RoomChatEntries.Where(x => x.RoomId == room && x.Id != row.Id && x.Payload.Contains("\"Pinned\":true")).ToArrayAsync(ct);
        var changed = new List<RoomMessage>();
        foreach (var previous in rows)
        {
            previous.Version++; var next = Read(previous) with {Pinned = false}; previous.Payload = Store(next); changed.Add(next);
        }
        row.Version++; var target = message with {Pinned = !message.Pinned, Revision = row.Version}; row.Payload = Store(target); changed.Add(target);
        await db.SaveChangesAsync(ct);
        return await HydrateAsync(room, changed.ToArray(), ct);
    }

    /// <summary>One reaction per person and message: the same emoji removes it, a different one replaces it.</summary>
    public async Task<RoomMessage> ReactAsync(Guid room, Guid account, string name, ReactChatCommand command, CancellationToken ct)
    {
        if (!IsEmoji(command.Emoji)) throw new HubException("Elige un emoji válido.");
        var (row, message) = await LoadAsync(room, command.MessageId, ct);
        if (message.Deleted) throw new HubException("Ese mensaje ya no está disponible.");
        var reactions = (message.Reactions ?? []).ToList(); var previous = reactions.FirstOrDefault(x => x.AccountId == account);
        reactions.RemoveAll(x => x.AccountId == account);
        if (previous?.Emoji != command.Emoji) reactions.Add(new(account, name, command.Emoji!));
        if (reactions.Count > 50) throw new HubException("Este mensaje ya tiene 50 reacciones.");
        return await SaveAsync(room, row, message with {Reactions = reactions.ToArray()}, ct);
    }

    public static bool IsEmoji(string? value)
    {
        if (value is null || value.Length is 0 or > 16) return false;
        var runes = value.EnumerateRunes().ToArray();
        return runes.Any(r => Rune.GetUnicodeCategory(r) == UnicodeCategory.OtherSymbol) &&
            runes.All(r => Rune.GetUnicodeCategory(r) is UnicodeCategory.OtherSymbol or UnicodeCategory.ModifierSymbol
                or UnicodeCategory.NonSpacingMark or UnicodeCategory.EnclosingMark or UnicodeCategory.Format);
    }

    /// <summary>
    /// Removes everything an account left in room chats: its messages and uploads, and its reactions on other
    /// messages (which carry its display name). Replies to its messages then show a neutral tombstone.
    /// Returns the upload ids whose files must be deleted after the transaction commits.
    /// </summary>
    public static async Task<Guid[]> ForgetAccountsAsync(OndaDbContext db, IReadOnlyCollection<Guid> accounts, CancellationToken ct)
    {
        if (accounts.Count == 0) return [];
        var ids = accounts.ToArray();
        var uploads = await db.RoomUploads.Where(x => ids.Contains(x.UploaderId)).Select(x => x.Id).ToArrayAsync(ct);
        await db.RoomUploads.Where(x => ids.Contains(x.UploaderId)).ExecuteDeleteAsync(ct);
        await db.RoomChatEntries.Where(x => ids.Contains(x.SenderId)).ExecuteDeleteAsync(ct);
        foreach (var account in ids)
        {
            var token = account.ToString();
            var rows = await db.RoomChatEntries.Where(x => x.Payload.Contains(token)).ToListAsync(ct);
            foreach (var row in rows)
            {
                var message = Read(row);
                var reactions = (message.Reactions ?? []).Where(x => x.AccountId != account).ToArray();
                if (reactions.Length == (message.Reactions?.Length ?? 0)) continue;
                row.Payload = Store(message with {Reactions = reactions}); row.Version++;
            }
            await db.SaveChangesAsync(ct);
        }
        return uploads;
    }

    /// <summary>Explicit retention: messages and their files older than 30 days are removed.</summary>
    public static async Task<Guid[]> PruneExpiredAsync(OndaDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var cutoff = now - Retention;
        var expired = await db.RoomChatEntries.Where(x => x.At < cutoff).Select(x => x.Id).Take(2000).ToArrayAsync(ct);
        if (expired.Length == 0) return [];
        var files = await db.RoomUploads.Where(x => x.MessageId != null && expired.Contains(x.MessageId.Value)).Select(x => x.Id).ToArrayAsync(ct);
        await db.RoomUploads.Where(x => x.MessageId != null && expired.Contains(x.MessageId.Value)).ExecuteDeleteAsync(ct);
        await db.RoomChatEntries.Where(x => expired.Contains(x.Id)).ExecuteDeleteAsync(ct);
        return files;
    }
}
