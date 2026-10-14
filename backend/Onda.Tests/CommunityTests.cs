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
    private WebApplicationFactory<Program> Factory(TimeProvider? clock = null) => new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
    {
        builder.UseEnvironment("Development");
        if (clock is not null) builder.ConfigureServices(services => services.AddSingleton(clock));
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
    [SkippableFact] public async Task ChoosingAnotherVideoBroadcastsToGroupAndPreservesOtherProposals()
    {
        RequireSql(); await using var app = Factory();
        using var ownerClient = await ClientAsync(app, "Anfitrión"); using var peerClient = await ClientAsync(app, "Amiga");
        var created = await ownerClient.PostAsJsonAsync("/api/v1/rooms/", new CreateRoom("Navegación", true, new("video", "https://youtu.be/M7lc1UVf-VE", Title: "Inicial")));
        created.EnsureSuccessStatusCode(); var room = (await created.Content.ReadFromJsonAsync<RoomView>())!;
        await using var owner = Hub(app, ownerClient); await using var peer = Hub(app, peerClient);
        await owner.StartAsync(); await peer.StartAsync(); await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        var input = new MediaInput("video", "https://m.youtube.com/watch?v=aqz-KE-bpKQ", Title: "Siguiente");
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync("ChangeMedia", room.Id, new ChangeMediaCommand(input, room.Version)));
        await peer.InvokeAsync("AddToQueue", room.Id, input);
        await peer.InvokeAsync("AddToQueue", room.Id, new MediaInput("video", "https://youtu.be/dQw4w9WgXcQ", Title: "Conservar"));
        var before = await owner.InvokeAsync<RoomView>("Snapshot", room.Id);
        var selected = before.Queue.Single(x => x.Media.VideoId == "aqz-KE-bpKQ");
        await peer.InvokeAsync("Vote", room.Id, selected.Id);
        var received = new TaskCompletionSource<RoomView>(TaskCreationOptions.RunContinuationsAsynchronously);
        peer.On<RoomView>("State", value => {if (value.Media.VideoId == "aqz-KE-bpKQ") received.TrySetResult(value);});
        await owner.InvokeAsync("ChangeMedia", room.Id, new ChangeMediaCommand(input, before.Version, true, 3));
        Assert.Equal("aqz-KE-bpKQ", (await received.Task.WaitAsync(TimeSpan.FromSeconds(10))).Media.VideoId);
        var changed = await peer.InvokeAsync<RoomView>("Snapshot", room.Id);
        Assert.Equal("aqz-KE-bpKQ", changed.Media.VideoId); Assert.True(changed.IsPlaying); Assert.Equal(3, changed.PositionSeconds);
        Assert.Equal("Conservar", changed.Queue.Single().Media.Title); Assert.Empty(await peer.InvokeAsync<Guid[]>("MyVotes", room.Id));
        await Assert.ThrowsAsync<HubException>(() => owner.InvokeAsync("ChangeMedia", room.Id, new ChangeMediaCommand(input, before.Version)));
        var peerId = changed.Members.Single(x => x.Name == "Amiga").Id;
        await owner.InvokeAsync("SetCohost", room.Id, peerId, true);
        changed = await peer.InvokeAsync<RoomView>("Snapshot", room.Id);
        await peer.InvokeAsync("ChangeMedia", room.Id, new ChangeMediaCommand(new("video", "https://youtu.be/M7lc1UVf-VE", Title: "Otra vez"), changed.Version, false));
        Assert.False((await owner.InvokeAsync<RoomView>("Snapshot", room.Id)).IsPlaying);
    }
    [SkippableTheory]
    [InlineData("youtube")]
    [InlineData("radio")]
    [InlineData("audio")]
    [InlineData("video")]
    public async Task ProviderCreatesPausedRoomUntilOwnerChoosesContent(string provider)
    {
        RequireSql(); await using var app = Factory();
        using var ownerClient = await ClientAsync(app, "Anfitrión"); using var peerClient = await ClientAsync(app, "Amiga");
        var created = await ownerClient.PostAsJsonAsync("/api/v1/rooms/", new CreateRoom("Selección directa", true, new(provider), Provider: provider));
        created.EnsureSuccessStatusCode(); var room = (await created.Content.ReadFromJsonAsync<RoomView>())!;
        Assert.Equal(provider, room.Media.Kind); Assert.Null(room.Media.Url); Assert.Null(room.Media.VideoId); Assert.False(room.IsPlaying);
        await using var owner = Hub(app, ownerClient); await using var peer = Hub(app, peerClient);
        await owner.StartAsync(); await peer.StartAsync(); await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        var joined = await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await Assert.ThrowsAsync<HubException>(() => owner.InvokeAsync("SetPlayback", room.Id, new PlaybackCommand(true, 0, joined.Version)));
        var received = new TaskCompletionSource<RoomView>(TaskCreationOptions.RunContinuationsAsynchronously);
        peer.On<RoomView>("State", value => {if (value.Media.Url is not null) received.TrySetResult(value);});
        await owner.InvokeAsync("ChangeMedia", room.Id, new ChangeMediaCommand(new("video", "https://youtu.be/M7lc1UVf-VE", Title: "Elegido"), joined.Version));
        Assert.Equal("Elegido", (await received.Task.WaitAsync(TimeSpan.FromSeconds(10))).Media.Title);
        Assert.True((await peer.InvokeAsync<RoomView>("Snapshot", room.Id)).IsPlaying);
        var invalid = await ownerClient.PostAsJsonAsync("/api/v1/rooms/", new CreateRoom("Inválida", true, new(provider), Provider: "untrusted"));
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
    }
    private sealed record RoomList(RoomSummary[] Items);
    private sealed class ManualClock : TimeProvider
    {
        private readonly object gate = new(); private DateTimeOffset now = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() {lock (gate) return now;}
        public void Advance(int seconds) {lock (gate) now = now.AddSeconds(seconds);}
    }
    [SkippableFact] public async Task CohostPermissionsGraceAndReconnectProtectRoomContinuity()
    {
        RequireSql(); var clock = new ManualClock(); await using var app = Factory(clock);
        using var ownerClient = await ClientAsync(app, "Anfitrión"); using var peerClient = await ClientAsync(app, "Coanfitrión");
        var created = await ownerClient.PostAsJsonAsync("/api/v1/rooms/", new CreateRoom("Continúa juntos", true, new("video", "https://youtu.be/M7lc1UVf-VE", Title: "Prueba"), true));
        created.EnsureSuccessStatusCode(); var room = (await created.Content.ReadFromJsonAsync<RoomView>())!;
        await using var owner = Hub(app, ownerClient); await using var peer = Hub(app, peerClient);
        await owner.StartAsync(); await peer.StartAsync(); await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        var joined = await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode); var peerId = joined.Members.Single(x => x.Name == "Coanfitrión").Id;
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync("SetCohost", room.Id, peerId, true));
        await owner.InvokeAsync("SetCohost", room.Id, peerId, true);
        joined = await peer.InvokeAsync<RoomView>("Snapshot", room.Id); Assert.Contains(peerId, joined.Cohosts);
        await peer.InvokeAsync("SetPlayback", room.Id, new PlaybackCommand(false, 12, joined.Version));
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync("RotateInvite", room.Id));
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync("CloseRoom", room.Id));
        await peer.InvokeAsync("AddToQueue", room.Id, new MediaInput("video", "https://youtu.be/dQw4w9WgXcQ", Title: "Propuesta"));
        var item = (await peer.InvokeAsync<RoomView>("Snapshot", room.Id)).Queue.Single();
        Assert.True(await peer.InvokeAsync<bool>("Vote", room.Id, item.Id));
        Assert.Contains(item.Id, await peer.InvokeAsync<Guid[]>("MyVotes", room.Id));
        await peer.InvokeAsync("PinQueued", room.Id, item.Id); Assert.True((await owner.InvokeAsync<RoomView>("Snapshot", room.Id)).Queue.Single().Pinned);
        await owner.StopAsync(); await peer.InvokeAsync<RoomView>("Snapshot", room.Id);
        clock.Advance(59); await app.Services.GetRequiredService<RoomContinuity>().SweepAsync(default);
        Assert.Equal(room.OwnerId, (await peer.InvokeAsync<RoomView>("Snapshot", room.Id)).OwnerId);
        await owner.StartAsync(); await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        clock.Advance(61); await app.Services.GetRequiredService<RoomContinuity>().SweepAsync(default);
        Assert.Equal(room.OwnerId, (await peer.InvokeAsync<RoomView>("Snapshot", room.Id)).OwnerId);
        await owner.StopAsync(); await peer.InvokeAsync<RoomView>("Snapshot", room.Id);
        clock.Advance(61); await app.Services.GetRequiredService<RoomContinuity>().SweepAsync(default);
        var recovered = await peer.InvokeAsync<RoomView>("Snapshot", room.Id);
        Assert.Equal(peerId, recovered.OwnerId); Assert.DoesNotContain(peerId, recovered.Cohosts);
        Assert.Equal(12, recovered.PositionSeconds); Assert.True(recovered.Queue.Single().Pinned);
        Assert.Contains(await peer.InvokeAsync<RoomMessage[]>("History", room.Id), x => x.Kind == "system");
        await peer.InvokeAsync("CloseRoom", room.Id);
    }
    [SkippableFact] public async Task RecoveryDoesNotTakeOverWhenOwnerDisabledIt()
    {
        RequireSql(); var clock = new ManualClock(); await using var app = Factory(clock);
        using var ownerClient = await ClientAsync(app, "Anfitrión"); using var peerClient = await ClientAsync(app, "Participante");
        var created = await ownerClient.PostAsJsonAsync("/api/v1/rooms/", new CreateRoom("Sin traspaso automático", true, new("video", "https://youtu.be/M7lc1UVf-VE", Title: "Prueba")));
        created.EnsureSuccessStatusCode(); var room = (await created.Content.ReadFromJsonAsync<RoomView>())!;
        await using var owner = Hub(app, ownerClient); await using var peer = Hub(app, peerClient);
        await owner.StartAsync(); await peer.StartAsync(); await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode); await owner.StopAsync();
        await peer.InvokeAsync<RoomView>("Snapshot", room.Id); clock.Advance(300);
        await app.Services.GetRequiredService<RoomContinuity>().SweepAsync(default);
        var unchanged = await peer.InvokeAsync<RoomView>("Snapshot", room.Id);
        Assert.False(unchanged.AutoRecovery); Assert.Equal(room.OwnerId, unchanged.OwnerId);
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync("SetPlayback", room.Id, new PlaybackCommand(true, 0, unchanged.Version)));
    }
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
