using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Onda.Application;
using Onda.Domain;
namespace Onda.Tests;

public class ApiTests
{
    private static readonly Station Fixture = new(Guid.Parse("d55990c0-ecee-4e52-a70e-cba0c10d11d8"), "Test fixture", "Perú", "PE", "Español", ["salsa"],
        "https://example.com/test", null, "MP3", 128, 1, null, null);

    private sealed class FakeCatalog(bool fail) : ICatalogQueries
    {
        public StationFilter? LastFilter { get; private set; }
        public CatalogCursor? LastCursor { get; private set; }
        public Task<StationPage> SearchAsync(StationFilter filter, CatalogCursor? cursor, int limit, CancellationToken ct)
        {
            if (fail) throw new HttpRequestException("upstream unavailable");
            (LastFilter, LastCursor) = (filter, cursor);
            return Task.FromResult(new StationPage([Fixture], new CatalogCursor(CatalogCursor.Catalog, (cursor?.Offset ?? 0) + 1).Encode(), true, "catalog", 42));
        }
        public Task<MapArea> MapAsync(BoundingBox bounds, double zoom, StationFilter filter, CancellationToken ct) =>
            Task.FromResult(new MapArea([new MapCell(-12, -77, 3, null, null)], 3, false));
        public Task<IReadOnlyList<CountryFacet>> CountriesAsync(CancellationToken ct) => Task.FromResult<IReadOnlyList<CountryFacet>>([new("PE", "Perú", 10, null)]);
        public Task<IReadOnlyList<PlaceFacet>> PlacesAsync(string country, CancellationToken ct) => Task.FromResult<IReadOnlyList<PlaceFacet>>([]);
        public Task<IReadOnlyList<LabeledFacet>> LanguagesAsync(CancellationToken ct) => Task.FromResult<IReadOnlyList<LabeledFacet>>([]);
        public Task<IReadOnlyList<LabeledFacet>> TagsAsync(CancellationToken ct) => Task.FromResult<IReadOnlyList<LabeledFacet>>([]);
        public Task<IReadOnlyList<Station>> LookupAsync(IReadOnlyList<Guid> ids, CancellationToken ct) => Task.FromResult<IReadOnlyList<Station>>([Fixture]);
        public Task<CatalogStatus> StatusAsync(CancellationToken ct) => Task.FromResult(new CatalogStatus("catalog", 1, 1, null, null, null, "Radio Browser"));
    }

    private sealed class FakeMetadata : INowPlaying
    {
        public Task<NowPlaying?> GetAsync(Guid id, int source, CancellationToken ct) => Task.FromResult<NowPlaying?>(id == Fixture.Id ? new(id,source,"available","Artist - Song",DateTimeOffset.UtcNow) : null);
    }
    private sealed class FakeReports : IStationReports
    {
        public List<(Guid, ReportInput)> Saved { get; } = [];
        public Task<long?> CreateAsync(Guid stationId, ReportInput input, CancellationToken ct)
        {
            if (stationId != Fixture.Id) return Task.FromResult<long?>(null);
            Saved.Add((stationId, input));
            return Task.FromResult<long?>(Saved.Count);
        }
    }

