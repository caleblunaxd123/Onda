namespace Onda.Domain;

/// <summary>Station returned by the API. The first fields keep the original contract used by stored mobile libraries.</summary>
public sealed record Station(Guid Id, string Name, string Country, string CountryCode,
    string Language, string[] Tags, string StreamUrl, string? ArtworkUrl, string Codec,
    int Bitrate, int Votes, double? Latitude, double? Longitude,
    string Region = "", string[]? Streams = null, string? Homepage = null,
    string Availability = Availability.Unknown, string[]? LanguageCodes = null);

public static class Availability
{
    public const string Unknown = "unknown";
    public const string Ok = "ok";
    /// <summary>One or two consecutive failed source checks: still listed, ranked lower.</summary>
    public const string Unstable = "unstable";
    /// <summary>Three or more consecutive, distinct failed checks.</summary>
    public const string Down = "down";
    public const int DownAfterConsecutiveFailures = 3;
}

/// <summary>Normalized catalog row persisted in SQL Server (table Stations).</summary>
public sealed class StationEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string SearchName { get; set; } = "";
    public string CountryCode { get; set; } = "";
    public string Country { get; set; } = "";
    public string Region { get; set; } = "";
    public string SearchRegion { get; set; } = "";
    public string Language { get; set; } = "";
    public string StreamUrl { get; set; } = "";
    public string? AlternateStreamUrl { get; set; }
    public bool HasHttpsStream { get; set; }
    public string? Homepage { get; set; }
    public string? ArtworkUrl { get; set; }
    public string Codec { get; set; } = "";
    public int Bitrate { get; set; }
    public bool IsHls { get; set; }
    public int Votes { get; set; }
    public int ClickCount { get; set; }
    public int ClickTrend { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? VariantKey { get; set; }
    public bool IsPrimaryVariant { get; set; } = true;
    public bool SourceCheckOk { get; set; } = true;
    public DateTimeOffset? SourceCheckedAt { get; set; }
    public DateTimeOffset? SourceChangedAt { get; set; }
    public int ConsecutiveFailedChecks { get; set; }
    public string Availability { get; set; } = Domain.Availability.Unknown;
    public bool IsActive { get; set; } = true;
    /// <summary>Stable pseudo-random key derived from the id; lets SQL take seeded samples of the long tail.</summary>
    public int SampleKey { get; set; }
    public DateTimeOffset FirstSeenAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<StationTag> Tags { get; set; } = [];
    public List<StationLanguage> Languages { get; set; } = [];
}

public sealed class StationTag
{
    public Guid StationId { get; set; }
    public string Tag { get; set; } = "";
    public int Position { get; set; }
}

public sealed class StationLanguage
{
    public Guid StationId { get; set; }
    public string Code { get; set; } = "";
    public int Position { get; set; }
}

public sealed class SyncRun
{
    public int Id { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset HeartbeatAt { get; set; }
    public string Status { get; set; } = SyncStatus.Running;
    public int NextOffset { get; set; }
    public int Processed { get; set; }
    public int Upserted { get; set; }
    public string? LastError { get; set; }
}

public static class SyncStatus
{
    public const string Running = "running";
    public const string Completed = "completed";
    public const string Failed = "failed";
}

/// <summary>User report about a station. Reviewed manually; never changes the catalog automatically.</summary>
public sealed class StationReport
{
    public long Id { get; set; }
    public Guid StationId { get; set; }
    public string Kind { get; set; } = "";
    public string? Message { get; set; }
    public string? StreamUrl { get; set; }
    public string? AppVersion { get; set; }
    public string? Platform { get; set; }
    public string Status { get; set; } = "open";
    public DateTimeOffset CreatedAt { get; set; }
}
