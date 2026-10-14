using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Onda.Domain;
using Onda.Infrastructure;
namespace Onda.Api;

public sealed record ChatDraft(string? Text, Guid? ReplyToId = null, Guid[]? AttachmentIds = null);
public sealed class RoomChatService(OndaDbContext db, TimeProvider clock, RoomPresence presence, RoomUploadStore files)
{
    private static RoomMessage Read(RoomChatEntry row) => JsonSerializer.Deserialize<RoomMessage>(row.Payload)! with {Revision = row.Version};
    // Reply hydration is batched in History; sending validates the target against the room.
    private static MessageReply Quote(RoomMessage m) => new(m.Id, m.Sender, m.Deleted ? "Mensaje eliminado" : (m.Text.Length > 0 ? m.Text[..Math.Min(160, m.Text.Length)] : m.Attachments?.FirstOrDefault()?.Name ?? "Adjunto"), m.Deleted);
    private static string Clean(string? value) => new string((value ?? "").Where(c => !char.IsControl(c) || c is '\n' or '\t').ToArray()).Trim();
    public async Task<RoomMessage[]> HistoryAsync(Guid room, CancellationToken ct)
    {
        var rows = await db.RoomChatEntries.AsNoTracking().Where(x => x.RoomId == room).OrderByDescending(x => x.At).ThenByDescending(x => x.Id).Take(100).ToArrayAsync(ct);
        var result = rows.Select(Read).ToArray(); var ids = result.Select(x => x.ReplyToId).OfType<Guid>().Distinct().ToArray();
        var quotes = (await db.RoomChatEntries.AsNoTracking().Where(x => x.RoomId == room && ids.Contains(x.Id)).ToArrayAsync(ct)).ToDictionary(x => x.Id, x => Quote(Read(x)));
        return result.Select(m => m.ReplyToId is { } id ? m with {Reply = quotes.GetValueOrDefault(id, new(id, "", "Mensaje eliminado", true))} : m)
            .Concat(presence.Messages(room).Where(x => x.Kind == "system")).OrderBy(x => x.At).ThenBy(x => x.Id).TakeLast(100).ToArray();
    }
    public async Task<RoomMessage> SendAsync(Guid room, Guid account, string name, ChatDraft draft, CancellationToken ct)
    {
        if (draft.Text is {Length: > 2000} || draft.AttachmentIds is {Length: > 3}) throw new HubException("Usa hasta 2.000 caracteres y 3 adjuntos por mensaje.");
        var text = Clean(draft.Text); var ids = (draft.AttachmentIds ?? []).Distinct().ToArray();
        if (text.Length == 0 && ids.Length == 0) throw new HubException("Escribe algo o añade un adjunto.");
        MessageReply? reply = null;
        if (draft.ReplyToId is { } target)
        {
            var row = await db.RoomChatEntries.AsNoTracking().SingleOrDefaultAsync(x => x.Id == target && x.RoomId == room, ct);
            if (row is null) throw new HubException("Ese mensaje ya no está disponible.");
            reply = Quote(Read(row));
        }
        var uploads = await db.RoomUploads.Where(x => ids.Contains(x.Id) && x.RoomId == room && x.UploaderId == account && x.MessageId == null).ToArrayAsync(ct);
        if (uploads.Length != ids.Length) throw new HubException("Un adjunto ya se envió o no pertenece a esta sala.");
        var id = Guid.NewGuid();
        var message = new RoomMessage(id, account, name, text, "text", clock.GetUtcNow(), draft.ReplyToId, reply, Reactions: [], Attachments: uploads.Select(RoomUploadStore.View).ToArray(), Revision: 1);
        db.RoomChatEntries.Add(new() {Id = id, RoomId = room, SenderId = account, At = message.At, Version = 1, Payload = JsonSerializer.Serialize(message with {Reply = null})});
        foreach (var upload in uploads) upload.MessageId = id;
        await db.SaveChangesAsync(ct); return message;
    }
    public async Task<RoomMessage> ChangeAsync(Guid room, Guid id, Guid account, bool moderator, string action, string? value, string name, CancellationToken ct)
    {
        var row = await db.RoomChatEntries.SingleOrDefaultAsync(x => x.Id == id && x.RoomId == room, ct) ?? throw new HubException("Ese mensaje ya no está disponible.");
        var message = Read(row);
        if (action == "edit")
        {
            if (row.SenderId != account || message.Deleted || clock.GetUtcNow() - row.At > TimeSpan.FromMinutes(15)) throw new HubException("Solo puedes editar tus mensajes durante los primeros 15 minutos.");
            var text = Clean(value); if (value is {Length: > 2000} || text.Length == 0) throw new HubException("Escribe un texto de hasta 2.000 caracteres.");
            message = message with {Text = text, EditedAt = clock.GetUtcNow()};
        }
        else if (action == "delete")
        {
            if (row.SenderId != account && !moderator) throw new HubException("Solo puedes borrar tus mensajes; el anfitrión puede moderar la sala.");
            message = message with {Text = "", Deleted = true, Reactions = [], Attachments = []};
            var uploads = await db.RoomUploads.Where(x => x.MessageId == id && x.RoomId == room).ToArrayAsync(ct);
            db.RoomUploads.RemoveRange(uploads);
            row.Payload = JsonSerializer.Serialize(message with {Reply = null}); row.Version++;
            await db.SaveChangesAsync(ct);
            foreach (var upload in uploads) files.Delete(upload.Id);
            return message with {Revision = row.Version};
        }
        else if (action == "react")
        {
            if (message.Deleted || value is null || value.Length > 16 || !value.EnumerateRunes().Any(r => RuneCategory(r) == UnicodeCategory.OtherSymbol) || value.EnumerateRunes().Any(r => RuneCategory(r) is not (UnicodeCategory.OtherSymbol or UnicodeCategory.ModifierSymbol or UnicodeCategory.NonSpacingMark or UnicodeCategory.EnclosingMark or UnicodeCategory.Format))) throw new HubException("Elige un emoji válido.");
            var reactions = (message.Reactions ?? []).ToList(); var previous = reactions.FirstOrDefault(x => x.AccountId == account);
            reactions.RemoveAll(x => x.AccountId == account);
            if (previous?.Emoji != value) reactions.Add(new(account, name, value));
            if (reactions.Count > 50) throw new HubException("Este mensaje ya tiene 50 reacciones.");
            message = message with {Reactions = reactions.ToArray()};
        }
        else throw new HubException("Acción inválida.");
        row.Payload = JsonSerializer.Serialize(message with {Reply = null}); row.Version++;
        await db.SaveChangesAsync(ct); return message with {Revision = row.Version};
    }
    private static UnicodeCategory RuneCategory(System.Text.Rune rune) => System.Text.Rune.GetUnicodeCategory(rune);
}