    private static WebApplicationFactory<Program> Factory(FakeCatalog? catalog = null, FakeReports? reports = null) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Onda"] = "Server=unused;Database=unused;Integrated Security=true", ["Catalog:SyncEnabled"] = "false"
            }));
            builder.ConfigureServices(s =>
            {
                s.AddScoped<ICatalogQueries>(_ => catalog ?? new FakeCatalog(false));
                s.AddScoped<IStationReports>(_ => reports ?? new FakeReports());
                s.AddScoped<INowPlaying>(_ => new FakeMetadata());
            });
        });

    [Theory] [InlineData("0")] [InlineData("6")] [InlineData("not-a-number")]
    public async Task MetadataRejectsInvalidSource(string source)
    {
        await using var app=Factory();using var client=app.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest,(await client.GetAsync($"/api/v1/stations/{Fixture.Id}/now-playing?source={source}")).StatusCode);
    }
    [Fact] public async Task MetadataReturnsStationIdentityAndNeverCachesAtTheHttpLayer()
    {
        await using var app=Factory();using var client=app.CreateClient();
        var response=await client.GetAsync($"/api/v1/stations/{Fixture.Id}/now-playing?source=1");
        var result=await response.Content.ReadFromJsonAsync<NowPlaying>();Assert.Equal("Artist - Song",result!.Title);Assert.Equal(Fixture.Id,result.StationId);
        Assert.True(response.Headers.CacheControl?.NoStore);
        Assert.Equal(HttpStatusCode.NotFound,(await client.GetAsync($"/api/v1/stations/{Guid.NewGuid()}/now-playing")).StatusCode);
    }

    [Theory]
    [InlineData("limit=0")] [InlineData("limit=101")] [InlineData("offset=-1")] [InlineData("country=PER")] [InlineData("country=12")]
    [InlineData("cursor=bogus")] [InlineData("bbox=1,2,3")] [InlineData("geo=somewhere")] [InlineData("order=loudest")]
    [InlineData("exclude=not-a-guid")] [InlineData("boostCountries=PER")]
    public async Task InvalidFiltersReturnProblemDetails(string query)
    {
        await using var app = Factory(); using var client = app.CreateClient();
        var response = await client.GetAsync("/api/v1/stations?" + query);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact] public async Task SearchReturnsCursorEnvelopeWithRealTotal()
    {
        var catalog = new FakeCatalog(false);
        await using var app = Factory(catalog); using var client = app.CreateClient();
        var result = await client.GetFromJsonAsync<Envelope>("/api/v1/stations?q=test&country=pe&tag=salsa&language=es&region=Lima");
        Assert.Single(result!.Items);
        Assert.True(result.HasMore);
        Assert.Equal(42, result.Total);
        Assert.Equal(30, result.Limit);
        Assert.Equal("PE", catalog.LastFilter!.Country);
        var next = await client.GetFromJsonAsync<Envelope>("/api/v1/stations?q=test&country=pe&cursor=" + result.NextCursor);
        Assert.Equal(1, catalog.LastCursor!.Offset);
        Assert.NotNull(next);
    }

    [Fact] public async Task UpstreamFailureReturns503()
    {
        await using var app = Factory(new FakeCatalog(true)); using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/api/v1/stations")).StatusCode);
    }

    [Fact] public async Task MapRequiresViewportAndZoom()
    {
        await using var app = Factory(); using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/v1/map?zoom=3")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/v1/map?bbox=-80,-20,-60,0")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/map?bbox=-80,-20,-60,0&zoom=4.5")).StatusCode);
    }

    [Fact] public async Task ReportsAreValidatedAndPersisted()
    {
        var reports = new FakeReports();
        await using var app = Factory(reports: reports); using var client = app.CreateClient();
        var bad = await client.PostAsJsonAsync($"/api/v1/stations/{Fixture.Id}/reports", new { kind = "spam" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        var missing = await client.PostAsJsonAsync($"/api/v1/stations/{Guid.NewGuid()}/reports", new { kind = "no_audio" });
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        var ok = await client.PostAsJsonAsync($"/api/v1/stations/{Fixture.Id}/reports", new { kind = "no_audio", message = "Silencio", appVersion = "0.2.0", platform = "android" });
        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
        Assert.Equal("no_audio", Assert.Single(reports.Saved).Item2.Kind);
    }

    [Fact] public async Task LookupValidatesIds()
    {
        await using var app = Factory(); using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/v1/stations/lookup?ids=x")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/v1/stations/lookup?ids={Fixture.Id}")).StatusCode);
    }

    private sealed record Envelope(Station[] Items, string? NextCursor, bool HasMore, string Source, int? Total, int Limit);

    [Theory]
    [InlineData("http://localhost:8081", true)]
    [InlineData("https://untrusted.example", false)]
    public async Task CorsOnlyAllowsLocalPreview(string origin, bool allowed)
    {
        await using var app = Factory(); using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add("Origin", origin);
        var response = await client.GetAsync("/health/live");
        Assert.Equal(allowed, response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
