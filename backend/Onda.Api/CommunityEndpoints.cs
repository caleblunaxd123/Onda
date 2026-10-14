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
        var blocks = app.MapGroup("/api/v1/safety/blocks").RequireAuthorization().CacheOutput(p => p.NoCache());
        blocks.MapGet("/", async (ClaimsPrincipal user, OndaDbContext db, CancellationToken ct) => Results.Ok(new {
            items = await db.UserBlocks.Where(x => x.BlockerId == user.ListenerId()).OrderByDescending(x => x.CreatedAt)
                .Join(db.ListenerAccounts, b => b.BlockedId, a => a.Id, (b, a) => new {id = a.Id, name = a.DisplayName, at = b.CreatedAt}).Take(500).ToArrayAsync(ct)
        }));
        blocks.MapPut("/{account:guid}", async (Guid account, ClaimsPrincipal user, OndaDbContext db, RoomPresence presence,
            IHubContext<RoomsHub> hub, TimeProvider clock, CancellationToken ct) =>
        {
            var me = user.ListenerId();
            if (account == me || !await db.ListenerAccounts.AnyAsync(x => x.Id == account, ct)) return Results.Problem("Elige otra persona para bloquear.", statusCode: 400);
            var gate = presence.RoomLock(me); await gate.WaitAsync(ct);
            try
            {
                if (!await db.UserBlocks.AnyAsync(x => x.BlockerId == me && x.BlockedId == account, ct))
                {
                    if (await db.UserBlocks.CountAsync(x => x.BlockerId == me, ct) >= 500) return Results.Problem("Revisa tu lista de bloqueados antes de añadir otra persona.", statusCode: 400);
                    db.UserBlocks.Add(new() {BlockerId = me, BlockedId = account, CreatedAt = clock.GetUtcNow()});
                    await db.SaveChangesAsync(ct);
                }
            }
            finally {gate.Release();}
            var active = presence.ActiveRooms();
            var owned = await db.ListeningRooms.AsNoTracking().Where(x => active.Contains(x.Id) && (x.OwnerId == me || x.OwnerId == account)).ToArrayAsync(ct);
            foreach (var room in owned)
            {
                var removed = room.OwnerId == me ? account : me;
                await hub.Clients.Group(room.Id.ToString()).SendAsync("AccessChanged", room.Id, removed, ct);
                presence.RevokeRoom(removed, room.Id);
                await hub.Clients.Group(room.Id.ToString()).SendAsync("Refresh", ct);
            }
            return Results.NoContent();
        }).RequireRateLimiting("account");
        blocks.MapDelete("/{account:guid}", async (Guid account, ClaimsPrincipal user, OndaDbContext db, CancellationToken ct) =>
        {
            await db.UserBlocks.Where(x => x.BlockerId == user.ListenerId() && x.BlockedId == account).ExecuteDeleteAsync(ct);
            return Results.NoContent();
        }).RequireRateLimiting("account");
        var roomApi = app.MapGroup("/api/v1/rooms").CacheOutput(p => p.NoCache());
        roomApi.MapGet("/", async (bool? mine, ClaimsPrincipal user, RoomService rooms, CancellationToken ct) =>
            Results.Ok(new {items = await rooms.ListAsync(user.Identity?.IsAuthenticated == true ? user.ListenerId() : null, mine == true, ct)}));
        roomApi.MapPost("/", async (CreateRoom request, ClaimsPrincipal user, RoomService rooms, CancellationToken ct) =>
            await rooms.CreateAsync(user.ListenerId(), request, ct) is { } created ? Results.Created($"/api/v1/rooms/{created.Id}", created) : Results.Problem("Elige un nombre y contenido compatible. Puedes mantener hasta 3 salas abiertas.", statusCode: 400)).RequireAuthorization().RequireRateLimiting("create-room");
        roomApi.MapGet("/invite/{code}", async (string code, ClaimsPrincipal user, RoomService rooms, CancellationToken ct) =>
            await rooms.ByCodeAsync(code, user.ListenerId(), ct) is { } room ? Results.Ok(room) : Results.Problem("Invitación inválida, sala cerrada o acceso restringido.", statusCode: 404)).RequireAuthorization();
        roomApi.MapPost("/{id:guid}/reports", async (Guid id, RoomReportRequest request, ClaimsPrincipal user, OndaDbContext db,
            RoomPresence presence, TimeProvider clock, CancellationToken ct) =>
        {
            var me = user.ListenerId();
            var room = await db.ListeningRooms.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
            if (room is null || room.OwnerId != me && !presence.Members(id).Any(x => x.Id == me)) return Results.NotFound();
            var reason = Onda.Application.Text.CleanName(request.Reason ?? "", 500).Trim();
            if (request.Reason is not {Length: >= 3 and <= 500} || reason.Length < 3) return Results.Problem("Indica el motivo del reporte.", statusCode: 400);
            Onda.Domain.RoomChatEntry? message = null;
            if (request.MessageId is { } messageId)
            {
                message = await db.RoomChatEntries.AsNoTracking().SingleOrDefaultAsync(x => x.Id == messageId && x.RoomId == id, ct);
                if (message is null || request.AccountId is { } target && target != message.SenderId) return Results.NotFound();
            }
            else if (request.AccountId is { } target && target != room.OwnerId && !presence.Members(id).Any(x => x.Id == target) &&
                !await db.RoomChatEntries.AnyAsync(x => x.RoomId == id && x.SenderId == target, ct)) return Results.NotFound();
            var now = clock.GetUtcNow();
            var targetId = message?.SenderId ?? request.AccountId;
            if (await db.CommunityReports.AnyAsync(x => x.RoomId == id && x.ReporterId == me && x.MessageId == request.MessageId && x.AccountId == targetId && x.CreatedAt > now.AddMinutes(-5), ct))
                return Results.Ok(new {status = "received"});
            var snapshot = message is null ? null : System.Text.Json.JsonSerializer.Deserialize<RoomMessage>(message.Payload)?.Text;
            db.CommunityReports.Add(new() {RoomId = id, ReporterId = me, AccountId = targetId, MessageId = request.MessageId,
                MessageSnapshot = snapshot is null ? null : snapshot[..Math.Min(2000, snapshot.Length)], Reason = reason, CreatedAt = now});
            await db.SaveChangesAsync(ct); return Results.Ok(new {status = "received"});
        }).RequireAuthorization().RequireRateLimiting("reports");
        app.MapPost("/api/v1/media/resolve", async (MediaInput input, MediaResolver resolver, CancellationToken ct) =>
            await resolver.ResolveAsync(input, ct) is { } media ? Results.Ok(media) : Results.Problem("Usa YouTube, una radio del catálogo o un archivo HTTPS público: MP3/M4A/OGG/AAC/WAV o MP4/WebM.", statusCode: 400)).RequireAuthorization().CacheOutput(p => p.NoCache());
    }
    private static Task NotifyRevoked(Guid[] rooms, IHubContext<RoomsHub> hub) => Task.WhenAll(rooms.Select(room => hub.Clients.Group(room.ToString()).SendAsync("Refresh")));
}
