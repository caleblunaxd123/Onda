using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Onda.Application;
using Onda.Domain;
using Onda.Infrastructure;
namespace Onda.Tests;

/// <summary>
/// Integration tests against a real SQL Server. Each test creates and drops its own database.
/// Uses ONDA_TEST_SQL (server-level connection string) or SQL Server Express (.\SQLEXPRESS) on Windows; skipped when neither is reachable.
/// </summary>
public sealed class SqlCatalogTests : IAsyncLifetime
{
    private static readonly string? Server = Environment.GetEnvironmentVariable("ONDA_TEST_SQL")
        ?? (OperatingSystem.IsWindows() ? @"Server=.\SQLEXPRESS;Integrated Security=true;TrustServerCertificate=true" : null);
    private readonly string database = "OndaTest_" + Guid.NewGuid().ToString("N")[..12];
    private bool available;
    private string unavailableReason = "define ONDA_TEST_SQL para ejecutar estas pruebas";
    private string ConnectionString => new SqlConnectionStringBuilder(Server) { InitialCatalog = database }.ConnectionString;

    public async Task InitializeAsync()
    {
        if (Server is null) return;
        try
        {
            await using var connection = new SqlConnection(new SqlConnectionStringBuilder(Server) { ConnectTimeout = 15 }.ConnectionString);
            await connection.OpenAsync();
            available = true;
        }
        catch (SqlException ex) { unavailableReason = ex.Message; }
    }

    public async Task DisposeAsync()
    {
        if (!available) return;
        SqlConnection.ClearAllPools();
        await using var connection = new SqlConnection(Server);
        await connection.OpenAsync();
        await using var command = new SqlCommand($"IF DB_ID('{database}') IS NOT NULL BEGIN ALTER DATABASE [{database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{database}]; END", connection);
        await command.ExecuteNonQueryAsync();
    }

    private OndaDbContext Db() => new(new DbContextOptionsBuilder<OndaDbContext>().UseSqlServer(ConnectionString).Options);

    private async Task<OndaDbContext> MigratedAsync()
    {
        Skip.IfNot(available, "SQL Server no disponible: " + unavailableReason);
        var db = Db();
        await db.Database.MigrateAsync();
        return db;
    }

    private sealed class FakeSource(List<RadioStation> rows) : IRadioBrowserClient
    {
        public int FailAtOffset { get; set; } = -1;
        public List<int> Offsets { get; } = [];
        public List<RadioStation> Rows { get; set; } = rows;
        public Task<IReadOnlyList<RadioStation>> SearchAsync(RadioBrowserSearch search, int offset, int limit, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<RadioStation>>(Rows.Where(r => search.CountryCode is null || r.CountryCode == search.CountryCode).Skip(offset).Take(limit).ToList());
        public Task<IReadOnlyList<RadioStation>> ListAsync(int offset, int limit, CancellationToken ct)
        {
            Offsets.Add(offset);
            if (offset == FailAtOffset) { FailAtOffset = -1; throw new HttpRequestException("temporary outage"); }
            return Task.FromResult<IReadOnlyList<RadioStation>>(Rows.Skip(offset).Take(limit).ToList());
        }
    }

    private static RadioStation Row(int i, string country = "PE", double? lat = null, double? lon = null, string? stream = null,
        string? homepage = null, string tags = "pop", int votes = 1, int checkOk = 1, DateTimeOffset? checkedAt = null, string? name = null) =>
        CatalogTests.Row(stream ?? $"https://stream.example/{i}", lat, lon, $"00000000-0000-4000-8000-{i:D12}",
            name ?? $"Radio {i}", country, homepage, tags, checkOk: checkOk, checkedAt: checkedAt) with { Votes = votes, ClickCount = votes };

