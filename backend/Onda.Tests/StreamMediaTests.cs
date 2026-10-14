using Onda.Api;
using Xunit;
namespace Onda.Tests;

public sealed class StreamMediaTests
{
    [Theory]
    [InlineData("https://www.netflix.com/watch/81234567?trackId=1&tctx=abc", "netflix", "https://www.netflix.com/watch/81234567")]
    [InlineData("https://www.netflix.com/pe/title/80100172", "netflix", "https://www.netflix.com/pe/title/80100172")]
    [InlineData("https://www.primevideo.com/detail/0ABCDEF/ref=atv_hm", "prime", "https://www.primevideo.com/detail/0ABCDEF/ref=atv_hm")]
    [InlineData("https://www.amazon.com/gp/video/detail/B0XYZ", "prime", "https://www.amazon.com/gp/video/detail/B0XYZ")]
    [InlineData("https://www.disneyplus.com/video/abc-123#t=10", "disney", "https://www.disneyplus.com/video/abc-123")]
    [InlineData("https://play.max.com/video/watch/uuid", "max", "https://play.max.com/video/watch/uuid")]
    [InlineData("https://tv.apple.com/pe/show/severance/umc.cmc.1", "appletv", "https://tv.apple.com/pe/show/severance/umc.cmc.1")]
    [InlineData("https://www.crunchyroll.com/watch/G4VUQ1/x", "crunchyroll", "https://www.crunchyroll.com/watch/G4VUQ1/x")]
    public void OfficialTitleLinksAreAcceptedWithoutQueryOrFragment(string url, string service, string clean)
    {
        var media = MediaResolver.StreamMedia(new("stream", url, Title: "  Mi   serie "));
        Assert.NotNull(media);
        Assert.Equal("stream", media!.Kind);
        Assert.Equal(service, media.Category);
        Assert.Equal(clean, media.Url);
        Assert.Equal("Mi serie", media.Title);
        Assert.Null(media.VideoId);
    }

    [Theory]
    [InlineData("http://www.netflix.com/watch/81234567")]
    [InlineData("https://netflix.com.evil.example/watch/1")]
    [InlineData("https://www.netflix.com/")]
    [InlineData("https://www.netflix.com/browse")]
    [InlineData("https://user:pass@www.netflix.com/watch/1")]
    [InlineData("https://www.netflix.com:8443/watch/1")]
    [InlineData("https://www.amazon.com/s?k=tv")]
    [InlineData("https://example.com/video.mp4")]
    [InlineData("not a url")]
    public void OtherLinksAreRejected(string url) => Assert.Null(MediaResolver.StreamMedia(new("stream", url)));

    [Fact]
    public void ServiceNameIsUsedWhenNoTitleIsGiven()
    {
        Assert.Equal("Título en Netflix", MediaResolver.StreamMedia(new("stream", "https://www.netflix.com/watch/1"))!.Title);
        Assert.Null(MediaResolver.StreamMedia(new("video", "https://www.netflix.com/watch/1")));
    }
}
