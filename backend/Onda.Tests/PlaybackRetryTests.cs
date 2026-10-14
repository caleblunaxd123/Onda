using System.Net.Http.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Onda.Api;
namespace Onda.Tests;

public partial class CommunityTests
{
    [SkippableFact] public async Task HostChangesCannotGiveSomeoneASecondOpenRoom()
    {
        RequireSql(); var clock = new ManualClock(); await using var app = Factory(clock);
        using var client = await ClientAsync(app, "Owner transfer"); using var peerClient = await ClientAsync(app, "Peer transfer");
        var media = new MediaInput("youtube", "https://youtu.be/M7lc1UVf-VE");
        var room = (await (await client.PostAsJsonAsync("/api/v1/rooms/", new CreateRoom("Owner QA", true, media, true))).Content.ReadFromJsonAsync<RoomView>())!;
        var peerRoom = (await (await peerClient.PostAsJsonAsync("/api/v1/rooms/", new CreateRoom("Peer QA", true, media))).Content.ReadFromJsonAsync<RoomView>())!;
        await using var owner = Hub(app, client); await using var peer = Hub(app, peerClient);
        await owner.StartAsync(); await peer.StartAsync(); await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await Assert.ThrowsAsync<HubException>(() => owner.InvokeAsync("TransferHost", room.Id, peerRoom.OwnerId));
        await owner.StopAsync(); await peer.InvokeAsync<RoomView>("Snapshot", room.Id); clock.Advance(61);
        await app.Services.GetRequiredService<RoomContinuity>().SweepAsync(default);
        Assert.Equal(room.OwnerId, (await peer.InvokeAsync<RoomView>("Snapshot", room.Id)).OwnerId);
        await peer.InvokeAsync<RoomView>("Join", peerRoom.Id, peerRoom.InviteCode); await peer.InvokeAsync("CloseRoom", peerRoom.Id);
        await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await owner.StartAsync(); await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await owner.InvokeAsync("TransferHost", room.Id, peerRoom.OwnerId);
        Assert.Equal(peerRoom.OwnerId, (await peer.InvokeAsync<RoomView>("Snapshot", room.Id)).OwnerId);
    }
    [SkippableFact] public async Task PlaybackRetriesAreBoundToSessionPayloadAndVersionAcrossReconnect()
    {
        RequireSql(); await using var app = Factory();
        using var client = await ClientAsync(app, "Retry owner"); using var peerClient = await ClientAsync(app, "Retry peer");
        var room = (await (await client.PostAsJsonAsync("/api/v1/rooms/", new CreateRoom("Retry QA", true, new("youtube", "https://youtu.be/M7lc1UVf-VE")))).Content.ReadFromJsonAsync<RoomView>())!;
        await using var owner = Hub(app, client); await using var peer = Hub(app, peerClient);
        await owner.StartAsync(); await peer.StartAsync(); await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        var joined = await peer.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await owner.InvokeAsync("SetCohost", room.Id, joined.Members.Single(x => x.Name == "Retry peer").Id, true);
        var before = await owner.InvokeAsync<RoomView>("Snapshot", room.Id);
        var command = new PlaybackCommand(false, 120, before.Version, Guid.NewGuid());
        await owner.InvokeAsync("SetPlayback", room.Id, command);
        var accepted = await owner.InvokeAsync<RoomView>("Snapshot", room.Id);
        await owner.InvokeAsync("SetPlayback", room.Id, command);
        Assert.Equal(accepted.Version, (await peer.InvokeAsync<RoomView>("Snapshot", room.Id)).Version);
        await Assert.ThrowsAsync<HubException>(() => owner.InvokeAsync("SetPlayback", room.Id, command with {PositionSeconds = 900}));
        await Assert.ThrowsAsync<HubException>(() => peer.InvokeAsync("SetPlayback", room.Id, command));
        await owner.StopAsync(); await owner.StartAsync(); await owner.InvokeAsync<RoomView>("Join", room.Id, room.InviteCode);
        await owner.InvokeAsync("SetPlayback", room.Id, command);
        var resumed = await owner.InvokeAsync<RoomView>("Snapshot", room.Id);
        Assert.Equal(accepted.Version, resumed.Version); Assert.Equal(120, resumed.PositionSeconds);
        await Assert.ThrowsAsync<HubException>(() => owner.InvokeAsync("SetPlayback", room.Id, command with {EventId = Guid.NewGuid()}));
    }
}