    private sealed class Services(OndaDbContext db, IRadioBrowserClient source, string mode = "catalog", int pageSize = 10)
    {
        public readonly MemoryCache Cache = new(new MemoryCacheOptions { SizeLimit = 1000 });
        public readonly IOptions<CatalogOptions> Options = Microsoft.Extensions.Options.Options.Create(new CatalogOptions { Mode = mode, SyncPageSize = pageSize, SyncPageDelayMs = 0 });
        public CatalogStore Store => new(db, TimeProvider.System, NullLogger<CatalogStore>.Instance);
        public CatalogQueryService Queries => new(db, source, Store, Cache, Options, TimeProvider.System, NullLogger<CatalogQueryService>.Instance);
        public CatalogSynchronizer Sync => new(db, Store, source, Options, TimeProvider.System, Cache, NullLogger<CatalogSynchronizer>.Instance);
    }

    [SkippableFact] public async Task SyncResumesAfterAnInterruptionAndCompletes()
    {
        await using var db = await MigratedAsync();
        var source = new FakeSource(Enumerable.Range(0, 25).Select(i => Row(i)).ToList()) { FailAtOffset = 10 };
        var services = new Services(db, source);
        var first = await services.Sync.RunOnceAsync(CancellationToken.None);
        Assert.Equal(SyncStatus.Running, first!.Status);
        Assert.Equal(10, first.NextOffset);
        Assert.NotNull(first.LastError);
        var second = await services.Sync.RunOnceAsync(CancellationToken.None);
        Assert.Equal(first.Id, second!.Id);
        Assert.Equal(SyncStatus.Completed, second.Status);
        Assert.Equal([0, 10, 10, 20], source.Offsets);
        await using var check = Db();
        Assert.Equal(25, await check.Stations.CountAsync());
        Assert.Equal(25, await check.StationTags.CountAsync(t => t.Tag == "pop"));
    }

    [SkippableFact] public async Task TagKeysUseTheSameUniquenessAsTheNormalizer()
    {
        await using var db = await MigratedAsync();
        // "straße"/"strasse" are equal under SQL Server's default case-insensitive collation but different in C#.
        var source = new FakeSource([Row(1, tags: "straße, strasse, islam🕋, islam")]);
        var run = await new Services(db, source).Sync.RunOnceAsync(CancellationToken.None);
        Assert.Equal(SyncStatus.Completed, run!.Status);
        await using var check = Db();
        Assert.Equal(["islam", "strasse", "straße"], (await check.StationTags.Select(t => t.Tag).ToListAsync()).Order(StringComparer.Ordinal));
    }

    [SkippableFact] public async Task FullSyncRetiresMissingStationsWithoutDeletingThem()
    {
        await using var db = await MigratedAsync();
        var source = new FakeSource(Enumerable.Range(0, 12).Select(i => Row(i)).ToList());
        var services = new Services(db, source);
        await services.Sync.RunOnceAsync(CancellationToken.None);
        await Task.Delay(20);
        source.Rows = source.Rows.Skip(1).ToList();
        await new Services(Db(), source).Sync.RunOnceAsync(CancellationToken.None);
        await using var check = Db();
        Assert.Equal(12, await check.Stations.CountAsync());
        Assert.Equal(11, await check.Stations.CountAsync(s => s.IsActive));
    }

    [SkippableFact] public async Task LocalPagesAreExactContiguousAndCounted()
    {
        await using var db = await MigratedAsync();
        var services = new Services(db, new FakeSource([]));
        await services.Store.UpsertAsync(Enumerable.Range(0, 23).Select(i => StationMapper.ToEntity(Row(i, votes: 100 - i), DateTimeOffset.UtcNow)!).ToList(), CancellationToken.None);
        // Non-HTTPS rows are stored but never listed.
        await services.Store.UpsertAsync([StationMapper.ToEntity(Row(99, stream: "http://insecure.example/x"), DateTimeOffset.UtcNow)!], CancellationToken.None);
        var seen = new List<Guid>();
        CatalogCursor? cursor = null;
        StationPage page;
        var first = true;
        do
        {
            page = await new Services(Db(), new FakeSource([])).Queries.SearchAsync(new StationFilter { Country = "PE" }, cursor, 10, CancellationToken.None);
            if (first) Assert.Equal(23, page.Total);
            first = false;
            seen.AddRange(page.Items.Select(s => s.Id));
            CatalogCursor.TryDecode(page.NextCursor, out cursor);
        } while (page.HasMore);
        Assert.Equal(23, seen.Count);
        Assert.Equal(23, seen.Distinct().Count());
    }

