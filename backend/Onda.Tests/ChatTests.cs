using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Onda.Api;
using Onda.Infrastructure;
namespace Onda.Tests;

/// <summary>Extended room chat against a real SQL Server and real WebSocket connections.</summary>
public class ChatTests : IAsyncLifetime
{
    private static readonly string? Server = Environment.GetEnvironmentVariable("ONDA_TEST_SQL") ?? (OperatingSystem.IsWindows() ? @"Server=.\SQLEXPRESS;Integrated Security=true;TrustServerCertificate=true" : null);
    private readonly string name = "OndaChatTest_" + Guid.NewGuid().ToString("N")[..12];
    private readonly string uploads = Path.Combine(Path.GetTempPath(), "onda-chat-test-" + Guid.NewGuid().ToString("N")[..8]);
    private bool available;
    private string Connection => new SqlConnectionStringBuilder(Server) {InitialCatalog = name}.ConnectionString;
    private OndaDbContext Db() => new(new DbContextOptionsBuilder<OndaDbContext>().UseSqlServer(Connection).Options);
    public async Task InitializeAsync()
    {
        if (Server is null) return;
        try {await using var db = Db(); await db.Database.MigrateAsync(); available = true;} catch (SqlException) { }
    }
    public async Task DisposeAsync()
    {
        if (Directory.Exists(uploads)) Directory.Delete(uploads, true);
        if (!available) return; SqlConnection.ClearAllPools();
        await using var db = Db(); await db.Database.EnsureDeletedAsync();
    }
    private void RequireSql() => Skip.IfNot(available, "SQL Server no disponible para probar el chat.");

