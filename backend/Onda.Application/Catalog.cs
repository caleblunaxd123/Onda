using System.Text;
using Onda.Domain;
namespace Onda.Application;

public enum StationOrder { Popular, Discover }
public enum GeoFilter { Any, Present, Missing }

/// <summary>Geographic rectangle in degrees. West may be greater than East when it crosses the antimeridian.</summary>
public sealed record BoundingBox(double West, double South, double East, double North)
{
    public bool CrossesAntimeridian => West > East;
    public static bool TryParse(string? value, out BoundingBox? box)
    {
        box = null;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var parts = value.Split(',');
        if (parts.Length != 4) return false;
        var numbers = new double[4];
        for (var i = 0; i < 4; i++)
            if (!double.TryParse(parts[i], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out numbers[i]) || !double.IsFinite(numbers[i])) return false;
        var (w, s, e, n) = (Wrap(numbers[0]), numbers[1], Wrap(numbers[2]), numbers[3]);
        if (s < -90 || n > 90 || s > n) return false;
        // A viewport wider than the world is clamped to the whole world.
        if (numbers[2] - numbers[0] >= 360) (w, e) = (-180, 180);
        box = new(w, s, e, n);
        return true;
    }
    private static double Wrap(double lon) => lon is >= -180 and <= 180 ? lon : ((lon + 180) % 360 + 360) % 360 - 180;
    public bool Contains(double lat, double lon) => lat >= South && lat <= North &&
        (CrossesAntimeridian ? lon >= West || lon <= East : lon >= West && lon <= East);
}

public sealed record StationFilter
{
    public string? Text { get; init; }
    public string? Country { get; init; }
    public string? Tag { get; init; }
    public string? Language { get; init; }
    public string? Region { get; init; }
    public BoundingBox? Bounds { get; init; }
    public GeoFilter Geo { get; init; }
    public StationOrder Order { get; init; }
    public int Seed { get; init; }
    public IReadOnlyList<string> BoostTags { get; init; } = [];
    public IReadOnlyList<string> BoostCountries { get; init; } = [];
    public IReadOnlyList<Guid> Exclude { get; init; } = [];
}

/// <summary>Opaque continuation token. Offsets count source records consumed, not surviving items.</summary>
public sealed record CatalogCursor(string Source, int Offset)
{
    public const string Catalog = "catalog";
    public const string Live = "live";
    public string Encode() => Convert.ToBase64String(Encoding.UTF8.GetBytes($"v1:{Source}:{Offset}")).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    public static bool TryDecode(string? token, out CatalogCursor? cursor)
    {
        cursor = null;
        if (string.IsNullOrWhiteSpace(token) || token.Length > 64) return false;
        var padded = token.Replace('-', '+').Replace('_', '/');
        padded += new string('=', (4 - padded.Length % 4) % 4);
        try
        {
            var parts = Encoding.UTF8.GetString(Convert.FromBase64String(padded)).Split(':');
            if (parts.Length != 3 || parts[0] != "v1" || parts[1] is not (Catalog or Live) ||
                !int.TryParse(parts[2], out var offset) || offset is < 0 or > 100_000) return false;
            cursor = new(parts[1], offset);
            return true;
        }
        catch (FormatException) { return false; }
    }
}

/// <param name="Total">Exact number of matches; only present when the local catalog can count them.</param>
public sealed record StationPage(IReadOnlyList<Station> Items, string? NextCursor, bool HasMore,
    string Source, int? Total = null, bool Stale = false);

public sealed record MapCell(double Latitude, double Longitude, int Count, Guid? StationId, string? Name);
public sealed record MapArea(IReadOnlyList<MapCell> Cells, int Total, bool Partial);
public sealed record CountryFacet(string Code, string Name, int Count, double[]? Bounds);
public sealed record PlaceFacet(string Name, int Count, double? Latitude, double? Longitude);
public sealed record LabeledFacet(string Value, string Label, int Count);
public sealed record CatalogStatus(string Mode, int Stations, int Playable, DateTimeOffset? LastCompletedSync,
    string? RunningStatus, int? RunningOffset, string Attribution);

