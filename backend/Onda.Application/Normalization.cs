using System.Globalization;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
namespace Onda.Application;

public static partial class Text
{
    /// <summary>Lowercase, accent-free, single-spaced form used for search and comparisons.</summary>
    public static string Fold(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        var decomposed = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var ch in decomposed)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category == UnicodeCategory.NonSpacingMark) continue;
            builder.Append(char.IsControl(ch) ? ' ' : char.ToLowerInvariant(ch));
        }
        return Spaces().Replace(builder.ToString().Normalize(NormalizationForm.FormC), " ").Trim();
    }

    /// <summary>Display-safe name: trimmed, single-spaced, without control characters.</summary>
    public static string CleanName(string? value, int max = 300)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        var clean = Spaces().Replace(new string(value.Select(c => char.IsControl(c) ? ' ' : c).ToArray()), " ").Trim();
        return clean.Length <= max ? clean : clean[..max].TrimEnd();
    }

    /// <summary>
    /// Station display name: clean and without decorative leading symbols ("# ", "-- ", "★") that some catalog
    /// entries use to sort first. Letters, digits and opening quotes/brackets are kept.
    /// </summary>
    public static string DisplayName(string? value)
    {
        var clean = CleanName(value);
        var start = 0;
        while (start < clean.Length && !char.IsLetterOrDigit(clean[start]) && clean[start] is not ('(' or '[' or '"' or '¡' or '¿' or '\'')) start++;
        var trimmed = clean[start..].Trim();
        return trimmed.Length > 0 ? trimmed : clean;
    }

    public static string NormalizeTag(string? value)
    {
        var tag = Fold(value).Replace('_', ' ').Replace('-', ' ');
        // Keep letters, digits and a few joiners; emoji and symbols would make otherwise equal tags differ.
        tag = TagNoise().Replace(tag, "");
        tag = Spaces().Replace(tag, " ").Trim(' ', '.', '#', '/', '&', '\'', '"');
        if (tag.Length is < 2 or > 40 || tag.All(c => char.IsDigit(c) || c == ' ')) return "";
        return TagAliases.TryGetValue(tag, out var alias) ? alias : tag;
    }

    public static string[] NormalizeTags(string? csv, int max = 12) =>
        (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries).Select(NormalizeTag)
            .Where(t => t.Length > 0).Distinct().Take(max).ToArray();

    private static readonly Dictionary<string, string> TagAliases = new()
    {
        ["hiphop"] = "hip hop", ["rnb"] = "r&b", ["r and b"] = "r&b", ["rhythm and blues"] = "r&b",
        ["noticias"] = "news", ["musica"] = "music", ["electronica"] = "electronic", ["clasica"] = "classical",
        ["classic"] = "classical", ["talk radio"] = "talk", ["oldies but goodies"] = "oldies", ["80's"] = "80s",
        ["90's"] = "90s", ["70's"] = "70s", ["60's"] = "60s", ["00s"] = "2000s",
    };

    /// <summary>Scheme-less, www-less, lowercase homepage used only for variant detection.</summary>
    public static string NormalizeHomepage(string? url)
    {
        if (!Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https")) return "";
        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.")) host = host[4..];
        return (host + uri.AbsolutePath.TrimEnd('/')).ToLowerInvariant();
    }

    public static string NormalizeStream(string? url) =>
        Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var uri) ? (uri.Host.ToLowerInvariant() + ":" + uri.Port + uri.PathAndQuery) : "";

    /// <summary>Station name without quality markers ("128k", "AAC", "HD"…), for variant detection.</summary>
    public static string BaseName(string? name)
    {
        var folded = Fold(name);
        folded = QualityMarkers().Replace(folded, " ");
        folded = Punctuation().Replace(folded, " ");
        return Spaces().Replace(folded, " ").Trim();
    }

    /// <summary>
    /// Verifiable variant criteria (no fuzzy matching):
    /// 1. same country, same normalized homepage and same base name; or
    /// 2. when there is no homepage, an identical normalized stream URL.
    /// Distinct stations that merely share a name never share a key.
    /// </summary>
    public static string? VariantKey(string countryCode, string? homepage, string name, string? streamUrl)
    {
        var page = NormalizeHomepage(homepage);
        var baseName = BaseName(name);
        string? raw = page.Length > 0 && baseName.Length > 0 ? $"h|{countryCode}|{page}|{baseName}"
            : NormalizeStream(streamUrl) is { Length: > 0 } stream ? $"s|{stream}" : null;
        return raw is null ? null : Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)))[..40];
    }

    [GeneratedRegex(@"\s+")] private static partial Regex Spaces();
    [GeneratedRegex(@"[^\p{L}\p{N} &+'.#/]")] private static partial Regex TagNoise();
    [GeneratedRegex(@"\b(\d{2,3}\s?k(bps|b)?|aac\+?|he\s?aac|mp3|ogg|opus|flac|hls|hq|lq|hd|high|low|mobile|stereo|mono|kbps)\b")] private static partial Regex QualityMarkers();
    [GeneratedRegex(@"[^\p{L}\p{N} ]")] private static partial Regex Punctuation();
}