    private sealed class ManualClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => Now;
    }
    private WebApplicationFactory<Program> Factory(TimeProvider? clock = null, string? kinds = "image,audio,file") => new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
    {
        builder.UseEnvironment("Development");
        if (clock is not null) builder.ConfigureServices(services => services.AddSingleton(clock));
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {["ConnectionStrings:Onda"] = Connection, ["Catalog:SyncEnabled"] = "false", ["Chat:UploadsPath"] = uploads, ["Chat:AllowedKinds"] = kinds}));
    });
    private static async Task<(HttpClient Client, AccountSession Session)> ClientAsync(WebApplicationFactory<Program> app, string user)
    {
        var client = app.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/guest", new GuestAccount(user)); response.EnsureSuccessStatusCode();
        var session = (await response.Content.ReadFromJsonAsync<AccountSession>())!;
        client.DefaultRequestHeaders.Authorization = new("Bearer", session.Token); return (client, session);
    }
    private static HubConnection Hub(WebApplicationFactory<Program> app, HttpClient client) =>
        new HubConnectionBuilder().WithUrl("http://localhost/hubs/rooms", o =>
        {
            o.Transports = HttpTransportType.WebSockets; o.SkipNegotiation = true;
            o.WebSocketFactory = async (context, ct) =>
            {
                var ws = app.Server.CreateWebSocketClient();
                ws.ConfigureRequest = request => request.Headers.Authorization = client.DefaultRequestHeaders.Authorization!.ToString();
                return await ws.ConnectAsync(context.Uri, ct);
            };
        }).Build();
    private static async Task<RoomView> RoomAsync(HttpClient owner)
    {
        var create = await owner.PostAsJsonAsync("/api/v1/rooms/", new CreateRoom("Chat de prueba", true, new("video", "https://www.youtube.com/watch?v=M7lc1UVf-VE", Title: "Video")));
        create.EnsureSuccessStatusCode(); return (await create.Content.ReadFromJsonAsync<RoomView>())!;
    }
    /// <summary>Smallest valid PNG header with the given dimensions (IHDR is all the classifier reads).</summary>
    private static byte[] Png(uint width = 1, uint height = 1)
    {
        var bytes = new byte[64]; new byte[] {137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82}.CopyTo(bytes, 0);
        System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(bytes.AsSpan(16), width);
        System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(bytes.AsSpan(20), height); return bytes;
    }
    private static async Task<HttpResponseMessage> UploadAsync(HttpClient client, Guid room, byte[] bytes, string mime, string file, int? durationMs = null)
    {
        using var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(bytes); content.Headers.ContentType = new(mime);
        form.Add(content, "file", file);
        if (durationMs is { } d) form.Add(new StringContent(d.ToString()), "durationMs");
        return await client.PostAsync($"/api/v1/rooms/{room}/attachments/", form);
    }
    private static Task<T> Next<T>(HubConnection hub, string method, Func<T, bool>? match = null)
    {
        var source = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);
        IDisposable? registration = null;
        registration = hub.On<T>(method, value => {if (match?.Invoke(value) != false) {source.TrySetResult(value); registration?.Dispose();}});
        return source.Task.WaitAsync(TimeSpan.FromSeconds(10));
    }

    [SkippableFact] public async Task MessagesPersistWithRepliesEditsReactionsAndStableOrder()
    {
        RequireSql(); await using var app = Factory();
        var (ownerClient, _) = await ClientAsync(app, "Anfitrión"); var (peerClient, peerSession) = await ClientAsync(app, "Amiga");
        var room = await RoomAsync(ownerClient);
        await using var owner = Hub(app, ownerClient); await using var peer = Hub(app, peerClient);
        await owner.StartAsync(); await peer.StartAsync();
        await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode); await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);

        var arrived = Next<RoomMessage>(owner, "Message");
        var first = await peer.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Hola 👋  sala\n\n\n\nde prueba"));
        Assert.Equal(first.Id, (await arrived).Id); Assert.Equal("Hola 👋  sala\n\nde prueba", first.Text);
        await owner.InvokeAsync("SendMessage", room.Id, "Mensaje desde un cliente anterior");
        var reply = await owner.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Te respondo", first.Id));
        Assert.Equal(first.Id, reply.Reply!.Id); Assert.Equal("Amiga", reply.Reply.Sender); Assert.StartsWith("Hola", reply.Reply.Text);

        // Only the author edits, within the window; the edit is broadcast and keeps the original timestamp/order.
        await Assert.ThrowsAsync<HubException>(() => owner.InvokeAsync<RoomMessage>("EditChat", room.Id, new EditChatCommand(first.Id, "Robado")));
        var updated = Next<RoomMessage>(owner, "MessageUpdated");
        var edited = await peer.InvokeAsync<RoomMessage>("EditChat", room.Id, new EditChatCommand(first.Id, "Hola, editado"));
        Assert.NotNull(edited.EditedAt); Assert.Equal(first.At, edited.At); Assert.True(edited.Revision > first.Revision);
        Assert.Equal("Hola, editado", (await updated).Text);

        // One reaction per person: same emoji toggles off, another replaces it; invalid input is rejected.
        var reacted = await owner.InvokeAsync<RoomMessage>("ReactChat", room.Id, new ReactChatCommand(first.Id, "❤️"));
        Assert.Equal("❤️", Assert.Single(reacted.Reactions!).Emoji);
        reacted = await owner.InvokeAsync<RoomMessage>("ReactChat", room.Id, new ReactChatCommand(first.Id, "🔥"));
        Assert.Equal("🔥", Assert.Single(reacted.Reactions!).Emoji);
        reacted = await peer.InvokeAsync<RoomMessage>("ReactChat", room.Id, new ReactChatCommand(first.Id, "🔥"));
        Assert.Equal(2, reacted.Reactions!.Length);
        reacted = await owner.InvokeAsync<RoomMessage>("ReactChat", room.Id, new ReactChatCommand(first.Id, "🔥"));
        Assert.Equal(peerSession.User.Id, Assert.Single(reacted.Reactions!).AccountId);
        await Assert.ThrowsAsync<HubException>(() => owner.InvokeAsync<RoomMessage>("ReactChat", room.Id, new ReactChatCommand(first.Id, "hola")));

        // A fresh connection reads the persisted history in the original order with hydrated quotes.
        await using var again = Hub(app, peerClient); await again.StartAsync(); await again.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        var history = await again.InvokeAsync<RoomMessage[]>("History", room.Id);
        Assert.Equal([first.Id, history[1].Id, reply.Id], history.Select(x => x.Id));
        Assert.Equal("Mensaje desde un cliente anterior", history[1].Text);
        Assert.Equal("Hola, editado", history[0].Text); Assert.Equal("Hola, editado", history[2].Reply!.Text);
        Assert.Single(history[0].Reactions!);

        // Typing is relayed to others and never stored.
        var typing = Next<TypingEvent>(owner, "Typing");
        await peer.InvokeAsync("Typing", room.Id);
        Assert.Equal("Amiga", (await typing).Sender);
        Assert.Equal(3, await new Func<Task<int>>(async () => {await using var db = Db(); return await db.RoomChatEntries.CountAsync();})());
    }

    [SkippableFact] public async Task DeletionRespectsAuthorOwnerAndCohostBoundariesWithTombstones()
    {
        RequireSql(); var clock = new ManualClock(); await using var app = Factory(clock);
        var (ownerClient, _) = await ClientAsync(app, "Anfitrión"); var (peerClient, peerSession) = await ClientAsync(app, "Amiga"); var (thirdClient, _) = await ClientAsync(app, "Tercero");
        var room = await RoomAsync(ownerClient);
        await using var owner = Hub(app, ownerClient); await using var peer = Hub(app, peerClient); await using var third = Hub(app, thirdClient);
        foreach (var hub in new[] {owner, peer, third}) {await hub.StartAsync(); await hub.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);}
        var ownerMessage = await owner.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Del anfitrión"));
        var thirdMessage = await third.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Del tercero"));
        await owner.InvokeAsync("SetCohost", room.Id, peerSession.User.Id, true);
        // A co-host controls playback/queue but does not gain chat moderation.
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync<RoomMessage>("DeleteChat", room.Id, new ChatTarget(ownerMessage.Id)));
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync<RoomMessage>("DeleteChat", room.Id, new ChatTarget(thirdMessage.Id)));
        var reply = await peer.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Respuesta", thirdMessage.Id));
        await third.InvokeAsync<RoomMessage>("ReactChat", room.Id, new ReactChatCommand(thirdMessage.Id, "👏"));
        var removed = await owner.InvokeAsync<RoomMessage>("DeleteChat", room.Id, new ChatTarget(thirdMessage.Id));
        Assert.True(removed.Deleted); Assert.Equal(RoomChatService.DeletedText, removed.Text); Assert.Empty(removed.Reactions!);
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Otra", thirdMessage.Id)));
        await Assert.ThrowsAsync<HubException>(() => third.InvokeAsync<RoomMessage>("ReactChat", room.Id, new ReactChatCommand(thirdMessage.Id, "👏")));
        var history = await peer.InvokeAsync<RoomMessage[]>("History", room.Id);
        var quoted = history.Single(x => x.Id == reply.Id).Reply!;
        Assert.True(quoted.Deleted); Assert.Equal(RoomChatService.DeletedText, quoted.Text);
        Assert.DoesNotContain(history, x => x.Text == "Del tercero");
        // The edit window is enforced on the server.
        var mine = await peer.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Primera versión"));
        clock.Now = clock.Now.AddMinutes(16);
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync<RoomMessage>("EditChat", room.Id, new EditChatCommand(mine.Id, "Tarde")));
        // An author can always delete their own message for everyone.
        Assert.True((await peer.InvokeAsync<RoomMessage>("DeleteChat", room.Id, new ChatTarget(mine.Id))).Deleted);
    }

    [SkippableFact] public async Task AttachmentsArePrivateValidatedLimitedAndRemovedWithMessages()
    {
        RequireSql(); await using var app = Factory();
        var (ownerClient, _) = await ClientAsync(app, "Anfitrión"); var (peerClient, peerSession) = await ClientAsync(app, "Amiga"); var (outsiderClient, _) = await ClientAsync(app, "Externa");
        var room = await RoomAsync(ownerClient); var other = await RoomAsync(outsiderClient);
        await using var owner = Hub(app, ownerClient); await using var peer = Hub(app, peerClient); await using var outsider = Hub(app, outsiderClient);
        await owner.StartAsync(); await peer.StartAsync(); await outsider.StartAsync();
        // Not connected to the room yet: uploads are refused.
        Assert.Equal(HttpStatusCode.Forbidden, (await UploadAsync(peerClient, room.Id, Png(), "image/png", "a.png")).StatusCode);
        await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode); await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await outsider.InvokeAsync<RoomView>("Join", other.Id, other.InviteCode);

        // Signature and dimension checks, not the declared MIME alone.
        Assert.Equal(HttpStatusCode.BadRequest, (await UploadAsync(peerClient, room.Id, "<svg onload=alert(1)>"u8.ToArray(), "image/png", "fake.png")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await UploadAsync(peerClient, room.Id, Png(5000, 100), "image/png", "huge.png")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await UploadAsync(peerClient, room.Id, "not audio"u8.ToArray(), "audio/mp4", "voz.m4a")).StatusCode);
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await UploadAsync(peerClient, room.Id, new byte[RoomUploadStore.MaxBytes + 1], "application/pdf", "big.pdf")).StatusCode);

        var photo = (await (await UploadAsync(peerClient, room.Id, Png(800, 600), "image/png", "foto.png")).Content.ReadFromJsonAsync<ChatAttachment>())!;
        Assert.Equal("image", photo.Kind);
        var voiceBytes = new byte[32]; "ftypM4A "u8.CopyTo(voiceBytes.AsSpan(4));
        var voice = (await (await UploadAsync(peerClient, room.Id, voiceBytes, "audio/mp4", "nota.m4a", 4200)).Content.ReadFromJsonAsync<ChatAttachment>())!;
        Assert.Equal(("audio", 4200), (voice.Kind, voice.DurationMs));
        var doc = (await (await UploadAsync(peerClient, room.Id, "%PDF-1.7 contenido"u8.ToArray(), "application/pdf", "../../informe.pdf")).Content.ReadFromJsonAsync<ChatAttachment>())!;
        Assert.Equal(("file", "informe.pdf", "application/octet-stream"), (doc.Kind, doc.Name, doc.Mime));

        // Unsent uploads are visible only to the uploader; others in the room and other rooms cannot read them.
        Assert.Equal(HttpStatusCode.OK, (await peerClient.GetAsync($"/api/v1/rooms/{room.Id}/attachments/{photo.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await ownerClient.GetAsync($"/api/v1/rooms/{room.Id}/attachments/{photo.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await outsiderClient.GetAsync($"/api/v1/rooms/{room.Id}/attachments/{photo.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outsiderClient.GetAsync($"/api/v1/rooms/{other.Id}/attachments/{photo.Id}")).StatusCode);
        // Someone else's pending upload cannot be attached.
        await Assert.ThrowsAsync<HubException>(() => owner.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand(null, null, [photo.Id])));

        var sent = await peer.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Mira", null, [photo.Id, voice.Id, doc.Id]));
        Assert.Equal(3, sent.Attachments!.Length);
        var download = await ownerClient.GetAsync($"/api/v1/rooms/{room.Id}/attachments/{doc.Id}");
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("attachment", download.Content.Headers.ContentDisposition?.DispositionType);
        Assert.Equal("nosniff", download.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Contains("no-store", download.Headers.CacheControl!.ToString());
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Otra vez", null, [photo.Id])));

        // Expelled people lose access immediately.
        await owner.InvokeAsync("Kick", room.Id, peerSession.User.Id);
        Assert.Equal(HttpStatusCode.Forbidden, (await peerClient.GetAsync($"/api/v1/rooms/{room.Id}/attachments/{photo.Id}")).StatusCode);

        // Deleting the message removes rows and files.
        await owner.InvokeAsync<RoomMessage>("DeleteChat", room.Id, new ChatTarget(sent.Id));
        Assert.Equal(HttpStatusCode.NotFound, (await ownerClient.GetAsync($"/api/v1/rooms/{room.Id}/attachments/{photo.Id}")).StatusCode);
        await using var db = Db();
        Assert.False(await db.RoomUploads.AnyAsync(x => x.MessageId == sent.Id));
        Assert.False(File.Exists(Path.Combine(uploads, photo.Id.ToString("N") + ".bin")));
    }

    [SkippableFact] public async Task ChatCanRestrictNewUploadsToVoiceNotes()
    {
        RequireSql(); await using var app = Factory(kinds: "audio");
        var (ownerClient, _) = await ClientAsync(app, "Anfitrión"); var room = await RoomAsync(ownerClient);
        await using var owner = Hub(app, ownerClient); await owner.StartAsync(); await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        var before = Directory.Exists(uploads) ? Directory.GetFiles(uploads, "*.bin").Length : 0;
        var photo = await UploadAsync(ownerClient, room.Id, Png(800, 600), "image/png", "foto.png");
        Assert.Equal(HttpStatusCode.BadRequest, photo.StatusCode);
        Assert.Contains("no está habilitado", await photo.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.BadRequest, (await UploadAsync(ownerClient, room.Id, "%PDF-1.7"u8.ToArray(), "application/pdf", "a.pdf")).StatusCode);
        var voiceBytes = new byte[32]; "ftypM4A "u8.CopyTo(voiceBytes.AsSpan(4));
        Assert.Equal(HttpStatusCode.OK, (await UploadAsync(ownerClient, room.Id, voiceBytes, "audio/mp4", "nota.m4a", 3000)).StatusCode);
        Assert.Equal(before + 1, Directory.GetFiles(uploads, "*.bin").Length);
    }

    [SkippableFact] public async Task DefaultChatRejectsAllUploadsWithoutWritingFiles()
    {
        RequireSql(); await using var app = Factory(kinds: null);
        var (client, _) = await ClientAsync(app, "Adjuntos QA"); var room = await RoomAsync(client);
        await using var hub = Hub(app, client); await hub.StartAsync(); await hub.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        var photoResponse = await UploadAsync(client, room.Id, Png(800, 600), "image/png", "foto.png");
        Assert.Equal(HttpStatusCode.BadRequest, photoResponse.StatusCode);
        var fileResponse = await UploadAsync(client, room.Id, "<html><script>alert(1)</script>"u8.ToArray(), "text/html", "archivo.html");
        Assert.Equal(HttpStatusCode.BadRequest, fileResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await UploadAsync(client, room.Id, "ftypM4A "u8.ToArray(), "audio/mp4", "voz.m4a")).StatusCode);
        await using var db = Db(); Assert.Empty(await db.RoomUploads.ToArrayAsync());
        Assert.False(Directory.Exists(uploads));
        Assert.Equal(HttpStatusCode.BadRequest, (await UploadAsync(client, room.Id, "fake image"u8.ToArray(), "image/png", "falsa.png")).StatusCode);
    }

    [SkippableFact] public async Task PinnedMessagesPersistWithControllerPermissionsAndClearOnDeletion()
    {
        RequireSql(); await using var app = Factory();
        var (a, _) = await ClientAsync(app, "Anfitrión"); var (b, peer) = await ClientAsync(app, "Amiga"); var room = await RoomAsync(a);
        await using var owner = Hub(app, a); await using var guest = Hub(app, b); await owner.StartAsync(); await guest.StartAsync();
        await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode); await guest.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        var first = await guest.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Primer mensaje"));
        await Assert.ThrowsAsync<HubException>(() => guest.InvokeAsync<RoomMessage[]>("PinChat", room.Id, new ChatTarget(first.Id)));
        await owner.InvokeAsync<RoomMessage[]>("PinChat", room.Id, new ChatTarget(first.Id));
        Assert.True((await guest.InvokeAsync<RoomMessage>("PinnedChat", room.Id)).Pinned);
        await guest.InvokeAsync<RoomMessage>("EditChat", room.Id, new EditChatCommand(first.Id, "Editado"));
        Assert.Equal("Editado", (await owner.InvokeAsync<RoomMessage>("PinnedChat", room.Id)).Text);
        await owner.InvokeAsync("SetCohost", room.Id, peer.User.Id, true);
        var second = await guest.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("[[onda:sticker:temazo]]"));
        await guest.InvokeAsync<RoomMessage[]>("PinChat", room.Id, new ChatTarget(second.Id));
        var history = await owner.InvokeAsync<RoomMessage[]>("History", room.Id);
        Assert.Single(history, x => x.Pinned);
        Assert.Equal(second.Id, (await owner.InvokeAsync<RoomMessage>("PinnedChat", room.Id)).Id);
        Assert.Equal("Sticker: ¡Qué temazo!", RoomChatService.Quote(history.Single(x => x.Id == second.Id)).Text);
        await guest.InvokeAsync<RoomMessage>("DeleteChat", room.Id, new ChatTarget(second.Id));
        Assert.Null(await owner.InvokeAsync<RoomMessage?>("PinnedChat", room.Id));
        await Assert.ThrowsAsync<HubException>(() => owner.InvokeAsync<RoomMessage[]>("PinChat", room.Id, new ChatTarget(second.Id)));
    }

    [SkippableFact] public async Task SpaEntryRevalidatesForBothDirectAndRoomNavigation()
    {
        RequireSql();
        var web = Path.Combine(uploads, "web"); Directory.CreateDirectory(web);
        await File.WriteAllTextAsync(Path.Combine(web, "index.html"), "<!doctype html><title>ONDA QA</title>");
        await using var app = Factory().WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> {["PublicAssetsPath"] = web})));
        var client = app.CreateClient(new WebApplicationFactoryClientOptions {BaseAddress = new Uri("https://onda.lunalav.pe")});
        foreach (var path in new[] {"/index.html", "/", "/room?id=qa"})
        {
            var response = await client.GetAsync(path);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.True(response.Headers.CacheControl!.NoStore);
            Assert.Contains("ONDA QA", await response.Content.ReadAsStringAsync());
        }
    }

    [SkippableFact] public async Task AccountDeletionAndMaintenanceRemoveChatDataAndOrphans()
    {
        RequireSql(); var clock = new ManualClock(); await using var app = Factory(clock);
        var (ownerClient, _) = await ClientAsync(app, "Anfitrión"); var (peerClient, peerSession) = await ClientAsync(app, "Amiga");
        var room = await RoomAsync(ownerClient);
        await using var owner = Hub(app, ownerClient); await using var peer = Hub(app, peerClient);
        await owner.StartAsync(); await peer.StartAsync();
        await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode); await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        var ownerMessage = await owner.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Hola"));
        await peer.InvokeAsync<RoomMessage>("ReactChat", room.Id, new ReactChatCommand(ownerMessage.Id, "❤️"));
        var photo = (await (await UploadAsync(peerClient, room.Id, Png(), "image/png", "foto.png")).Content.ReadFromJsonAsync<ChatAttachment>())!;
        var peerMessage = await peer.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Con foto", null, [photo.Id]));
        var pending = (await (await UploadAsync(peerClient, room.Id, Png(), "image/png", "pendiente.png")).Content.ReadFromJsonAsync<ChatAttachment>())!;
        var replyToPeer = await owner.InvokeAsync<RoomMessage>("SendChat", room.Id, new SendChatCommand("Respuesta", peerMessage.Id));

        // Guest accounts confirm deletion without a password.
        using var deletion = new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/account") {Content = JsonContent.Create(new PasswordConfirmation(null))};
        Assert.Equal(HttpStatusCode.NoContent, (await peerClient.SendAsync(deletion)).StatusCode);
        await using (var db = Db())
        {
            Assert.False(await db.RoomChatEntries.AnyAsync(x => x.SenderId == peerSession.User.Id));
            Assert.False(await db.RoomUploads.AnyAsync(x => x.UploaderId == peerSession.User.Id));
            Assert.DoesNotContain(peerSession.User.Id.ToString(), (await db.RoomChatEntries.SingleAsync(x => x.Id == ownerMessage.Id)).Payload);
        }
        Assert.False(File.Exists(Path.Combine(uploads, photo.Id.ToString("N") + ".bin")));
        Assert.False(File.Exists(Path.Combine(uploads, pending.Id.ToString("N") + ".bin")));
        var history = await owner.InvokeAsync<RoomMessage[]>("History", room.Id);
        Assert.Empty(history.Single(x => x.Id == ownerMessage.Id).Reactions!);
        Assert.True(history.Single(x => x.Id == replyToPeer.Id).Reply!.Deleted);

        // Retention and orphan cleanup.
        var mine = (await (await UploadAsync(ownerClient, room.Id, Png(), "image/png", "sin-enviar.png")).Content.ReadFromJsonAsync<ChatAttachment>())!;
        File.WriteAllBytes(Path.Combine(uploads, Guid.NewGuid().ToString("N") + ".bin"), [1, 2, 3]);
        foreach (var file in Directory.EnumerateFiles(uploads)) File.SetLastWriteTimeUtc(file, DateTime.UtcNow.AddHours(-2));
        clock.Now = clock.Now.AddDays(31);
        await using (var db = Db())
        {
            var store = app.Services.GetRequiredService<RoomUploadStore>();
            store.Delete(await RoomChatService.PruneExpiredAsync(db, clock.Now, default));
            await store.PruneAsync(db, default);
            Assert.False(await db.RoomChatEntries.AnyAsync(x => x.RoomId == room.Id));
            Assert.False(await db.RoomUploads.AnyAsync(x => x.Id == mine.Id));
        }
        Assert.Empty(Directory.EnumerateFiles(uploads));
    }
}

