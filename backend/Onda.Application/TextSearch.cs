using System.Text.RegularExpressions;
namespace Onda.Application;

/// <summary>Search words in any order, keeping meaningful joiners such as R&amp;B and l'amour.</summary>
public static partial class TextSearch
{
    public static string[] Terms(string? input) => Words().Matches(Text.Fold(input))
        .Select(m => m.Value).Distinct(StringComparer.Ordinal).ToArray();

    public static string? LanguageAlias(string word) => word switch
    {
        "espanol" or "spanish" => "es", "ingles" or "english" => "en",
        "portugues" or "portuguese" => "pt", "frances" or "french" => "fr",
        "aleman" or "german" => "de", "italiano" or "italian" => "it",
        "japones" or "japanese" => "ja", _ => null,
    };

    [GeneratedRegex(@"[\p{L}\p{N}]+(?:[&'][\p{L}\p{N}]+)*")]
    private static partial Regex Words();
}
