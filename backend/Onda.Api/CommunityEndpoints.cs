using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Onda.Infrastructure;
namespace Onda.Api;

public static class CommunityEndpoints
{
    public static void MapCommunityEndpoints(this WebApplication app)
    {
        var auth = app.MapGroup("/api/v1/auth").CacheOutput(p => p.NoCache());
        auth.MapGet("/providers", (IConfiguration config) => Results.Ok(new {google = new {
            enabled = !string.IsNullOrWhiteSpace(config["Google:WebClientId"]), webClientId = config["Google:WebClientId"], iosClientId = config["Google:IosClientId"],
        }}));
        auth.MapPost("/google/challenge", (IConfiguration config, GoogleChallenges challenges) => string.IsNullOrWhiteSpace(config["Google:WebClientId"])
            ? Results.Problem("Google todavía no está disponible. Puedes entrar con correo o como invitado.", statusCode: 503)
            : Results.Ok(new {nonce = challenges.Create()})).RequireRateLimiting("account");
        auth.MapPost("/google", async (GoogleLogin input, ClaimsPrincipal user, IGoogleIdentityVerifier verifier, GoogleChallenges challenges,
            IConfiguration config, AccountService accounts, RoomPresence presence, IHubContext<RoomsHub> hub, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(config["Google:WebClientId"])) return Results.Problem("Google todavía no está disponible.", statusCode: 503);
            if (input.IdToken is not {Length: > 0 and <= 8192} || input.Nonce is not {Length: 64}) return Results.Problem("No se pudo verificar el acceso con Google.", statusCode: 401);
            var identity = await verifier.VerifyAsync(input.IdToken, ct);
            if (identity is null || identity.Nonce != input.Nonce || !challenges.Consume(input.Nonce)) return Results.Problem("El acceso con Google venció o no es válido. Inténtalo otra vez.", statusCode: 401);
            var current = user.Identity?.IsAuthenticated == true ? user.ListenerId() : (Guid?)null;
            var session = await accounts.GoogleAsync(identity, current, ct);
            if (session is null) return Results.Problem("Este correo ya tiene una cuenta. Inicia sesión con su contraseña antes de conectar Google.", statusCode: 409);
            if (current == session.User.Id) await NotifyRevoked(presence.Revoke(session.User.Id), hub);
            return Results.Ok(session);
        }).RequireRateLimiting("account");
        auth.MapPost("/guest", async (GuestAccount input, AccountService accounts, CancellationToken ct) => Results.Ok(await accounts.GuestAsync(input.DisplayName, ct))).RequireRateLimiting("account");
        auth.MapPost("/register", async (RegisterAccount input, ClaimsPrincipal user, AccountService accounts, RoomPresence presence, IHubContext<RoomsHub> hub, CancellationToken ct) =>
        {
            var result = await accounts.RegisterAsync(input, user.Identity?.IsAuthenticated == true ? user.ListenerId() : null, ct);
            if (result is not null && user.Identity?.IsAuthenticated == true) await NotifyRevoked(presence.Revoke(user.ListenerId()), hub);
            return result is null ? Results.Problem("Revisa el nombre, correo y contraseña (10–128 caracteres), o inicia sesión si ya tienes cuenta.", statusCode: 400) : Results.Ok(result);
        }).RequireRateLimiting("account");
        auth.MapPost("/login", async (LoginAccount input, AccountService accounts, CancellationToken ct) =>
            await accounts.LoginAsync(input, ct) is { } session ? Results.Ok(session) : Results.Problem("Correo o contraseña incorrectos. Si hubo varios intentos, espera 15 minutos.", statusCode: 401)).RequireRateLimiting("account");
        auth.MapPost("/recover", async (RecoverAccount input, AccountService accounts, RoomPresence presence, IHubContext<RoomsHub> hub, CancellationToken ct) =>
        {
            var session = await accounts.RecoverAsync(input, ct);
            if (session is null) return Results.Problem("No se pudo recuperar la cuenta. Revisa el correo, código y nueva contraseña.", statusCode: 400);
            await NotifyRevoked(presence.Revoke(session.User.Id), hub);
            return Results.Ok(session);
        }).RequireRateLimiting("account");
        auth.MapGet("/me", async (ClaimsPrincipal user, OndaDbContext db, CancellationToken ct) =>
            Results.Ok(AccountService.View(await db.ListenerAccounts.SingleAsync(x => x.Id == user.ListenerId(), ct)))).RequireAuthorization();
        auth.MapPost("/logout", async (ClaimsPrincipal user, OndaDbContext db, RoomPresence presence, IHubContext<RoomsHub> hub, CancellationToken ct) =>
        {
            var hash = user.FindFirstValue("sid")!;
            await db.ListenerSessions.Where(x => x.TokenHash == hash).ExecuteDeleteAsync(ct);
            await NotifyRevoked(presence.Revoke(user.ListenerId(), hash), hub); return Results.NoContent();
        }).RequireAuthorization();
        auth.MapPatch("/profile", async (ListenerProfile input, ClaimsPrincipal user, OndaDbContext db, RoomPresence presence, IHubContext<RoomsHub> hub, CancellationToken ct) =>
        {
            var name = Onda.Application.Text.CleanName(input.DisplayName ?? "", 40).Trim();
            if (input.DisplayName is not {Length: <= 40} || name.Length < 2) return Results.Problem("Elige un nombre de 2 a 40 caracteres.", statusCode: 400);
            var account = await db.ListenerAccounts.SingleAsync(x => x.Id == user.ListenerId(), ct); account.DisplayName = name;
            await db.SaveChangesAsync(ct); await NotifyRevoked(presence.Revoke(account.Id), hub);
            return Results.Ok(AccountService.View(account));
        }).RequireAuthorization().RequireRateLimiting("account");
        auth.MapDelete("/account", async ([Microsoft.AspNetCore.Mvc.FromBody] PasswordConfirmation input, ClaimsPrincipal user, AccountService accounts, OndaDbContext db, RoomPresence presence, IHubContext<RoomsHub> hub, CancellationToken ct) =>
        {
            var id = user.ListenerId();
            var owned = await db.ListeningRooms.Where(x => x.OwnerId == id).Select(x => x.Id).ToArrayAsync(ct);
            if (!await accounts.DeleteAsync(id, input.Password, ct)) return Results.Problem("Confirma tu contraseña para eliminar la cuenta.", statusCode: 400);
            foreach (var room in owned) {await hub.Clients.Group(room.ToString()).SendAsync("Closed", room, ct); presence.Close(room);}
            await NotifyRevoked(presence.Revoke(id), hub); return Results.NoContent();
        }).RequireAuthorization().RequireRateLimiting("account");
        var library = app.MapGroup("/api/v1/library").RequireAuthorization("RegisteredListener").CacheOutput(p => p.NoCache());
        library.MapGet("/", async (ClaimsPrincipal user, LibrarySyncService sync, CancellationToken ct) => Results.Ok(await sync.GetAsync(user.ListenerId(), ct)));
        library.MapPut("/", async (SaveLibraryRequest request, ClaimsPrincipal user, LibrarySyncService sync, CancellationToken ct) =>
        {
            if (!LibrarySyncService.Valid(request.Library) || request.Version < 0) return Results.Problem("Biblioteca inválida o demasiado grande.", statusCode: 400);
            var saved = await sync.SaveAsync(user.ListenerId(), request, ct);
            return saved is null ? Results.Problem("Tu biblioteca cambió en otro dispositivo. Vuelve a sincronizar para combinarla.", statusCode: 409) : Results.Ok(saved);
        }).WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(1000000));
        var roomApi = app.MapGroup("/api/v1/rooms").CacheOutput(p => p.NoCache());
        roomApi.MapGet("/", async (bool? mine, ClaimsPrincipal user, RoomService rooms, CancellationToken ct) =>
            Results.Ok(new {items = await rooms.ListAsync(user.Identity?.IsAuthenticated == true ? user.ListenerId() : null, mine == true, ct)}));
        roomApi.MapPost("/", async (CreateRoom request, ClaimsPrincipal user, RoomService rooms, CancellationToken ct) =>
            await rooms.CreateAsync(user.ListenerId(), request, ct) is { } created ? Results.Created($"/api/v1/rooms/{created.Id}", created) : Results.Problem("Elige un nombre y contenido compatible. Puedes mantener hasta 3 salas abiertas.", statusCode: 400)).RequireAuthorization().RequireRateLimiting("create-room");
        roomApi.MapGet("/invite/{code}", async (string code, ClaimsPrincipal user, RoomService rooms, CancellationToken ct) =>
            await rooms.ByCodeAsync(code, user.ListenerId(), ct) is { } room ? Results.Ok(room) : Results.Problem("Invitación inválida, sala cerrada o acceso restringido.", statusCode: 404)).RequireAuthorization();
        roomApi.MapPost("/{id:guid}/reports", async (Guid id, RoomReportRequest request, ClaimsPrincipal user, OndaDbContext db, CancellationToken ct) =>
        {
            if (request.Reason is not {Length: >= 3 and <= 500} || !await db.ListeningRooms.AnyAsync(x => x.Id == id, ct)) return Results.Problem("Indica el motivo del reporte.", statusCode: 400);
            db.CommunityReports.Add(new() {RoomId = id, ReporterId = user.ListenerId(), AccountId = request.AccountId, Reason = Onda.Application.Text.CleanName(request.Reason, 500), CreatedAt = DateTimeOffset.UtcNow});
            await db.SaveChangesAsync(ct); return Results.Ok(new {status = "received"});
        }).RequireAuthorization().RequireRateLimiting("reports");
        app.MapPost("/api/v1/media/resolve", async (MediaInput input, MediaResolver resolver, CancellationToken ct) =>
            await resolver.ResolveAsync(input, ct) is { } media ? Results.Ok(media) : Results.Problem("Usa YouTube, una radio del catálogo o un archivo HTTPS público: MP3/M4A/OGG/AAC/WAV o MP4/WebM.", statusCode: 400)).RequireAuthorization().CacheOutput(p => p.NoCache());
    }
    private static Task NotifyRevoked(Guid[] rooms, IHubContext<RoomsHub> hub) => Task.WhenAll(rooms.Select(room => hub.Clients.Group(room.ToString()).SendAsync("Refresh")));
}
