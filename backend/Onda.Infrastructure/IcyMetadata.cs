using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;

namespace Onda.Infrastructure;

/// <summary>Only globally routable HTTPS targets, with DNS pinned at socket creation, including redirects.</summary>
public static class MetadataNetwork
{
    public static bool IsPublic(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        var b = address.GetAddressBytes();
        if (b.Length == 16)
            return (b[0] & 0xe0) == 0x20 && address.ScopeId == 0 &&
                !(b[0] == 0x20 && b[1] == 0x02) && // 6to4 encodes an IPv4 destination.
                !(b[0] == 0x20 && b[1] == 0x01 && (b[2] < 2 || b[2] == 0x0d && b[3] == 0xb8));
        return b[0] is > 0 and < 224 && b[0] is not (10 or 127) &&
            !(b[0] == 100 && b[1] is >= 64 and <= 127) &&
            !(b[0] == 169 && b[1] == 254) && !(b[0] == 172 && b[1] is >= 16 and <= 31) &&
            !(b[0] == 192 && (b[1] == 168 || b[1] == 0 && b[2] is 0 or 2)) &&
            !(b[0] == 198 && (b[1] is 18 or 19 || b[1] == 51 && b[2] == 100)) &&
            !(b[0] == 203 && b[1] == 0 && b[2] == 113);
    }
    public static bool IsAllowed(Uri uri) => uri.AbsoluteUri.Length <= 2000 && uri.Scheme == Uri.UriSchemeHttps && !uri.IsLoopback && string.IsNullOrEmpty(uri.UserInfo) &&
        string.IsNullOrEmpty(uri.Fragment) && (uri.Port == 443 || uri.Port is >= 1024 and <= 65535) &&
        uri.HostNameType is UriHostNameType.Dns or UriHostNameType.IPv4 or UriHostNameType.IPv6 &&
        (!IPAddress.TryParse(uri.Host, out var address) || IsPublic(address));

    public static SocketsHttpHandler Handler() => new()
    {
        AllowAutoRedirect = false, UseProxy = false, UseCookies = false,
        AutomaticDecompression = DecompressionMethods.None, MaxResponseHeadersLength = 16,
        ConnectTimeout = TimeSpan.FromSeconds(3), PooledConnectionLifetime = TimeSpan.FromMinutes(1),
        ConnectCallback = async (context, ct) =>
        {
            var addresses = await Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, ct);
            if (addresses.Length == 0 || addresses.Any(a => !IsPublic(a))) throw new HttpRequestException("Non-public metadata target");
            foreach (var address in addresses)
            {
                var socket = new Socket(address.AddressFamily, SocketType.Stream, ProtocolType.Tcp) {NoDelay = true};
                try {await socket.ConnectAsync(address, context.DnsEndPoint.Port, ct); return new NetworkStream(socket, ownsSocket: true);}
                catch (SocketException) {socket.Dispose();}
                catch {socket.Dispose(); throw;}
            }
            throw new HttpRequestException("Metadata host unreachable");
        },
    };
}

public sealed record MetadataReading(string Status, string? Title);
public interface IMetadataReader {Task<MetadataReading> ReadAsync(Uri uri, CancellationToken ct);}

/// <summary>Reads at most three ICY blocks (under 210 KiB) and closes the connection; audio is never retained.</summary>
public sealed class IcyMetadataReader(HttpClient client) : IMetadataReader
{
    public async Task<MetadataReading> ReadAsync(Uri uri, CancellationToken ct)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(8));
        for (var redirect = 0; redirect <= 3; redirect++)
        {
            if (!MetadataNetwork.IsAllowed(uri)) return new("unsupported", null);
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            request.Headers.TryAddWithoutValidation("Icy-MetaData", "1");
            request.Headers.UserAgent.ParseAdd("ONDA/0.7.2 (+https://onda.lunalav.pe)");
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
            if ((int)response.StatusCode is 301 or 302 or 303 or 307 or 308)
            {
                if (response.Headers.Location is not { } location) return new("unavailable", null);
                uri = location.IsAbsoluteUri ? location : new Uri(uri, location);
                continue;
            }
            if (!response.IsSuccessStatusCode) return new("unavailable", null);
            if (!response.Headers.TryGetValues("icy-metaint", out var values) ||
                !int.TryParse(values.FirstOrDefault(), out var interval) || interval is < 1 or > 65536)
                return new("unsupported", null);
            await using var stream = await response.Content.ReadAsStreamAsync(timeout.Token);
            var title = await ReadTitleAsync(stream, interval, timeout.Token);
            return title is not null ? new("available", title) : new("unavailable", null);
        }
        return new("unavailable", null);
    }

    public static async Task<string?> ReadTitleAsync(Stream stream, int interval, CancellationToken ct)
    {
        if (interval is < 1 or > 65536) return null;
        var audio = new byte[interval]; var length = new byte[1];
        for (var block = 0; block < 3; block++)
        {
            await stream.ReadExactlyAsync(audio, ct);
            await stream.ReadExactlyAsync(length, ct);
            var metadata = new byte[length[0] * 16];
            await stream.ReadExactlyAsync(metadata, ct);
            string text;
            try {text = new UTF8Encoding(false, true).GetString(metadata);}
            catch (DecoderFallbackException) {text = Encoding.Latin1.GetString(metadata);}
            var title = ParseTitle(text);
            if (title is not null) return title;
        }
        return null;
    }
    public static string? ParseTitle(string text)
    {
        if (text.Length > 4080) return null;
        var match = Regex.Match(text, @"(?:^|;)\s*StreamTitle='(?<title>.*?)';", RegexOptions.IgnoreCase | RegexOptions.Singleline, TimeSpan.FromMilliseconds(50));
        if (!match.Success) return null;
        var clean = new string(WebUtility.HtmlDecode(match.Groups["title"].Value).Where(c => !char.IsControl(c) &&
            char.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.Format).ToArray()).Trim();
        clean = Regex.Replace(clean, @"\s+", " ");
        return clean.Length is > 0 and <= 240 && !new[] {"unknown", "null", "undefined", "no title"}.Contains(clean.ToLowerInvariant()) ? clean : null;
    }
}
