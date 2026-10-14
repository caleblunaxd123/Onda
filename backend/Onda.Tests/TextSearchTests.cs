using Onda.Application;
namespace Onda.Tests;

public class TextSearchTests
{
    [Fact] public void TermsKeepJoinersNormalizeAccentsAndDeduplicate() =>
        Assert.Equal(["oxigeno", "r&b", "l'amour", "peru"], TextSearch.Terms("OXÍGENO, R&B / l'amour; Perú oxígeno"));
    [Fact] public void SymbolOnlySearchDoesNotProduceAnEmptyMatchAllTerm() => Assert.Empty(TextSearch.Terms(" % * _ "));
}
