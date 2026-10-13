using System.Globalization;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Onda.Application;
using Onda.Domain;
namespace Onda.Infrastructure;

public sealed class CatalogQueryService(OndaDbContext db, IRadioBrowserClient source, CatalogStore store, IMemoryCache cache,
    IOptions<CatalogOptions> options, TimeProvider clock, ILogger<CatalogQueryService> logger) : ICatalogQueries
{
    private const int DiscoverPoolSize = 600;
    public const string Attribution = "Catálogo comunitario de Radio Browser (https://www.radio-browser.info). Las transmisiones y logos pertenecen a sus emisoras.";

    public async Task<StationPage> SearchAsync(StationFilter filter, CatalogCursor? cursor, int limit, CancellationToken ct)
    {
        var liveCapable = filter.Bounds is null && filter.Geo == GeoFilter.Any;
        var live = cursor?.Source == CatalogCursor.Live || cursor is null && liveCapable && await ModeAsync(ct) == CatalogCursor.Live;
        if (!live || !liveCapable) return await LocalAsync(filter, cursor?.Offset ?? 0, limit, ct);
        try { return await LiveAsync(filter, cursor?.Offset ?? 0, limit, ct); }
        catch (HttpRequestException ex) when (cursor is null)
        {
            // Source temporarily down: serve what SQL Server already holds, clearly marked as stale.
            logger.LogWarning("Live catalog failed, serving persisted catalog: {Error}", ex.Message);
            var local = await LocalAsync(filter, 0, limit, ct);
            if (local.Items.Count == 0) throw;
            return local with { Stale = true };
        }
    }

    public async Task<string> ModeAsync(CancellationToken ct)
    {
        var mode = options.Value.Mode.ToLowerInvariant();
        if (mode is CatalogCursor.Catalog or CatalogCursor.Live) return mode;
        return await cache.GetOrCreateAsync("catalog-mode", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            entry.Size = 1;
            return await db.SyncRuns.AnyAsync(r => r.Status == SyncStatus.Completed, ct) ? CatalogCursor.Catalog : CatalogCursor.Live;
        }) ?? CatalogCursor.Live;
    }

    private IQueryable<StationEntity> Filtered(StationFilter f, bool collapseVariants)
    {
        var q = db.Stations.AsNoTracking().Where(s => s.IsActive && s.HasHttpsStream && s.Availability != Availability.Down);
        if (collapseVariants) q = q.Where(s => s.IsPrimaryVariant);
        if (Text.Fold(f.Text) is { Length: > 0 } text) q = q.Where(s => s.SearchName.Contains(text) || s.SearchRegion.Contains(text));
        if (!string.IsNullOrEmpty(f.Country)) q = q.Where(s => s.CountryCode == f.Country);
        if (Text.NormalizeTag(f.Tag) is { Length: > 0 } tag) q = q.Where(s => s.Tags.Any(t => t.Tag == tag));
        if (!string.IsNullOrEmpty(f.Language)) q = q.Where(s => s.Languages.Any(l => l.Code == f.Language));
        if (Text.Fold(f.Region) is { Length: > 0 } region) q = q.Where(s => s.SearchRegion == region);
        if (f.Bounds is { } b)
        {
            q = q.Where(s => s.Latitude != null && s.Latitude >= b.South && s.Latitude <= b.North);
            q = b.CrossesAntimeridian ? q.Where(s => s.Longitude >= b.West || s.Longitude <= b.East)
                : q.Where(s => s.Longitude >= b.West && s.Longitude <= b.East);
        }
        if (f.Geo == GeoFilter.Present) q = q.Where(s => s.Latitude != null);
        if (f.Geo == GeoFilter.Missing) q = q.Where(s => s.Latitude == null);
        return q;
    }

    private async Task<StationPage> LocalAsync(StationFilter f, int offset, int limit, CancellationToken ct)
    {
        if (f.Order == StationOrder.Discover) return await DiscoverAsync(f, offset, limit, ct);
        var q = Filtered(f, collapseVariants: string.IsNullOrWhiteSpace(f.Text));
        if (f.Exclude.Count > 0) q = q.Where(s => !f.Exclude.Contains(s.Id));
        int? total = offset == 0 ? await q.CountAsync(ct) : null;
        var rows = await q.OrderBy(s => s.Availability == Availability.Unstable ? 1 : 0).ThenByDescending(s => s.ClickCount)
            .ThenByDescending(s => s.Votes).ThenBy(s => s.Id).Skip(offset).Take(limit + 1)
            .Include(s => s.Tags).Include(s => s.Languages).AsSplitQuery().ToListAsync(ct);
        var hasMore = rows.Count > limit;
        var items = await WithStreamsAsync(rows.Take(limit).ToList(), ct);
        return new(items, hasMore ? new CatalogCursor(CatalogCursor.Catalog, offset + items.Count).Encode() : null, hasMore,
            CatalogCursor.Catalog, total, Stale: await ModeAsync(ct) != CatalogCursor.Catalog);
    }

    /// <summary>
    /// Personalized, rotating order. A bounded candidate pool (popular, profile matches and a seeded sample of the
    /// long tail) is ranked by <see cref="Recommendations"/>; pages are slices of that cached ranking.
    /// </summary>
    private async Task<StationPage> DiscoverAsync(StationFilter f, int offset, int limit, CancellationToken ct)
    {
        var key = "discover:" + JsonSerializer.Serialize(f with { Bounds = f.Bounds });
        var pool = await cache.GetOrCreateAsync(key, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            entry.Size = 1;
            return await DiscoverPoolAsync(f, ct);
        }) ?? [];
        var slice = pool.Skip(offset).Take(limit).ToList();
        var hasMore = offset + slice.Count < pool.Count;
        var entities = await db.Stations.AsNoTracking().Include(s => s.Tags).Include(s => s.Languages).AsSplitQuery()
            .Where(s => slice.Contains(s.Id)).ToDictionaryAsync(s => s.Id, ct);
        var items = await WithStreamsAsync(slice.Where(entities.ContainsKey).Select(id => entities[id]).ToList(), ct);
        return new(items, hasMore ? new CatalogCursor(CatalogCursor.Catalog, offset + slice.Count).Encode() : null, hasMore, CatalogCursor.Catalog);
    }

    private async Task<List<Guid>> DiscoverPoolAsync(StationFilter f, CancellationToken ct)
    {
        var baseQuery = Filtered(f with { Exclude = [] }, collapseVariants: true);
        var ids = new HashSet<Guid>();
        ids.UnionWith(await baseQuery.OrderByDescending(s => s.ClickCount).ThenByDescending(s => s.Votes).Select(s => s.Id).Take(250).ToListAsync(ct));
        var tags = f.BoostTags.Select(Text.NormalizeTag).Where(t => t.Length > 0).Distinct().Take(8).ToList();
        if (tags.Count > 0)
            ids.UnionWith(await baseQuery.Where(s => s.Tags.Any(t => tags.Contains(t.Tag))).OrderByDescending(s => s.ClickCount).Select(s => s.Id).Take(250).ToListAsync(ct));
        var countries = f.BoostCountries.Take(5).ToList();
        if (countries.Count > 0)
            ids.UnionWith(await baseQuery.Where(s => countries.Contains(s.CountryCode)).OrderByDescending(s => s.ClickCount).Select(s => s.Id).Take(150).ToListAsync(ct));
        var start = (int)(Recommendations.Jitter(Guid.Empty, f.Seed) * 1_000_000);
        var tail = baseQuery.Where(s => s.Votes > 0 || s.ClickCount > 0);
        var sample = await tail.Where(s => s.SampleKey >= start).OrderBy(s => s.SampleKey).Select(s => s.Id).Take(200).ToListAsync(ct);
        if (sample.Count < 200) sample.AddRange(await tail.Where(s => s.SampleKey < start).OrderBy(s => s.SampleKey).Select(s => s.Id).Take(200 - sample.Count).ToListAsync(ct));
        ids.UnionWith(sample);
        var idList = ids.ToList();
        var candidates = await db.Stations.AsNoTracking().Include(s => s.Tags).Include(s => s.Languages).AsSplitQuery()
            .Where(s => idList.Contains(s.Id)).ToListAsync(ct);
        return Recommendations.Rank(candidates.Select(c => StationMapper.ToDto(c)), f).Take(DiscoverPoolSize).Select(s => s.Id).ToList();
    }

    private async Task<StationPage> LiveAsync(StationFilter f, int offset, int limit, CancellationToken ct)
    {
        var tag = Text.NormalizeTag(f.Tag);
        var excluded = f.Exclude.ToHashSet();
        var search = new RadioBrowserSearch(Name: string.IsNullOrWhiteSpace(f.Text) ? null : f.Text.Trim(), CountryCode: f.Country,
            Tag: tag.Length > 0 ? tag : null, Language: f.Language is null ? null : Labels.EnglishLanguage(f.Language), State: f.Region);
        var now = clock.GetUtcNow();
        var seen = new List<StationEntity>();
        var page = await FilteredPaginator.FillAsync(offset, limit,
            async (o, l, c) => await source.SearchAsync(search, o, l, c),
            row =>
            {
                if (StationMapper.ToEntity(row, now) is not { } entity) return null;
                seen.Add(entity);
                if (!entity.HasHttpsStream || excluded.Contains(entity.Id)) return null;
                // Radio Browser matches tags by substring; keep only exact normalized tags.
                if (tag.Length > 0 && entity.Tags.All(t => t.Tag != tag)) return null;
                return entity;
            },
            e => e.Id.ToString(), new PaginationBudget(MaxRequests: 4, BatchSize: Math.Clamp(limit * 2, 40, 200), MaxDuration: TimeSpan.FromSeconds(10)), ct);
        try { await store.UpsertAsync(seen, ct); }
        catch (Exception ex) when (ex is DbUpdateException or SqlException or InvalidOperationException)
        {
            logger.LogWarning("Could not persist live catalog page: {Error}", ex.Message);
        }
        var items = page.Items.Select(e => StationMapper.ToDto(e)).ToList();
        return new(items, page.HasMore ? new CatalogCursor(CatalogCursor.Live, page.NextOffset).Encode() : null, page.HasMore, CatalogCursor.Live);
    }

    private async Task<IReadOnlyList<Station>> WithStreamsAsync(List<StationEntity> items, CancellationToken ct)
    {
        var keys = items.Select(s => s.VariantKey).OfType<string>().Distinct().ToList();
        var siblings = keys.Count == 0 ? [] : await db.Stations.AsNoTracking()
            .Where(s => s.VariantKey != null && keys.Contains(s.VariantKey) && s.IsActive && s.HasHttpsStream && s.Availability != Availability.Down)
            .Select(s => new { s.Id, s.VariantKey, s.StreamUrl, s.AlternateStreamUrl, s.Availability, s.Bitrate }).ToListAsync(ct);
        var groups = siblings.GroupBy(s => s.VariantKey!).ToDictionary(g => g.Key,
            g => g.OrderBy(s => s.Availability == Availability.Ok ? 0 : 1).ThenByDescending(s => s.Bitrate).ToList());
        return items.Select(item => StationMapper.ToDto(item, item.VariantKey is not null && groups.TryGetValue(item.VariantKey, out var group)
            ? group.Where(s => s.Id != item.Id).SelectMany(s => new[] { s.StreamUrl, s.AlternateStreamUrl }).OfType<string>().ToList()
            : null)).ToList();
    }

    private sealed class CellRow
    {
        public int Count { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string StationId { get; set; } = "";
        public string Name { get; set; } = "";
        public int Total { get; set; }
    }

    public async Task<MapArea> MapAsync(BoundingBox b, double zoom, StationFilter f, CancellationToken ct)
    {
        // Grid cells of ~76 px at the current zoom (512 px tiles); counts are exact for the visible area.
        var cell = 360.0 * 76 / (512 * Math.Pow(2, Math.Clamp(zoom, 0, 20)));
        var parameters = new List<SqlParameter>
        {
            new("@cell", cell), new("@south", b.South), new("@north", b.North), new("@west", b.West), new("@east", b.East), new("@maxCells", 1200)
        };
        var where = new List<string>
        {
            "s.IsActive = 1", "s.HasHttpsStream = 1", "s.Availability <> 'down'", "s.IsPrimaryVariant = 1",
            "s.Latitude IS NOT NULL", "s.Latitude BETWEEN @south AND @north",
            b.CrossesAntimeridian ? "(s.Longitude >= @west OR s.Longitude <= @east)" : "s.Longitude BETWEEN @west AND @east"
        };
        if (!string.IsNullOrEmpty(f.Country)) { where.Add("s.CountryCode = @country"); parameters.Add(new("@country", f.Country)); }
        if (Text.NormalizeTag(f.Tag) is { Length: > 0 } tag) { where.Add("EXISTS (SELECT 1 FROM StationTags t WHERE t.StationId = s.Id AND t.Tag = @tag)"); parameters.Add(new("@tag", tag)); }
        if (!string.IsNullOrEmpty(f.Language)) { where.Add("EXISTS (SELECT 1 FROM StationLanguages l WHERE l.StationId = s.Id AND l.Code = @language)"); parameters.Add(new("@language", f.Language)); }
        if (Text.Fold(f.Region) is { Length: > 0 } region) { where.Add("s.SearchRegion = @region"); parameters.Add(new("@region", region)); }
        if (Text.Fold(f.Text) is { Length: > 0 } text)
        {
            where.Add("(s.SearchName LIKE @text ESCAPE '\\' OR s.SearchRegion LIKE @text ESCAPE '\\')");
            parameters.Add(new("@text", "%" + text.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_").Replace("[", "\\[") + "%"));
        }
        var sql = $"""
            SELECT TOP (@maxCells) COUNT(*) AS [Count], AVG(s.Latitude) AS Latitude, AVG(s.Longitude) AS Longitude,
              MIN(CONVERT(char(36), s.Id)) AS StationId, MIN(s.Name) AS Name, CAST(SUM(COUNT(*)) OVER () AS int) AS Total
            FROM Stations s WHERE {string.Join(" AND ", where)}
            GROUP BY FLOOR(s.Latitude / @cell), FLOOR(s.Longitude / @cell)
            ORDER BY COUNT(*) DESC
            """;
        var rows = await db.Database.SqlQueryRaw<CellRow>(sql, parameters.ToArray<object>()).ToListAsync(ct);
        var cells = rows.Select(r => new MapCell(r.Latitude, r.Longitude, r.Count,
            r.Count == 1 && Guid.TryParse(r.StationId, out var id) ? id : null, r.Count == 1 ? r.Name : null)).ToList();
        return new(cells, rows.FirstOrDefault()?.Total ?? 0, await ModeAsync(ct) != CatalogCursor.Catalog);
    }

    private const string Playable = "IsActive = 1 AND HasHttpsStream = 1 AND Availability <> 'down' AND IsPrimaryVariant = 1";

    private sealed class CountryRow
    {
        public string Code { get; set; } = "";
        public int Count { get; set; }
        public double? West { get; set; }
        public double? South { get; set; }
        public double? East { get; set; }
        public double? North { get; set; }
    }

    public Task<IReadOnlyList<CountryFacet>> CountriesAsync(CancellationToken ct) => Cached("facet-countries", async () =>
    {
        var rows = await db.Database.SqlQueryRaw<CountryRow>($"""
            SELECT c.CountryCode AS Code, c.[Count], b.West, b.South, b.East, b.North
            FROM (SELECT CountryCode, COUNT(*) AS [Count] FROM Stations WHERE {Playable} AND CountryCode <> '' GROUP BY CountryCode) c
            LEFT JOIN (SELECT DISTINCT CountryCode,
                PERCENTILE_CONT(0.03) WITHIN GROUP (ORDER BY Longitude) OVER (PARTITION BY CountryCode) AS West,
                PERCENTILE_CONT(0.03) WITHIN GROUP (ORDER BY Latitude) OVER (PARTITION BY CountryCode) AS South,
                PERCENTILE_CONT(0.97) WITHIN GROUP (ORDER BY Longitude) OVER (PARTITION BY CountryCode) AS East,
                PERCENTILE_CONT(0.97) WITHIN GROUP (ORDER BY Latitude) OVER (PARTITION BY CountryCode) AS North
              FROM Stations WHERE {Playable} AND CountryCode <> '' AND Latitude IS NOT NULL) b ON b.CountryCode = c.CountryCode
            """).ToListAsync(ct);
        var spanish = CultureInfo.GetCultureInfo("es").CompareInfo;
        return (IReadOnlyList<CountryFacet>)rows.Select(r => new CountryFacet(r.Code, Labels.Country(r.Code), r.Count,
                r.West is null ? null : [r.West.Value, r.South!.Value, r.East!.Value, r.North!.Value]))
            .OrderBy(c => c.Name, Comparer<string>.Create((a, b) => spanish.Compare(a, b, CompareOptions.IgnoreCase))).ToList();
    });

    private sealed class PlaceRow
    {
        public string Name { get; set; } = "";
        public int Count { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }

    public Task<IReadOnlyList<PlaceFacet>> PlacesAsync(string country, CancellationToken ct) => Cached("facet-places:" + country, async () =>
    {
        var rows = await db.Database.SqlQueryRaw<PlaceRow>($"""
            SELECT TOP 300 MIN(Region) AS Name, COUNT(*) AS [Count], AVG(Latitude) AS Latitude, AVG(Longitude) AS Longitude
            FROM Stations WHERE {Playable} AND CountryCode = @country AND SearchRegion <> ''
            GROUP BY SearchRegion ORDER BY COUNT(*) DESC
            """, new SqlParameter("@country", country)).ToListAsync(ct);
        return (IReadOnlyList<PlaceFacet>)rows.Select(r => new PlaceFacet(r.Name, r.Count, r.Latitude, r.Longitude)).ToList();
    });

    public Task<IReadOnlyList<LabeledFacet>> LanguagesAsync(CancellationToken ct) => Cached("facet-languages", async () =>
    {
        var rows = await db.StationLanguages.Where(l => db.Stations.Any(s => s.Id == l.StationId && s.IsActive && s.HasHttpsStream && s.Availability != Availability.Down && s.IsPrimaryVariant))
            .GroupBy(l => l.Code).Select(g => new { g.Key, Count = g.Count() }).Where(g => g.Count >= 3)
            .OrderByDescending(g => g.Count).Take(200).ToListAsync(ct);
        return (IReadOnlyList<LabeledFacet>)rows.Select(r => new LabeledFacet(r.Key, Labels.Language(r.Key), r.Count)).ToList();
    });

    public Task<IReadOnlyList<LabeledFacet>> TagsAsync(CancellationToken ct) => Cached("facet-tags", async () =>
    {
        var rows = await db.StationTags.Where(t => db.Stations.Any(s => s.Id == t.StationId && s.IsActive && s.HasHttpsStream && s.Availability != Availability.Down && s.IsPrimaryVariant))
            .GroupBy(t => t.Tag).Select(g => new { g.Key, Count = g.Count() }).Where(g => g.Count >= 10)
            .OrderByDescending(g => g.Count).Take(200).ToListAsync(ct);
        return (IReadOnlyList<LabeledFacet>)rows.Select(r => new LabeledFacet(r.Key, Labels.Tag(r.Key), r.Count)).ToList();
    });

    private async Task<T> Cached<T>(string key, Func<Task<T>> load) where T : class =>
        (await cache.GetOrCreateAsync(key, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
            entry.Size = 1;
            return await load();
        }))!;

    public async Task<IReadOnlyList<Station>> LookupAsync(IReadOnlyList<Guid> ids, CancellationToken ct)
    {
        var rows = await db.Stations.AsNoTracking().Include(s => s.Tags).Include(s => s.Languages).AsSplitQuery()
            .Where(s => ids.Contains(s.Id) && s.HasHttpsStream).ToListAsync(ct);
        return await WithStreamsAsync(rows, ct);
    }

    public async Task<CatalogStatus> StatusAsync(CancellationToken ct)
    {
        var total = await db.Stations.CountAsync(s => s.IsActive, ct);
        var playable = await db.Stations.CountAsync(s => s.IsActive && s.HasHttpsStream && s.Availability != Availability.Down && s.IsPrimaryVariant, ct);
        var completed = await db.SyncRuns.Where(r => r.Status == SyncStatus.Completed).MaxAsync(r => (DateTimeOffset?)r.CompletedAt, ct);
        var running = await db.SyncRuns.Where(r => r.Status == SyncStatus.Running).OrderByDescending(r => r.Id).FirstOrDefaultAsync(ct);
        return new(await ModeAsync(ct), total, playable, completed, running?.Status, running?.NextOffset, Attribution);
    }
}
