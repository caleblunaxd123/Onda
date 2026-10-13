using Microsoft.EntityFrameworkCore;
using Onda.Infrastructure;
namespace Onda.Api;
public sealed class CommunityMaintenance(IServiceScopeFactory scopes, TimeProvider clock, ILogger<CommunityMaintenance> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<OndaDbContext>(); var now = clock.GetUtcNow();
                await db.ListenerSessions.Where(x => x.ExpiresAt < now).ExecuteDeleteAsync(stoppingToken);
                var old = now.AddDays(-8);
                var guests = await db.ListenerAccounts.Where(x => x.Email == null && x.CreatedAt < old).Select(x => x.Id).Take(1000).ToArrayAsync(stoppingToken);
                await db.ListeningRooms.Where(x => guests.Contains(x.OwnerId)).ExecuteDeleteAsync(stoppingToken);
                await db.RoomBans.Where(x => guests.Contains(x.AccountId)).ExecuteDeleteAsync(stoppingToken);
                await db.CommunityReports.Where(x => guests.Contains(x.ReporterId)).ExecuteUpdateAsync(x => x.SetProperty(r => r.ReporterId, Guid.Empty), stoppingToken);
                await db.CommunityReports.Where(x => x.AccountId != null && guests.Contains(x.AccountId.Value)).ExecuteUpdateAsync(x => x.SetProperty(r => r.AccountId, (Guid?)null), stoppingToken);
                await db.ListenerAccounts.Where(x => guests.Contains(x.Id)).ExecuteDeleteAsync(stoppingToken);
                var closed = now.AddDays(-7);
                await db.ListeningRooms.Where(x => x.Closed && x.UpdatedAt < closed).ExecuteDeleteAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested) {logger.LogWarning("Community maintenance could not finish ({Type}).", ex.GetType().Name);}
        }
    }
}
