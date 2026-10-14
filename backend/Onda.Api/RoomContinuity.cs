using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Onda.Infrastructure;
namespace Onda.Api;

/// <summary>Opt-in takeover, only after a full grace period and while participants remain connected.</summary>
public sealed class RoomContinuity(IServiceScopeFactory scopes, RoomPresence presence, IHubContext<RoomsHub> hub, TimeProvider clock, ILogger<RoomContinuity> log) : BackgroundService
{
    public const int GraceSeconds = 60;
    public async Task SweepAsync(CancellationToken ct)
    {
        foreach (var id in presence.ActiveRooms())
        {
            var gate = presence.RoomLock(id); await gate.WaitAsync(ct);
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<OndaDbContext>();
                var rooms = scope.ServiceProvider.GetRequiredService<RoomService>();
                var room = await db.ListeningRooms.SingleOrDefaultAsync(x => x.Id == id && !x.Closed && x.AutoRecovery, ct);
                if (room is null || presence.HostAbsentSince(id, room.OwnerId) is not { } since || clock.GetUtcNow() - since < TimeSpan.FromSeconds(GraceSeconds)) continue;
                var members = presence.Members(id);
                var cohosts = RoomService.Cohosts(room);
                var next = members.FirstOrDefault(x => cohosts.Contains(x.Id)) ?? members.FirstOrDefault();
                if (next is null) continue;
                room.OwnerId = next.Id; room.Cohosts = JsonSerializer.Serialize(cohosts.Where(x => x != next.Id));
                await rooms.SaveAsync(room, ct);
                await hub.Clients.Group(id.ToString()).SendAsync("State", rooms.View(room), ct);
                var notice = presence.AddMessage(id, Guid.Empty, "ONDA", next.Name + " lleva el control para que el momento continúe.", "system");
                await hub.Clients.Group(id.ToString()).SendAsync("Message", notice, ct);
            }
            catch (Exception error) when (error is DbUpdateException or Microsoft.Data.SqlClient.SqlException or HubException)
            {log.LogWarning("Room continuity database operation will retry on the next sweep.");}
            finally {gate.Release();}
        }
    }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try {while (!stoppingToken.IsCancellationRequested) {await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); await SweepAsync(stoppingToken);}}
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}
