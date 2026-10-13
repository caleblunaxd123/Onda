using Onda.Api;
using Onda.Application;
namespace Onda.Tests;
public class AssistantTests
{
    private static readonly CountryFacet[] Countries = [new("PE", "Perú", 300, null), new("JP", "Japón", 100, null), new("US", "Estados Unidos", 1000, null)];
    private static readonly LabeledFacet[] Tags = [new("salsa", "Salsa", 100), new("ambient", "Ambiental", 100), new("news", "Noticias", 100)];
    [Theory]
    [InlineData("Quiero salsa peruana", "PE", "salsa", null)]
    [InlineData("Muéstrame radios de Japón", "JP", null, null)]
    [InlineData("Música tranquila para trabajar", null, "ambient", null)]
    [InlineData("Noticias en inglés", null, "news", "en")]
    [InlineData("Rock de Perú", "PE", null, null)]
    [InlineData("Noticias en francés", null, "news", "fr")]
    public void GuidedFallbackUnderstandsCountriesGenresAndLanguage(string text, string? country, string? tag, string? language)
    {
        Assert.Equal(new DiscoveryIntent(country, tag, language), DiscoveryAssistant.RuleIntent(text, Countries, Tags));
    }
    [Fact] public void ModelCannotInventFiltersOutsideTheRealCatalog()
    {
        Assert.Equal(new DiscoveryIntent(null, null, null), DiscoveryAssistant.Validate(new("XX", "inventado", "zz"), Countries, Tags, []));
        Assert.Equal(new DiscoveryIntent("JP", "salsa", null), DiscoveryAssistant.Validate(new("jp", "salsa", ""), Countries, Tags, []));
    }
}
