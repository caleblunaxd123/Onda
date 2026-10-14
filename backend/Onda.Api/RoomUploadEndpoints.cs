using System.Security.Claims;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Onda.Infrastructure;
namespace Onda.Api;
public static class RoomUploadEndpoints
{
    public static void MapRoomUploads(this WebApplication app)
    {
        bool Member(RoomPresence presence, Guid room, ClaimsPrincipal user) => presence.Members(room).Any(x => x.Id == user.ListenerId());
        var group = app.MapGroup("/api/v1/rooms/{room:guid}/attachments").RequireAuthorization().CacheOutput(p => p.NoCache());
        group.MapPost("/", async (Guid room, HttpContext context, RoomPresence presence, OndaDbContext db, RoomUploadStore files, TimeProvider clock, CancellationToken ct) =>
        {
            if (!Member(presence, room, context.User)) return Results.Forbid();
            if (context.Request.ContentLength > RoomUploadStore.MaxBytes + 65536 || !context.Request.HasFormContentType) return Results.Problem("Adjunta un archivo de hasta 10 MB.", statusCode: 413);
            if (context.Features.Get<IHttpMaxRequestBodySizeFeature>() is {IsReadOnly: false} size) size.MaxRequestBodySize = RoomUploadStore.MaxBytes + 65536;
            IFormCollection form;
            try {form = await context.Request.ReadFormAsync(new FormOptions {MultipartBodyLengthLimit = RoomUploadStore.MaxBytes + 65536}, ct);} catch (InvalidDataException) {return Results.Problem("El archivo es demasiado grande.", statusCode: 413);}
            if (form.Files.Count != 1) return Results.Problem("Elige un archivo.", statusCode: 400);
            var gate = presence.RoomLock(room); await gate.WaitAsync(ct);
            try
            {
                if (!Member(presence, room, context.User) || !await db.ListeningRooms.AnyAsync(x => x.Id == room && !x.Closed, ct)) return Results.Forbid();
                var row = await files.SaveAsync(room, context.User.ListenerId(), form.Files[0], db, clock, ct);
                return row is null ? Results.Problem("No se pudo adjuntar. Límite 10 MB por archivo, 100 MB diarios y fotos JPG/PNG de hasta 4096 px.", statusCode: 400) : Results.Ok(RoomUploadStore.View(row));
            }
            finally {gate.Release();}
        }).RequireRateLimiting("uploads");
        group.MapGet("/{id:guid}", async (Guid room, Guid id, HttpContext context, RoomPresence presence, OndaDbContext db, RoomUploadStore files, CancellationToken ct) =>
        {
            if (!Member(presence, room, context.User)) return Results.Forbid();
            var row = await db.RoomUploads.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.RoomId == room, ct);
            if (row is null || !File.Exists(files.PathFor(id))) return Results.NotFound();
            if (row.MessageId is null && row.UploaderId != context.User.ListenerId()) return Results.Forbid();
            context.Response.Headers.XContentTypeOptions = "nosniff";
            return Results.File(files.PathFor(id), row.Mime, fileDownloadName: row.Kind == "file" ? row.Name : null, enableRangeProcessing: true);
        });
    }
}
