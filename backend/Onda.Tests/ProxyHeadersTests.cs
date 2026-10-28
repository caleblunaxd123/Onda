using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Onda.Api;
namespace Onda.Tests;

public class ProxyHeadersTests
{
    [Theory]
    [InlineData("10.77.0.10", "203.0.113.8", "https")]
    [InlineData("10.77.0.11", "10.77.0.11", "http")]
    public async Task OnlyConfiguredProxyCanSupplyClientAddress(string peer, string expectedIp, string expectedScheme)
    {
        var options = new ForwardedHeadersOptions();
        ProxyHeaders.Configure(options, ["10.77.0.10"]);
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(peer);
        context.Request.Scheme = "http";
        context.Request.Headers["X-Forwarded-For"] = "198.51.100.99, 203.0.113.8";
        context.Request.Headers["X-Forwarded-Proto"] = "https";
        var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(options));
        await middleware.Invoke(context);
        Assert.Equal(expectedIp, context.Connection.RemoteIpAddress!.ToString());
        Assert.Equal(expectedScheme, context.Request.Scheme);
    }
}
