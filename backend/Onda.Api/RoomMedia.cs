using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Onda.Application;
using Onda.Domain;
namespace Onda.Api;

public sealed record MediaInput(string? Kind, string? Url = null, Guid? StationId = null, string? Title = null);
public sealed record RoomMedia(string Kind, string Title, string? Url, string? VideoId, Station? Station, string Category = "");
public sealed partial class MediaResolver(ICatalogQueries catalog, IHttpClientFactory http, IMemoryCache cache)
{
    [GeneratedRegex("^[a-zA-Z0-9_-]{11}$")] private static partial Regex VideoIdPattern();
    public static string? YoutubeId(string? url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != "https" || !uri.IsDefaultPort || uri.UserInfo.Length > 0) return null;
        var host = uri.IdnHost.ToLowerInvariant();
        string? id = null;
        if (host is "youtu.be" or "www.youtu.be") id = uri.AbsolutePath.Trim('/').Split('/')[0];
        if (host is "youtube.com" or "www.youtube.com" or "m.youtube.com" or "music.youtube.com" or "www.youtube-nocookie.com")
        {
            var path = uri.AbsolutePath.Trim('/').Split('/');
            if (path.Length == 2 && path[0] is "embed" or "shorts" or "live") id = path[1];
            else if (uri.AbsolutePath == "/watch") id = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query)["v"].ToString();
        }
        return id is not null && VideoIdPattern().IsMatch(id) ? id : null;
    }
    public static bool PublicAddress(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        if (IPAddress.IsLoopback(ip)) return false;
        var b = ip.GetAddressBytes();
        if (b.Length == 4) return b[0] is not (0 or 10 or 127) && b[0] < 224 &&
            !(b[0] == 169 && b[1] == 254) && !(b[0] == 172 && b[1] is >= 16 and <= 31) &&
            !(b[0] == 192 && b[1] == 168) && !(b[0] == 100 && b[1] is >= 64 and <= 127);
        return !ip.IsIPv6LinkLocal && !ip.IsIPv6Multicast && !ip.IsIPv6SiteLocal && !ip.Equals(IPAddress.IPv6Any) && (b[0] & 0xfe) != 0xfc;
    }
    public async Task<RoomMedia?> ResolveAsync(MediaInput input, CancellationToken ct)
    {
        if (input.Kind == "radio" && input.StationId is { } id)
        {
            var station = (await catalog.LookupAsync([id], ct)).FirstOrDefault();
            return station is null || !station.StreamUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase) || station.Availability == Availability.Down
                ? null : new("radio", station.Name, station.StreamUrl, null, station);
        }
        if (input.Kind is "youtube" or "video" or "audio" && YoutubeId(input.Url) is { } videoId)
        {
            var title = Text.CleanName(input.Title ?? "", 120);
            if (title.Length == 0)
            {
                title = await cache.GetOrCreateAsync("yt-title:" + videoId, async entry =>
                {
                    entry.Size = 1; entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
                    try
                    {
                        var data = await http.CreateClient("media-metadata").GetFromJsonAsync<YoutubeMetadata>("https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + videoId, ct);
                        return Text.CleanName(data?.title ?? "Video de YouTube", 120);
                    }
                    catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException) {return "Video de YouTube";}
                }) ?? "Video de YouTube";
            }
            return new("youtube", title, "https://www.youtube.com/watch?v=" + videoId, videoId, null, input.Kind == "audio" ? "music" : "video");
        }
        if (input.Kind is not ("audio" or "video") || input.Url is not {Length: <= 2000} ||
            !Uri.TryCreate(input.Url, UriKind.Absolute, out var uri) || uri.Scheme != "https" || !uri.IsDefaultPort || uri.UserInfo.Length > 0 ||
            uri.HostNameType != UriHostNameType.Dns || !uri.IdnHost.Contains('.') || uri.IdnHost.EndsWith(".local", StringComparison.OrdinalIgnoreCase)) return null;
        var extension = Path.GetExtension(uri.AbsolutePath).ToLowerInvariant();
        if (!(input.Kind == "audio" ? new[] {".mp3", ".m4a", ".ogg", ".aac", ".wav"} : new[] {".mp4", ".webm"}).Contains(extension)) return null;
        try
        {
            var addresses = await Dns.GetHostAddressesAsync(uri.DnsSafeHost, ct);
            if (addresses.Length == 0 || addresses.Any(ip => !PublicAddress(ip))) return null;
        }
        catch (System.Net.Sockets.SocketException) {return null;}
        // No server-side fetching of arbitrary media. Only the fixed YouTube metadata endpoint is fetched above.
        var cleanTitle = Text.CleanName(input.Title ?? "", 120);
        return new(input.Kind, cleanTitle.Length > 0 ? cleanTitle : Text.CleanName(Uri.UnescapeDataString(Path.GetFileName(uri.AbsolutePath)), 120), uri.AbsoluteUri, null, null);
    }
    private sealed record YoutubeMetadata(string title);
}
