using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Onda.Application;
using Onda.Domain;
namespace Onda.Infrastructure;

public sealed class StationReportService(OndaDbContext db, TimeProvider clock) : IStationReports
{
    public async Task<long?> CreateAsync(Guid stationId, ReportInput input, CancellationToken ct)
    {
        if (!await db.Stations.AnyAsync(s => s.Id == stationId, ct)) return null;
        var report = new StationReport
        {
            StationId = stationId, Kind = input.Kind, Message = string.IsNullOrWhiteSpace(input.Message) ? null : Text.CleanName(input.Message, 500),
            StreamUrl = input.StreamUrl, AppVersion = Text.CleanName(input.AppVersion, 30), Platform = Text.CleanName(input.Platform, 20),
            CreatedAt = clock.GetUtcNow(),
        };
        db.StationReports.Add(report);
        await db.SaveChangesAsync(ct);
        return report.Id;
    }
}

public static class DependencyInjection
{
    public static IServiceCollection AddOndaCatalog(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<CatalogOptions>(configuration.GetSection("Catalog"));
        services.AddMemoryCache(o => o.SizeLimit = 1000);
        services.AddSingleton(TimeProvider.System);
        services.AddHttpClient<IRadioBrowserClient, RadioBrowserClient>(c =>
        {
            c.Timeout = TimeSpan.FromSeconds(60);
            c.DefaultRequestHeaders.UserAgent.ParseAdd("ONDA/0.2 (radio-discovery; +https://github.com/caleblunaxd123/Onda)");
        }).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
        {
            AllowAutoRedirect = false, AutomaticDecompression = DecompressionMethods.All, PooledConnectionLifetime = TimeSpan.FromMinutes(10),
        });
        services.AddScoped<CatalogStore>();
        services.AddScoped<CatalogQueryService>();
        services.AddScoped<ICatalogQueries>(sp => sp.GetRequiredService<CatalogQueryService>());
        services.AddScoped<IStationReports, StationReportService>();
        services.AddScoped<CatalogSynchronizer>();
        services.AddHostedService<CatalogSyncService>();
        return services;
    }
}
