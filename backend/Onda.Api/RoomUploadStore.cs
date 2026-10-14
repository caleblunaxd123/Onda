using System.Buffers.Binary;
using Microsoft.EntityFrameworkCore;
using Onda.Domain;
using Onda.Infrastructure;
namespace Onda.Api;

public sealed class RoomUploadStore(IConfiguration config)
{
    public const long MaxBytes = 10 * 1024 * 1024;
    private readonly string root = Path.GetFullPath(config["Chat:UploadsPath"] ?? Path.Combine(Path.GetTempPath(), "onda-chat-uploads"));
    public string PathFor(Guid id) => Path.Combine(root, id.ToString("N") + ".bin");
    public static ChatAttachment View(RoomUpload row) => new(row.Id, row.Name, row.Mime, row.Kind, row.Length);
    public void Delete(Guid id) {var path = PathFor(id); if (File.Exists(path)) File.Delete(path);}
    public static (string Kind, string Mime)? Classify(ReadOnlySpan<byte> b, string mime)
    {
        if (mime.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            if (b.Length >= 24 && b[..8].SequenceEqual(new byte[] {137,80,78,71,13,10,26,10}))
            {
                var w = BinaryPrimitives.ReadUInt32BigEndian(b[16..20]); var h = BinaryPrimitives.ReadUInt32BigEndian(b[20..24]);
                return w is > 0 and <= 4096 && h is > 0 and <= 4096 ? ("image", "image/png") : null;
            }
            if (b.Length >= 4 && b[0] == 255 && b[1] == 216)
            {
                var i = 2;
                while (i + 8 < b.Length)
                {
                    if (b[i] != 255) return null;
                    var marker = b[i + 1]; if (marker == 255) {i++; continue;}
                    var len = BinaryPrimitives.ReadUInt16BigEndian(b[(i+2)..(i+4)]); if (len < 2 || i + 2 + len > b.Length) return null;
                    if (marker is 0xC0 or 0xC1 or 0xC2)
                    {
                        var h = BinaryPrimitives.ReadUInt16BigEndian(b[(i+5)..(i+7)]); var w = BinaryPrimitives.ReadUInt16BigEndian(b[(i+7)..(i+9)]);
                        return w is > 0 and <= 4096 && h is > 0 and <= 4096 ? ("image", "image/jpeg") : null;
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
            if (b.Length >= 4 && b[..4].SequenceEqual(new byte[] {26,69,223,163})) return ("audio", "audio/webm");
            if (b.Length >= 3 && b[..3].SequenceEqual("ID3"u8) || b.Length >= 2 && b[0] == 255 && (b[1] & 0xE0) == 0xE0) return ("audio", "audio/mpeg");
            if (b.Length >= 4 && b[..4].SequenceEqual("OggS"u8)) return ("audio", "audio/ogg");
            return null;
        }
        return ("file", "application/octet-stream");
    }
    public async Task<RoomUpload?> SaveAsync(Guid room, Guid account, IFormFile file, OndaDbContext db, TimeProvider clock, CancellationToken ct)
    {
        if (file.Length is <= 0 or > MaxBytes) return null;
        if ((await db.RoomUploads.Where(x => x.RoomId == room).SumAsync(x => (long?)x.Length, ct) ?? 0) + file.Length > 20 * MaxBytes) return null;
        var cutoff = clock.GetUtcNow().AddDays(-1);
        if ((await db.RoomUploads.Where(x => x.UploaderId == account && x.At > cutoff).SumAsync(x => (long?)x.Length, ct) ?? 0) + file.Length > 10 * MaxBytes) return null;
        var id = Guid.NewGuid(); Directory.CreateDirectory(root); var path = PathFor(id);
        try
        {
            await using (var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 65536, true)) await file.CopyToAsync(output, ct);
            await using var input = File.OpenRead(path); var header = new byte[(int)Math.Min(262144, input.Length)]; await input.ReadExactlyAsync(header, ct);
            var classification = Classify(header, file.ContentType);
            if (classification is null) {input.Close(); Delete(id); return null;}
            var name = Path.GetFileName(file.FileName.Replace('\\','/')); name = Onda.Application.Text.CleanName(name, 120);
            var row = new RoomUpload {Id = id, RoomId = room, UploaderId = account, Name = name.Length > 0 ? name : "Adjunto", Mime = classification.Value.Mime, Kind = classification.Value.Kind, Length = file.Length, At = clock.GetUtcNow()};
            db.RoomUploads.Add(row); await db.SaveChangesAsync(ct); return row;
        }
        catch {Delete(id); throw;}
    }
    public async Task PruneAsync(OndaDbContext db, CancellationToken ct)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-1);
        var abandoned = await db.RoomUploads.Where(x => x.MessageId == null && x.At < cutoff).Take(500).ToArrayAsync(ct);
        db.RoomUploads.RemoveRange(abandoned); await db.SaveChangesAsync(ct);
        foreach (var row in abandoned) Delete(row.Id);
        if (!Directory.Exists(root)) return;
        foreach (var file in Directory.EnumerateFiles(root, "*.bin"))
        {
            if (File.GetLastWriteTimeUtc(file) > cutoff.UtcDateTime || !Guid.TryParseExact(Path.GetFileNameWithoutExtension(file), "N", out var id)) continue;
            if (!await db.RoomUploads.AnyAsync(x => x.Id == id, ct)) Delete(id);
        }
    }
}
