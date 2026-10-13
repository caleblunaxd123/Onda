using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Onda.Api;
using Onda.Domain;
using Onda.Infrastructure;
namespace Onda.Tests;

public class CommunityTests : IAsyncLifetime
{
    private static readonly string? Server = Environment.GetEnvironmentVariable("ONDA_TEST_SQL") ?? (OperatingSystem.IsWindows() ? @"Server=.\SQLEXPRESS;Integrated Security=true;TrustServerCertificate=true" : null);
    private readonly string name = "OndaCommunityTest_" + Guid.NewGuid().ToString("N")[..12];
    private bool available;
    private string Connection => new SqlConnectionStringBuilder(Server) {InitialCatalog = name}.ConnectionString;
    private OndaDbContext Db() => new(new DbContextOptionsBuilder<OndaDbContext>().UseSqlServer(Connection).Options);
    private AccountService Accounts(OndaDbContext db) => new(db, TimeProvider.System, new PasswordHasher<ListenerAccount>(Options.Create(new PasswordHasherOptions {IterationCount = 210000})));
    public async Task InitializeAsync()
    {
        if (Server is null) return;
        try {await using var db = Db(); await db.Database.MigrateAsync(); available = true;} catch (SqlException) { }
    }
    public async Task DisposeAsync()
    {
        if (!available) return; SqlConnection.ClearAllPools();
        await using var db = Db(); await db.Database.EnsureDeletedAsync();
    }
    private void RequireSql() => Skip.IfNot(available, "SQL Server no disponible para probar cuentas y salas.");
    private WebApplicationFactory<Program> Factory() => new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:Onda"] = Connection, ["Catalog:SyncEnabled"] = "false" }));
    });
    private static async Task<HttpClient> ClientAsync(WebApplicationFactory<Program> app, string user)
    {
        var client = app.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/guest", new GuestAccount(user)); response.EnsureSuccessStatusCode();
        var session = await response.Content.ReadFromJsonAsync<AccountSession>();
        client.DefaultRequestHeaders.Authorization = new("Bearer", session!.Token); return client;
    }
    private static HubConnection Hub(WebApplicationFactory<Program> app, HttpClient client)
    {
        return new HubConnectionBuilder().WithUrl("http://localhost/hubs/rooms", o =>
        {
            o.Transports = HttpTransportType.WebSockets; o.SkipNegotiation = true;
            o.WebSocketFactory = async (context, ct) =>
            {
                var ws = app.Server.CreateWebSocketClient();
                ws.ConfigureRequest = request => request.Headers.Authorization = client.DefaultRequestHeaders.Authorization!.ToString();
                return await ws.ConnectAsync(context.Uri, ct);
            };
        }).Build();
    }
    [SkippableFact] public async Task PasswordsAndTokensAreHashedAndRecoveryRevokesOldSessions()
    {
        RequireSql(); await using var db = Db(); var service = Accounts(db);
        var created = await service.RegisterAsync(new("Ana", "ANA@example.test", "Onda-testing-pass123"), null, default);
        Assert.NotNull(created); Assert.Equal("ana@example.test", created.User.Email);
        var stored = await db.ListenerAccounts.SingleAsync();
        Assert.NotEqual("Onda-testing-pass123", stored.PasswordHash); Assert.NotEqual(created.RecoveryCode, stored.RecoveryHash);
        Assert.NotEqual(created.Token, (await db.ListenerSessions.SingleAsync()).TokenHash);
        Assert.Null(await service.LoginAsync(new("ana@example.test", "Incorrect-pass123"), default));
        Assert.NotNull(await service.AuthenticateAsync(created.Token, default));
        var recovered = await service.RecoverAsync(new("ana@example.test", created.RecoveryCode, "A-new-testing-pass123"), default);
        Assert.NotNull(recovered); Assert.NotEqual(created.RecoveryCode, recovered.RecoveryCode);
        Assert.Null(await service.AuthenticateAsync(created.Token, default));
        Assert.Null(await service.RecoverAsync(new("ana@example.test", created.RecoveryCode, "Another-testing-pass123"), default));
        Assert.NotNull(await service.LoginAsync(new("ana@example.test", "A-new-testing-pass123"), default));
    }
    [SkippableFact] public async Task GuestUpgradePreservesIdentityAndLibraryVersionsRejectStaleWrites()
    {
        RequireSql(); await using var db = Db(); var accounts = Accounts(db);
        var guest = await accounts.GuestAsync("Mi nombre", default);
        var registered = await accounts.RegisterAsync(new("Mi nombre", "listener@example.test", "Onda-testing-pass123"), guest.User.Id, default);
        Assert.Equal(guest.User.Id, registered!.User.Id); Assert.False(registered.User.Guest);
        Assert.Null(await accounts.AuthenticateAsync(guest.Token, default));
        var sync = new LibrarySyncService(db, TimeProvider.System); var station = Guid.NewGuid();
        var saved = await sync.SaveAsync(registered.User.Id, new(0, new([station], null, [new("c", "Viaje", [station])], [new("video", "youtube", "https://www.youtube.com/watch?v=M7lc1UVf-VE", "Video guardado")])), default);
        Assert.Equal(1, saved!.Version);
        Assert.Null(await sync.SaveAsync(registered.User.Id, new(0, LibrarySyncService.Empty), default));
        Assert.Equal(station, (await sync.GetAsync(registered.User.Id, default)).Library.Favorites.Single());
        Assert.Equal("Video guardado", (await sync.GetAsync(registered.User.Id, default)).Library.Media!.Single().Title);
        var another = await accounts.GuestAsync("Otro", default);
        Assert.Empty((await sync.GetAsync(another.User.Id, default)).Library.Favorites);
        Assert.False(await accounts.DeleteAsync(registered.User.Id, "wrong", default));
        Assert.True(await accounts.DeleteAsync(registered.User.Id, "Onda-testing-pass123", default));
        Assert.False(await db.CloudLibraries.AnyAsync(x => x.AccountId == registered.User.Id));
        Assert.Null(await accounts.AuthenticateAsync(registered.Token, default));
    }
    [SkippableFact] public async Task ApiRequiresIdentityAndNeverLeaksCloudLibraryToGuests()
    {
        RequireSql(); await using var app = Factory(); using var anonymous = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/library/")).StatusCode);
        using var guest = await ClientAsync(app, "Invitado");
        Assert.Equal(HttpStatusCode.Forbidden, (await guest.GetAsync("/api/v1/library/")).StatusCode);
        var user = await guest.GetFromJsonAsync<AccountView>("/api/v1/auth/me"); Assert.True(user!.Guest);
        Assert.Equal(HttpStatusCode.NoContent, (await guest.PostAsync("/api/v1/auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await guest.GetAsync("/api/v1/auth/me")).StatusCode);
    }
    [SkippableFact] public async Task ApiRegistrationRecoveryAndDeletionSupportSqlRetryTransactions()
    {
        RequireSql(); await using var app = Factory(); using var client = app.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccount("Persona", "transaction@example.test", "Onda-testing-pass123"));
        response.EnsureSuccessStatusCode(); var created = (await response.Content.ReadFromJsonAsync<AccountSession>())!;
        client.DefaultRequestHeaders.Authorization = new("Bearer", created.Token);
        Assert.False((await client.GetFromJsonAsync<AccountView>("/api/v1/auth/me"))!.Guest);
        var reset = await client.PostAsJsonAsync("/api/v1/auth/recover", new RecoverAccount(created.User.Email, created.RecoveryCode, "Another-testing-pass123"));
        reset.EnsureSuccessStatusCode(); var recovered = (await reset.Content.ReadFromJsonAsync<AccountSession>())!;
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new("Bearer", recovered.Token);
        using var deletion = new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/account") {Content = JsonContent.Create(new PasswordConfirmation("Another-testing-pass123"))};
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(deletion)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
    }
    [SkippableFact] public async Task RealWebSocketsEnforcePrivateInvitesHostControlsChatVotesAndBans()
    {
        RequireSql(); await using var app = Factory(); using var ownerClient = await ClientAsync(app, "Anfitrión"); using var peerClient = await ClientAsync(app, "Amiga");
        var create = await ownerClient.PostAsJsonAsync("/api/v1/rooms/", new CreateRoom("Sala privada de prueba", true, new("video", "https://www.youtube.com/watch?v=M7lc1UVf-VE", Title: "Video de prueba")));
        create.EnsureSuccessStatusCode(); var room = (await create.Content.ReadFromJsonAsync<RoomView>())!;
        using var publicClient = app.CreateClient(); var publicRooms = await publicClient.GetFromJsonAsync<RoomList>("/api/v1/rooms/"); Assert.DoesNotContain(publicRooms!.Items, x => x.Id == room.Id);
        await using var owner = Hub(app, ownerClient); await using var peer = Hub(app, peerClient);
        await owner.StartAsync(); await peer.StartAsync();
        await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync<RoomView>("Join", room.Id, "wrong"));
        var joined = await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode); Assert.Equal(2, joined.Members.Length);
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync("SetPlayback", room.Id, new PlaybackCommand(true, 10, joined.Version)));
        await owner.InvokeAsync("SetPlayback", room.Id, new PlaybackCommand(true, 10, joined.Version));
        var snapshot = await peer.InvokeAsync<RoomView>("Snapshot", room.Id); Assert.True(snapshot.IsPlaying); Assert.Equal(10, snapshot.PositionSeconds);
        var received = new TaskCompletionSource<RoomMessage>(TaskCreationOptions.RunContinuationsAsynchronously);
        owner.On<RoomMessage>("Message", message => received.TrySetResult(message));
        await peer.InvokeAsync("SendMessage", room.Id, "Hola, sala de prueba");
        var message = await received.Task.WaitAsync(TimeSpan.FromSeconds(10)); Assert.Equal("Amiga", message.Sender);
        await peer.InvokeAsync("AddToQueue", room.Id, new MediaInput("video", "https://youtu.be/dQw4w9WgXcQ", Title: "Propuesta"));
        snapshot = await owner.InvokeAsync<RoomView>("Snapshot", room.Id); var item = snapshot.Queue.Single();
        await peer.InvokeAsync("Vote", room.Id, item.Id); Assert.Equal(1, (await owner.InvokeAsync<RoomView>("Snapshot", room.Id)).Queue.Single().Votes);
        await peer.InvokeAsync("Vote", room.Id, item.Id); Assert.Equal(0, (await owner.InvokeAsync<RoomView>("Snapshot", room.Id)).Queue.Single().Votes);
        await owner.InvokeAsync("PlayQueued", room.Id, item.Id); Assert.Empty((await owner.InvokeAsync<RoomView>("Snapshot", room.Id)).Queue);
        await owner.InvokeAsync("Kick", room.Id, joined.Members.Single(x => x.Name == "Amiga").Id);
        await using var banned = Hub(app, peerClient); await banned.StartAsync();
        await Assert.ThrowsAsync<HubException>(() => banned.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode));
        await owner.InvokeAsync("CloseRoom", room.Id);
        Assert.Equal(HttpStatusCode.NotFound, (await ownerClient.GetAsync("/api/v1/rooms/invite/" + room.InviteCode)).StatusCode);
    }
    private sealed record RoomList(RoomSummary[] Items);
}

public class MediaValidationTests
{
    [Theory]
    [InlineData("https://youtu.be/M7lc1UVf-VE", "M7lc1UVf-VE")]
    [InlineData("https://www.youtube.com/shorts/M7lc1UVf-VE", "M7lc1UVf-VE")]
    [InlineData("https://youtube.com.attacker.test/watch?v=M7lc1UVf-VE", null)]
    [InlineData("http://youtube.com/watch?v=M7lc1UVf-VE", null)]
    [InlineData("https://youtube.com/watch?v=<script>", null)]
    public void MediaIdsAreValidatedAgainstExactOfficialHosts(string url, string? expected) => Assert.Equal(expected, MediaResolver.YoutubeId(url));
    [Theory]
    [InlineData("127.0.0.1", false)] [InlineData("10.0.0.1", false)] [InlineData("169.254.169.254", false)]
    [InlineData("::1", false)] [InlineData("fc00::1", false)] [InlineData("::ffff:192.168.1.1", false)] [InlineData("8.8.8.8", true)]
    public void PrivateMediaAddressesAreRejected(string value, bool expected) => Assert.Equal(expected, MediaResolver.PublicAddress(IPAddress.Parse(value)));
}
