using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Onda.Domain;
using Onda.Application;
using Onda.Infrastructure;
namespace Onda.Api;

public sealed record QueueEntry(Guid Id, RoomMedia Media, Guid ProposedBy);
public sealed record QueueView(Guid Id, RoomMedia Media, Guid ProposedBy, int Votes);
public sealed record RoomView(Guid Id, string Name, bool IsPrivate, Guid OwnerId, string? InviteCode, RoomMedia Media,
    bool IsPlaying, double PositionSeconds, DateTimeOffset PlaybackUpdatedAt, long Version, RoomMember[] Members, QueueView[] Queue, DateTimeOffset ServerNow);
public sealed record RoomSummary(Guid Id, string Name, bool IsPrivate, Guid OwnerId, RoomMedia Media, int Listeners);
public sealed record CreateRoom(string? Name, bool IsPrivate, MediaInput Media);
public sealed record PlaybackCommand(bool Playing, double PositionSeconds, long Version);
public sealed record RoomReportRequest(Guid? AccountId, string? Reason);

public sealed class RoomService(OndaDbContext db, MediaResolver resolver, RoomPresence presence, TimeProvider clock)
{
    public static RoomMedia Media(ListeningRoom room) => JsonSerializer.Deserialize<RoomMedia>(room.Media)!;
    public static List<QueueEntry> Queue(ListeningRoom room) => JsonSerializer.Deserialize<List<QueueEntry>>(room.Queue) ?? [];
    public RoomView View(ListeningRoom room, bool includeInvite = true) => new(room.Id, room.Name, room.IsPrivate, room.OwnerId,
        includeInvite ? room.InviteCode : null, Media(room), room.IsPlaying, room.PositionSeconds, room.PlaybackUpdatedAt, room.Version,
        presence.Members(room.Id), Queue(room).Select(x => new QueueView(x.Id, x.Media, x.ProposedBy, presence.Votes(room.Id, x.Id))).ToArray(), clock.GetUtcNow());
    public async Task<RoomSummary[]> ListAsync(Guid? user, bool mine, CancellationToken ct)
    {
        var cutoff = clock.GetUtcNow().AddHours(-24);
        var active = presence.ActiveRooms();
        var query = db.ListeningRooms.AsNoTracking().Where(x => !x.Closed);
        query = mine ? query.Where(x => x.OwnerId == user) : query.Where(x => !x.IsPrivate && (x.UpdatedAt > cutoff || active.Contains(x.Id)));
        var rows = await query.OrderByDescending(x => x.UpdatedAt).Take(50).ToListAsync(ct);
        return rows.Select(x => new RoomSummary(x.Id, x.Name, x.IsPrivate, x.OwnerId, Media(x), presence.Count(x.Id))).OrderByDescending(x => x.Listeners).ToArray();
    }
    public async Task<RoomView?> CreateAsync(Guid owner, CreateRoom input, CancellationToken ct)
    {
        var name = Text.CleanName(input.Name ?? "", 70).Trim();
        if (name.Length < 2 || input.Media is null) return null;
        var semaphore = presence.RoomLock(owner); await semaphore.WaitAsync(ct);
        try
        {
        if (await db.ListeningRooms.CountAsync(x => x.OwnerId == owner && !x.Closed, ct) >= 3) return null;
        var media = await resolver.ResolveAsync(input.Media, ct); if (media is null) return null;
        var now = clock.GetUtcNow();
        var room = new ListeningRoom {Id = Guid.NewGuid(), OwnerId = owner, Name = name, IsPrivate = input.IsPrivate, IsPlaying = true,
            InviteCode = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(6)),
            Media = JsonSerializer.Serialize(media), Version = 1, CreatedAt = now, UpdatedAt = now, PlaybackUpdatedAt = now};
        db.ListeningRooms.Add(room); await db.SaveChangesAsync(ct); return View(room);
        }
        finally {semaphore.Release();}
    }
    public Task<ListeningRoom?> FindAsync(Guid id, CancellationToken ct) => db.ListeningRooms.SingleOrDefaultAsync(x => x.Id == id && !x.Closed, ct);
    public async Task<bool> CanJoinAsync(ListeningRoom room, Guid account, string? code, CancellationToken ct) =>
        (!room.IsPrivate || room.OwnerId == account || string.Equals(room.InviteCode, code, StringComparison.OrdinalIgnoreCase)) &&
        !await db.RoomBans.AnyAsync(x => x.RoomId == room.Id && x.AccountId == account, ct);
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
public sealed class RoomsHub(RoomService rooms, RoomPresence presence, OndaDbContext db, MediaResolver resolver, TimeProvider clock) : Hub
{
    private Guid Account => Context.User!.ListenerId();
    private CancellationToken Ct => Context.ConnectionAborted;
    public override Task OnConnectedAsync()
    {
        presence.Connect(Context.ConnectionId, Account, Context.User!.FindFirstValue("sid")!, Context.User!.Identity!.Name!, Context.Abort);
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
    private async Task<ListeningRoom> MemberAsync(Guid id, bool host = false)
    {
        if (!presence.InRoom(Context.ConnectionId, id)) throw new HubException("Entra a la sala primero.");
        var room = await rooms.FindAsync(id, Ct) ?? throw new HubException("La sala está cerrada.");
        if (host && room.OwnerId != Account) throw new HubException("Solo el anfitrión puede usar este control.");
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
        if (!await rooms.CanJoinAsync(room, Account, code, Ct)) throw new HubException("Invitación inválida o acceso restringido.");
        var semaphore = presence.RoomLock(id); await semaphore.WaitAsync(Ct);
        try
        {
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
    public async Task<RoomMessage[]> History(Guid id) {await MemberAsync(id); return presence.Messages(id);}
    public async Task SendMessage(Guid id, string text)
    {
        Limit("message", 12, 10); await MemberAsync(id);
        if (text is null || text.Length > 300 || Text.CleanName(text, 300).Trim() is not {Length: > 0} clean) throw new HubException("Escribe un mensaje de hasta 300 caracteres.");
        var message = presence.AddMessage(id, Account, Context.User!.Identity!.Name!, clean);
        await Clients.Group(id.ToString()).SendAsync("Message", message);
    }
    public async Task React(Guid id, string emoji)
    {
        Limit("reaction", 6, 10); await MemberAsync(id);
        if (!new[] {"❤️", "🔥", "👏", "😂", "🎵"}.Contains(emoji)) throw new HubException("Reacción inválida.");
        await Clients.Group(id.ToString()).SendAsync("Reaction", new RoomReaction(Account, emoji));
    }
    public async Task SetPlayback(Guid id, PlaybackCommand command)
    {
        Limit("playback", 20, 10);
        var semaphore = presence.RoomLock(id); await semaphore.WaitAsync(Ct);
        try
        {
            var room = await MemberAsync(id, true);
            if (command.Version != room.Version || !double.IsFinite(command.PositionSeconds) || command.PositionSeconds is < 0 or > 86400) throw new HubException("Actualiza la sala antes de cambiar la reproducción.");
            room.IsPlaying = command.Playing; room.PositionSeconds = RoomService.Media(room).Kind == "radio" ? 0 : command.PositionSeconds;
            room.PlaybackUpdatedAt = clock.GetUtcNow(); await rooms.SaveAsync(room, Ct); await BroadcastAsync(id);
        }
        finally {semaphore.Release();}
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
    public async Task Vote(Guid id, Guid item)
    {
        Limit("vote", 12, 10); var room = await MemberAsync(id);
        if (!RoomService.Queue(room).Any(x => x.Id == item)) throw new HubException("Esa propuesta ya no está en la lista.");
        presence.Vote(id, item, Account); await BroadcastAsync(id);
    }
    public async Task PlayQueued(Guid id, Guid item)
    {
        Limit("change", 6, 10); var semaphore = presence.RoomLock(id); await semaphore.WaitAsync(Ct);
        try
        {
            var room = await MemberAsync(id, true); var queue = RoomService.Queue(room);
            var selected = queue.FirstOrDefault(x => x.Id == item) ?? throw new HubException("La propuesta ya no existe.");
            room.Media = JsonSerializer.Serialize(selected.Media); queue.Remove(selected); room.Queue = JsonSerializer.Serialize(queue);
            room.PositionSeconds = 0; room.IsPlaying = true; room.PlaybackUpdatedAt = clock.GetUtcNow(); presence.ForgetItem(id, item);
            await rooms.SaveAsync(room, Ct); await BroadcastAsync(id);
        }
        finally {semaphore.Release();}
    }
    public async Task RemoveQueued(Guid id, Guid item)
    {
        Limit("change", 6, 10); var room = await MemberAsync(id, true); var queue = RoomService.Queue(room);
        queue.RemoveAll(x => x.Id == item); room.Queue = JsonSerializer.Serialize(queue); presence.ForgetItem(id, item);
        await rooms.SaveAsync(room, Ct); await BroadcastAsync(id);
    }
    public async Task TransferHost(Guid id, Guid account)
    {
        Limit("host", 3, 30); var room = await MemberAsync(id, true);
        if (!presence.Members(id).Any(x => x.Id == account)) throw new HubException("El nuevo anfitrión debe estar en la sala.");
        room.OwnerId = account; await rooms.SaveAsync(room, Ct); await BroadcastAsync(id);
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
        {db.RoomBans.Add(new() {RoomId = id, AccountId = account}); await db.SaveChangesAsync(Ct);}
        await Clients.User(account.ToString()).SendAsync("Kicked", id);
        presence.RevokeRoom(account, id); await BroadcastAsync(id);
    }
    public async Task CloseRoom(Guid id)
    {
        var room = await MemberAsync(id, true); room.Closed = true; await rooms.SaveAsync(room, Ct);
        await Clients.Group(id.ToString()).SendAsync("Closed", id); presence.Close(id);
    }
}
