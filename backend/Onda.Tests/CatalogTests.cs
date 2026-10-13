using Onda.Infrastructure;
using Onda.Application;
namespace Onda.Tests;
public class CatalogTests
{
    private static RadioStation Row(string url = "https://radio.example/live", double? lat = -12, double? lon = -77) =>
        new("d55990c0-ecee-4e52-a70e-cba0c10d11d8", "  Radio  ", "Peru", "PE", "spanish", "salsa, latin", url, "", "MP3", 128, 10, lat, lon);
    [Fact] public void NormalizesIdentityAndTags() {
        var station = RadioBrowserCatalog.Normalize(Row())!;
        Assert.Equal("Radio", station.Name); Assert.Equal(new[] {"salsa", "latin"}, station.Tags);
    }
    [Theory] [InlineData("http://example.com/live")] [InlineData("file:///etc/passwd")] [InlineData("https://user:pass@example.com")] [InlineData("invalid")]
    public void RejectsUnsafeOrUnsupportedStreams(string url) => Assert.Null(RadioBrowserCatalog.Normalize(Row(url)));
    [Fact] public void DoesNotInventCoordinates() {
        var station = RadioBrowserCatalog.Normalize(Row(lat: 100))!;
        Assert.Null(station.Latitude); Assert.Null(station.Longitude);
    }
    [Fact] public void RecommendationsDeduplicateAndPreferRelevantTags() {
        var original = RadioBrowserCatalog.Normalize(Row())!;
        var other = original with { Id = Guid.NewGuid(), CountryCode = "US", Tags = ["rock"], Votes = 1000 };
        var ranked = Recommendations.Rank([other, original, original], "PE", "salsa").ToArray();
        Assert.Equal(2, ranked.Length); Assert.Equal(original.Id, ranked[0].Id);
    }
}
