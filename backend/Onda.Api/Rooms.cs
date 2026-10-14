using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Onda.Domain;
using Onda.Application;
using Onda.Infrastructure;
namespace Onda.Api;

public sealed record QueueEntry(Guid Id, RoomMedia Media, Guid ProposedBy, bool Pinned = false);
public sealed record QueueView(Guid Id, RoomMedia Media, Guid ProposedBy, int Votes, bool Pinned);
public sealed record RoomView(Guid Id, string Name, bool IsPrivate, Guid OwnerId, string? InviteCode, RoomMedia Media,
    bool IsPlaying, double PositionSeconds, DateTimeOffset PlaybackUpdatedAt, long Version, RoomMember[] Members, QueueView[] Queue, DateTimeOffset ServerNow,
    Guid[] Cohosts, bool AutoRecovery, DateTimeOffset? HostAbsentSince);
public sealed record RoomSummary(Guid Id, string Name, bool IsPrivate, Guid OwnerId, RoomMedia Media, int Listeners, RoomMember[]? Members = null);
public sealed record CreateRoom(string? Name, bool IsPrivate, MediaInput Media, bool AutoRecovery = false, string? Provider = null);
public sealed record PlaybackCommand(bool Playing, double PositionSeconds, long Version, Guid? EventId = null);
public sealed record ChangeMediaCommand(MediaInput Media, long Version, bool Playing = true, double PositionSeconds = 0);
public sealed record RoomReportRequest(Guid? AccountId, string? Reason, Guid? MessageId = null);
public sealed class RoomAlreadyOpenException(Guid roomId) : Exception("Ya tienes una sala abierta.") {public Guid RoomId { get; } = roomId;}