public class ChatValidationTests
{
    [Theory] [InlineData("❤️", true)] [InlineData("👍🏽", true)] [InlineData("🇵🇪", true)] [InlineData("hola", false)] [InlineData("<b>", false)] [InlineData("", false)]
    public void EmojiReactionsAcceptOnlySymbols(string value, bool valid) => Assert.Equal(valid, RoomChatService.IsEmoji(value));

    [Fact] public void TextIsCleanedButLineBreaksSurvive() =>
        Assert.Equal("Hola\n\nmundo\tfin", RoomChatService.Clean("  Hola\r\n\n\n\n\u0007mundo\tfin  "));

    [Theory]
    [InlineData(new byte[] {0x1A, 0x45, 0xDF, 0xA3, 0, 0, 0, 0}, "audio/webm", "audio/webm")]
    [InlineData(new byte[] {0x4F, 0x67, 0x67, 0x53, 0, 0, 0, 0}, "audio/ogg", "audio/ogg")]
    [InlineData(new byte[] {0x49, 0x44, 0x33, 4, 0, 0, 0, 0}, "audio/mpeg", "audio/mpeg")]
    public void VoiceNotesAreRecognisedBySignature(byte[] bytes, string declared, string expected) =>
        Assert.Equal(("audio", expected), RoomUploadStore.Classify(bytes, declared));

    [Fact] public void QuotesNeverExposeDeletedText()
    {
        var deleted = new RoomMessage(Guid.NewGuid(), Guid.NewGuid(), "Ana", "secreto", "text", DateTimeOffset.UtcNow, Deleted: true);
        Assert.Equal(RoomChatService.DeletedText, RoomChatService.Quote(deleted).Text);
        var voice = new RoomMessage(Guid.NewGuid(), Guid.NewGuid(), "Ana", "", "text", DateTimeOffset.UtcNow, Attachments: [new(Guid.NewGuid(), "x.m4a", "audio/mp4", "audio", 10)]);
        Assert.Equal("Nota de voz", RoomChatService.Quote(voice).Text);
    }
}