    [SkippableFact] public async Task VariantsCollapseIntoOneStationWithAlternativeStreams()
    {
        await using var db = await MigratedAsync();
        var services = new Services(db, new FakeSource([]));
        var now = DateTimeOffset.UtcNow;
        await services.Store.UpsertAsync([
            StationMapper.ToEntity(Row(1, homepage: "https://radiouno.pe", name: "Radio Uno 128k", votes: 50), now)!,
            StationMapper.ToEntity(Row(2, homepage: "https://www.radiouno.pe/", name: "Radio Uno AAC", votes: 10), now)!,
            StationMapper.ToEntity(Row(3, homepage: "https://otra.pe", name: "Radio Uno", votes: 5), now)!,
        ], CancellationToken.None);
        var page = await new Services(Db(), new FakeSource([])).Queries.SearchAsync(new StationFilter(), null, 10, CancellationToken.None);
        Assert.Equal(2, page.Items.Count);
        var primary = page.Items.Single(s => s.Name == "Radio Uno 128k");
        Assert.Equal(["https://stream.example/1", "https://stream.example/2"], primary.Streams!);
    }

    [SkippableFact] public async Task ViewportQueriesUseBoundsClustersAndKeepStationsWithoutCoordinates()
    {
        await using var db = await MigratedAsync();
        var services = new Services(db, new FakeSource([]));
        var now = DateTimeOffset.UtcNow;
        await services.Store.UpsertAsync([
            StationMapper.ToEntity(Row(1, lat: -12.05, lon: -77.04), now)!, StationMapper.ToEntity(Row(2, lat: -12.06, lon: -77.03), now)!,
            StationMapper.ToEntity(Row(3, lat: -16.4, lon: -71.5), now)!, StationMapper.ToEntity(Row(4, country: "FJ", lat: -17.7, lon: 178.4), now)!,
            StationMapper.ToEntity(Row(5), now)!,
        ], CancellationToken.None);
        BoundingBox.TryParse("-80,-20,-70,0", out var peru);
        var queries = new Services(Db(), new FakeSource([])).Queries;
        var inside = await queries.SearchAsync(new StationFilter { Bounds = peru }, null, 10, CancellationToken.None);
        Assert.Equal(3, inside.Total);
        var map = await queries.MapAsync(peru!, 3, new StationFilter(), CancellationToken.None);
        Assert.Equal(3, map.Total);
        Assert.Equal(3, map.Cells.Sum(c => c.Count));
        Assert.Contains(map.Cells, c => c.Count == 2 && c.StationId is null);
        Assert.Contains(map.Cells, c => c.Count == 1 && c.StationId is not null);
        BoundingBox.TryParse("170,-30,-170,0", out var pacific);
        Assert.Equal(1, (await queries.SearchAsync(new StationFilter { Bounds = pacific }, null, 10, CancellationToken.None)).Total);
        var missing = await queries.SearchAsync(new StationFilter { Geo = GeoFilter.Missing }, null, 10, CancellationToken.None);
        Assert.Equal("Radio 5", Assert.Single(missing.Items).Name);
        var countries = await queries.CountriesAsync(CancellationToken.None);
        var pe = countries.Single(c => c.Code == "PE");
        Assert.Equal(("Perú", 4), (pe.Name, pe.Count));
        Assert.NotNull(pe.Bounds);
    }

