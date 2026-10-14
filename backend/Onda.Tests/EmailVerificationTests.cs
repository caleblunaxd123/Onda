using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Onda.Api;

namespace Onda.Tests;

public partial class CommunityTests
{
    private sealed class CaptureMailer : IVerificationMailer
    {
        public bool Enabled {get; set;} = true;
        public bool Deliver {get; set;} = true;
        public string? Token {get; private set;}
        public int Sent {get; private set;}
        public Task<bool> SendAsync(string email, string token, CancellationToken ct)
        {Token = token; Sent++; return Task.FromResult(Deliver);}
    }

    [SkippableFact] public async Task EmailVerificationHashesTokensExpiresAndConsumesOnlyOnce()
    {
        RequireSql(); var clock = new ManualClock(); var mailer = new CaptureMailer();
        await using var db = Db(); var account = (await Accounts(db).RegisterAsync(new("Email QA", "verify@example.test", "testing-password-long"), null, default))!;
        var service = new EmailVerificationService(db, clock, mailer, new RoomPresence(clock));
        Assert.False(account.User.EmailVerified);
        Assert.Equal("sent", (await service.RequestAsync(account.User.Id, default)).Status);
        var token = mailer.Token!;
        Assert.NotEqual(token, (await db.ListenerAccounts.AsNoTracking().SingleAsync()).EmailVerificationHash);
        Assert.Equal("wait", (await service.RequestAsync(account.User.Id, default)).Status); Assert.Equal(1, mailer.Sent);
        Assert.False(await service.ConfirmAsync(new string('0', 64), default));
        Assert.False(await service.ConfirmAsync("bad", default));
        clock.Advance(1801); Assert.False(await service.ConfirmAsync(token, default));
        Assert.Equal("sent", (await service.RequestAsync(account.User.Id, default)).Status);
        Assert.NotEqual(token, mailer.Token); Assert.False(await service.ConfirmAsync(token, default));
        Assert.True(await service.ConfirmAsync(mailer.Token, default)); Assert.False(await service.ConfirmAsync(mailer.Token, default));
        var confirmed = await db.ListenerAccounts.AsNoTracking().SingleAsync();
        Assert.NotNull(confirmed.EmailVerifiedAt); Assert.Null(confirmed.EmailVerificationHash);
        Assert.True(AccountService.View(confirmed).EmailVerified);
    }

    [SkippableFact] public async Task FailedOrUnavailableDeliveryCannotVerifyAnAddress()
    {
        RequireSql(); var clock = new ManualClock(); var mailer = new CaptureMailer {Enabled = false};
        await using var db = Db(); var account = (await Accounts(db).RegisterAsync(new("Email QA", "failed@example.test", "testing-password-long"), null, default))!;
        var service = new EmailVerificationService(db, clock, mailer, new RoomPresence(clock));
        Assert.Equal("unavailable", (await service.RequestAsync(account.User.Id, default)).Status); Assert.Equal(0, mailer.Sent);
        mailer.Enabled = true; mailer.Deliver = false;
        Assert.Equal("failed", (await service.RequestAsync(account.User.Id, default)).Status);
        Assert.False(await service.ConfirmAsync(mailer.Token, default));
        Assert.Null((await db.ListenerAccounts.AsNoTracking().SingleAsync()).EmailVerificationHash);
    }

    [SkippableFact] public async Task RegistrationSendsThroughConfiguredProviderAndGetDoesNotConsumeLink()
    {
        RequireSql(); var mailer = new CaptureMailer();
        await using var app = Factory().WithWebHostBuilder(builder => builder.ConfigureServices(services => services.AddSingleton<IVerificationMailer>(mailer)));
        using var client = app.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccount("Email QA", "endpoint@example.test", "testing-password-long"));
        response.EnsureSuccessStatusCode(); var account = (await response.Content.ReadFromJsonAsync<AccountSession>())!;
        Assert.Equal("sent", account.EmailVerificationStatus); Assert.Equal(1, mailer.Sent);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/auth/email/request", new {})).StatusCode);
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await client.GetAsync("/api/v1/auth/email/confirm")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/v1/auth/email/confirm", new VerifyEmailRequest(mailer.Token))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/auth/email/confirm", new VerifyEmailRequest(mailer.Token))).StatusCode);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);
        Assert.True((await client.GetFromJsonAsync<AccountView>("/api/v1/auth/me"))!.EmailVerified);
    }
}

public sealed class ResendMailerTests
{
    private sealed class Handler(HttpStatusCode status) : HttpMessageHandler
    {
        public Uri? Uri {get; private set;}
        public string? Payload {get; private set;}
        public string? Idempotency {get; private set;}
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {Uri = request.RequestUri; Payload = await request.Content!.ReadAsStringAsync(ct); Idempotency = request.Headers.GetValues("Idempotency-Key").Single(); return new(status);}
    }
    private sealed class Clients(HttpClient client) : IHttpClientFactory {public HttpClient CreateClient(string name) => client;}
    [Theory]
    [InlineData(200, true)] [InlineData(429, false)] [InlineData(401, false)]
    public async Task SendsOnlyToFixedProviderAndReturnsActualAcceptance(int status, bool accepted)
    {
        using var handler = new Handler((HttpStatusCode)status); using var client = new HttpClient(handler);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["Email:Enabled"] = "true", ["Email:ApiKey"] = "test-secret", ["Email:FromAddress"] = "no-reply@mail.onda.lunalav.pe", ["Email:PublicOrigin"] = "https://onda.lunalav.pe"
        }).Build();
        var mailer = new ResendVerificationMailer(config, new Clients(client)); var token = new string('A', 64);
        Assert.True(mailer.Enabled); Assert.Equal(accepted, await mailer.SendAsync("recipient@example.test", token, default));
        Assert.Equal("https://api.resend.com/emails", handler.Uri!.AbsoluteUri);
        Assert.Contains("/verify-email#token=" + token, handler.Payload!); Assert.DoesNotContain("test-secret", handler.Payload!);
        Assert.Equal("onda-verification-" + AccountService.Hash(token), handler.Idempotency);
    }
    [Fact] public void SendingIsDisabledUntilEveryRequiredSettingExists()
    {
        var config = new ConfigurationBuilder().Build(); using var client = new HttpClient();
        Assert.False(new ResendVerificationMailer(config, new Clients(client)).Enabled);
    }
}
