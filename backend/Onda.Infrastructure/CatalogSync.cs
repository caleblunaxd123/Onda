using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Onda.Domain;
namespace Onda.Infrastructure;

/// <summary>
/// Copies the full Radio Browser list into SQL Server in pages. Progress (offset of consumed source records) is
/// committed after each page, so an interrupted run resumes where it stopped. A SQL application lock keeps a
/// single synchronizer active even with several API instances.
/// </summary>
public sealed class CatalogSynchronizer(OndaDbContext db, CatalogStore store, IRadioBrowserClient source,
    IOptions<CatalogOptions> options, TimeProvider clock, IMemoryCache cache, ILogger<CatalogSynchronizer> logger)
{
    public static readonly TimeSpan AbandonAfter = TimeSpan.FromHours(24);

    public async Task<SyncRun?> RunOnceAsync(CancellationToken ct)
    {
        var settings = options.Value;
        await db.Database.OpenConnectionAsync(ct);
        var locked = false;
        try
        {
            if (!await TryLockAsync(ct)) { logger.LogInformation("Catalog sync already running elsewhere."); return null; }
            locked = true;
            var run = await CurrentOrNewRunAsync(ct);
            var pages = 0;
            var finished = false;
            while (pages < settings.SyncMaxPagesPerRun)
            {
                ct.ThrowIfCancellationRequested();
                IReadOnlyList<RadioStation> rows;
                try { rows = await source.ListAsync(run.NextOffset, settings.SyncPageSize, ct); }
                catch (HttpRequestException ex)
                {
                    Track(run);
                    run.LastError = Truncate(ex.Message);
                    run.HeartbeatAt = clock.GetUtcNow();
                    await db.SaveChangesAsync(ct);
                    logger.LogWarning("Catalog sync paused at offset {Offset}: {Error}", run.NextOffset, ex.Message);
                    return run;
                }
                var now = clock.GetUtcNow();
                var entities = rows.Select(r => StationMapper.ToEntity(r, now)).OfType<StationEntity>().ToList();
                var upserted = await UpsertPageAsync(entities, ct);
                Track(run);
                run.NextOffset += rows.Count;
                run.Processed += rows.Count;
                run.Upserted += upserted;
                run.HeartbeatAt = clock.GetUtcNow();
                run.LastError = null;
                await db.SaveChangesAsync(ct);
                pages++;
                logger.LogInformation("Catalog sync page: offset {Offset}, {Rows} source rows, {Upserted} stored", run.NextOffset, rows.Count, upserted);
                if (rows.Count < settings.SyncPageSize) { finished = true; break; }
                if (settings.SyncPageDelayMs > 0) await Task.Delay(settings.SyncPageDelayMs, ct);
            }
            if (finished) await CompleteAsync(run, ct);
            return run;
        }
        finally
        {
            // Pooled connections keep session state until reused, so release the lock explicitly.
            if (locked) await db.Database.ExecuteSqlRawAsync("EXEC sp_releaseapplock @Resource = 'onda-catalog-sync', @LockOwner = 'Session'", CancellationToken.None);
            await db.Database.CloseConnectionAsync();
        }
    }

    private async Task<bool> TryLockAsync(CancellationToken ct)
    {
        var result = new SqlParameter("@result", SqlDbType.Int) { Direction = ParameterDirection.Output };
        await db.Database.ExecuteSqlRawAsync(
            "EXEC @result = sp_getapplock @Resource = 'onda-catalog-sync', @LockMode = 'Exclusive', @LockOwner = 'Session', @LockTimeout = 0",
            [result], ct);
        return result.Value is int code && code >= 0;
    }

    private async Task<SyncRun> CurrentOrNewRunAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var last = await db.SyncRuns.OrderByDescending(r => r.Id).FirstOrDefaultAsync(ct);
        if (last is { Status: SyncStatus.Running } && now - last.StartedAt < AbandonAfter)
        {
            logger.LogInformation("Resuming catalog sync run {Run} at offset {Offset}", last.Id, last.NextOffset);
            return last;
        }
        if (last is { Status: SyncStatus.Running })
        {
            last.Status = SyncStatus.Failed;
            last.LastError = "Abandonada: superó el tiempo máximo sin completarse.";
        }
        var run = new SyncRun { StartedAt = now, HeartbeatAt = now, Status = SyncStatus.Running };
        db.SyncRuns.Add(run);
        await db.SaveChangesAsync(ct);
        return run;
    }

    private async Task CompleteAsync(SyncRun run, CancellationToken ct)
    {
        var active = await db.Stations.CountAsync(s => s.IsActive, ct);
        // Guard against a truncated source response hiding the catalog: only retire stations after a plausible full pass.
        var retired = run.Upserted >= active * 0.5 ? await store.MarkMissingInactiveAsync(run.StartedAt, ct) : 0;
        await store.RecomputeVariantsAsync(null, ct);
        Track(run);
        run.Status = SyncStatus.Completed;
        run.CompletedAt = clock.GetUtcNow();
        run.HeartbeatAt = run.CompletedAt.Value;
        await db.SaveChangesAsync(ct);
        cache.Remove("catalog-mode");
        logger.LogInformation("Catalog sync {Run} completed: {Processed} source rows, {Retired} retired", run.Id, run.Processed, retired);
    }

    /// <summary>
    /// Saves a page as one batch; if the batch is rejected, saves row by row so a single bad record cannot block the
    /// synchronization at the same offset forever. Skipped rows are logged and retried on the next full run.
    /// </summary>
    private async Task<int> UpsertPageAsync(List<StationEntity> entities, CancellationToken ct)
    {
        try { return await store.UpsertAsync(entities, ct); }
        catch (DbUpdateException ex)
        {
            db.ChangeTracker.Clear();
            logger.LogWarning("Catalog page rejected as a batch, saving row by row: {Error}", ex.InnerException?.Message ?? ex.Message);
        }
        var saved = 0;
        foreach (var entity in entities)
        {
            try { saved += await store.UpsertAsync([entity], ct); }
            catch (DbUpdateException ex)
            {
                db.ChangeTracker.Clear();
                logger.LogWarning("Skipped station {Station}: {Error}", entity.Id, ex.InnerException?.Message ?? ex.Message);
            }
        }
        return saved;
    }

    private void Track(SyncRun run)
    {
        if (db.Entry(run).State == EntityState.Detached) db.Attach(run);
    }

    private static string Truncate(string value) => value.Length <= 1000 ? value : value[..1000];
}

