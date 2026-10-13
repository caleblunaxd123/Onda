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
    private sealed class FakeCatalog(bool fail = false) : IStationCatalog
    {
        public Task<IReadOnlyList<Station>> SearchAsync(StationQuery query, CancellationToken ct) {
            if (fail) throw new HttpRequestException("upstream unavailable");
            return Task.FromResult<IReadOnlyList<Station>>([new(Guid.Parse("d55990c0-ecee-4e52-a70e-cba0c10d11d8"), "Test fixture", "Peru", "PE", "spanish", ["salsa"], "https://example.com/test", null, "MP3", 128, 1, null, null)]);
        }
    }
    private static WebApplicationFactory<Program> Factory(bool fail = false) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder => {
            builder.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(new Dictionary<string, string?> {["ConnectionStrings:Onda"]="Server=unused;Database=unused;Integrated Security=true"}));
            builder.ConfigureServices(s => s.AddScoped<IStationCatalog>(_ => new FakeCatalog(fail)));
        });
    [Theory]
    [InlineData("limit=0")] [InlineData("limit=101")] [InlineData("offset=-1")] [InlineData("country=PER")] [InlineData("country=12")]
    public async Task InvalidFiltersReturnProblemDetails(string query) {
        await using var app = Factory(); using var client = app.CreateClient();
        var response = await client.GetAsync("/api/v1/stations?" + query);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
    [Fact] public async Task SearchReturnsVersionedEnvelope() {
        await using var app = Factory(); using var client = app.CreateClient();
        var result = await client.GetFromJsonAsync<Envelope>("/api/v1/stations?q=test&country=pe");
        Assert.Single(result!.Items); Assert.Equal(30, result.Limit);
    }
    [Fact] public async Task UpstreamFailureReturns503() {
        await using var app = Factory(true); using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/api/v1/stations")).StatusCode);
    }
    private sealed record Envelope(Station[] Items, int Offset, int Limit);
    [Theory]
    [InlineData("http://localhost:8081", true)]
    [InlineData("https://untrusted.example", false)]
    public async Task CorsOnlyAllowsLocalPreview(string origin, bool allowed) {
        await using var app = Factory(); using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add("Origin", origin);
        var response = await client.GetAsync("/health/live");
        Assert.Equal(allowed, response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
