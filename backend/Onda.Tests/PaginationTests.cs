using Onda.Application;
namespace Onda.Tests;

public class PaginationTests
{
    private sealed record Item(int Value);

    /// <summary>Simulated source with <paramref name="total"/> records; records that fail <paramref name="keep"/> are filtered out after fetching.</summary>
    private sealed class Source(int total, Func<int, bool> keep)
    {
        public List<(int Offset, int Limit)> Calls { get; } = [];
        public Task<IReadOnlyList<int>> Fetch(int offset, int limit, CancellationToken _)
        {
            Calls.Add((offset, limit));
            return Task.FromResult<IReadOnlyList<int>>(Enumerable.Range(offset, Math.Max(0, Math.Min(limit, total - offset))).ToList());
        }
        public Item? Map(int row) => keep(row) ? new Item(row) : null;
    }

    private static Task<FilteredPage<Item>> Fill(Source source, int offset, int limit, int batch = 20, int maxRequests = 4) =>
        FilteredPaginator.FillAsync<int, Item>(offset, limit, source.Fetch, source.Map, i => i.Value.ToString(),
            new PaginationBudget(maxRequests, batch), CancellationToken.None);

    [Fact] public async Task CursorCountsConsumedSourceRecordsNotSurvivingItems()
    {
        var source = new Source(1000, r => r % 10 == 0);
        var page = await Fill(source, 0, 3, batch: 20);
        Assert.Equal([0, 10, 20], page.Items.Select(i => i.Value));
        // Stopped right after record 20 (21 records consumed), not at 3 or at the end of the second batch.
        Assert.Equal(21, page.NextOffset);
        Assert.True(page.HasMore);
    }

    [Fact] public async Task AnEmptyFilteredPageIsNotTheEndOfTheCatalog()
    {
        var source = new Source(500, r => r >= 300);
        var first = await Fill(source, 0, 10, batch: 50, maxRequests: 2);
        Assert.Empty(first.Items);
        Assert.True(first.HasMore);
        Assert.True(first.BudgetExhausted);
        Assert.Equal(100, first.NextOffset);
        var later = await Fill(source, 200, 10, batch: 50, maxRequests: 4);
        Assert.Equal(Enumerable.Range(300, 10), later.Items.Select(i => i.Value));
    }

    [Fact] public async Task OnlyAShortSourcePageEndsTheCatalog()
    {
        var source = new Source(45, _ => false);
        var page = await Fill(source, 0, 10, batch: 20, maxRequests: 5);
        Assert.Empty(page.Items);
        Assert.False(page.HasMore);
        Assert.Equal(45, page.NextOffset);
    }

    [Fact] public async Task FollowingCursorsVisitsEveryMatchOnceInSourceOrder()
    {
        var source = new Source(737, r => r % 7 == 3 || r % 11 == 0);
        var expected = Enumerable.Range(0, 737).Where(r => r % 7 == 3 || r % 11 == 0).ToList();
        var collected = new List<int>();
        var offset = 0;
        for (var guard = 0; guard < 200; guard++)
        {
            var page = await Fill(source, offset, 9, batch: 25, maxRequests: 2);
            collected.AddRange(page.Items.Select(i => i.Value));
            offset = page.NextOffset;
            if (!page.HasMore) break;
        }
        Assert.Equal(expected, collected);
    }

    [Fact] public async Task DuplicatesInsideASourcePageAreDropped()
    {
        var rows = new[] { 1, 2, 2, 3, 1, 4 };
        var page = await FilteredPaginator.FillAsync<int, Item>(0, 10,
            (o, l, _) => Task.FromResult<IReadOnlyList<int>>(rows.Skip(o).Take(l).ToList()), r => new Item(r), i => i.Value.ToString(),
            new PaginationBudget(3, 6), CancellationToken.None);
        Assert.Equal([1, 2, 3, 4], page.Items.Select(i => i.Value));
        Assert.False(page.HasMore);
    }

    [Fact] public async Task CancellationStopsFetching()
    {
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => FilteredPaginator.FillAsync<int, Item>(0, 10,
            (_, _, _) => Task.FromResult<IReadOnlyList<int>>([1]), r => new Item(r), i => i.Value.ToString(), new PaginationBudget(), cts.Token));
    }

    [Fact] public void CursorRoundTripsAndRejectsTampering()
    {
        var token = new CatalogCursor(CatalogCursor.Live, 1234).Encode();
        Assert.True(CatalogCursor.TryDecode(token, out var cursor));
        Assert.Equal(new CatalogCursor(CatalogCursor.Live, 1234), cursor);
        Assert.False(CatalogCursor.TryDecode("bm90LWEtY3Vyc29y", out _));
        Assert.False(CatalogCursor.TryDecode("%%%", out _));
    }

    [Theory]
    [InlineData("-80,-20,-60,0", false)]
    [InlineData("170,-30,-170,10", true)]
    public void BoundingBoxesHandleTheAntimeridian(string value, bool crosses)
    {
        Assert.True(BoundingBox.TryParse(value, out var box));
        Assert.Equal(crosses, box!.CrossesAntimeridian);
        Assert.Equal(crosses, box.Contains(0, 179));
        Assert.False(box.Contains(50, -70));
    }

    [Theory] [InlineData("1,2,3")] [InlineData("0,50,10,40")] [InlineData("a,b,c,d")] [InlineData("0,-95,10,10")]
    public void InvalidBoundingBoxesAreRejected(string value) => Assert.False(BoundingBox.TryParse(value, out _));
}