public sealed class RoomService(OndaDbContext db, MediaResolver resolver, RoomPresence presence, TimeProvider clock)
{
    public static RoomMedia Media(ListeningRoom room) => JsonSerializer.Deserialize<RoomMedia>(room.Media)!;
    public static List<QueueEntry> Queue(ListeningRoom room) => JsonSerializer.Deserialize<List<QueueEntry>>(room.Queue) ?? [];
    public static Guid[] Cohosts(ListeningRoom room) => string.IsNullOrWhiteSpace(room.Cohosts) ? [] : JsonSerializer.Deserialize<Guid[]>(room.Cohosts) ?? [];
    public RoomView View(ListeningRoom room, bool includeInvite = true) => new(room.Id, room.Name, room.IsPrivate, room.OwnerId,
        includeInvite ? room.InviteCode : null, Media(room), room.IsPlaying, room.PositionSeconds, room.PlaybackUpdatedAt, room.Version,
        presence.Members(room.Id), Queue(room).Select(x => new QueueView(x.Id, x.Media, x.ProposedBy, presence.Votes(room.Id, x.Id), x.Pinned)).ToArray(), clock.GetUtcNow(),
        Cohosts(room), room.AutoRecovery, presence.HostAbsentSince(room.Id, room.OwnerId));
    public async Task<RoomSummary[]> ListAsync(Guid? user, bool mine, CancellationToken ct)
    {
        var active = presence.ActiveRooms();
        var query = db.ListeningRooms.AsNoTracking().Where(x => !x.Closed);
        query = mine ? query.Where(x => x.OwnerId == user) : query.Where(x => !x.IsPrivate && active.Contains(x.Id));
        if (user is { } account) query = query.Where(room => !db.UserBlocks.Any(b =>
            (b.BlockerId == account && b.BlockedId == room.OwnerId) || (b.BlockerId == room.OwnerId && b.BlockedId == account)));
        var rows = await query.OrderByDescending(x => x.UpdatedAt).Take(50).ToListAsync(ct);
        return rows.Select(x => {
            var members = presence.Members(x.Id);
            return new RoomSummary(x.Id, x.Name, x.IsPrivate, x.OwnerId, Media(x), members.Length, members.Take(3).ToArray());
        }).OrderByDescending(x => x.Listeners).ToArray();
    }
    public async Task<RoomView?> CurrentAsync(Guid owner, CancellationToken ct)
    {
        var active = presence.ActiveRooms();
        var room = await db.ListeningRooms.Where(x => x.OwnerId == owner && !x.Closed)
            .OrderByDescending(x => active.Contains(x.Id)).ThenByDescending(x => x.UpdatedAt).FirstOrDefaultAsync(ct);
        return room is null ? null : View(room);
    }
    public async Task<RoomView?> CreateAsync(Guid owner, CreateRoom input, CancellationToken ct)
    {
        var name = Text.CleanName(input.Name ?? "", 70).Trim();
        if (name.Length < 2 || input.Media is null) return null;
        var semaphore = presence.RoomLock(owner); await semaphore.WaitAsync(ct);
        try
        {
        RoomMedia? media;
        if (input.Provider is not null)
        {
            if (input.Provider is not ("youtube" or "radio" or "audio" or "video" or "stream") || input.Media.Kind != input.Provider || input.Media.Url is not null || input.Media.StationId is not null) return null;
            media = new(input.Provider, input.Provider switch {"youtube" => "Elige un video de YouTube", "radio" => "Busca una emisora", "audio" => "Elige música", "stream" => "Elige qué ver con tu cuenta", _ => "Elige un video"}, null, null, null, input.Provider switch {"audio" => "music", "stream" => "", _ => "video"});
        }
        else media = await resolver.ResolveAsync(input.Media, ct);
        if (media is null) return null;
        if (await CurrentAsync(owner, ct) is { } existing) throw new RoomAlreadyOpenException(existing.Id);
        var now = clock.GetUtcNow();
        var room = new ListeningRoom {Id = Guid.NewGuid(), OwnerId = owner, Name = name, IsPrivate = input.IsPrivate, IsPlaying = media.Url is not null, AutoRecovery = input.AutoRecovery,
            InviteCode = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(6)),
            Media = JsonSerializer.Serialize(media), Version = 1, CreatedAt = now, UpdatedAt = now, PlaybackUpdatedAt = now};
        db.ListeningRooms.Add(room); await db.SaveChangesAsync(ct); return View(room);
        }
        finally {semaphore.Release();}
    }
    public Task<ListeningRoom?> FindAsync(Guid id, CancellationToken ct) => db.ListeningRooms.SingleOrDefaultAsync(x => x.Id == id && !x.Closed, ct);
    public async Task<bool> CanJoinAsync(ListeningRoom room, Guid account, string? code, CancellationToken ct) =>
        (!room.IsPrivate || room.OwnerId == account || string.Equals(room.InviteCode, code, StringComparison.OrdinalIgnoreCase)) &&
        !await db.RoomBans.AnyAsync(x => x.RoomId == room.Id && x.AccountId == account, ct) && await CanInteractAsync(room, account, ct);
    public async Task<bool> CanInteractAsync(ListeningRoom room, Guid account, CancellationToken ct) => !await db.UserBlocks.AnyAsync(x =>
        (x.BlockerId == account && x.BlockedId == room.OwnerId) || (x.BlockerId == room.OwnerId && x.BlockedId == account), ct);
    public async Task<RoomView?> ByCodeAsync(string code, Guid account, CancellationToken ct)
    {
        if (code.Length != 12) return null;
        var room = await db.ListeningRooms.SingleOrDefaultAsync(x => x.InviteCode == code.ToUpperInvariant() && !x.Closed, ct);
        return room is not null && await CanJoinAsync(room, account, code, ct) ? View(room) : null;
    }
    public async Task SaveAsync(ListeningRoom room, CancellationToken ct)
    {
        room.Version++; room.UpdatedAt = clock.GetUtcNow();
        try {await db.SaveChangesAsync(ct);}
        catch (DbUpdateConcurrencyException) {throw new HubException("La sala cambió. Vuelve a sincronizarla.");}
    }
}

public sealed class RoomSessionFilter : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(HubInvocationContext context, Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var accounts = context.ServiceProvider.GetRequiredService<AccountService>();
        var sid = context.Context.User?.FindFirstValue("sid");
        if (sid is null || !await accounts.IsSessionValidAsync(sid, context.Context.ConnectionAborted))
        {context.Context.Abort(); throw new HubException("Tu sesión venció. Vuelve a entrar.");}
        return await next(context);
    }
}

