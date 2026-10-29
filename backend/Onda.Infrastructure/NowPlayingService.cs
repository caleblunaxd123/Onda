using Microsoft.Extensions.Caching.Memory;
using Onda.Application;
namespace Onda.Infrastructure;

/// <summary>Bounded shared cache and probes. Only streams looked up by station id are eligible.</summary>
public sealed class MetadataCache(IMemoryCache cache, IMetadataReader reader, TimeProvider clock)
{
    private readonly SemaphoreSlim gate = new(4);
    private readonly SemaphoreSlim[] stripes = Enumerable.Range(0,64).Select(_ => new SemaphoreSlim(1)).ToArray();
    public async Task<(MetadataReading Reading, DateTimeOffset At)> ReadAsync(Uri uri, CancellationToken ct)
    {
        var key = "now-playing:" + uri.AbsoluteUri;
        if (cache.TryGetValue<(MetadataReading, DateTimeOffset)>(key, out var saved)) return saved;
        var stripe = stripes[(uint)StringComparer.Ordinal.GetHashCode(key) % (uint)stripes.Length];
        if (!await stripe.WaitAsync(0, ct)) return (new("unavailable", null), clock.GetUtcNow());
        try
        {
            if (cache.TryGetValue(key, out saved)) return saved;
            if (!await gate.WaitAsync(0, ct)) return (new("unavailable", null), clock.GetUtcNow());
            MetadataReading reading;
            try
            {
                try {reading = await reader.ReadAsync(uri, ct);}
                catch (Exception e) when (e is HttpRequestException or IOException or OperationCanceledException or System.Net.Sockets.SocketException or UriFormatException)
                {ct.ThrowIfCancellationRequested(); reading = new("unavailable", null);}
            }
            finally {gate.Release();}
            var result = (reading, clock.GetUtcNow());
            cache.Set(key, result, new MemoryCacheEntryOptions {AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(reading.Status == "unsupported" ? 120 : 20), Size = 1});
            return result;
        }
        finally {stripe.Release();}
    }
}

public sealed class NowPlayingService(ICatalogQueries catalog, MetadataCache cache) : INowPlaying
{
    public async Task<NowPlaying?> GetAsync(Guid stationId, int source, CancellationToken ct)
    {
        var station = (await catalog.LookupAsync([stationId], ct)).FirstOrDefault(s => s.Id == stationId);
        if (station is null) return null;
        var sources = new[] {station.StreamUrl}.Concat(station.Streams ?? []).Where(s => s.StartsWith("https://", StringComparison.OrdinalIgnoreCase)).Distinct().Take(5).ToArray();
        if (source < 1 || source > sources.Length || !Uri.TryCreate(sources[source-1], UriKind.Absolute, out var uri) || !MetadataNetwork.IsAllowed(uri))
            return new(stationId, source, "unsupported", null, null);
        var (reading, at) = await cache.ReadAsync(uri, ct);
        // Some broadcasters send only their name; do not present it as a song.
        var title = string.Equals(reading.Title, station.Name, StringComparison.OrdinalIgnoreCase) ? null : reading.Title;
        return new(stationId, source, title is not null ? "available" : reading.Status == "unsupported" ? "unsupported" : "unavailable", title, title is not null ? at : null);
    }
}
