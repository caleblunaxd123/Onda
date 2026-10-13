using Onda.Domain;
namespace Onda.Application;
public sealed record StationQuery(string? Text = null, string? Country = null,
    string? Tag = null, string? Language = null, int Offset = 0, int Limit = 30);
public interface IStationCatalog
{
    Task<IReadOnlyList<Station>> SearchAsync(StationQuery query, CancellationToken cancellationToken);
}
public static class Recommendations
{
    public static readonly IReadOnlyDictionary<string, string> Moods = new Dictionary<string, string>
    {
        ["relajarme"] = "chillout", ["concentrarme"] = "ambient", ["energía"] = "dance",
        ["romántico"] = "romantic", ["nostalgia"] = "80s", ["noticias"] = "news",
        ["deportes"] = "sports", ["descubrir"] = "world"
    };
    public static IEnumerable<Station> Rank(IEnumerable<Station> stations, string? country, string? tag) =>
        stations.DistinctBy(s => s.Id).OrderByDescending(s =>
            (s.CountryCode == country ? 20 : 0) + (s.Tags.Contains(tag, StringComparer.OrdinalIgnoreCase) ? 30 : 0)
            + Math.Log10(1 + Math.Max(0, s.Votes)));
}
