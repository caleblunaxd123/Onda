using System.Buffers.Binary;
using Microsoft.EntityFrameworkCore;
using Onda.Domain;
using Onda.Infrastructure;
namespace Onda.Api;

public enum UploadRejection { None, Empty, TooLarge, DailyQuota, RoomQuota, Format, Kind }
public sealed record UploadResult(RoomUpload? Row, UploadRejection Rejection)
{
    public string Message => Rejection switch
    {
        UploadRejection.TooLarge => "El archivo supera 10 MB.",
        UploadRejection.DailyQuota => "Alcanzaste el límite de 100 MB de adjuntos por día.",
        UploadRejection.RoomQuota => "Esta sala alcanzó su límite de 200 MB de adjuntos.",
        UploadRejection.Format => "Formato no admitido. Fotos JPG/PNG de hasta 4096 px; notas de voz M4A/WebM/MP3/OGG/WAV.",
        UploadRejection.Kind => "En el chat de las salas solo se pueden enviar notas de voz.",
        _ => "Elige un archivo con contenido.",
    };
}

/// <summary>
/// Private chat attachments. Files live outside the public web assets (configurable <c>Chat:UploadsPath</c>,
/// a dedicated volume in production) and are only served through the authenticated attachment endpoint.
/// Content is classified from its bytes, never from the client-provided MIME alone.
/// </summary>
public sealed class RoomUploadStore(IConfiguration config, TimeProvider clock)
{
    public const long MaxBytes = 10 * 1024 * 1024;
    public const long DailyBytes = 100 * 1024 * 1024;
    public const long RoomBytes = 200 * 1024 * 1024;
    public const int MaxImagePixels = 4096;
    public const int MaxVoiceMs = 10 * 60 * 1000;
    public static readonly TimeSpan UnsentLifetime = TimeSpan.FromHours(1);
    private readonly string root = Path.GetFullPath(config["Chat:UploadsPath"] ?? Path.Combine(Path.GetTempPath(), "onda-chat-uploads"));
    /// <summary>Kinds accepted for new uploads (<c>Chat:AllowedKinds</c>, comma separated). Default: voice notes only.</summary>
    private readonly HashSet<string> allowed = (config["Chat:AllowedKinds"] ?? "audio").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.Ordinal);
    public string Root => root;
    public string PathFor(Guid id) => Path.Combine(root, id.ToString("N") + ".bin");
    public static ChatAttachment View(RoomUpload row) => new(row.Id, row.Name, row.Mime, row.Kind, row.Length, row.DurationMs);
    public void Delete(Guid id) {var path = PathFor(id); try {if (File.Exists(path)) File.Delete(path);} catch (IOException) { }}
    public void Delete(IEnumerable<Guid> ids) {foreach (var id in ids) Delete(id);}

    /// <summary>Classifies by signature. Images must be PNG/JPEG within 4096 px; audio must be a known container.</summary>
    public static (string Kind, string Mime)? Classify(ReadOnlySpan<byte> b, string? mime)
    {
        mime ??= "";
        if (mime.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            if (b.Length >= 24 && b[..8].SequenceEqual(new byte[] {137, 80, 78, 71, 13, 10, 26, 10}))
            {
                var w = BinaryPrimitives.ReadUInt32BigEndian(b[16..20]); var h = BinaryPrimitives.ReadUInt32BigEndian(b[20..24]);
                return w is > 0 and <= MaxImagePixels && h is > 0 and <= MaxImagePixels ? ("image", "image/png") : null;
            }
            if (b.Length >= 4 && b[0] == 255 && b[1] == 216)
            {
                var i = 2;
                while (i + 8 < b.Length)
                {
                    if (b[i] != 255) return null;
                    var marker = b[i + 1]; if (marker == 255) {i++; continue;}
                    var len = BinaryPrimitives.ReadUInt16BigEndian(b[(i + 2)..(i + 4)]); if (len < 2 || i + 2 + len > b.Length) return null;
                    if (marker is 0xC0 or 0xC1 or 0xC2)
                    {
                        var h = BinaryPrimitives.ReadUInt16BigEndian(b[(i + 5)..(i + 7)]); var w = BinaryPrimitives.ReadUInt16BigEndian(b[(i + 7)..(i + 9)]);
                        return w is > 0 and <= MaxImagePixels && h is > 0 and <= MaxImagePixels ? ("image", "image/jpeg") : null;
                    }
                    i += 2 + len;
                }
            }
            return null;
        }
        if (mime.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
        {
            if (b.Length >= 12 && b[..4].SequenceEqual("RIFF"u8) && b[8..12].SequenceEqual("WAVE"u8)) return ("audio", "audio/wav");
            if (b.Length >= 8 && b[4..8].SequenceEqual("ftyp"u8)) return ("audio", "audio/mp4");
            if (b.Length >= 4 && b[..4].SequenceEqual(new byte[] {26, 69, 223, 163})) return ("audio", "audio/webm");
            if (b.Length >= 3 && b[..3].SequenceEqual("ID3"u8) || b.Length >= 2 && b[0] == 255 && (b[1] & 0xE0) == 0xE0) return ("audio", "audio/mpeg");
            if (b.Length >= 4 && b[..4].SequenceEqual("OggS"u8)) return ("audio", "audio/ogg");
            return null;
        }
        // Any other document is stored as opaque bytes and only ever served as a download (never rendered/executed).
        return ("file", "application/octet-stream");
    }

    public async Task<UploadResult> SaveAsync(Guid room, Guid account, IFormFile file, int? durationMs, OndaDbContext db, CancellationToken ct)
    {
        if (file.Length <= 0) return new(null, UploadRejection.Empty);
        if (file.Length > MaxBytes) return new(null, UploadRejection.TooLarge);
        if ((await db.RoomUploads.Where(x => x.RoomId == room).SumAsync(x => (long?)x.Length, ct) ?? 0) + file.Length > RoomBytes) return new(null, UploadRejection.RoomQuota);
        var cutoff = clock.GetUtcNow().AddDays(-1);
        if ((await db.RoomUploads.Where(x => x.UploaderId == account && x.At > cutoff).SumAsync(x => (long?)x.Length, ct) ?? 0) + file.Length > DailyBytes) return new(null, UploadRejection.DailyQuota);
        var id = Guid.NewGuid(); Directory.CreateDirectory(root); var path = PathFor(id);
        try
        {
            await using (var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 65536, true)) await file.CopyToAsync(output, ct);
            byte[] header;
            await using (var input = File.OpenRead(path)) {header = new byte[(int)Math.Min(262144, input.Length)]; await input.ReadExactlyAsync(header, ct);}
            var classification = Classify(header, file.ContentType);
            if (classification is null) {Delete(id); return new(null, UploadRejection.Format);}
            if (!allowed.Contains(classification.Value.Kind)) {Delete(id); return new(null, UploadRejection.Kind);}
            var name = Onda.Application.Text.CleanName(Path.GetFileName(file.FileName.Replace('\\', '/')), 120);
            var kind = classification.Value.Kind;
            var row = new RoomUpload
            {
                Id = id, RoomId = room, UploaderId = account, Name = name.Length > 0 ? name : kind == "audio" ? "Nota de voz" : "Adjunto",
                Mime = classification.Value.Mime, Kind = kind, Length = file.Length, At = clock.GetUtcNow(),
                DurationMs = kind == "audio" && durationMs is > 0 and <= MaxVoiceMs ? durationMs : null,
            };
            db.RoomUploads.Add(row); await db.SaveChangesAsync(ct); return new(row, UploadRejection.None);
        }
        catch {Delete(id); throw;}
    }

    /// <summary>Removes uploads never attached to a message after an hour, and files without a database row.</summary>
    public async Task PruneAsync(OndaDbContext db, CancellationToken ct)
    {
        var cutoff = clock.GetUtcNow() - UnsentLifetime;
        var abandoned = await db.RoomUploads.Where(x => x.MessageId == null && x.At < cutoff).Take(500).ToArrayAsync(ct);
        db.RoomUploads.RemoveRange(abandoned); await db.SaveChangesAsync(ct);
        Delete(abandoned.Select(x => x.Id));
        if (!Directory.Exists(root)) return;
        foreach (var file in Directory.EnumerateFiles(root, "*.bin"))
        {
            if (File.GetLastWriteTimeUtc(file) > cutoff.UtcDateTime || !Guid.TryParseExact(Path.GetFileNameWithoutExtension(file), "N", out var id)) continue;
            if (!await db.RoomUploads.AnyAsync(x => x.Id == id, ct)) Delete(id);
        }
    }
}
