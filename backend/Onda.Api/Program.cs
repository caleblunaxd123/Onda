using Microsoft.EntityFrameworkCore;
using Onda.Application;
using Onda.Infrastructure;
using System.Threading.RateLimiting;
var builder = WebApplication.CreateBuilder(args);
builder.Logging.AddJsonConsole();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddPolicy("LocalWebPreview", policy =>
    policy.WithOrigins("http://localhost:8081", "http://127.0.0.1:8081")
        .WithMethods("GET").AllowAnyHeader()));
builder.Services.AddDbContext<OndaDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Onda")
    ?? throw new InvalidOperationException("Configure ConnectionStrings__Onda.")));
builder.Services.AddHttpClient<IStationCatalog, RadioBrowserCatalog>(c => {
    c.Timeout = TimeSpan.FromSeconds(8);
    c.DefaultRequestHeaders.UserAgent.ParseAdd("ONDA/0.1 (radio-discovery)");
}).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
builder.Services.AddOutputCache(o => o.AddBasePolicy(p => p.Expire(TimeSpan.FromMinutes(5)).SetVaryByQuery("*")));
builder.Services.AddRateLimiter(o => {
    o.RejectionStatusCode = 429;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new() { PermitLimit = 90, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
var app = builder.Build();
app.UseExceptionHandler();
if (app.Environment.IsDevelopment()) app.UseCors("LocalWebPreview");
app.UseRateLimiter();
app.UseOutputCache();
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));
app.MapGet("/health/ready", async (OndaDbContext db, CancellationToken ct) =>
    await db.Database.CanConnectAsync(ct) ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503));
app.MapGet("/api/v1/stations", async (string? q, string? country, string? tag, string? language, int? offset, int? limit, IStationCatalog catalog, CancellationToken ct) => {
    if (q?.Length > 100 || tag?.Length > 50 || language?.Length > 50 || country is not null && (country.Length != 2 || !country.All(char.IsAsciiLetter)) || offset is < 0 or > 10000 || limit is < 1 or > 100)
        return Results.Problem("Filtros inválidos.", statusCode: 400);
    try {
        var rows = await catalog.SearchAsync(new(q, country?.ToUpperInvariant(), tag, language, offset ?? 0, limit ?? 30), ct);
        return Results.Ok(new { items = rows, offset = offset ?? 0, limit = limit ?? 30 });
    } catch (HttpRequestException) { return Results.Problem("No se pudo consultar Radio Browser. Intenta nuevamente.", statusCode: 503); }
}).CacheOutput();
app.MapGet("/api/v1/moods", () => Recommendations.Moods);
if (args.Contains("--migrate")) {
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<OndaDbContext>().Database.MigrateAsync();
    return;
}
app.Run();
public partial class Program { }
