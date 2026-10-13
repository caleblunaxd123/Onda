using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Onda.Domain;
using Onda.Infrastructure;
namespace Onda.Api;

public sealed record SavedCollection(string Id, string Name, Guid[] Stations);
public sealed record SavedMediaBookmark(string Id, string Kind, string Url, string Title, string Category = "");
public sealed record SavedLibrary(Guid[] Favorites, Guid[]? History, SavedCollection[] Collections, SavedMediaBookmark[]? Media = null);
public sealed record LibraryEnvelope(long Version, SavedLibrary Library, DateTimeOffset? UpdatedAt);
public sealed record SaveLibraryRequest(long Version, SavedLibrary Library);
public sealed class LibrarySyncService(OndaDbContext db, TimeProvider clock)
{
    public static readonly SavedLibrary Empty = new([], null, []);
    public static bool Valid(SavedLibrary? library) => library is not null && library.Favorites is {Length: <= 500} &&
        library.History is null or {Length: <= 100} && library.Collections is {Length: <= 50} &&
        library.Collections.All(x => x is not null && x.Id is {Length: >= 1 and <= 80} && x.Name is {Length: >= 1 and <= 50} && x.Stations is {Length: <= 500}) &&
        library.Collections.Select(x => x.Id).Distinct().Count() == library.Collections.Length &&
        library.Favorites.Length + (library.History?.Length ?? 0) + library.Collections.Sum(x => x.Stations.Length) <= 10000 &&
        (library.Media is null || library.Media.Length <= 100 && library.Media.All(x => x is not null && x.Id is {Length: >= 1 and <= 80} && x.Title is {Length: <= 120} && x.Kind is "youtube" or "audio" or "video" &&
            x.Url is {Length: <= 2000} && Uri.TryCreate(x.Url, UriKind.Absolute, out var uri) && uri.Scheme == "https" && uri.UserInfo.Length == 0 &&
            (x.Kind != "youtube" || MediaResolver.YoutubeId(x.Url) is not null)) && library.Media.Select(x => x.Id).Distinct().Count() == library.Media.Length) &&
        !library.Favorites.Concat(library.History ?? []).Concat(library.Collections.SelectMany(x => x.Stations)).Contains(Guid.Empty);
    public async Task<LibraryEnvelope> GetAsync(Guid id, CancellationToken ct)
    {
        var row = await db.CloudLibraries.AsNoTracking().SingleOrDefaultAsync(x => x.AccountId == id, ct);
        return row is null ? new(0, Empty, null) : new(row.Version, JsonSerializer.Deserialize<SavedLibrary>(row.Payload)!, row.UpdatedAt);
    }
    public async Task<LibraryEnvelope?> SaveAsync(Guid id, SaveLibraryRequest request, CancellationToken ct)
    {
        if (!Valid(request.Library) || request.Version < 0) throw new ArgumentException("Biblioteca inválida.");
        var row = await db.CloudLibraries.SingleOrDefaultAsync(x => x.AccountId == id, ct);
        if ((row?.Version ?? 0) != request.Version) return null;
        if (row is null) {row = new() {AccountId = id}; db.CloudLibraries.Add(row);}
        row.Payload = JsonSerializer.Serialize(request.Library); row.Version++; row.UpdatedAt = clock.GetUtcNow();
        try {await db.SaveChangesAsync(ct);}
        catch (DbUpdateException) {return null;}
        return new(row.Version, request.Library, row.UpdatedAt);
    }
}
