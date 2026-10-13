using Microsoft.EntityFrameworkCore;
using Onda.Domain;
namespace Onda.Infrastructure;
public sealed class OndaDbContext(DbContextOptions<OndaDbContext> options) : DbContext(options)
{
    public const string BinaryCollation = "Latin1_General_100_BIN2";
    public DbSet<StationEntity> Stations => Set<StationEntity>();
    public DbSet<StationTag> StationTags => Set<StationTag>();
    public DbSet<StationLanguage> StationLanguages => Set<StationLanguage>();
    public DbSet<SyncRun> SyncRuns => Set<SyncRun>();
    public DbSet<StationReport> StationReports => Set<StationReport>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<StationEntity>(e =>
        {
            e.ToTable("Stations");
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).ValueGeneratedNever();
            e.Property(s => s.Name).HasMaxLength(300);
            e.Property(s => s.SearchName).HasMaxLength(300);
            e.Property(s => s.CountryCode).HasMaxLength(2).IsUnicode(false);
            e.Property(s => s.Country).HasMaxLength(100);
            e.Property(s => s.Region).HasMaxLength(150);
            e.Property(s => s.SearchRegion).HasMaxLength(150);
            e.Property(s => s.Language).HasMaxLength(200);
            e.Property(s => s.StreamUrl).HasMaxLength(2000);
            e.Property(s => s.AlternateStreamUrl).HasMaxLength(2000);
            e.Property(s => s.Homepage).HasMaxLength(2000);
            e.Property(s => s.ArtworkUrl).HasMaxLength(2000);
            e.Property(s => s.Codec).HasMaxLength(40);
            e.Property(s => s.VariantKey).HasMaxLength(40).IsUnicode(false);
            e.Property(s => s.Availability).HasMaxLength(16).IsUnicode(false);
            e.HasMany(s => s.Tags).WithOne().HasForeignKey(t => t.StationId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(s => s.Languages).WithOne().HasForeignKey(l => l.StationId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(s => s.UpdatedAt);
            // Popular listing per country, covering the common filter columns.
            e.HasIndex(s => new { s.CountryCode, s.ClickCount }).IncludeProperties(s => new { s.IsActive, s.HasHttpsStream, s.Availability, s.IsPrimaryVariant, s.Votes });
            e.HasIndex(s => s.ClickCount).IncludeProperties(s => new { s.IsActive, s.HasHttpsStream, s.Availability, s.IsPrimaryVariant, s.CountryCode });
            // Viewport (bounding box) queries; filtered to geolocated stations.
            e.HasIndex(s => new { s.Latitude, s.Longitude }).HasDatabaseName("IX_Stations_Geo").HasFilter("[Latitude] IS NOT NULL")
                .IncludeProperties(s => new { s.IsActive, s.HasHttpsStream, s.Availability, s.IsPrimaryVariant, s.CountryCode, s.ClickCount });
            e.HasIndex(s => s.SearchName);
            e.HasIndex(s => new { s.CountryCode, s.SearchRegion });
            e.HasIndex(s => s.VariantKey).HasFilter("[VariantKey] IS NOT NULL");
            e.HasIndex(s => s.SampleKey);
            e.HasIndex(s => s.LastSeenAt);
        });
        model.Entity<StationTag>(e =>
        {
            e.HasKey(t => new { t.StationId, t.Tag });
            // Binary collation: SQL uniqueness must match the ordinal comparison used when normalizing in C#.
            e.Property(t => t.Tag).HasMaxLength(40).UseCollation(BinaryCollation);
            e.HasIndex(t => t.Tag);
        });
        model.Entity<StationLanguage>(e =>
        {
            e.HasKey(l => new { l.StationId, l.Code });
            e.Property(l => l.Code).HasMaxLength(40).UseCollation(BinaryCollation);
            e.HasIndex(l => l.Code);
        });
        model.Entity<SyncRun>(e =>
        {
            e.Property(r => r.Status).HasMaxLength(16).IsUnicode(false);
            e.Property(r => r.LastError).HasMaxLength(1000);
            e.HasIndex(r => r.StartedAt);
        });
        model.Entity<StationReport>(e =>
        {
            e.Property(r => r.Kind).HasMaxLength(20).IsUnicode(false);
            e.Property(r => r.Message).HasMaxLength(500);
            e.Property(r => r.StreamUrl).HasMaxLength(2000);
            e.Property(r => r.AppVersion).HasMaxLength(30);
            e.Property(r => r.Platform).HasMaxLength(20);
            e.Property(r => r.Status).HasMaxLength(16).IsUnicode(false);
            e.HasIndex(r => new { r.StationId, r.CreatedAt });
            e.HasIndex(r => new { r.Status, r.CreatedAt });
        });
    }
}
