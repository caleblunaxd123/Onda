using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
namespace Onda.Infrastructure;

public sealed record RadioBrowserSearch(string? Name = null, string? CountryCode = null, string? Tag = null,
    string? Language = null, string? State = null, string Order = "clickcount", bool Reverse = true);

public interface IRadioBrowserClient
{
    /// <summary>Filtered search of working stations (hidebroken=true), as used by on-demand pages.</summary>
    Task<IReadOnlyList<RadioStation>> SearchAsync(RadioBrowserSearch search, int offset, int limit, CancellationToken ct);
    /// <summary>Full station list, including broken ones, in a stable order for batch synchronization.</summary>
    Task<IReadOnlyList<RadioStation>> ListAsync(int offset, int limit, CancellationToken ct);
}

/// <summary>
/// Official Radio Browser API (https://docs.radio-browser.info/). Servers are discovered through DNS as the
/// documentation recommends, only *.api.radio-browser.info hosts are accepted, and concurrent requests are capped.
/// </summary>
public sealed class RadioBrowserClient(HttpClient client, ILogger<RadioBrowserClient> logger) : IRadioBrowserClient
{
    private static readonly SemaphoreSlim Gate = new(3);
    private static readonly SemaphoreSlim DiscoveryLock = new(1);
    private static (string[] Hosts, DateTimeOffset Expires) discovered = ([], DateTimeOffset.MinValue);

    public Task<IReadOnlyList<RadioStation>> SearchAsync(RadioBrowserSearch search, int offset, int limit, CancellationToken ct)
    {
        var args = new Dictionary<string, string?>
        {
            ["name"] = search.Name, ["countrycode"] = search.CountryCode, ["tag"] = search.Tag,
            ["language"] = search.Language, ["state"] = search.State, ["hidebroken"] = "true", ["order"] = search.Order,
            ["reverse"] = search.Reverse ? "true" : "false", ["limit"] = limit.ToString(), ["offset"] = offset.ToString()
        };
        return GetAsync("/json/stations/search?" + Query(args), TimeSpan.FromSeconds(8), ct);
    }

    public Task<IReadOnlyList<RadioStation>> ListAsync(int offset, int limit, CancellationToken ct) =>
        GetAsync($"/json/stations?order=changetimestamp&reverse=false&hidebroken=false&offset={offset}&limit={limit}", TimeSpan.FromSeconds(45), ct);

    private static string Query(Dictionary<string, string?> args) =>
        string.Join('&', args.Where(p => !string.IsNullOrWhiteSpace(p.Value)).Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value!)}"));

    private async Task<IReadOnlyList<RadioStation>> GetAsync(string pathAndQuery, TimeSpan timeout, CancellationToken ct)
    {
        var hosts = await HostsAsync(ct);
        Exception? last = null;
        foreach (var host in hosts.OrderBy(_ => Random.Shared.Next()).Take(3))
        {
            await Gate.WaitAsync(ct);
            try
            {
                using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
                deadline.CancelAfter(timeout);
                return await client.GetFromJsonAsync<RadioStation[]>($"https://{host}{pathAndQuery}", deadline.Token) ?? [];
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException || ex is OperationCanceledException && !ct.IsCancellationRequested)
            {
                last = ex;
                logger.LogWarning("Radio Browser host {Host} failed: {Error}", host, ex.GetType().Name);
            }
            finally { Gate.Release(); }
            await Task.Delay(250, ct);
        }
        throw new HttpRequestException("El catálogo no está disponible temporalmente.", last);
    }

    private static async Task<string[]> HostsAsync(CancellationToken ct)
    {
        if (discovered.Expires > DateTimeOffset.UtcNow && discovered.Hosts.Length > 0) return discovered.Hosts;
        await DiscoveryLock.WaitAsync(ct);
        try
        {
            if (discovered.Expires > DateTimeOffset.UtcNow && discovered.Hosts.Length > 0) return discovered.Hosts;
            var addresses = await Dns.GetHostAddressesAsync("all.api.radio-browser.info", ct);
            var hosts = new List<string>();
            foreach (var address in addresses.Take(8))
            {
                try
                {
                    var host = (await Dns.GetHostEntryAsync(address).WaitAsync(TimeSpan.FromSeconds(3), ct)).HostName.TrimEnd('.');
                    if (host.EndsWith(".api.radio-browser.info", StringComparison.OrdinalIgnoreCase)) hosts.Add(host.ToLowerInvariant());
                }
                catch (Exception ex) when (ex is System.Net.Sockets.SocketException or TimeoutException) { }
            }
            if (hosts.Count == 0) throw new HttpRequestException("No se encontraron servidores de Radio Browser.");
            discovered = (hosts.Distinct().ToArray(), DateTimeOffset.UtcNow.AddMinutes(30));
            return discovered.Hosts;
        }
        finally { DiscoveryLock.Release(); }
    }
}

public sealed record RadioStation(
    [property: JsonPropertyName("stationuuid")] string? Id,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("country")] string? Country,
    [property: JsonPropertyName("countrycode")] string? CountryCode,
    [property: JsonPropertyName("language")] string? Language,
    [property: JsonPropertyName("tags")] string? Tags,
    [property: JsonPropertyName("url_resolved")] string? ResolvedUrl,
    [property: JsonPropertyName("favicon")] string? Favicon,
    [property: JsonPropertyName("codec")] string? Codec,
    [property: JsonPropertyName("bitrate")] int Bitrate,
    [property: JsonPropertyName("votes")] int Votes,
    [property: JsonPropertyName("geo_lat")] double? Latitude,
    [property: JsonPropertyName("geo_long")] double? Longitude)
{
    [JsonPropertyName("url")] public string? Url { get; init; }
    [JsonPropertyName("homepage")] public string? Homepage { get; init; }
    [JsonPropertyName("state")] public string? State { get; init; }
    [JsonPropertyName("languagecodes")] public string? LanguageCodes { get; init; }
    [JsonPropertyName("clickcount")] public int ClickCount { get; init; }
    [JsonPropertyName("clicktrend")] public int ClickTrend { get; init; }
    [JsonPropertyName("hls")] public int Hls { get; init; }
    [JsonPropertyName("lastcheckok")] public int LastCheckOk { get; init; } = 1;
    [JsonPropertyName("lastchecktime_iso8601")] public DateTimeOffset? LastCheckTime { get; init; }
    [JsonPropertyName("lastchangetime_iso8601")] public DateTimeOffset? LastChangeTime { get; init; }
}
