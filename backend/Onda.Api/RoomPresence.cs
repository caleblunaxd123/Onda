using System.Collections.Concurrent;
namespace Onda.Api;

public sealed record RoomMember(Guid Id, string Name, string? AvatarUrl = null);
public sealed record MessageEmoji(Guid AccountId, string Name, string Emoji);
public sealed record MessageReply(Guid Id, string Sender, string Text, bool Deleted, Guid? SenderId = null);
public sealed record ChatAttachment(Guid Id, string Name, string Mime, string Kind, long Length, int? DurationMs = null);
public sealed record RoomMessage(Guid Id, Guid SenderId, string Sender, string Text, string Kind, DateTimeOffset At,
    Guid? ReplyToId = null, MessageReply? Reply = null, DateTimeOffset? EditedAt = null, bool Deleted = false,
    MessageEmoji[]? Reactions = null, ChatAttachment[]? Attachments = null, long Revision = 0, bool Pinned = false);
public sealed record RoomReaction(Guid SenderId, string Emoji);
public sealed class RoomPresence(TimeProvider clock)
{
    private sealed record Connection(Guid Account, string Session, string Name, Action Abort, Guid? Room, string? AvatarUrl);
    private readonly object gate = new();
    private readonly Dictionary<string, Connection> connections = [];
    private readonly Dictionary<Guid, Queue<RoomMessage>> messages = [];
    private readonly Dictionary<(Guid, Guid), HashSet<Guid>> votes = [];
    private readonly Dictionary<(Guid, string), Queue<DateTimeOffset>> rate = [];
    private readonly Dictionary<Guid, (Guid Owner, DateTimeOffset Since)> missingOwners = [];
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> locks = new();
    public SemaphoreSlim RoomLock(Guid id) => locks.GetOrAdd(id, _ => new(1, 1));
    public void Connect(string id, Guid account, string session, string name, Action abort, string? avatarUrl = null)
    {
        lock (gate)
        {
            if (connections.Count >= 1000 || connections.Values.Count(x => x.Account == account) >= 5)
                throw new Microsoft.AspNetCore.SignalR.HubException("Cierra otra conexión antes de entrar de nuevo.");
            connections[id] = new(account, session, name, abort, null, avatarUrl);
        }
    }
    public Guid? Enter(string id, Guid room)
    {lock (gate) {var old = connections[id].Room; connections[id] = connections[id] with {Room = room}; return old;}}
    public Guid? Leave(string id)
    {lock (gate) {if (!connections.TryGetValue(id, out var c)) return null; connections[id] = c with {Room = null}; return c.Room;}}
    public Guid? Disconnect(string id)
    {lock (gate) {if (!connections.Remove(id, out var c)) return null; return c.Room;}}
    public bool InRoom(string connection, Guid room)
    {lock (gate) return connections.TryGetValue(connection, out var c) && c.Room == room;}
    public RoomMember[] Members(Guid room)
    {lock (gate) return connections.Values.Where(c => c.Room == room).DistinctBy(c => c.Account).Select(c => new RoomMember(c.Account, c.Name, c.AvatarUrl)).ToArray();}
    public int Count(Guid room) => Members(room).Length;
    public DateTimeOffset? HostAbsentSince(Guid room, Guid owner)
    {
        lock (gate)
        {
            if (connections.Values.Any(x => x.Room == room && x.Account == owner) || !connections.Values.Any(x => x.Room == room))
            {missingOwners.Remove(room); return null;}
            if (!missingOwners.TryGetValue(room, out var missing) || missing.Owner != owner)
                missingOwners[room] = missing = (owner, clock.GetUtcNow());
            return missing.Since;
        }
    }
    public Guid[] ActiveRooms() {lock (gate) return connections.Values.Select(c => c.Room).OfType<Guid>().Distinct().ToArray();}
    public void RevokeRoom(Guid account, Guid room)
    {
        Action[] aborts;
        lock (gate)
        {
            var affected = connections.Where(x => x.Value.Account == account && x.Value.Room == room).ToArray();
            aborts = affected.Select(x => x.Value.Abort).ToArray();
            foreach (var c in affected) connections.Remove(c.Key);
        }
        foreach (var abort in aborts) abort();
    }
    public RoomMessage[] Messages(Guid room)
    {lock (gate) return messages.TryGetValue(room, out var queue) ? queue.ToArray() : [];}
    public RoomMessage AddMessage(Guid room, Guid sender, string name, string text, string kind = "text")
    {
        lock (gate)
        {
            if (!messages.TryGetValue(room, out var queue)) messages[room] = queue = new();
            var message = new RoomMessage(Guid.NewGuid(), sender, name, text, kind, clock.GetUtcNow());
            queue.Enqueue(message); while (queue.Count > 100) queue.Dequeue(); return message;
        }
    }
    public bool Allow(Guid account, string action, int limit, int seconds)
    {
        lock (gate)
        {
            var key = (account, action);
            if (!rate.TryGetValue(key, out var times)) rate[key] = times = new();
            var now = clock.GetUtcNow(); while (times.TryPeek(out var time) && time < now.AddSeconds(-seconds)) times.Dequeue();
            if (times.Count >= limit) return false; times.Enqueue(now); return true;
        }
    }
    public int Vote(Guid room, Guid item, Guid account)
    {lock (gate) {if (!votes.TryGetValue((room, item), out var users)) votes[(room, item)] = users = []; if (!users.Add(account)) users.Remove(account); return users.Count;}}
    public int Votes(Guid room, Guid item)
    {lock (gate) return votes.TryGetValue((room, item), out var users) ? users.Count : 0;}
    public Guid[] MyVotes(Guid room, Guid account)
    {lock (gate) return votes.Where(x => x.Key.Item1 == room && x.Value.Contains(account)).Select(x => x.Key.Item2).ToArray();}
    public void ForgetItem(Guid room, Guid item) {lock (gate) votes.Remove((room, item));}
    public Guid[] Revoke(Guid account, string? session = null)
    {
        Action[] aborts; Guid[] rooms;
        lock (gate)
        {
            var affected = connections.Where(x => x.Value.Account == account && (session is null || x.Value.Session == session)).ToArray();
            rooms = affected.Select(x => x.Value.Room).OfType<Guid>().Distinct().ToArray();
            aborts = affected.Select(x => x.Value.Abort).ToArray();
            foreach (var c in affected) connections.Remove(c.Key);
            if (session is null)
                foreach (var key in messages.Keys.ToArray()) messages[key] = new(messages[key].Where(m => m.SenderId != account));
        }
        foreach (var abort in aborts) abort(); return rooms;
    }
    public void Close(Guid room)
    {lock (gate) {messages.Remove(room); missingOwners.Remove(room); foreach (var key in votes.Keys.Where(x => x.Item1 == room).ToArray()) votes.Remove(key);}}
}