    [SkippableFact] public async Task StationsAreHiddenOnlyAfterRepeatedDistinctFailedChecks()
    {
        await using var db = await MigratedAsync();
        var start = DateTimeOffset.UtcNow;
        async Task<int> Listed()
        {
            await using var ctx = Db();
            return (await new Services(ctx, new FakeSource([])).Queries.SearchAsync(new StationFilter(), null, 10, CancellationToken.None)).Items.Count;
        }
        for (var check = 0; check < 3; check++)
        {
            await using var ctx = Db();
            await new Services(ctx, new FakeSource([])).Store.UpsertAsync([StationMapper.ToEntity(Row(1, checkOk: 0, checkedAt: start.AddHours(check)), start)!], CancellationToken.None);
            // Re-observing the same check result does not count as a new failure.
            await new Services(ctx, new FakeSource([])).Store.UpsertAsync([StationMapper.ToEntity(Row(1, checkOk: 0, checkedAt: start.AddHours(check)), start)!], CancellationToken.None);
            Assert.Equal(check < 2 ? 1 : 0, await Listed());
        }
    }

    [SkippableFact] public async Task LivePagesPersistResultsAndFallBackToSqlWhenTheSourceFails()
    {
        await using var db = await MigratedAsync();
        var rows = Enumerable.Range(0, 30).Select(i => Row(i, stream: i % 3 == 0 ? $"https://s/{i}" : $"http://s/{i}")).ToList();
        var live = new Services(db, new FakeSource(rows), mode: "live");
        var page = await live.Queries.SearchAsync(new StationFilter(), null, 4, CancellationToken.None);
        Assert.Equal(4, page.Items.Count);
        Assert.Equal("live", page.Source);
        Assert.True(CatalogCursor.TryDecode(page.NextCursor, out var cursor));
        Assert.Equal(10, cursor!.Offset); // records 0..9 consumed, 0,3,6,9 kept
        await using var check = Db();
        Assert.True(await check.Stations.CountAsync() >= 10);
        var failing = new Services(Db(), new ThrowingSource(), mode: "live");
        var fallback = await failing.Queries.SearchAsync(new StationFilter(), null, 10, CancellationToken.None);
        Assert.True(fallback.Stale);
        Assert.NotEmpty(fallback.Items);
    }

    private sealed class ThrowingSource : IRadioBrowserClient
    {
        public Task<IReadOnlyList<RadioStation>> SearchAsync(RadioBrowserSearch search, int offset, int limit, CancellationToken ct) => throw new HttpRequestException("down");
        public Task<IReadOnlyList<RadioStation>> ListAsync(int offset, int limit, CancellationToken ct) => throw new HttpRequestException("down");
    }

