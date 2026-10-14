using System.Net;
using Microsoft.AspNetCore.HttpOverrides;
namespace Onda.Api;

public static class ProxyHeaders
{
    public static void Configure(ForwardedHeadersOptions options, string[] knownProxies)
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = 1;
        // An empty trust list accepts every proxy. Always keep an explicit allowlist.
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
        foreach (var address in knownProxies.Length > 0 ? knownProxies : ["127.0.0.1", "::1"])
            options.KnownProxies.Add(IPAddress.Parse(address));
    }
}
