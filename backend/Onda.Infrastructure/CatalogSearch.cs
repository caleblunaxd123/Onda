using Microsoft.EntityFrameworkCore;
using Onda.Application;
using Onda.Domain;
namespace Onda.Infrastructure;

/// <summary>SQL-translatable search shared by listings, counts and discovery. No client-side catalog scan.</summary>
public static class CatalogSearch
{
    public static IQueryable<StationEntity> Apply(IQueryable<StationEntity> query, string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return query;
        var terms = TextSearch.Terms(input);
        if (terms.Length == 0) return query.Where(_ => false);
        foreach (var term in terms)
        {
            var country = term.ToUpperInvariant();
            var genre = Text.NormalizeTag(term);
            var language = TextSearch.LanguageAlias(term) ?? term;
            query = query.Where(s => s.SearchName.Contains(term) || s.SearchName.Replace(" ", "").Contains(term)
                || s.SearchRegion.Contains(term) || EF.Functions.Collate(s.Country, "Latin1_General_100_CI_AI").Contains(term)
                || s.CountryCode == country || s.Tags.Any(t => t.Tag.Contains(term) || t.Tag == genre)
                || s.Languages.Any(l => l.Code == language));
        }
        return query;
    }

    public static IOrderedQueryable<StationEntity> Order(IQueryable<StationEntity> query, string? input)
    {
        var phrase = Text.Fold(input);
        var compact = phrase.Replace(" ", "");
        return query.OrderBy(s => phrase.Length == 0 ? 0 : s.SearchName == phrase || s.SearchName.Replace(" ", "") == compact ? 0
                : s.SearchName.StartsWith(phrase) ? 1 : 2)
            .ThenBy(s => s.Availability == Availability.Unstable ? 1 : 0)
            .ThenByDescending(s => s.ClickCount).ThenByDescending(s => s.Votes).ThenBy(s => s.Id);
    }
}
