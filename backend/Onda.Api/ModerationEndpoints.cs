using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Onda.Infrastructure;

namespace Onda.Api;

public sealed record ReviewReport(string? Action, string? Note);
public static class ModerationEndpoints
{
    // Explicit server allowlist, never a role/name/email supplied by the client. Disabled by default.
    private static bool Allowed(ClaimsPrincipal user, IConfiguration config) =>
        user.FindFirstValue("registered") == "True" && config.GetSection("Moderation:AccountIds").GetChildren()
            .Any(x => Guid.TryParse(x.Value, out var id) && id == user.ListenerId());

    public static void MapModerationEndpoints(this WebApplication app)
    {
        var api = app.MapGroup("/api/v1/moderation").RequireAuthorization().CacheOutput(p => p.NoCache());
        api.MapGet("/access", (ClaimsPrincipal user, IConfiguration config) => Results.Ok(new {allowed = Allowed(user, config)}));
        api.MapGet("/reports", async (ClaimsPrincipal user, IConfiguration config, OndaDbContext db, CancellationToken ct) =>
        {
            if (!Allowed(user, config)) return Results.Forbid();
            return Results.Ok(new {items = await db.CommunityReports.AsNoTracking().Where(x => x.Status == "received")
                .OrderBy(x => x.CreatedAt).Take(50).Select(x => new {x.Id, x.RoomId, x.AccountId, x.MessageId, x.MessageSnapshot, x.Reason, x.CreatedAt}).ToArrayAsync(ct)});
        });
        api.MapPost("/reports/{id:long}/review", async (long id, ReviewReport input, ClaimsPrincipal user, IConfiguration config,
            OndaDbContext db, RoomService rooms, RoomChatService chat, RoomPresence presence, IHubContext<RoomsHub> hub, TimeProvider clock, CancellationToken ct) =>
        {
            if (!Allowed(user, config)) return Results.Forbid();
            var note = Onda.Application.Text.CleanName(input.Note ?? "", 500).Trim();
            if (input.Action is not ("dismiss" or "delete-message" or "close-room") || input.Note is not {Length: >= 3 and <= 500} || note.Length < 3)
                return Results.Problem("Elige una acción y explica el motivo (3–500 caracteres).", statusCode: 400);
            var report = await db.CommunityReports.SingleOrDefaultAsync(x => x.Id == id, ct);
            if (report is null) return Results.NotFound();
            var gate = presence.RoomLock(report.RoomId); await gate.WaitAsync(ct);
            RoomMessage? deleted = null;
            try
            {
                await db.Entry(report).ReloadAsync(ct);
                if (report.Status != "received") return Results.Problem("Este reporte ya fue revisado.", statusCode: 409);
                var room = await db.ListeningRooms.SingleOrDefaultAsync(x => x.Id == report.RoomId, ct);
                if (input.Action != "dismiss" && room is null) return Results.Problem("El contenido ya no está disponible. Puedes descartar el reporte indicando el motivo.", statusCode: 409);
                report.Status = input.Action == "dismiss" ? "dismissed" : input.Action;
                report.ReviewedAt = clock.GetUtcNow(); report.ReviewedBy = user.ListenerId(); report.ReviewNote = note;
                if (input.Action == "delete-message")
                {
                    if (report.MessageId is not { } message || !await db.RoomChatEntries.AnyAsync(x => x.Id == message && x.RoomId == report.RoomId, ct)) return Results.NotFound();
                    deleted = await chat.DeleteAsync(report.RoomId, user.ListenerId(), true, new(message), ct);
                }
                if (input.Action == "close-room") {room!.Closed = true; room.Version++; room.UpdatedAt = clock.GetUtcNow();}
                await db.SaveChangesAsync(ct);
            }
            finally {gate.Release();}
            if (deleted is not null) await hub.Clients.Group(report.RoomId.ToString()).SendAsync("MessageUpdated", deleted, ct);
            if (input.Action == "close-room") {await hub.Clients.Group(report.RoomId.ToString()).SendAsync("Closed", report.RoomId, ct); presence.Close(report.RoomId);}
            return Results.Ok(new {status = report.Status});
        }).RequireRateLimiting("reports");
    }
}
