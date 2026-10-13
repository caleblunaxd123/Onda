using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Onda.Application;
using Onda.Domain;
namespace Onda.Infrastructure;
public sealed class RadioBrowserCatalog(HttpClient client, OndaDbContext db) : IStationCatalog
{
    public async Task<IReadOnlyList<Station>> SearchAsync(StationQuery query, CancellationToken ct)
    {
        var addresses = await Dns.GetHostAddressesAsync("all.api.radio-browser.info", ct);
        var hosts = new List<string>();
        foreach (var address in addresses.Take(6))
        {
            try
            {
                var host = (await Dns.GetHostEntryAsync(address).WaitAsync(ct)).HostName.TrimEnd('.');
                if (host.EndsWith(".api.radio-browser.info", StringComparison.OrdinalIgnoreCase)) hosts.Add(host);
            }
            catch (System.Net.Sockets.SocketException) { }
        }
        Exception? last = null;
        foreach (var host in hosts.Distinct().OrderBy(_ => Random.Shared.Next()).Take(3))
        {
            var args = new Dictionary<string, string?> {
                ["name"] = query.Text, ["countrycode"] = query.Country, ["tag"] = query.Tag,
                ["language"] = query.Language, ["hidebroken"] = "true", ["order"] = "clickcount",
                ["reverse"] = "true", ["limit"] = query.Limit.ToString(), ["offset"] = query.Offset.ToString()
            };
            var url = $"https://{host}/json/stations/search?" + string.Join('&', args.Where(p => !string.IsNullOrWhiteSpace(p.Value)).Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value!)}"));
            try
            {
                var rows = await client.GetFromJsonAsync<RadioStation[]>(url, ct) ?? [];
                var stations = rows.Select(Normalize).OfType<Station>().DistinctBy(s => s.Id).ToArray();
                foreach (var station in stations)
                {
                    var json = JsonSerializer.Serialize(station);
                    await db.Database.ExecuteSqlInterpolatedAsync($"MERGE [Stations] WITH (HOLDLOCK) AS target USING (SELECT {station.Id} AS Id, {json} AS Payload, {DateTimeOffset.UtcNow} AS UpdatedAt) AS source ON target.Id = source.Id WHEN MATCHED THEN UPDATE SET Payload = source.Payload, UpdatedAt = source.UpdatedAt WHEN NOT MATCHED THEN INSERT (Id, Payload, UpdatedAt) VALUES (source.Id, source.Payload, source.UpdatedAt);", ct);
                }
                return stations;
            }
            catch (Exception ex) when (ex is HttpRequestException || ex is JsonException || ex is TaskCanceledException && !ct.IsCancellationRequested)
            { last = ex; await Task.Delay(250, ct); }
        }
        throw new HttpRequestException("El catálogo no está disponible temporalmente.", last);
    }
    public static Station? Normalize(RadioStation row)
    {
        if (!Guid.TryParse(row.Id, out var id) || string.IsNullOrWhiteSpace(row.Name) ||
            !Uri.TryCreate(row.ResolvedUrl, UriKind.Absolute, out var stream) || stream.Scheme != "https" || !string.IsNullOrEmpty(stream.UserInfo)) return null;
        var geo = row.Latitude is >= -90 and <= 90 && row.Longitude is >= -180 and <= 180;
        return new(id, row.Name.Trim(), row.Country ?? "", row.CountryCode ?? "", row.Language ?? "",
            (row.Tags ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries),
            stream.AbsoluteUri, Uri.TryCreate(row.Favicon, UriKind.Absolute, out var art) && art.Scheme == "https" ? art.AbsoluteUri : null,
            row.Codec ?? "", Math.Max(0, row.Bitrate), Math.Max(0, row.Votes), geo ? row.Latitude : null, geo ? row.Longitude : null);
    }
}
public sealed record RadioStation(
    [property: JsonPropertyName("stationuuid")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("country")] string Country,
    [property: JsonPropertyName("countrycode")] string CountryCode,
    [property: JsonPropertyName("language")] string Language,
    [property: JsonPropertyName("tags")] string Tags,
    [property: JsonPropertyName("url_resolved")] string ResolvedUrl,
    [property: JsonPropertyName("favicon")] string Favicon,
    [property: JsonPropertyName("codec")] string Codec,
    [property: JsonPropertyName("bitrate")] int Bitrate,
    [property: JsonPropertyName("votes")] int Votes,
    [property: JsonPropertyName("geo_lat")] double? Latitude,
    [property: JsonPropertyName("geo_long")] double? Longitude);