[Authorize]
public sealed class RoomsHub(RoomService rooms, RoomPresence presence, OndaDbContext db, MediaResolver resolver, TimeProvider clock, RoomChatService chat) : Hub
{
    private Guid Account => Context.User!.ListenerId();
    private CancellationToken Ct => Context.ConnectionAborted;
    public override Task OnConnectedAsync()
    {
        presence.Connect(Context.ConnectionId, Account, Context.User!.FindFirstValue("sid")!, Context.User!.Identity!.Name!, Context.Abort, Context.User.FindFirstValue("avatar"));
        return base.OnConnectedAsync();
    }
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (presence.Disconnect(Context.ConnectionId) is { } room)
        {
            await BroadcastAsync(room);
            if (presence.Count(room) == 0) presence.Close(room);
        }
        await base.OnDisconnectedAsync(exception);
    }
    private void Limit(string action, int count = 8, int seconds = 10)
    {if (!presence.Allow(Account, action, count, seconds)) throw new HubException("Espera unos segundos antes de continuar.");}
    private async Task<ListeningRoom> MemberAsync(Guid id, bool host = false, bool controller = false)
    {
        if (!presence.InRoom(Context.ConnectionId, id)) throw new HubException("Entra a la sala primero.");
        var room = await rooms.FindAsync(id, Ct) ?? throw new HubException("La sala está cerrada.");
        if (!await rooms.CanInteractAsync(room, Account, Ct)) throw new HubException("El acceso a esta sala está restringido.");
        if (host && room.OwnerId != Account) throw new HubException("Solo el anfitrión puede usar este control.");
        if (controller && room.OwnerId != Account && !RoomService.Cohosts(room).Contains(Account)) throw new HubException("Solo el anfitrión o un coanfitrión puede controlar la reproducción.");
        return room;
    }
    private async Task BroadcastAsync(Guid id)
    {
        var room = await rooms.FindAsync(id, CancellationToken.None);
        if (room is not null) await Clients.Group(id.ToString()).SendAsync("State", rooms.View(room));
    }
    public async Task<RoomView> Join(Guid id, string? code)
    {
        Limit("join", 8, 30);
        var room = await rooms.FindAsync(id, Ct) ?? throw new HubException("No se encontró la sala.");
        var semaphore = presence.RoomLock(id); await semaphore.WaitAsync(Ct);
        try
        {
            // A close/transfer may have completed while Join waited for the room lock.
            await db.Entry(room).ReloadAsync(Ct);
            if (db.Entry(room).State == EntityState.Detached || room.Closed) throw new HubException("La sala está cerrada.");
            if (!await rooms.CanJoinAsync(room, Account, code, Ct)) throw new HubException("Invitación inválida o acceso restringido.");
            if (presence.Count(id) >= 50 && !presence.Members(id).Any(x => x.Id == Account)) throw new HubException("La sala está llena (50 personas).");
            var old = presence.Enter(Context.ConnectionId, id);
            if (old is { } previous && previous != id) {await Groups.RemoveFromGroupAsync(Context.ConnectionId, previous.ToString()); await BroadcastAsync(previous);}
            await Groups.AddToGroupAsync(Context.ConnectionId, id.ToString());
            await BroadcastAsync(id); return rooms.View(room);
        }
        finally {semaphore.Release();}
    }
    public async Task Leave()
    {
        if (presence.Leave(Context.ConnectionId) is { } id)
        {await Groups.RemoveFromGroupAsync(Context.ConnectionId, id.ToString()); await BroadcastAsync(id); if (presence.Count(id) == 0) presence.Close(id);}
    }
    public async Task<RoomView> Snapshot(Guid id) => rooms.View(await MemberAsync(id));
    private string DisplayName => Context.User!.Identity!.Name!;
    /// <summary>Runs a chat mutation under the room lock after re-validating membership (and the session via the hub filter).</summary>
    private async Task<T> ChatAsync<T>(Guid id, Func<ListeningRoom, Task<T>> action)
    {
        var gate = presence.RoomLock(id); await gate.WaitAsync(Ct);
        try {db.ChangeTracker.Clear(); return await action(await MemberAsync(id));}
        finally {gate.Release();}
    }
    public async Task<RoomMessage[]> History(Guid id) {await MemberAsync(id); return await chat.HistoryAsync(id, Ct);}
    public async Task<RoomMessage?> PinnedChat(Guid id) {await MemberAsync(id); return await chat.PinnedAsync(id, Ct);}
    public async Task<RoomMessage[]> PinChat(Guid id, ChatTarget command)
    {
        Limit("chat-change", 12, 10);
        var changed = await ChatAsync(id, room => chat.PinAsync(id, room.OwnerId == Account || RoomService.Cohosts(room).Contains(Account), command, Ct));
        foreach (var message in changed) await Clients.Group(id.ToString()).SendAsync("MessageUpdated", message);
        return changed;
    }
    public async Task<ChatPage> ChatHistory(Guid id, Guid before) {Limit("history", 10, 30); await MemberAsync(id); return await chat.OlderAsync(id, before, Ct);}
    /// <summary>Legacy text-only command kept for clients released before the extended chat.</summary>
    public async Task SendMessage(Guid id, string text)
    {
        Limit("message", 12, 10);
        if (text is null || text.Length > RoomChatService.LegacyMaxText) throw new HubException("Escribe un mensaje de hasta 300 caracteres.");
        var message = await ChatAsync(id, _ => chat.SendAsync(id, Account, DisplayName, new(text), Ct, RoomChatService.LegacyMaxText));
        await Clients.Group(id.ToString()).SendAsync("Message", message);
    }
    public async Task<RoomMessage> SendChat(Guid id, SendChatCommand command)
    {
        Limit("message", 12, 10);
        var message = await ChatAsync(id, _ => chat.SendAsync(id, Account, DisplayName, command ?? new(null), Ct));
        await Clients.Group(id.ToString()).SendAsync("Message", message); return message;
    }
    public async Task<RoomMessage> EditChat(Guid id, EditChatCommand command)
    {
        Limit("chat-change", 12, 10);
        var message = await ChatAsync(id, _ => chat.EditAsync(id, Account, command, Ct));
        await Clients.Group(id.ToString()).SendAsync("MessageUpdated", message); return message;
    }
    /// <summary>Delete for everyone: the author or the room owner. Co-hosts do not gain moderation.</summary>
    public async Task<RoomMessage> DeleteChat(Guid id, ChatTarget command)
    {
        Limit("chat-change", 12, 10);
        var message = await ChatAsync(id, room => chat.DeleteAsync(id, Account, room.OwnerId == Account, command, Ct));
        await Clients.Group(id.ToString()).SendAsync("MessageUpdated", message); return message;
    }
    public async Task<RoomMessage> ReactChat(Guid id, ReactChatCommand command)
    {
        Limit("reaction", 12, 10);
        var message = await ChatAsync(id, _ => chat.ReactAsync(id, Account, DisplayName, command, Ct));
        await Clients.Group(id.ToString()).SendAsync("MessageUpdated", message); return message;
    }
    /// <summary>Server clock (Unix ms) for NTP-style offset/latency sampling; clients keep the lowest round trip.</summary>
    public long ServerTime() {Limit("clock", 30, 10); return clock.GetUtcNow().ToUnixTimeMilliseconds();}
    /// <summary>Ephemeral typing signal; never stored. Extra calls inside the rate window are ignored silently.</summary>
    public async Task Typing(Guid id)
    {
        if (!presence.InRoom(Context.ConnectionId, id) || !presence.Allow(Account, "typing", 4, 10)) return;
        await Clients.OthersInGroup(id.ToString()).SendAsync("Typing", new TypingEvent(Account, DisplayName));
    }
    public async Task React(Guid id, string emoji)
    {
        Limit("reaction", 6, 10); await MemberAsync(id);
        if (!new[] {"❤️", "🔥", "👏", "😂", "🎵", "🎉", "😍"}.Contains(emoji)) throw new HubException("Reacción inválida.");
        await Clients.Group(id.ToString()).SendAsync("Reaction", new RoomReaction(Account, emoji));
    }
    public async Task SetPlayback(Guid id, PlaybackCommand command)
    {
        Limit("playback", 20, 10);
        var semaphore = presence.RoomLock(id); await semaphore.WaitAsync(Ct);
        try
        {
            var room = await MemberAsync(id, controller: true);
            if (RoomService.Media(room).Url is null) throw new HubException("Elige contenido para la sala antes de reproducir.");
            var signature = AccountService.Hash(JsonSerializer.Serialize(command));
            if (command.EventId is { } eventId && room.LastPlaybackEventId == eventId && room.LastPlaybackSessionHash == Context.User!.FindFirstValue("sid"))
            {
                if (room.LastPlaybackCommandHash != signature) throw new HubException("Este evento ya se usó para otro control.");
                await BroadcastAsync(id); return; // Lost acknowledgement: return canonical state without replaying a seek.
            }
            if (command.Version != room.Version || !double.IsFinite(command.PositionSeconds) || command.PositionSeconds is < 0 or > 86400) throw new HubException("Actualiza la sala antes de cambiar la reproducción.");
            room.LastPlaybackEventId = command.EventId;
            room.LastPlaybackSessionHash = command.EventId is null ? null : Context.User!.FindFirstValue("sid");
            room.LastPlaybackCommandHash = command.EventId is null ? null : signature;
            room.IsPlaying = command.Playing; room.PositionSeconds = RoomService.Media(room).Kind == "radio" ? 0 : command.PositionSeconds;
            room.PlaybackUpdatedAt = clock.GetUtcNow(); await rooms.SaveAsync(room, Ct); await BroadcastAsync(id);
        }
        finally {semaphore.Release();}
    }
    public async Task ChangeMedia(Guid id, ChangeMediaCommand command)
    {
        Limit("change", 6, 10);
        await MemberAsync(id, controller: true);
        if (!double.IsFinite(command.PositionSeconds) || command.PositionSeconds is < 0 or > 86400)
            throw new HubException("Posición de reproducción inválida.");
        var media = await resolver.ResolveAsync(command.Media, Ct) ?? throw new HubException("Usa una radio del catálogo, YouTube o un enlace HTTPS compatible.");
        // Metadata resolution can take time; reload roles/version after taking the room lock.
        db.ChangeTracker.Clear();
        var gate = presence.RoomLock(id); await gate.WaitAsync(Ct);
        try
        {
            var room = await MemberAsync(id, controller: true);
            if (command.Version != room.Version) throw new HubException("La sala cambió. Actualízala antes de elegir otro contenido.");
            var queue = RoomService.Queue(room);
            var removed = queue.Where(x => x.Media.Url == media.Url).Select(x => x.Id).ToArray();
            queue.RemoveAll(x => removed.Contains(x.Id));
            room.Media = JsonSerializer.Serialize(media); room.Queue = JsonSerializer.Serialize(queue);
            room.IsPlaying = command.Playing; room.PositionSeconds = media.Kind == "radio" ? 0 : command.PositionSeconds;
            room.PlaybackUpdatedAt = clock.GetUtcNow();
            await rooms.SaveAsync(room, Ct);
            foreach (var item in removed) presence.ForgetItem(id, item);
            await BroadcastAsync(id);
        }
        finally {gate.Release();}
    }
    public async Task AddToQueue(Guid id, MediaInput input)
    {
        Limit("queue", 4, 30);
        var media = await resolver.ResolveAsync(input, Ct) ?? throw new HubException("Usa una radio del catálogo, YouTube o un enlace HTTPS de audio/video compatible.");
        var semaphore = presence.RoomLock(id); await semaphore.WaitAsync(Ct);
        try
        {
            var room = await MemberAsync(id); var queue = RoomService.Queue(room);
            if (queue.Count >= 30) throw new HubException("La lista tiene 30 propuestas. El anfitrión puede retirar alguna.");
            if (queue.Any(x => x.Media.Url == media.Url)) throw new HubException("Ese contenido ya está propuesto.");
            queue.Add(new(Guid.NewGuid(), media, Account)); room.Queue = JsonSerializer.Serialize(queue);
            await rooms.SaveAsync(room, Ct); await BroadcastAsync(id);
        }
        finally {semaphore.Release();}
    }
    public async Task<Guid[]> MyVotes(Guid id) {var room = await MemberAsync(id); var ids = RoomService.Queue(room).Select(x => x.Id).ToHashSet(); return presence.MyVotes(id, Account).Where(ids.Contains).ToArray();}
    public async Task<bool> Vote(Guid id, Guid item)
    {
        Limit("vote", 12, 10); var gate = presence.RoomLock(id); await gate.WaitAsync(Ct);
        try {
            var room = await MemberAsync(id);
            if (!RoomService.Queue(room).Any(x => x.Id == item)) throw new HubException("Esa propuesta ya no está en la lista.");
            presence.Vote(id, item, Account); await BroadcastAsync(id); return presence.MyVotes(id, Account).Contains(item);
        } finally {gate.Release();}
    }
    public async Task PinQueued(Guid id, Guid item)
    {
        Limit("change", 6, 10); var semaphore = presence.RoomLock(id); await semaphore.WaitAsync(Ct);
        try
        {
            var room = await MemberAsync(id, controller: true); var queue = RoomService.Queue(room);
            var target = queue.FirstOrDefault(x => x.Id == item) ?? throw new HubException("La propuesta ya no existe.");
            room.Queue = JsonSerializer.Serialize(queue.Select(x => x with {Pinned = x.Id == item && !target.Pinned}));
            await rooms.SaveAsync(room, Ct); await BroadcastAsync(id);
        }
        finally {semaphore.Release();}
    }
    public async Task PlayQueued(Guid id, Guid item)
    {
        Limit("change", 6, 10); var semaphore = presence.RoomLock(id); await semaphore.WaitAsync(Ct);
        try
        {
            var room = await MemberAsync(id, controller: true); var queue = RoomService.Queue(room);
            var selected = queue.FirstOrDefault(x => x.Id == item) ?? throw new HubException("La propuesta ya no existe.");
            room.Media = JsonSerializer.Serialize(selected.Media); queue.Remove(selected); room.Queue = JsonSerializer.Serialize(queue);
            room.PositionSeconds = 0; room.IsPlaying = true; room.PlaybackUpdatedAt = clock.GetUtcNow();
            await rooms.SaveAsync(room, Ct); presence.ForgetItem(id, item); await BroadcastAsync(id);
        }
        finally {semaphore.Release();}
    }
    public async Task RemoveQueued(Guid id, Guid item)
    {
        Limit("change", 6, 10); var gate = presence.RoomLock(id); await gate.WaitAsync(Ct);
        try {
            var room = await MemberAsync(id, controller: true); var queue = RoomService.Queue(room);
            queue.RemoveAll(x => x.Id == item); room.Queue = JsonSerializer.Serialize(queue);
            await rooms.SaveAsync(room, Ct); presence.ForgetItem(id, item); await BroadcastAsync(id);
        } finally {gate.Release();}
    }
    public async Task TransferHost(Guid id, Guid account)
    {
        Limit("host", 3, 30); var roomGate = presence.RoomLock(id); await roomGate.WaitAsync(Ct);
        try
        {
            var room = await MemberAsync(id, true);
            if (account == room.OwnerId) return;
            if (!presence.Members(id).Any(x => x.Id == account)) throw new HubException("El nuevo anfitrión debe estar en la sala.");
            var accountGate = presence.RoomLock(account); await accountGate.WaitAsync(Ct);
            try
            {
                if (await db.ListeningRooms.AnyAsync(x => x.OwnerId == account && !x.Closed && x.Id != id, Ct))
                    throw new HubException("Esta persona ya tiene una sala abierta. Puede ayudarte como coanfitrión.");
                room.OwnerId = account; room.Cohosts = JsonSerializer.Serialize(RoomService.Cohosts(room).Where(x => x != account));
                await rooms.SaveAsync(room, Ct); await BroadcastAsync(id);
            }
            finally {accountGate.Release();}
        }
        finally {roomGate.Release();}
    }
    public async Task SetCohost(Guid id, Guid account, bool enabled)
    {
        Limit("cohost", 6, 30); var semaphore = presence.RoomLock(id); await semaphore.WaitAsync(Ct);
        try
        {
            var room = await MemberAsync(id, true); var cohosts = RoomService.Cohosts(room).ToList();
            if (account == room.OwnerId || enabled && !presence.Members(id).Any(x => x.Id == account)) throw new HubException("Elige otra persona conectada a la sala.");
            if (enabled && !cohosts.Contains(account)) {if (cohosts.Count >= 2) throw new HubException("Puedes tener hasta 2 coanfitriones."); cohosts.Add(account);}
            if (!enabled) cohosts.Remove(account);
            room.Cohosts = JsonSerializer.Serialize(cohosts); await rooms.SaveAsync(room, Ct); await BroadcastAsync(id);
        }
        finally {semaphore.Release();}
    }
    public async Task RotateInvite(Guid id)
    {
        Limit("invite", 2, 30); var room = await MemberAsync(id, true);
        room.InviteCode = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(6));
        await rooms.SaveAsync(room, Ct); await BroadcastAsync(id);
    }
    public async Task Kick(Guid id, Guid account)
    {
        Limit("moderation", 6, 30); var room = await MemberAsync(id, true);
        if (account == Account || !presence.Members(id).Any(x => x.Id == account)) throw new HubException("Selecciona otra persona de la sala.");
        if (!await db.RoomBans.AnyAsync(x => x.RoomId == id && x.AccountId == account, Ct))
        {db.RoomBans.Add(new() {RoomId = id, AccountId = account});}
        room.Cohosts = JsonSerializer.Serialize(RoomService.Cohosts(room).Where(x => x != account));
        await rooms.SaveAsync(room, Ct);
        await Clients.User(account.ToString()).SendAsync("Kicked", id);
        presence.RevokeRoom(account, id); await BroadcastAsync(id);
    }
    public async Task CloseRoom(Guid id)
    {
        var room = await MemberAsync(id, true); room.Closed = true; await rooms.SaveAsync(room, Ct);
        await Clients.Group(id.ToString()).SendAsync("Closed", id); presence.Close(id);
    }
}
