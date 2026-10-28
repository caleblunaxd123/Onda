using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Onda.Api;
using Onda.Application;
using Onda.Infrastructure;
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 1_000_000);
// Production mounts the SQL credential as a read-only file, never in the image or public env.
if (builder.Configuration["ConnectionStringFile"] is {Length: > 0} connectionFile)
    builder.Configuration["ConnectionStrings:Onda"] = File.ReadAllText(connectionFile).Trim();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
    ProxyHeaders.Configure(options, builder.Configuration.GetSection("ReverseProxy:KnownProxies").Get<string[]>() ?? []));
builder.Logging.AddJsonConsole();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddPolicy("LocalWebPreview", policy =>
    policy.WithOrigins("http://localhost:8081", "http://127.0.0.1:8081")
        .WithMethods("GET", "POST").AllowAnyHeader()));
builder.Services.AddCors(options => options.AddPolicy("AppWeb", policy =>
    policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
        .WithMethods("GET", "POST").AllowAnyHeader()));
builder.Services.AddDbContext<OndaDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Onda")
    ?? throw new InvalidOperationException("Configure ConnectionStrings__Onda."), sql => sql.EnableRetryOnFailure(3)));
builder.Services.AddOndaCatalog(builder.Configuration);
builder.Services.AddOutputCache(o =>
{
    o.AddBasePolicy(p => p.Expire(TimeSpan.FromMinutes(5)).SetVaryByQuery("*"));
    o.AddPolicy("facets", p => p.Expire(TimeSpan.FromMinutes(30)).SetVaryByQuery("*"));
});
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new() { PermitLimit = 240, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("reports", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new() { PermitLimit = 10, Window = TimeSpan.FromMinutes(10), QueueLimit = 0 }));
});
var app = builder.Build();
app.UseForwardedHeaders();
app.UseExceptionHandler();
if (app.Environment.IsDevelopment()) app.UseCors("LocalWebPreview");
else app.UseCors("AppWeb");
app.UseRateLimiter();
app.UseOutputCache();
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));
app.MapGet("/health/ready", async (OndaDbContext db, CancellationToken ct) =>
    await db.Database.CanConnectAsync(ct) ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503));

var api = app.MapGroup("/api/v1");
api.MapGet("/stations", async (HttpRequest request, ICatalogQueries catalog, CancellationToken ct) =>
{
    if (!StationQueryParser.TryParse(request.Query, out var query, out var error)) return Results.Problem(error, statusCode: 400);
    try
    {
        var page = await catalog.SearchAsync(query.Filter, query.Cursor, query.Limit, ct);
        return Results.Ok(new { page.Items, page.NextCursor, page.HasMore, page.Source, page.Total, page.Stale, limit = query.Limit });
    }
    catch (HttpRequestException) { return Results.Problem("No se pudo consultar el catálogo de radios. Intenta nuevamente.", statusCode: 503); }
}).CacheOutput();
api.MapGet("/stations/lookup", async (string? ids, ICatalogQueries catalog, CancellationToken ct) =>
{
    var parsed = StationQueryParser.ParseIds(ids, 100);
    if (parsed is null || parsed.Count == 0) return Results.Problem("Indica entre 1 y 100 identificadores válidos.", statusCode: 400);
    return Results.Ok(new { items = await catalog.LookupAsync(parsed, ct) });
});
api.MapGet("/map", async (HttpRequest request, ICatalogQueries catalog, CancellationToken ct) =>
{
    if (!StationQueryParser.TryParse(request.Query, out var query, out var error)) return Results.Problem(error, statusCode: 400);
    if (query.Filter.Bounds is null || !double.TryParse(request.Query["zoom"], System.Globalization.CultureInfo.InvariantCulture, out var zoom) || zoom is < 0 or > 22)
        return Results.Problem("Indica bbox=oeste,sur,este,norte y zoom entre 0 y 22.", statusCode: 400);
    var area = await catalog.MapAsync(query.Filter.Bounds, zoom, query.Filter, ct);
    return Results.Ok(area);
}).CacheOutput();
api.MapGet("/facets/countries", async (ICatalogQueries catalog, CancellationToken ct) => Results.Ok(new { items = await catalog.CountriesAsync(ct) })).CacheOutput("facets");
api.MapGet("/facets/languages", async (ICatalogQueries catalog, CancellationToken ct) => Results.Ok(new { items = await catalog.LanguagesAsync(ct) })).CacheOutput("facets");
api.MapGet("/facets/tags", async (ICatalogQueries catalog, CancellationToken ct) => Results.Ok(new { items = await catalog.TagsAsync(ct) })).CacheOutput("facets");
api.MapGet("/facets/places", async (string? country, ICatalogQueries catalog, CancellationToken ct) =>
    StationQueryParser.CountryCode(country) is { } code ? Results.Ok(new { items = await catalog.PlacesAsync(code, ct) })
        : Results.Problem("Indica un país con código de dos letras.", statusCode: 400)).CacheOutput("facets");
