namespace Onda.Application;

/// <summary>Text published by a station, not audio recognition. Ads and programmes may also be reported.</summary>
public sealed record NowPlaying(Guid StationId, int Source, string Status, string? Title, DateTimeOffset? ObservedAt);
public interface INowPlaying
{
    Task<NowPlaying?> GetAsync(Guid stationId, int source, CancellationToken ct);
}
