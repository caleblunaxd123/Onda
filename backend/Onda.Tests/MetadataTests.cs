using System.Net;
using System.Text;
using Microsoft.Extensions.Caching.Memory;
using Onda.Infrastructure;
namespace Onda.Tests;

public class MetadataTests
{
    [Theory]
    [InlineData("127.0.0.1")] [InlineData("10.77.0.10")] [InlineData("172.16.0.1")] [InlineData("192.168.1.1")]
    [InlineData("169.254.169.254")] [InlineData("100.64.0.1")] [InlineData("0.0.0.0")] [InlineData("224.0.0.1")]
    [InlineData("::1")] [InlineData("fe80::1")] [InlineData("fc00::1")] [InlineData("::ffff:127.0.0.1")]
    [InlineData("2001:db8::1")] [InlineData("2002:7f00:1::")]
    public void RejectsNonPublicAddresses(string value) => Assert.False(MetadataNetwork.IsPublic(IPAddress.Parse(value)));
    [Theory] [InlineData("8.8.8.8")] [InlineData("2606:4700:4700::1111")]
    public void AcceptsGlobalAddresses(string value) => Assert.True(MetadataNetwork.IsPublic(IPAddress.Parse(value)));
    [Theory]
    [InlineData("http://radio.example/live")] [InlineData("https://user:pass@radio.example/live")]
    [InlineData("https://localhost/live")] [InlineData("https://127.0.0.1/live")] [InlineData("https://radio.example:22/live")]
    [InlineData("https://radio.example/live#fragment")] [InlineData("file:///etc/passwd")]
    public void RejectsUnsafeUrls(string url) => Assert.False(MetadataNetwork.IsAllowed(new Uri(url)));

    [Fact] public async Task ReadsSplitBlocksSkipsEmptyMetadataAndPreservesAccentedTitles()
    {
        using var bytes = new MemoryStream();
        bytes.Write(new byte[7]);bytes.WriteByte(0);bytes.Write(new byte[7]);
        var metadata=Encoding.UTF8.GetBytes("StreamTitle='Björk - Jóga';StreamUrl='https://example.org';");
        var units=(metadata.Length+15)/16;bytes.WriteByte((byte)units);bytes.Write(metadata);bytes.Write(new byte[units*16-metadata.Length]);bytes.Position=0;
        Assert.Equal("Björk - Jóga",await IcyMetadataReader.ReadTitleAsync(bytes,7,CancellationToken.None));
    }
    [Theory]
    [InlineData("StreamTitle='Artist - Song';", "Artist - Song")]
    [InlineData("StreamTitle='Guns N' Roses - Don't Cry';", "Guns N' Roses - Don't Cry")]
    [InlineData("StreamTitle='Rock &amp; Roll';", "Rock & Roll")]
    [InlineData("StreamTitle='';", null)] [InlineData("StreamTitle='unknown';", null)]
    [InlineData("StreamUrl='https://example.com';", null)]
    public void ParsesOnlyPublishedTitles(string text,string? expected) => Assert.Equal(expected,IcyMetadataReader.ParseTitle(text));
    [Fact] public async Task RejectsInvalidIntervalsWithoutReadingAndBoundsMissingMetadata()
    {
        using var empty=new MemoryStream();Assert.Null(await IcyMetadataReader.ReadTitleAsync(empty,65537,CancellationToken.None));
        using var blocks=new MemoryStream(new byte[3*(7+1)]);Assert.Null(await IcyMetadataReader.ReadTitleAsync(blocks,7,CancellationToken.None));Assert.Equal(24,blocks.Position);
        await Assert.ThrowsAsync<EndOfStreamException>(()=>IcyMetadataReader.ReadTitleAsync(empty,7,CancellationToken.None));
    }
    private sealed class Reader : IMetadataReader
    {
        public int Calls;
        public Task<MetadataReading> ReadAsync(Uri uri,CancellationToken ct) {Calls++;return Task.FromResult(new MetadataReading("available","Artist - Song"));}
    }
    [Fact] public async Task SharesCachedProbesAndRetainsObservationTime()
    {
        using var memory=new MemoryCache(new MemoryCacheOptions{SizeLimit=10});var reader=new Reader();var cache=new MetadataCache(memory,reader,TimeProvider.System);
        var uri=new Uri("https://radio.example/live");var first=await cache.ReadAsync(uri,CancellationToken.None);var second=await cache.ReadAsync(uri,CancellationToken.None);
        Assert.Equal(1,reader.Calls);Assert.Equal(first,second);
    }
    private sealed class Handler(Func<HttpRequestMessage,HttpResponseMessage> reply) : HttpMessageHandler
    {
        public int Calls;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken ct){Calls++;Assert.True(request.Headers.Contains("Icy-MetaData"));return Task.FromResult(reply(request));}
    }
    [Fact] public async Task DoesNotFollowRedirectsToPrivateHostsOrDowngradeToHttp()
    {
        foreach(var target in new[]{"https://169.254.169.254/secrets","http://radio.example/live"})
        {
            var handler=new Handler(_=>new(HttpStatusCode.Redirect){Headers={Location=new Uri(target)}});
            using var http=new HttpClient(handler);var result=await new IcyMetadataReader(http).ReadAsync(new Uri("https://radio.example/live"),CancellationToken.None);
            Assert.Equal("unsupported",result.Status);Assert.Equal(1,handler.Calls);
        }
    }
    [Fact] public async Task HlsWithoutIcyDoesNotReadOrDownloadAudioSegments()
    {
        var handler=new Handler(_=>new(HttpStatusCode.OK){Content=new StringContent("#EXTM3U")});
        using var http=new HttpClient(handler);var result=await new IcyMetadataReader(http).ReadAsync(new Uri("https://radio.example/live.m3u8"),CancellationToken.None);
        Assert.Equal("unsupported",result.Status);Assert.Null(result.Title);Assert.Equal(1,handler.Calls);
    }
}