public sealed class CatalogSyncService(IServiceScopeFactory scopes, IOptions<CatalogOptions> options, TimeProvider clock,
    ILogger<CatalogSyncService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var settings = options.Value;
        if (!settings.SyncEnabled) return;
        await Task.Delay(TimeSpan.FromSeconds(settings.SyncStartupDelaySeconds), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            var wait = TimeSpan.FromMinutes(10);
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<OndaDbContext>();
                var last = await db.SyncRuns.Where(r => r.Status == SyncStatus.Completed).MaxAsync(r => (DateTimeOffset?)r.CompletedAt, stoppingToken);
                var due = last is null ? TimeSpan.Zero : last.Value.AddHours(settings.SyncIntervalHours) - clock.GetUtcNow();
                if (due <= TimeSpan.Zero || await db.SyncRuns.AnyAsync(r => r.Status == SyncStatus.Running, stoppingToken))
                {
                    var run = await scope.ServiceProvider.GetRequiredService<CatalogSynchronizer>().RunOnceAsync(stoppingToken);
                    wait = run?.Status == SyncStatus.Completed ? TimeSpan.FromHours(settings.SyncIntervalHours) : TimeSpan.FromMinutes(5);
                }
                else wait = due < wait ? due : wait;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception ex)
            {
                logger.LogError(ex, "Catalog sync cycle failed; retrying later.");
            }
            await Task.Delay(wait, stoppingToken);
        }
    }
}
