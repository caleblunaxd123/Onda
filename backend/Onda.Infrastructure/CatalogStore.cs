using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Onda.Domain;
namespace Onda.Infrastructure;

public sealed class CatalogOptions
{
    /// <summary>auto: local SQL catalog once a full sync completed, live Radio Browser before that. Also: catalog, live.</summary>
    public string Mode { get; set; } = "auto";
    public bool SyncEnabled { get; set; } = true;
    public int SyncIntervalHours { get; set; } = 6;
    public int SyncPageSize { get; set; } = 1000;
    public int SyncPageDelayMs { get; set; } = 500;
    public int SyncMaxPagesPerRun { get; set; } = 200;
    public int SyncStartupDelaySeconds { get; set; } = 15;
}

/// <summary>Writes normalized stations to SQL Server. Library data lives on devices and is never touched here.</summary>
public sealed class CatalogStore(OndaDbContext db, TimeProvider clock, ILogger<CatalogStore> logger)
{
    public async Task<int> UpsertAsync(IReadOnlyCollection<StationEntity> incoming, CancellationToken ct)
    {
        var batch = incoming.DistinctBy(s => s.Id).ToList();
        if (batch.Count == 0) return 0;
        for (var attempt = 0; ; attempt++)
        {
            try { return await UpsertOnceAsync(batch, ct); }
            catch (DbUpdateException ex) when (attempt == 0)
            {
                // A concurrent writer (on-demand page vs. batch sync) inserted the same station first; retry as update.
                logger.LogInformation("Retrying catalog upsert after concurrent write: {Error}", ex.InnerException?.Message ?? ex.Message);
                db.ChangeTracker.Clear();
                await Task.Delay(200, ct);
            }
        }
    }

    private async Task<int> UpsertOnceAsync(List<StationEntity> batch, CancellationToken ct)
    {
        var ids = batch.Select(s => s.Id).ToList();
        var existing = await db.Stations.Include(s => s.Tags).Include(s => s.Languages).AsSplitQuery()
            .Where(s => ids.Contains(s.Id)).ToDictionaryAsync(s => s.Id, ct);
        var now = clock.GetUtcNow();
        foreach (var item in batch)
        {
            if (existing.TryGetValue(item.Id, out var target))
            {
                CopyScalars(item, target, now);
                StationMapper.ApplyCheck(target, item.SourceCheckOk, item.SourceCheckedAt, isNew: false);
                SyncChildren(target.Tags, item.Tags, t => t.Tag, (a, b) => a.Position = b.Position);
                SyncChildren(target.Languages, item.Languages, l => l.Code, (a, b) => a.Position = b.Position);
            }
            else
            {
                item.FirstSeenAt = item.LastSeenAt = item.UpdatedAt = now;
                item.IsActive = true;
                StationMapper.ApplyCheck(item, item.SourceCheckOk, item.SourceCheckedAt, isNew: true);
                db.Stations.Add(item);
            }
        }
        await db.SaveChangesAsync(ct);
        db.ChangeTracker.Clear();
        await RecomputeVariantsAsync(batch.Select(s => s.VariantKey).OfType<string>().Distinct().ToList(), ct);
        return batch.Count;
    }

    private static void CopyScalars(StationEntity from, StationEntity to, DateTimeOffset now)
    {
        to.Name = from.Name; to.SearchName = from.SearchName; to.CountryCode = from.CountryCode; to.Country = from.Country;
        to.Region = from.Region; to.SearchRegion = from.SearchRegion; to.Language = from.Language;
        to.StreamUrl = from.StreamUrl; to.AlternateStreamUrl = from.AlternateStreamUrl; to.HasHttpsStream = from.HasHttpsStream;
        to.Homepage = from.Homepage; to.ArtworkUrl = from.ArtworkUrl; to.Codec = from.Codec; to.Bitrate = from.Bitrate;
        to.IsHls = from.IsHls; to.Votes = from.Votes; to.ClickCount = from.ClickCount; to.ClickTrend = from.ClickTrend;
        to.Latitude = from.Latitude; to.Longitude = from.Longitude; to.VariantKey = from.VariantKey;
        to.SourceChangedAt = from.SourceChangedAt; to.SampleKey = from.SampleKey;
        to.IsActive = true; to.LastSeenAt = now; to.UpdatedAt = now;
    }

    private static void SyncChildren<T>(List<T> current, List<T> desired, Func<T, string> key, Action<T, T> update)
    {
        var wanted = desired.ToDictionary(key);
        current.RemoveAll(c => !wanted.ContainsKey(key(c)));
        foreach (var item in desired)
        {
            var match = current.FirstOrDefault(c => key(c) == key(item));
            if (match is null) current.Add(item); else update(match, item);
        }
    }

    /// <summary>Elects one primary station per variant group: active and HTTPS first, then healthiest and most popular.</summary>
    public async Task RecomputeVariantsAsync(IReadOnlyList<string>? keys, CancellationToken ct)
    {
        if (keys is { Count: 0 }) return;
        var scope = keys is null ? "" : "AND VariantKey IN (SELECT value FROM OPENJSON(@keys))";
        var sql = $"""
            WITH ranked AS (
              SELECT IsPrimaryVariant, ROW_NUMBER() OVER (PARTITION BY VariantKey ORDER BY
                CASE WHEN IsActive = 1 AND HasHttpsStream = 1 THEN 0 ELSE 1 END,
                CASE Availability WHEN 'ok' THEN 0 WHEN 'unknown' THEN 1 WHEN 'unstable' THEN 2 ELSE 3 END,
                ClickCount DESC, Votes DESC, Bitrate DESC, Id) AS rn
              FROM Stations WHERE VariantKey IS NOT NULL {scope})
            UPDATE ranked SET IsPrimaryVariant = CASE WHEN rn = 1 THEN 1 ELSE 0 END
            WHERE IsPrimaryVariant <> CASE WHEN rn = 1 THEN 1 ELSE 0 END;
            """;
        var json = System.Text.Json.JsonSerializer.Serialize(keys ?? []);
        await db.Database.ExecuteSqlRawAsync(sql, [new SqlParameter("@keys", json)], ct);
        if (keys is null)
            await db.Stations.Where(s => s.VariantKey == null && !s.IsPrimaryVariant).ExecuteUpdateAsync(u => u.SetProperty(s => s.IsPrimaryVariant, true), ct);
    }

    /// <summary>Stations not seen by a completed full sync are hidden, never deleted (reports and libraries keep their ids).</summary>
    public Task<int> MarkMissingInactiveAsync(DateTimeOffset seenBefore, CancellationToken ct) =>
        db.Stations.Where(s => s.IsActive && s.LastSeenAt < seenBefore)
            .ExecuteUpdateAsync(u => u.SetProperty(s => s.IsActive, false), ct);
}