public interface ICatalogQueries
{
    Task<StationPage> SearchAsync(StationFilter filter, CatalogCursor? cursor, int limit, CancellationToken ct);
    Task<MapArea> MapAsync(BoundingBox bounds, double zoom, StationFilter filter, CancellationToken ct);
    Task<IReadOnlyList<CountryFacet>> CountriesAsync(CancellationToken ct);
    Task<IReadOnlyList<PlaceFacet>> PlacesAsync(string country, CancellationToken ct);
    Task<IReadOnlyList<LabeledFacet>> LanguagesAsync(CancellationToken ct);
    Task<IReadOnlyList<LabeledFacet>> TagsAsync(CancellationToken ct);
    Task<IReadOnlyList<Station>> LookupAsync(IReadOnlyList<Guid> ids, CancellationToken ct);
    Task<CatalogStatus> StatusAsync(CancellationToken ct);
}

public sealed record ReportInput(string Kind, string? Message, string? StreamUrl, string? AppVersion, string? Platform);
public interface IStationReports
{
    /// <returns>The report id, or null when the station is unknown to the catalog.</returns>
    Task<long?> CreateAsync(Guid stationId, ReportInput input, CancellationToken ct);
}

public static class ReportKinds
{
    public static readonly IReadOnlySet<string> All = new HashSet<string> { "no_audio", "cuts", "wrong_info", "other" };
}

public static class Recommendations
{
    public static readonly IReadOnlyDictionary<string, string> Moods = new Dictionary<string, string>
    {
        ["relajarme"] = "chillout", ["concentrarme"] = "ambient", ["energía"] = "dance",
        ["romántico"] = "romantic", ["nostalgia"] = "oldies", ["noticias"] = "news",
        ["deportes"] = "sports", ["descubrir"] = "world music"
    };

    /// <summary>Deterministic value in [0, 1) for a station and seed, used to rotate equally relevant stations.</summary>
    public static double Jitter(Guid id, int seed)
    {
        var hash = 2166136261u;
        foreach (var b in id.ToByteArray()) hash = (hash ^ b) * 16777619;
        hash = (hash ^ (uint)seed) * 16777619;
        hash ^= hash >> 15; hash *= 2246822519; hash ^= hash >> 13;
        return hash / (double)uint.MaxValue * 0.999999;
    }

    public static double Score(Station s, StationFilter profile)
    {
        var score = Math.Log10(1 + Math.Max(0, s.Votes)) * 6;
        for (var i = 0; i < profile.BoostTags.Count; i++)
            if (s.Tags.Contains(profile.BoostTags[i], StringComparer.OrdinalIgnoreCase)) score += 30.0 / (1 + i * 0.35);
        for (var i = 0; i < profile.BoostCountries.Count; i++)
            if (string.Equals(s.CountryCode, profile.BoostCountries[i], StringComparison.OrdinalIgnoreCase)) score += 15.0 / (1 + i * 0.5);
        if (string.Equals(s.CountryCode, profile.Country, StringComparison.OrdinalIgnoreCase)) score += 20;
        if (profile.Tag is not null && s.Tags.Contains(profile.Tag, StringComparer.OrdinalIgnoreCase)) score += 30;
        if (s.Availability == Availability.Unstable) score -= 12;
        if (profile.Order == StationOrder.Discover) score += Jitter(s.Id, profile.Seed) * 25;
        return score;
    }

    public static IEnumerable<Station> Rank(IEnumerable<Station> stations, string? country, string? tag) =>
        Rank(stations, new StationFilter { Country = country, Tag = tag });

    public static IReadOnlyList<Station> Rank(IEnumerable<Station> stations, StationFilter profile)
    {
        var excluded = profile.Exclude.ToHashSet();
        var ranked = stations.DistinctBy(s => s.Id).Where(s => !excluded.Contains(s.Id))
            .OrderByDescending(s => Score(s, profile)).ThenBy(s => s.Id).ToList();
        return profile.Order == StationOrder.Discover ? Diversify(ranked, s => s.CountryCode + "|" + s.Tags.FirstOrDefault()) : ranked;
    }

    /// <summary>Greedy reordering that avoids consecutive items from the same group while keeping relative order otherwise.</summary>
    public static IReadOnlyList<T> Diversify<T>(IReadOnlyList<T> ranked, Func<T, string> group)
    {
        var pending = ranked.ToList();
        var result = new List<T>(pending.Count);
        string? last = null;
        while (pending.Count > 0)
        {
            var index = pending.FindIndex(item => group(item) != last);
            if (index < 0 || index > 6) index = 0;
            last = group(pending[index]);
            result.Add(pending[index]);
            pending.RemoveAt(index);
        }
        return result;
    }
}
