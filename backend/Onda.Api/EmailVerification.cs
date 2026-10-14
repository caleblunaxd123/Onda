using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Encodings.Web;
using Microsoft.EntityFrameworkCore;
using Onda.Infrastructure;

namespace Onda.Api;

public interface IVerificationMailer
{
    bool Enabled { get; }
    Task<bool> SendAsync(string email, string token, CancellationToken ct);
}

// This adapter sends only verification mail. No contacts, tracking or uploaded media.
public sealed class ResendVerificationMailer(IConfiguration config, IHttpClientFactory clients) : IVerificationMailer
{
    public bool Enabled => config.GetValue<bool>("Email:Enabled") &&
        !string.IsNullOrWhiteSpace(config["Email:ApiKey"]) &&
        AccountService.Email(config["Email:FromAddress"]) is not null &&
        Uri.TryCreate(config["Email:PublicOrigin"], UriKind.Absolute, out var origin) &&
        origin.Scheme == "https" && origin.IsDefaultPort && origin.UserInfo.Length == 0 &&
        origin.AbsolutePath == "/" && origin.Query.Length == 0 && origin.Fragment.Length == 0;

    public async Task<bool> SendAsync(string email, string token, CancellationToken ct)
    {
        if (!Enabled) return false;
        var link = config["Email:PublicOrigin"]!.TrimEnd('/') + "/verify-email#token=" + token;
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config["Email:ApiKey"]);
        request.Headers.Add("Idempotency-Key", "onda-verification-" + AccountService.Hash(token));
        request.Content = JsonContent.Create(new {
            from = "ONDA <" + config["Email:FromAddress"] + ">", to = new[] {email},
            subject = "Confirma tu correo en ONDA",
            text = "Confirma tu correo en ONDA: " + link + "\nEl enlace vence en 30 minutos. Si no solicitaste esta cuenta, ignora este correo.",
            html = "<p>Confirma tu correo en ONDA.</p><p><a href=\"" + HtmlEncoder.Default.Encode(link) + "\">Confirmar mi correo</a></p><p>El enlace vence en 30 minutos. Si no solicitaste esta cuenta, ignora este correo.</p>"
        });
        try
        {
            using var response = await clients.CreateClient("verification-mail").SendAsync(request, ct);
            return response.IsSuccessStatusCode;
        }
        catch (HttpRequestException) {return false;}
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) {return false;}
    }
}

public sealed record VerifyEmailRequest(string? Token);
public sealed record VerificationResult(string Status);

public sealed class EmailVerificationService(OndaDbContext db, TimeProvider clock, IVerificationMailer mailer, RoomPresence locks)
{
    public bool Enabled => mailer.Enabled;
    public async Task<VerificationResult> RequestAsync(Guid accountId, CancellationToken ct)
    {
        if (!Enabled) return new("unavailable");
        // One API instance today. Reserve before sending so reconnects/parallel requests cannot spam mail.
        var gate = locks.RoomLock(accountId); await gate.WaitAsync(ct);
        try
        {
            var account = await db.ListenerAccounts.SingleOrDefaultAsync(x => x.Id == accountId, ct);
            if (account?.Email is null) return new("unavailable");
            if (account.EmailVerifiedAt is not null || account.GoogleSubject is not null) return new("verified");
            var now = clock.GetUtcNow();
            if (account.EmailVerificationRequestedAt > now.AddMinutes(-1)) return new("wait");
            var token = AccountService.NewSecret();
            account.EmailVerificationHash = AccountService.Hash(token);
            account.EmailVerificationExpiresAt = now.AddMinutes(30);
            account.EmailVerificationRequestedAt = now;
            await db.SaveChangesAsync(ct);
            if (await mailer.SendAsync(account.Email, token, ct)) return new("sent");
            // A failed delivery cannot verify an address; retain the cooldown to bound provider failures.
            await db.ListenerAccounts.Where(x => x.Id == accountId && x.EmailVerificationHash == account.EmailVerificationHash)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.EmailVerificationHash, (string?)null)
                    .SetProperty(x => x.EmailVerificationExpiresAt, (DateTimeOffset?)null), ct);
            return new("failed");
        }
        finally {gate.Release();}
    }

    public async Task<bool> ConfirmAsync(string? token, CancellationToken ct)
    {
        if (token is not {Length: 64} || token.Any(c => !char.IsAsciiHexDigit(c))) return false;
        var hash = AccountService.Hash(token); var now = clock.GetUtcNow();
        // A conditional SQL update makes confirmation atomic and single use, including concurrent clicks.
        return await db.ListenerAccounts.Where(x => x.EmailVerificationHash == hash && x.EmailVerificationExpiresAt > now && x.EmailVerifiedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.EmailVerifiedAt, now)
                .SetProperty(x => x.EmailVerificationHash, (string?)null)
                .SetProperty(x => x.EmailVerificationExpiresAt, (DateTimeOffset?)null), ct) == 1;
    }
}
