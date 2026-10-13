namespace Onda.Domain;
public sealed record Station(Guid Id, string Name, string Country, string CountryCode,
    string Language, string[] Tags, string StreamUrl, string? ArtworkUrl, string Codec,
    int Bitrate, int Votes, double? Latitude, double? Longitude);
public sealed class CatalogEntry
{
    public Guid Id { get; set; }
    public string Payload { get; set; } = "";
    public DateTimeOffset UpdatedAt { get; set; }
}
