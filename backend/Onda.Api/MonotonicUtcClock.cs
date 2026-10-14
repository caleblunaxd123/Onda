namespace Onda.Api;

/// <summary>UTC anchor for wire/persistence plus monotonic elapsed time within one API process.</summary>
public sealed class MonotonicUtcClock(TimeProvider source) : TimeProvider
{
    private readonly DateTimeOffset anchor = source.GetUtcNow();
    private readonly long started = source.GetTimestamp();
    public override DateTimeOffset GetUtcNow() => anchor + source.GetElapsedTime(started, source.GetTimestamp());
    public override long GetTimestamp() => source.GetTimestamp();
    public override long TimestampFrequency => source.TimestampFrequency;
}