    [SkippableFact] public async Task MigrationPreservesTheLegacyJsonCatalog()
    {
        Skip.IfNot(available, "SQL Server no disponible: " + unavailableReason);
        await using var db = Db();
        await db.GetService<IMigrator>().MigrateAsync("20261012210420_InitialSqlServerCatalog");
        var id = Guid.NewGuid();
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO Stations (Id, Payload, UpdatedAt) VALUES ({id},
            {"{\"Id\":\"" + id + "\",\"Name\":\"Radio Legado\",\"Country\":\"Peru\",\"CountryCode\":\"PE\",\"Language\":\"spanish\",\"Tags\":[\"salsa\",\"Latin\"],\"StreamUrl\":\"https://legacy.example/live\",\"ArtworkUrl\":null,\"Codec\":\"MP3\",\"Bitrate\":128,\"Votes\":7,\"Latitude\":-12.1,\"Longitude\":-77.0}"},
            {DateTimeOffset.UtcNow})
            """);
        await db.Database.MigrateAsync();
        await using var check = Db();
        var station = await check.Stations.Include(s => s.Tags).SingleAsync(s => s.Id == id);
        Assert.Equal(("Radio Legado", "PE", "https://legacy.example/live", 7, -12.1), (station.Name, station.CountryCode, station.StreamUrl, station.Votes, station.Latitude!.Value));
        Assert.True(station.HasHttpsStream && station.IsActive);
        Assert.Equal(["latin", "salsa"], station.Tags.Select(t => t.Tag).Order());
    }

    [SkippableFact] public async Task SearchMatchesAllWordsAcrossNameRegionCountryAndGenres()
    {
        await using var db = await MigratedAsync();
        var services = new Services(db, new FakeSource([]));
        var fixtures = new[] {
            Row(1, name: "Radio Oxígeno", tags: "rock", votes: 5) with { State = "Lima" },
            Row(2, name: "Radio Andina", tags: "news", votes: 10) with { State = "Arequipa" },
            Row(3, name: "Radio Rock", country: "ES", tags: "rock", votes: 100) with { State = "Madrid" },
        };
        await services.Store.UpsertAsync(fixtures.Select(row => StationMapper.ToEntity(row, DateTimeOffset.UtcNow)!).ToList(), CancellationToken.None);
        foreach (var text in new[] { "oxigeno peru", "LIMA radio", "rock español Perú" })
        {
            var page = await services.Queries.SearchAsync(new StationFilter { Text = text }, null, 10, CancellationToken.None);
            Assert.Equal("Radio Oxígeno", Assert.Single(page.Items).Name);
            Assert.Equal(1, page.Total);
        }
        var news = await services.Queries.SearchAsync(new StationFilter { Text = "noticias Arequipa" }, null, 10, CancellationToken.None);
        Assert.Equal("Radio Andina", Assert.Single(news.Items).Name);
        Assert.Empty((await services.Queries.SearchAsync(new StationFilter { Text = "***" }, null, 10, CancellationToken.None)).Items);
    }

    [SkippableFact] public async Task SearchRanksExactNamesBeforePopularityAndPagesConsistently()
    {
        await using var db = await MigratedAsync();
        var services = new Services(db, new FakeSource([]));
        await services.Store.UpsertAsync(new[] {
            Row(1, name: "LOS 40", votes: 1), Row(2, name: "LOS 40 Classic", votes: 100),
            Row(3, name: "Otra LOS 40", votes: 300),
        }.Select(row => StationMapper.ToEntity(row, DateTimeOffset.UtcNow)!).ToList(), CancellationToken.None);
        var first = await services.Queries.SearchAsync(new StationFilter { Text = "los40" }, null, 1, CancellationToken.None);
        Assert.Equal("LOS 40", Assert.Single(first.Items).Name);
        Assert.Equal(3, first.Total);
        Assert.True(CatalogCursor.TryDecode(first.NextCursor, out var cursor));
        var remaining = await services.Queries.SearchAsync(new StationFilter { Text = "los40" }, cursor, 10, CancellationToken.None);
        Assert.Equal(2, remaining.Items.Count);
        Assert.DoesNotContain(remaining.Items, item => item.Id == first.Items[0].Id);
        Assert.False(remaining.HasMore);
    }

    [SkippableFact] public async Task ReportsArePersistedOnlyForKnownStations()
    {
        await using var db = await MigratedAsync();
        await new Services(db, new FakeSource([])).Store.UpsertAsync([StationMapper.ToEntity(Row(1), DateTimeOffset.UtcNow)!], CancellationToken.None);
        await using var ctx = Db();
        var reports = new StationReportService(ctx, TimeProvider.System);
        var stationId = Guid.Parse(Row(1).Id!);
        Assert.Null(await reports.CreateAsync(Guid.NewGuid(), new("no_audio", null, null, null, null), CancellationToken.None));
        Assert.NotNull(await reports.CreateAsync(stationId, new("cuts", "Se corta cada minuto", null, "0.2.0", "android"), CancellationToken.None));
        await using var check = Db();
        Assert.Equal("cuts", (await check.StationReports.SingleAsync()).Kind);
    }
}

