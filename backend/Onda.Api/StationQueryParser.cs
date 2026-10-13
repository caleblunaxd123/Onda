using System.Globalization;
using Onda.Application;
namespace Onda.Api;

public sealed record ReportRequest(string? Kind, string? Message, string? StreamUrl, string? AppVersion, string? Platform);
public sealed record ParsedStationQuery(StationFilter Filter, CatalogCursor? Cursor, int Limit);

public static class StationQueryParser
{
    public const int DefaultLimit = 30;

    public static bool TryParse(IQueryCollection q, out ParsedStationQuery query, out string error)
    {
        query = null!;
        error = "Filtros inválidos.";
        string? Value(string key) => q[key].FirstOrDefault() is { } v && !string.IsNullOrWhiteSpace(v) ? v.Trim() : null;
        var text = Value("q");
        var tag = Value("tag");
        var language = Value("language")?.ToLowerInvariant();
        var region = Value("region");
        if (text?.Length > 100 || tag?.Length > 50 || language?.Length > 40 || region?.Length > 150) return false;
        string? country = null;
        if (Value("country") is { } rawCountry && (country = CountryCode(rawCountry)) is null) return false;
        var limit = DefaultLimit;
        if (Value("limit") is { } rawLimit && (!int.TryParse(rawLimit, out limit) || limit is < 1 or > 100)) return false;
        CatalogCursor? cursor = null;
        if (Value("cursor") is { } rawCursor)
        {
            if (!CatalogCursor.TryDecode(rawCursor, out cursor)) { error = "El cursor de paginación no es válido."; return false; }
        }
        else if (Value("offset") is { } rawOffset)
        {
            // Legacy clients: an offset is interpreted in the local catalog.
            if (!int.TryParse(rawOffset, out var offset) || offset is < 0 or > 10000) return false;
            if (offset > 0) cursor = new(CatalogCursor.Catalog, offset);
        }
        BoundingBox? bounds = null;
        if (Value("bbox") is { } rawBox && !BoundingBox.TryParse(rawBox, out bounds)) { error = "bbox debe ser oeste,sur,este,norte en grados."; return false; }
        var geo = Value("geo") switch { null or "any" => GeoFilter.Any, "present" => GeoFilter.Present, "missing" => GeoFilter.Missing, _ => (GeoFilter?)null };
        var order = Value("order") switch { null or "popular" => StationOrder.Popular, "discover" => StationOrder.Discover, _ => (StationOrder?)null };
        if (geo is null || order is null) return false;
        var seed = 0;
        if (Value("seed") is { } rawSeed && !int.TryParse(rawSeed, NumberStyles.Integer, CultureInfo.InvariantCulture, out seed)) return false;
        var boostTags = List(Value("boostTags"), 8, 50);
        var boostCountries = List(Value("boostCountries"), 5, 2)?.Select(CountryCode).ToList();
        var exclude = Value("exclude") is { } rawExclude ? ParseIds(rawExclude, 100) : [];
        if (boostTags is null || boostCountries is null || boostCountries.Any(c => c is null) || exclude is null) return false;
        query = new(new StationFilter
        {
            Text = text, Country = country, Tag = tag, Language = language, Region = region, Bounds = bounds, Geo = geo.Value,
            Order = order.Value, Seed = seed, BoostTags = boostTags, BoostCountries = boostCountries!, Exclude = exclude,
        }, cursor, limit);
        return true;
    }

    public static string? CountryCode(string? value) =>
        value?.Trim() is { Length: 2 } code && code.All(char.IsAsciiLetter) ? code.ToUpperInvariant() : null;

    private static List<string>? List(string? csv, int maxItems, int maxLength)
    {
        var items = (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
        return items.Count > maxItems || items.Any(i => i.Length > maxLength) ? null : items;
    }

    public static List<Guid>? ParseIds(string? csv, int max)
    {
        var parts = (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length > max) return null;
        var ids = new List<Guid>(parts.Length);
        foreach (var part in parts)
        {
            if (!Guid.TryParse(part, out var id)) return null;
            ids.Add(id);
        }
        return ids.Distinct().ToList();
    }
}
