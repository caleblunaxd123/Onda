namespace Onda.Domain;

public sealed class ListenerAccount
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
    public string? GoogleSubject { get; set; }
    public string DisplayName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string RecoveryHash { get; set; } = "";
    public int FailedLogins { get; set; }
    public DateTimeOffset? LockedUntil { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
public sealed class ListenerSession
{
    public string TokenHash { get; set; } = "";
    public Guid AccountId { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
}
public sealed class CloudLibrary
{
    public Guid AccountId { get; set; }
    public string Payload { get; set; } = "{}";
    public long Version { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
public sealed class ListeningRoom
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = "";
    public bool IsPrivate { get; set; }
    public string InviteCode { get; set; } = "";
    public string Media { get; set; } = "{}";
    public string Queue { get; set; } = "[]";
    public string Cohosts { get; set; } = "[]";
    public bool AutoRecovery { get; set; }
    public bool IsPlaying { get; set; }
    public double PositionSeconds { get; set; }
    public DateTimeOffset PlaybackUpdatedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public bool Closed { get; set; }
    public long Version { get; set; }
}
public sealed class RoomBan
{
    public Guid RoomId { get; set; }
    public Guid AccountId { get; set; }
}
public sealed class CommunityReport
{
    public long Id { get; set; }
    public Guid RoomId { get; set; }
    public Guid ReporterId { get; set; }
    public Guid? AccountId { get; set; }
    public Guid? MessageId { get; set; }
    public string? MessageSnapshot { get; set; }
    public string Status { get; set; } = "received";
    public DateTimeOffset? ReviewedAt { get; set; }
    public Guid? ReviewedBy { get; set; }
    public string? ReviewNote { get; set; }
    public string Reason { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}
public sealed class UserBlock
{
    public Guid BlockerId { get; set; }
    public Guid BlockedId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
public sealed class RoomChatEntry
{
    public Guid Id { get; set; }
    public Guid RoomId { get; set; }
    public Guid SenderId { get; set; }
    public string Payload { get; set; } = "{}";
    public DateTimeOffset At { get; set; }
    public long Version { get; set; }
}
public sealed class RoomUpload
{
    public Guid Id { get; set; }
    public Guid RoomId { get; set; }
    public Guid UploaderId { get; set; }
    public Guid? MessageId { get; set; }
    public string Name { get; set; } = "";
    public string Mime { get; set; } = "";
    public string Kind { get; set; } = "file";
    public long Length { get; set; }
    /// <summary>Voice note length reported by the recording client; display only.</summary>
    public int? DurationMs { get; set; }
    public DateTimeOffset At { get; set; }
}