api.MapGet("/catalog/status", async (ICatalogQueries catalog, CancellationToken ct) => Results.Ok(await catalog.StatusAsync(ct)));
api.MapPost("/stations/{id:guid}/reports", async (Guid id, ReportRequest body, IStationReports reports, CancellationToken ct) =>
{
    if (body.Kind is null || !ReportKinds.All.Contains(body.Kind) || body.Message?.Length > 500 || body.AppVersion?.Length > 30 || body.Platform?.Length > 20 ||
        body.StreamUrl is not null && (body.StreamUrl.Length > 2000 || !body.StreamUrl.StartsWith("https://", StringComparison.Ordinal)))
        return Results.Problem("Reporte inválido.", statusCode: 400);
    var reportId = await reports.CreateAsync(id, new(body.Kind, body.Message, body.StreamUrl, body.AppVersion, body.Platform), ct);
    return reportId is null ? Results.Problem("La emisora no existe en el catálogo.", statusCode: 404)
        : Results.Created($"/api/v1/reports/{reportId}", new { id = reportId, status = "received" });
}).RequireRateLimiting("reports");
api.MapGet("/moods", () => Recommendations.Moods);

if (builder.Configuration["PublicAssetsPath"] is { } assets && Directory.Exists(assets))
{
    var files = new StaticFileOptions {FileProvider = new PhysicalFileProvider(assets), OnPrepareResponse = context =>
    {
        if (context.File.Name.Equals("index.html", StringComparison.OrdinalIgnoreCase))
            context.Context.Response.Headers.CacheControl = "no-store, max-age=0";
    }};
    app.UseStaticFiles(files);
    app.MapGet("/downloads/ONDA-beta.apk", () => File.Exists(Path.Combine(assets, "downloads", "ONDA-beta.apk"))
        ? Results.File(Path.Combine(assets, "downloads", "ONDA-beta.apk"), "application/vnd.android.package-archive", "ONDA-beta.apk", enableRangeProcessing: true)
        : Results.Problem("La descarga se está preparando.", statusCode: 503)).CacheOutput(p => p.NoCache());
    // Retired API routes must never return the SPA HTML, including requests on the web hostname.
    app.MapMethods("/api/{**path}", ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], () => Results.NotFound());
    app.MapMethods("/hubs/{**path}", ["GET", "POST", "OPTIONS"], () => Results.NotFound());
    foreach (var retired in new[] {"/room", "/rooms", "/create-room", "/account", "/verify-email", "/ai"})
        app.MapGet(retired, () => Results.Redirect("/"));
    app.MapFallbackToFile("index.html", files).RequireHost("onda.lunalav.pe");
}

if (args.Contains("--migrate"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<OndaDbContext>().Database.MigrateAsync();
    return;
}
app.Run();
public partial class Program { }
