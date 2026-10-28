using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
namespace Onda.Tests;

public sealed class ProductionHostingTests : IDisposable
{
    private readonly string assets = Path.Combine(Path.GetTempPath(), "OndaHosting_" + Guid.NewGuid().ToString("N"));
    private WebApplicationFactory<Program> Factory()
    {
        Directory.CreateDirectory(Path.Combine(assets, "downloads"));
        File.WriteAllText(Path.Combine(assets, "index.html"), "<html>ONDA radio fixture</html>");
        File.WriteAllBytes(Path.Combine(assets, "downloads", "ONDA-beta.apk"), [0x50, 0x4b, 0x03, 0x04]);
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Onda"] = "Server=unused;Database=unused;Integrated Security=true",
                ["Catalog:SyncEnabled"] = "false", ["PublicAssetsPath"] = assets,
                ["Cors:Origins:0"] = "https://onda.lunalav.pe"
            }));
        });
    }
    [Fact] public async Task ProductionAllowsOnlyTheConfiguredWebOrigin()
    {
        await using var app = Factory(); using var client = app.CreateClient();
        foreach (var origin in new[] {"https://onda.lunalav.pe", "https://other.example"})
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/health/live");
            request.Headers.Add("Origin", origin);
            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(origin == "https://onda.lunalav.pe", response.Headers.Contains("Access-Control-Allow-Origin"));
        }
    }
    [Fact] public async Task WebEntryDoesNotRemainCachedAcrossReleasesAndApkSupportsRange()
    {
        await using var app = Factory(); using var client = app.CreateClient();
        client.DefaultRequestHeaders.Host = "onda.lunalav.pe";
        var home = await client.GetAsync("/");
        Assert.Contains("ONDA radio fixture", await home.Content.ReadAsStringAsync());
        Assert.True(home.Headers.CacheControl!.NoStore);
        using var request = new HttpRequestMessage(HttpMethod.Get, "/downloads/ONDA-beta.apk");
        request.Headers.Range = new(0, 1);
        var apk = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.PartialContent, apk.StatusCode);
        Assert.Equal("application/vnd.android.package-archive", apk.Content.Headers.ContentType!.MediaType);
        Assert.Equal(2, (await apk.Content.ReadAsByteArrayAsync()).Length);
    }
    [Theory]
    [InlineData("/api/v1/rooms")] [InlineData("/api/v1/auth/providers")] [InlineData("/hubs/rooms/negotiate")]
    public async Task RetiredEndpointsNeverReturnTheRadioHtml(string path)
    {
        await using var app = Factory(); using var client = app.CreateClient();
        client.DefaultRequestHeaders.Host = "onda.lunalav.pe";
        var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.DoesNotContain("ONDA radio fixture", await response.Content.ReadAsStringAsync());
    }
    public void Dispose() {if (Directory.Exists(assets)) Directory.Delete(assets, recursive: true);}
}
