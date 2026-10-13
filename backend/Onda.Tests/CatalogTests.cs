using Onda.Application;
using Onda.Domain;
using Onda.Infrastructure;
namespace Onda.Tests;

public class CatalogTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 12, 12, 0, 0, TimeSpan.Zero);

    internal static RadioStation Row(string url = "https://radio.example/live", double? lat = -12, double? lon = -77,
        string id = "d55990c0-ecee-4e52-a70e-cba0c10d11d8", string name = "  Radio  ", string country = "PE",
        string? homepage = null, string tags = "salsa, latin", string? original = null, int checkOk = 1, DateTimeOffset? checkedAt = null) =>
        new(id, name, "Peru", country, "spanish", tags, url, "", "MP3", 128, 10, lat, lon)
        { Url = original ?? url, Homepage = homepage, LastCheckOk = checkOk, LastCheckTime = checkedAt ?? Now };

    [Fact] public void NormalizesIdentityTagsAndSpanishLabels()
    {
        var station = StationMapper.ToDto(StationMapper.ToEntity(Row(tags: "Salsa, LATIN,  , hip-hop, salsa"), Now)!);
        Assert.Equal("Radio", station.Name);
        Assert.Equal(new[] { "salsa", "latin", "hip hop" }, station.Tags);
        Assert.Equal("Perú", station.Country);
        Assert.Equal("Español", station.Language);
        Assert.Equal(new[] { "es" }, station.LanguageCodes);
    }

    [Theory]
    [InlineData("# RdMix Classic Rock", "RdMix Classic Rock")] [InlineData("-- # TOP 100 CHARTS", "TOP 100 CHARTS")]
    [InlineData("¡Radio Uno!", "¡Radio Uno!")] [InlineData("(K)Radio", "(K)Radio")] [InlineData("★★", "★★")]
    public void DisplayNamesDropDecorativeLeadingSymbols(string raw, string expected) => Assert.Equal(expected, Text.DisplayName(raw));

    [Fact] public void TagsIgnoreEmojiAndSymbolsSoEquivalentTagsAreNotDuplicated() =>
        Assert.Equal(new[] { "islam", "rock & roll", "80s" }, Text.NormalizeTags("islam, islam🕋, ★Rock & Roll★, 80's, ♫♫"));

    [Theory] [InlineData("file:///etc/passwd")] [InlineData("https://user:pass@example.com")] [InlineData("invalid")]
    public void RejectsUnsafeOrInvalidStreams(string url) => Assert.Null(StationMapper.ToEntity(Row(url), Now));

    [Fact] public void KeepsHttpOnlyStationsButMarksThemNotPlayable()
    {
        var entity = StationMapper.ToEntity(Row("http://example.com/live"), Now)!;
        Assert.False(entity.HasHttpsStream);
        Assert.Empty(StationMapper.ToDto(entity).Streams!);
    }

    [Fact] public void PrefersTheOfficialHttpsUrlWhenTheResolvedOneIsHttp()
    {
        var entity = StationMapper.ToEntity(Row("http://cdn.example/live", original: "https://radio.example/stream.m3u"), Now)!;
        Assert.True(entity.HasHttpsStream);
        Assert.Equal("https://radio.example/stream.m3u", entity.StreamUrl);
    }

    [Theory] [InlineData(100.0, -77.0)] [InlineData(0.0, 0.0)] [InlineData(null, -77.0)]
    public void DoesNotInventCoordinates(double? lat, double? lon)
    {
        var station = StationMapper.ToEntity(Row(lat: lat, lon: lon), Now)!;
        Assert.Null(station.Latitude); Assert.Null(station.Longitude);
    }

    [Fact] public void VariantKeysUseVerifiableCriteriaOnly()
    {
        string? Key(string name, string country, string? home, string stream) => Text.VariantKey(country, home, name, stream);
        // Same broadcaster, quality suffixes and different streams: variants.
        Assert.Equal(Key("Radio Uno 128k", "PE", "https://www.radiouno.pe/", "https://a.example/1"), Key("Radio Uno (AAC)", "PE", "http://radiouno.pe", "https://b.example/2"));
        // Same name, different homepage or country: distinct stations.
        Assert.NotEqual(Key("Radio Maria", "PE", "https://radiomaria.pe", "https://a/1"), Key("Radio Maria", "PE", "https://radiomaria.org.pe", "https://a/2"));
        Assert.NotEqual(Key("Radio Maria", "PE", "https://radiomaria.org", "https://a/1"), Key("Radio Maria", "AR", "https://radiomaria.org", "https://a/1"));
        // No homepage: only an identical stream URL groups them; a shared name alone never does.
        Assert.Equal(Key("Grün-Weiss", "AT", null, "https://live.gruen-weiss.at/rgw.aac"), Key("Grun Weiss", "AT", "", "https://LIVE.gruen-weiss.at/rgw.aac"));
        Assert.NotEqual(Key("Radio Uno", "PE", null, "https://a.example/1"), Key("Radio Uno", "PE", null, "https://b.example/1"));
    }

    [Fact] public void ASingleFailedCheckNeverMarksAStationDown()
    {
        var station = StationMapper.ToEntity(Row(checkOk: 0), Now)!;
        StationMapper.ApplyCheck(station, ok: false, Now, isNew: true);
        Assert.Equal(Availability.Unstable, station.Availability);
        // The same check observed again (another sync, no new check) does not count twice.
        StationMapper.ApplyCheck(station, ok: false, Now, isNew: false);
        StationMapper.ApplyCheck(station, ok: false, Now, isNew: false);
        Assert.Equal(Availability.Unstable, station.Availability);
        StationMapper.ApplyCheck(station, ok: false, Now.AddHours(1), isNew: false);
        StationMapper.ApplyCheck(station, ok: false, Now.AddHours(2), isNew: false);
        Assert.Equal(Availability.Down, station.Availability);
        StationMapper.ApplyCheck(station, ok: true, Now.AddHours(3), isNew: false);
        Assert.Equal(Availability.Ok, station.Availability);
    }

    [Fact] public void RecommendationsDeduplicateAndPreferRelevantTags()
    {
        var original = StationMapper.ToDto(StationMapper.ToEntity(Row(), Now)!);
        var other = original with { Id = Guid.NewGuid(), CountryCode = "US", Tags = ["rock"], Votes = 1000 };
        var ranked = Recommendations.Rank([other, original, original], "PE", "salsa").ToArray();
        Assert.Equal(2, ranked.Length); Assert.Equal(original.Id, ranked[0].Id);
    }

    [Fact] public void DiscoverOrderRotatesWithSeedIsStableAndHonorsExclusions()
    {
        var stations = Enumerable.Range(0, 40).Select(i => new Station(Guid.NewGuid(), "R" + i, "Perú", i % 2 == 0 ? "PE" : "US", "", [i % 3 == 0 ? "jazz" : "rock"],
            "https://x/" + i, null, "MP3", 128, 50, null, null)).ToList();
        StationFilter Profile(int seed) => new() { Order = StationOrder.Discover, Seed = seed, BoostTags = ["jazz"], Exclude = [stations[0].Id] };
        var first = Recommendations.Rank(stations, Profile(1)).Select(s => s.Id).ToList();
        Assert.Equal(first, Recommendations.Rank(stations, Profile(1)).Select(s => s.Id).ToList());
        Assert.NotEqual(first, Recommendations.Rank(stations, Profile(2)).Select(s => s.Id).ToList());
        Assert.DoesNotContain(stations[0].Id, first);
        // The boosted genre leads the ranking.
        var top = Recommendations.Rank(stations, Profile(1)).Take(5);
        Assert.All(top, s => Assert.Contains("jazz", s.Tags));
    }

    [Fact] public void DiversifyAvoidsAdjacentItemsFromTheSameGroupWhenPossible()
    {
        var result = Recommendations.Diversify(["a1", "a2", "a3", "b1", "b2", "c1"], s => s[..1]);
        for (var i = 1; i < 5; i++) Assert.NotEqual(result[i][0], result[i - 1][0]);
        Assert.Equal(6, result.Count);
    }

    [Fact] public void LanguageCodesComeFromCodesOrEnglishNames()
    {
        Assert.Equal(new[] { "es", "en" }, Labels.LanguageCodes("", "Spanish,english"));
        Assert.Equal(new[] { "pt" }, Labels.LanguageCodes("pt", "portuguese"));
        Assert.Equal("Alemania", Labels.Country("de"));
        Assert.Equal("Noticias", Labels.Tag("news"));
        Assert.Equal("spanish", Labels.EnglishLanguage("es"));
    }
}
