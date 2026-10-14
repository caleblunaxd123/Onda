using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text.Json;
using Google.Apis.Auth;
namespace Onda.Api;

public sealed record GoogleIdentity(string Subject, string Email, string Name, string Nonce);
public sealed record GoogleLogin(string? IdToken, string? Nonce);
public interface IGoogleIdentityVerifier {Task<GoogleIdentity?> VerifyAsync(string token, CancellationToken ct);}
public sealed class GoogleIdentityVerifier(IConfiguration config) : IGoogleIdentityVerifier
{
    public async Task<GoogleIdentity?> VerifyAsync(string token, CancellationToken ct)
    {
        var client = config["Google:WebClientId"];
        if (string.IsNullOrWhiteSpace(client) || token.Length > 8192) return null;
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(token, new GoogleJsonWebSignature.ValidationSettings {Audience = [client]}).WaitAsync(ct);
            if (!payload.EmailVerified || payload.Subject is not {Length: > 0 and <= 255} || AccountService.Email(payload.Email) is not { } email) return null;
            var segment = token.Split('.')[1].Replace('-', '+').Replace('_', '/'); segment += new string('=', (4 - segment.Length % 4) % 4);
            using var body = JsonDocument.Parse(Convert.FromBase64String(segment));
            if (!body.RootElement.TryGetProperty("nonce", out var nonce)) return null;
            return new(payload.Subject, email, payload.Name ?? "", nonce.GetString() ?? "");
        }
        catch (Exception error) when (error is InvalidJwtException or FormatException or JsonException or HttpRequestException) {return null;}
    }
}
/** Short-lived, single-use challenges. Tokens/nonces are never logged or put in URLs. */
public sealed class GoogleChallenges(TimeProvider clock)
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> pending = new();
    public string Create()
    {
        foreach (var entry in pending) if (entry.Value <= clock.GetUtcNow()) pending.TryRemove(entry.Key, out _);
        if (pending.Count >= 10000) throw new InvalidOperationException("Google sign-in is busy.");
        var nonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        pending[nonce] = clock.GetUtcNow().AddMinutes(5); return nonce;
    }
    public bool Consume(string nonce) => pending.TryRemove(nonce, out var expires) && expires > clock.GetUtcNow();
}