/// <summary>Spanish labels generated from ICU (countries, languages) plus a reviewed genre glossary.</summary>
public static class Labels
{
    private sealed record Data(Dictionary<string, string> Countries, Dictionary<string, string> Languages, Dictionary<string, string> EnglishLanguages);
    private static readonly Data Tables = Load();
    private static Data Load()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("Onda.Application.Data.labels.json")
            ?? throw new InvalidOperationException("Missing labels.json resource.");
        return JsonSerializer.Deserialize<Data>(stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }

    public static string Country(string code, string? fallback = null) =>
        Tables.Countries.TryGetValue(code.ToUpperInvariant(), out var name) ? name : string.IsNullOrWhiteSpace(fallback) ? code : fallback;

    /// <summary>Converts Radio Browser language codes or English names into stable codes ("es", "quechua").</summary>
    public static string[] LanguageCodes(string? codes, string? names)
    {
        var fromCodes = (codes ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(c => c.ToLowerInvariant()).Where(c => c.Length is 2 or 3 && c.All(char.IsAsciiLetterLower));
        var fromNames = (names ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(n => Text.Fold(n)).Where(n => n.Length is >= 2 and <= 40)
            .Select(n => Tables.EnglishLanguages.TryGetValue(n, out var code) ? code : n);
        return fromCodes.Concat(fromNames).Select(c => c == "spa" ? "es" : c == "eng" ? "en" : c).Distinct().Take(6).ToArray();
    }

    public static string Language(string code) =>
        Tables.Languages.TryGetValue(code, out var name) ? Capitalize(name) : Capitalize(code);

    /// <summary>English language name expected by Radio Browser's `language` filter.</summary>
    public static string? EnglishLanguage(string code) =>
        Tables.EnglishLanguages.FirstOrDefault(p => p.Value == code).Key ?? (code.Length > 3 ? code : null);

    public static string Tag(string tag) => Genres.TryGetValue(tag, out var label) ? label : Capitalize(tag);

    private static string Capitalize(string value) =>
        value.Length == 0 ? value : char.ToUpper(value[0], CultureInfo.GetCultureInfo("es")) + value[1..];

    private static readonly Dictionary<string, string> Genres = new()
    {
        ["pop"] = "Pop", ["rock"] = "Rock", ["news"] = "Noticias", ["talk"] = "Programas hablados", ["music"] = "Música variada",
        ["classical"] = "Clásica", ["jazz"] = "Jazz", ["dance"] = "Dance", ["electronic"] = "Electrónica", ["oldies"] = "Clásicos de siempre",
        ["80s"] = "Años 80", ["90s"] = "Años 90", ["70s"] = "Años 70", ["60s"] = "Años 60", ["2000s"] = "Años 2000",
        ["hits"] = "Éxitos", ["top 40"] = "Top 40", ["country"] = "Country", ["christian"] = "Cristiana", ["religious"] = "Religiosa",
        ["sports"] = "Deportes", ["local news"] = "Noticias locales", ["public radio"] = "Radio pública", ["community radio"] = "Radio comunitaria",
        ["chillout"] = "Chill out", ["ambient"] = "Ambiental", ["lounge"] = "Lounge", ["romantic"] = "Romántica", ["latin"] = "Latina",
        ["latin music"] = "Música latina", ["salsa"] = "Salsa", ["cumbia"] = "Cumbia", ["reggaeton"] = "Reguetón", ["bachata"] = "Bachata",
        ["merengue"] = "Merengue", ["tango"] = "Tango", ["folk"] = "Folk", ["folklore"] = "Folclore", ["world"] = "Músicas del mundo",
        ["world music"] = "Músicas del mundo", ["hip hop"] = "Hip hop", ["r&b"] = "R&B", ["soul"] = "Soul", ["funk"] = "Funk",
        ["blues"] = "Blues", ["reggae"] = "Reggae", ["metal"] = "Metal", ["heavy metal"] = "Heavy metal", ["punk"] = "Punk",
        ["alternative"] = "Alternativa", ["indie"] = "Indie", ["house"] = "House", ["techno"] = "Techno", ["trance"] = "Trance",
        ["edm"] = "EDM", ["soundtrack"] = "Bandas sonoras", ["easy listening"] = "Fácil de escuchar", ["adult contemporary"] = "Contemporánea adulta",
        ["culture"] = "Cultura", ["education"] = "Educación", ["information"] = "Información", ["entertainment"] = "Entretenimiento",
        ["comedy"] = "Humor", ["kids"] = "Infantil", ["children"] = "Infantil", ["variety"] = "Variedad", ["regional"] = "Regional",
        ["regional mexican"] = "Regional mexicana", ["ranchera"] = "Ranchera", ["schlager"] = "Schlager", ["chanson"] = "Chanson",
        ["k pop"] = "K-pop", ["j pop"] = "J-pop", ["anime"] = "Anime", ["gospel"] = "Góspel", ["piano"] = "Piano", ["instrumental"] = "Instrumental",
        ["fm"] = "FM", ["am"] = "AM", ["university radio"] = "Radio universitaria", ["college radio"] = "Radio universitaria",
        ["charts"] = "Listas de éxitos", ["contemporary"] = "Contemporánea", ["disco"] = "Disco", ["love songs"] = "Canciones de amor",
        ["mpb"] = "MPB", ["samba"] = "Samba", ["bossa nova"] = "Bossa nova", ["flamenco"] = "Flamenco", ["arabic"] = "Árabe",
        ["bollywood"] = "Bollywood", ["greek"] = "Griega", ["turkish"] = "Turca", ["polish"] = "Polaca", ["german"] = "Alemana",
        ["spanish"] = "En español", ["english"] = "En inglés", ["french"] = "Francesa", ["italian"] = "Italiana", ["russian"] = "Rusa",
        ["political"] = "Política", ["business"] = "Economía", ["weather"] = "Tiempo", ["traffic"] = "Tráfico", ["meditation"] = "Meditación",
    };
}

/// <summary>Result of filling a page from a source that filters records after fetching them.</summary>
public sealed record FilteredPage<T>(IReadOnlyList<T> Items, int NextOffset, bool HasMore, int Requests, bool BudgetExhausted);

public sealed record PaginationBudget(int MaxRequests = 4, int BatchSize = 100, TimeSpan? MaxDuration = null);

public static class FilteredPaginator
{
    /// <summary>
    /// Fetches raw source pages until <paramref name="limit"/> items survive <paramref name="map"/> or the budget runs out.
    /// NextOffset counts raw records consumed, so filtered-out records never cause skipped or repeated items, and an
    /// empty filtered page is only the end of the catalog when the source itself returned a short page.
    /// </summary>
    public static async Task<FilteredPage<T>> FillAsync<TRow, T>(int startOffset, int limit,
        Func<int, int, CancellationToken, Task<IReadOnlyList<TRow>>> fetch, Func<TRow, T?> map, Func<T, string> key,
        PaginationBudget budget, CancellationToken ct, TimeProvider? clock = null) where T : class
    {
        clock ??= TimeProvider.System;
        var started = clock.GetTimestamp();
        var items = new List<T>(limit);
        var seen = new HashSet<string>();
        var offset = startOffset;
        var requests = 0;
        var exhausted = false;
        while (items.Count < limit && requests < budget.MaxRequests &&
               (budget.MaxDuration is null || requests == 0 || clock.GetElapsedTime(started) < budget.MaxDuration))
        {
            ct.ThrowIfCancellationRequested();
            var rows = await fetch(offset, budget.BatchSize, ct);
            requests++;
            var consumed = 0;
            foreach (var row in rows)
            {
                consumed++;
                if (map(row) is { } item && seen.Add(key(item))) items.Add(item);
                if (items.Count == limit) break;
            }
            offset += consumed;
            if (rows.Count < budget.BatchSize && consumed == rows.Count) { exhausted = true; break; }
        }
        return new(items, offset, !exhausted, requests, !exhausted && items.Count < limit);
    }
}
