using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Onda.Infrastructure;
namespace Onda.Api;

/// <summary>
/// Private attachment upload/download. Both require a valid session (authentication handler) and a live
/// connection in that exact room (RoomPresence), so expelled people, revoked sessions and other rooms are rejected.
/// Tokens travel only in the Authorization header, never in URLs.
/// </summary>
public static class RoomUploadEndpoints
{
    private const long FormOverhead = 65536;
    public static void MapRoomUploads(this WebApplication app)
    {
        static bool Member(RoomPresence presence, Guid room, ClaimsPrincipal user) => presence.Members(room).Any(x => x.Id == user.ListenerId());
        var group = app.MapGroup("/api/v1/rooms/{room:guid}/attachments").RequireAuthorization().CacheOutput(p => p.NoCache());
        group.MapPost("/", async (Guid room, HttpContext context, RoomPresence presence, OndaDbContext db, RoomUploadStore files, CancellationToken ct) =>
        {
            if (!Member(presence, room, context.User)) return Results.Problem("Entra a la sala para adjuntar archivos.", statusCode: 403);
            if (context.Request.ContentLength > RoomUploadStore.MaxBytes + FormOverhead) return Results.Problem("El archivo supera 10 MB.", statusCode: 413);
            if (!context.Request.HasFormContentType) return Results.Problem("Elige un archivo.", statusCode: 400);
            if (context.Features.Get<IHttpMaxRequestBodySizeFeature>() is {IsReadOnly: false} size) size.MaxRequestBodySize = RoomUploadStore.MaxBytes + FormOverhead;
            IFormCollection form;
            try {form = await context.Request.ReadFormAsync(new FormOptions {MultipartBodyLengthLimit = RoomUploadStore.MaxBytes + FormOverhead}, ct);}
            catch (Exception ex) when (ex is InvalidDataException or BadHttpRequestException) {return Results.Problem("El archivo supera 10 MB.", statusCode: 413);}
            if (form.Files.Count != 1) return Results.Problem("Elige un archivo.", statusCode: 400);
            int? duration = int.TryParse(form["durationMs"], NumberStyles.None, CultureInfo.InvariantCulture, out var ms) ? ms : null;
            var gate = presence.RoomLock(room); await gate.WaitAsync(ct);
            try
            {
                // Re-check after the (possibly slow) upload: the person may have been expelled meanwhile.
                if (!Member(presence, room, context.User) || !await db.ListeningRooms.AnyAsync(x => x.Id == room && !x.Closed, ct))
                    return Results.Problem("Ya no estás en la sala.", statusCode: 403);
                var result = await files.SaveAsync(room, context.User.ListenerId(), form.Files[0], duration, db, ct);
                return result.Row is null
                    ? Results.Problem(result.Message, statusCode: result.Rejection is UploadRejection.TooLarge ? 413 : 400)
                    : Results.Ok(RoomUploadStore.View(result.Row));
            }
            finally {gate.Release();}
        }).RequireRateLimiting("uploads").DisableAntiforgery();
        group.MapDelete("/{id:guid}", async (Guid room, Guid id, ClaimsPrincipal user, OndaDbContext db, RoomUploadStore files, CancellationToken ct) =>
        {
            // Cancelling before sending: only the uploader's own unsent file.
            var row = await db.RoomUploads.SingleOrDefaultAsync(x => x.Id == id && x.RoomId == room && x.UploaderId == user.ListenerId() && x.MessageId == null, ct);
            if (row is null) return Results.NotFound();
            db.RoomUploads.Remove(row); await db.SaveChangesAsync(ct); files.Delete(id);
            return Results.NoContent();
        });
        group.MapGet("/{id:guid}", async (Guid room, Guid id, HttpContext context, RoomPresence presence, OndaDbContext db, RoomUploadStore files, CancellationToken ct) =>
        {
            if (!Member(presence, room, context.User)) return Results.Problem("Entra a la sala para ver sus archivos.", statusCode: 403);
            var row = await db.RoomUploads.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.RoomId == room, ct);
            if (row is null || !File.Exists(files.PathFor(id))) return Results.NotFound();
            if (row.MessageId is null && row.UploaderId != context.User.ListenerId()) return Results.NotFound();
            context.Response.Headers.XContentTypeOptions = "nosniff";
            context.Response.Headers.ContentSecurityPolicy = "default-src 'none'; sandbox";
            // Documents are always downloads; images and voice notes may render inline.
            return Results.File(files.PathFor(id), row.Mime, fileDownloadName: row.Kind == "file" ? row.Name : null, enableRangeProcessing: true);
        });
    }
}
