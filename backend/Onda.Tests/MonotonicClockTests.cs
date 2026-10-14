using Onda.Api;
namespace Onda.Tests;
public sealed class MonotonicClockTests
{
    private sealed class SourceClock : TimeProvider
    {
        public DateTimeOffset Wall = DateTimeOffset.UnixEpoch.AddDays(1);
        public long Ticks;
        public override DateTimeOffset GetUtcNow() => Wall;
        public override long GetTimestamp() => Ticks;
        public override long TimestampFrequency => 1000;
    }
    [Fact] public void PlaybackClockIgnoresForwardAndBackwardWallClockCorrections()
    {
        var source = new SourceClock(); var clock = new MonotonicUtcClock(source); var start = clock.GetUtcNow();
        source.Ticks += 1000; source.Wall -= TimeSpan.FromHours(2);
        Assert.Equal(start.AddSeconds(1), clock.GetUtcNow());
        source.Ticks += 1000; source.Wall += TimeSpan.FromHours(5);
        Assert.Equal(start.AddSeconds(2), clock.GetUtcNow());
        Assert.Equal(TimeSpan.FromSeconds(2), clock.GetElapsedTime(0, clock.GetTimestamp()));
    }
}
