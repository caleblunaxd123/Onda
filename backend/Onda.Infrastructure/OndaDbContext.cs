using Microsoft.EntityFrameworkCore;
using Onda.Domain;
namespace Onda.Infrastructure;
public sealed class OndaDbContext(DbContextOptions<OndaDbContext> options) : DbContext(options)
{
    public DbSet<CatalogEntry> Stations => Set<CatalogEntry>();
    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<CatalogEntry>().HasKey(s => s.Id);
        model.Entity<CatalogEntry>().Property(s => s.Payload).HasColumnType("nvarchar(max)");
        model.Entity<CatalogEntry>().HasIndex(s => s.UpdatedAt);
    }
}
