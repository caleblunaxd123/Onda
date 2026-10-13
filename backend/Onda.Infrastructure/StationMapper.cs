using Onda.Application;
using Onda.Domain;
namespace Onda.Infrastructure;

public static class StationMapper
{
    /// <summary>
    /// Normalizes a Radio Browser record. Records without a valid UUID, name or stream are discarded; stations
    /// without an HTTPS stream are kept (for variants and availability) but flagged as not playable.
    /// </summary>
    public static StationEntity? ToEntity(RadioStation row, DateTimeOffset now)
    {
        var name = Text.DisplayName(row.Name);
        if (!Guid.TryParse(row.Id, out var id) || name.Length == 0) return null;
        var candidates = new[] { row.ResolvedUrl, row.Url }
            .Select(u => Uri.TryCreate(u?.Trim(), UriKind.Absolute, out var uri) ? uri : null)
            .OfType<Uri>().Where(u => u.Scheme is "https" or "http" && string.IsNullOrEmpty(u.UserInfo) && u.AbsoluteUri.Length <= 2000)
            .Select(u => u.AbsoluteUri).Distinct().ToArray();
        if (candidates.Length == 0) return null;
        var https = candidates.Where(u => u.StartsWith("https://", StringComparison.Ordinal)).ToArray();
        var code = row.CountryCode?.Trim().ToUpperInvariant() is { Length: 2 } cc && cc.All(char.IsAsciiLetterUpper) ? cc : "";
        var region = Text.CleanName(row.State, 150);
        var homepage = Uri.TryCreate(row.Homepage?.Trim(), UriKind.Absolute, out var page) && page.Scheme is "http" or "https" && page.AbsoluteUri.Length <= 2000 ? page.AbsoluteUri : null;
        var geo = row.Latitude is >= -90 and <= 90 && row.Longitude is >= -180 and <= 180 && !(row.Latitude == 0 && row.Longitude == 0);
        var stream = https.FirstOrDefault() ?? candidates[0];
        var entity = new StationEntity
        {
            Id = id, Name = name, SearchName = Cap(Text.Fold(name), 300), CountryCode = code,
            Country = code.Length > 0 ? Labels.Country(code, Text.CleanName(row.Country, 100)) : Text.CleanName(row.Country, 100),
            Region = region, SearchRegion = Cap(Text.Fold(region), 150), Language = Text.CleanName(row.Language, 200),
            StreamUrl = stream, AlternateStreamUrl = https.Skip(1).FirstOrDefault(), HasHttpsStream = https.Length > 0,
            Homepage = homepage,
            ArtworkUrl = Uri.TryCreate(row.Favicon?.Trim(), UriKind.Absolute, out var art) && art.Scheme == "https" && art.AbsoluteUri.Length <= 2000 ? art.AbsoluteUri : null,
            Codec = Text.CleanName(row.Codec, 40), Bitrate = Math.Clamp(row.Bitrate, 0, 10_000), IsHls = row.Hls == 1,
            Votes = Math.Max(0, row.Votes), ClickCount = Math.Max(0, row.ClickCount), ClickTrend = row.ClickTrend,
            Latitude = geo ? row.Latitude : null, Longitude = geo ? row.Longitude : null,
            VariantKey = Text.VariantKey(code, homepage, name, stream),
            SourceCheckOk = row.LastCheckOk != 0, SourceCheckedAt = row.LastCheckTime, SourceChangedAt = row.LastChangeTime,
            FirstSeenAt = now, LastSeenAt = now, UpdatedAt = now, SampleKey = SampleKey(id),
        };
        entity.Tags = Text.NormalizeTags(row.Tags).Select((t, i) => new StationTag { StationId = id, Tag = t, Position = i }).ToList();
        entity.Languages = Labels.LanguageCodes(row.LanguageCodes, row.Language).Select((c, i) => new StationLanguage { StationId = id, Code = c, Position = i }).ToList();
        return entity;
    }

    private static string Cap(string value, int max) => value.Length <= max ? value : value[..max];

    public static int SampleKey(Guid id) => (int)(Recommendations.Jitter(id, 0) * 1_000_000);

    /// <summary>
    /// Applies one observation of the source health check. A failure only counts when it is a new check
    /// (different check timestamp), and a station is "down" only after several consecutive failed checks.
    /// </summary>
    public static void ApplyCheck(StationEntity target, bool ok, DateTimeOffset? checkedAt, bool isNew)
    {
        var newCheck = isNew || checkedAt != target.SourceCheckedAt;
        if (newCheck) target.ConsecutiveFailedChecks = ok ? 0 : target.ConsecutiveFailedChecks + 1;
        target.SourceCheckOk = ok;
        target.SourceCheckedAt = checkedAt;
        target.Availability = target.ConsecutiveFailedChecks == 0 ? Availability.Ok
            : target.ConsecutiveFailedChecks >= Availability.DownAfterConsecutiveFailures ? Availability.Down : Availability.Unstable;
    }

    public static Station ToDto(StationEntity s, IReadOnlyList<string>? siblings = null)
    {
        var codes = s.Languages.OrderBy(l => l.Position).Select(l => l.Code).ToArray();
        var streams = new[] { s.StreamUrl, s.AlternateStreamUrl }.Concat(siblings ?? [])
            .Where(u => u is not null && u.StartsWith("https://", StringComparison.Ordinal)).Distinct().Take(5).ToArray();
        return new Station(s.Id, s.Name, s.Country, s.CountryCode,
            codes.Length > 0 ? string.Join(", ", codes.Take(2).Select(Labels.Language)) : s.Language,
            s.Tags.OrderBy(t => t.Position).Select(t => t.Tag).ToArray(), s.StreamUrl, s.ArtworkUrl, s.Codec, s.Bitrate, s.Votes,
            s.Latitude, s.Longitude, s.Region, streams!, s.Homepage, s.Availability, codes);
    }
}
