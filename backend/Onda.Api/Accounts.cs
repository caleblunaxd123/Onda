using System.Net.Mail;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Onda.Domain;
using Onda.Application;
using Onda.Infrastructure;
namespace Onda.Api;

public sealed record AccountView(Guid Id, string DisplayName, string? Email, bool Guest, string Provider = "email", string? AvatarUrl = null, bool EmailVerified = false);
public sealed record AccountSession(string Token, DateTimeOffset ExpiresAt, AccountView User, string? RecoveryCode = null, string? EmailVerificationStatus = null);
public sealed record RegisterAccount(string? DisplayName, string? Email, string? Password);
public sealed record LoginAccount(string? Email, string? Password);
public sealed record RecoverAccount(string? Email, string? Code, string? Password);
public sealed record GuestAccount(string? DisplayName);
public sealed record PasswordConfirmation(string? Password);

public sealed class AccountService(OndaDbContext db, TimeProvider clock, IPasswordHasher<ListenerAccount> hasher, RoomUploadStore? files = null, EmailVerificationService? verification = null)
{
    public static AccountView View(ListenerAccount user) => new(user.Id, user.DisplayName, user.Email, user.Email is null, user.GoogleSubject is not null ? "google" : user.Email is null ? "guest" : "email", user.AvatarUrl, user.EmailVerifiedAt is not null || user.GoogleSubject is not null);
    public static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    public static string NewSecret() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    public static string? Email(string? value)
    {
        var clean = value?.Trim().ToLowerInvariant();
        return clean is {Length: > 3 and <= 254} && MailAddress.TryCreate(clean, out var parsed) && parsed.Address == clean ? clean : null;
    }
    public static bool ValidPassword(string? value) => value is {Length: >= 10 and <= 128};
    public async Task<AccountSession> GuestAsync(string? displayName, CancellationToken ct)
    {
        var name = Text.CleanName(displayName ?? "", 40).Trim();
        var user = new ListenerAccount {Id = Guid.NewGuid(), DisplayName = name.Length >= 2 ? name : "Oyente " + RandomNumberGenerator.GetInt32(1000, 10000), CreatedAt = clock.GetUtcNow()};
        db.ListenerAccounts.Add(user);
        return await SessionAsync(user, null, ct);
    }
    public async Task<AccountSession?> RegisterAsync(RegisterAccount input, Guid? guestId, CancellationToken ct)
    {
        var email = Email(input.Email); var name = Text.CleanName(input.DisplayName ?? "", 40).Trim();
        if (email is null || name.Length < 2 || !ValidPassword(input.Password) || await db.ListenerAccounts.AnyAsync(x => x.Email == email, ct)) return null;
        var user = guestId is { } id ? await db.ListenerAccounts.FindAsync([id], ct) : null;
        if (user?.Email is not null) return null;
        var upgrading = user is not null;
        if (user is null) {user = new() {Id = Guid.NewGuid(), CreatedAt = clock.GetUtcNow()}; db.ListenerAccounts.Add(user);}
        var recovery = NewSecret();
        user.Email = email; user.DisplayName = name; user.PasswordHash = hasher.HashPassword(user, input.Password!); user.RecoveryHash = Hash(recovery);
        var registered = await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            try
            {
                if (upgrading) await db.ListenerSessions.Where(x => x.AccountId == user.Id).ExecuteDeleteAsync(ct);
                var session = await SessionAsync(user, recovery, ct, false); await transaction.CommitAsync(ct); db.ChangeTracker.AcceptAllChanges(); return session;
            }
            catch (DbUpdateException) {return null;}
        });
        if (registered is null) return null;
        var result = verification is null ? new VerificationResult("unavailable") : await verification.RequestAsync(user.Id, ct);
        return registered with {EmailVerificationStatus = result.Status};
    }
    public async Task<AccountSession?> LoginAsync(LoginAccount input, CancellationToken ct)
    {
        var email = Email(input.Email);
        if (email is null || !ValidPassword(input.Password)) return null;
        var user = await db.ListenerAccounts.SingleOrDefaultAsync(x => x.Email == email, ct);
        if (user is null) {hasher.HashPassword(new ListenerAccount(), input.Password!); return null;}
        if (user.LockedUntil > clock.GetUtcNow() || user.PasswordHash.Length == 0) return null;
        var verified = hasher.VerifyHashedPassword(user, user.PasswordHash, input.Password!);
        if (verified == PasswordVerificationResult.Failed)
        {
            user.FailedLogins++;
            if (user.FailedLogins >= 5) {user.LockedUntil = clock.GetUtcNow().AddMinutes(15); user.FailedLogins = 0;}
            await db.SaveChangesAsync(ct); return null;
        }
        if (verified == PasswordVerificationResult.SuccessRehashNeeded) user.PasswordHash = hasher.HashPassword(user, input.Password!);
        user.FailedLogins = 0; user.LockedUntil = null;
        return await SessionAsync(user, null, ct);
    }
    public async Task<AccountSession?> GoogleAsync(GoogleIdentity identity, Guid? currentId, CancellationToken ct)
    {
        var existing = await db.ListenerAccounts.SingleOrDefaultAsync(x => x.GoogleSubject == identity.Subject, ct);
        if (existing is not null)
        {
            if (currentId is { } currentAccount && currentAccount != existing.Id && await db.ListenerAccounts.AnyAsync(x => x.Id == currentAccount && x.Email != null, ct)) return null;
            existing.AvatarUrl = GoogleIdentityVerifier.SafeAvatar(identity.AvatarUrl);
            existing.EmailVerifiedAt ??= clock.GetUtcNow();
            return await SessionAsync(existing, null, ct);
        }
        var current = currentId is { } id ? await db.ListenerAccounts.FindAsync([id], ct) : null;
        // An unverified password account with the same email is never silently taken over or linked.
        if (await db.ListenerAccounts.AnyAsync(x => x.Email == identity.Email && (current == null || x.Id != current.Id), ct)) return null;
        if (current?.Email is not null && (current.Email != identity.Email || current.GoogleSubject is not null)) return null;
        var user = current ?? new ListenerAccount {Id = Guid.NewGuid(), CreatedAt = clock.GetUtcNow()};
        if (current is null) db.ListenerAccounts.Add(user);
        var name = Text.CleanName(identity.Name, 40);
        if (user.DisplayName.Length < 2) user.DisplayName = name.Length >= 2 ? name : "Oyente ONDA";
        user.Email = identity.Email; user.GoogleSubject = identity.Subject;
        user.EmailVerifiedAt ??= clock.GetUtcNow();
        user.AvatarUrl = GoogleIdentityVerifier.SafeAvatar(identity.AvatarUrl);
        var recovery = user.RecoveryHash.Length == 0 ? NewSecret() : null;
        if (recovery is not null) user.RecoveryHash = Hash(recovery);
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            try
            {
                if (current is not null) await db.ListenerSessions.Where(x => x.AccountId == current.Id).ExecuteDeleteAsync(ct);
                var session = await SessionAsync(user, recovery, ct, false); await transaction.CommitAsync(ct); db.ChangeTracker.AcceptAllChanges(); return session;
            }
            catch (DbUpdateException) {return null;}
        });
    }
    public async Task<AccountSession?> RecoverAsync(RecoverAccount input, CancellationToken ct)
    {
        if (Email(input.Email) is not { } email || !ValidPassword(input.Password) || input.Code is not {Length: 64}) return null;
        var user = await db.ListenerAccounts.SingleOrDefaultAsync(x => x.Email == email, ct);
        if (user is null || !CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Hash(input.Code.ToUpperInvariant())), Encoding.ASCII.GetBytes(user.RecoveryHash))) return null;
        var nextCode = NewSecret();
        user.PasswordHash = hasher.HashPassword(user, input.Password!); user.RecoveryHash = Hash(nextCode);
        user.FailedLogins = 0; user.LockedUntil = null;
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            try
            {
                await db.ListenerSessions.Where(x => x.AccountId == user.Id).ExecuteDeleteAsync(ct);
                var session = await SessionAsync(user, nextCode, ct, false); await transaction.CommitAsync(ct); db.ChangeTracker.AcceptAllChanges(); return session;
            }
            catch (DbUpdateConcurrencyException) {return null;}
        });
    }
    private async Task<AccountSession> SessionAsync(ListenerAccount user, string? recoveryCode, CancellationToken ct, bool acceptChanges = true)
    {
        var token = NewSecret(); var expiry = clock.GetUtcNow().AddDays(user.Email is null ? 7 : 30);
        db.ListenerSessions.Add(new() {TokenHash = Hash(token), AccountId = user.Id, ExpiresAt = expiry});
        await db.SaveChangesAsync(acceptChanges, ct);
        return new(token, expiry, View(user), recoveryCode);
    }
    public async Task<(ListenerAccount User, ListenerSession Session)?> AuthenticateAsync(string token, CancellationToken ct)
    {
        if (token.Length != 64 || token.Any(c => !char.IsAsciiHexDigit(c))) return null;
        var hash = Hash(token);
        var session = await db.ListenerSessions.AsNoTracking().SingleOrDefaultAsync(x => x.TokenHash == hash && x.ExpiresAt > clock.GetUtcNow(), ct);
        if (session is null) return null;
        var user = await db.ListenerAccounts.AsNoTracking().SingleOrDefaultAsync(x => x.Id == session.AccountId, ct);
        return user is null ? null : (user, session);
    }
    public Task<bool> IsSessionValidAsync(string hash, CancellationToken ct) => db.ListenerSessions.AnyAsync(x => x.TokenHash == hash && x.ExpiresAt > clock.GetUtcNow(), ct);
    public async Task<bool> DeleteAsync(Guid id, string? password, CancellationToken ct)
    {
        var user = await db.ListenerAccounts.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (user is null) return false;
        if (user.Email is not null)
        {
            if (password is null || password.Length > 128) return false;
            var recovery = user.GoogleSubject is not null && password.Length == 64 && CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Hash(password.ToUpperInvariant())), Encoding.ASCII.GetBytes(user.RecoveryHash));
            if (!recovery && (user.PasswordHash.Length == 0 || hasher.VerifyHashedPassword(user, user.PasswordHash, password) == PasswordVerificationResult.Failed)) return false;
        }
        Guid[] removedFiles = [];
        var deleted = await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            // Owned rooms cascade to their chat and uploads; elsewhere, remove the account's messages, files and reactions.
            var ownedUploads = await db.RoomUploads.Where(x => db.ListeningRooms.Any(r => r.Id == x.RoomId && r.OwnerId == id)).Select(x => x.Id).ToArrayAsync(ct);
            removedFiles = [..ownedUploads, ..await RoomChatService.ForgetAccountsAsync(db, [id], ct)];
            await db.ListeningRooms.Where(x => x.OwnerId == id).ExecuteDeleteAsync(ct);
            await db.RoomBans.Where(x => x.AccountId == id).ExecuteDeleteAsync(ct);
            await db.UserBlocks.Where(x => x.BlockerId == id || x.BlockedId == id).ExecuteDeleteAsync(ct);
            await db.CommunityReports.Where(x => x.ReporterId == id).ExecuteDeleteAsync(ct);
            await db.CommunityReports.Where(x => x.AccountId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AccountId, (Guid?)null), ct);
            await db.CommunityReports.Where(x => x.ReviewedBy == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.ReviewedBy, (Guid?)null), ct);
            await db.ListenerAccounts.Where(x => x.Id == id).ExecuteDeleteAsync(ct);
            db.Entry(user).State = EntityState.Detached;
            await transaction.CommitAsync(ct); return true;
        });
        // Files are removed only after the rows are gone; anything missed is collected by the hourly prune.
        if (deleted) files?.Delete(removedFiles);
        return deleted;
    }
}

public sealed class ListenerAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, AccountService accounts)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorization = Request.Headers.Authorization.ToString();
        var token = authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? authorization[7..] : "";
        if (token.Length == 0 && Request.Path.StartsWithSegments("/hubs/rooms")) token = Request.Query["access_token"].ToString();
        if (token.Length == 0) return AuthenticateResult.NoResult();
        var found = await accounts.AuthenticateAsync(token, Context.RequestAborted);
        if (found is not { } result) return AuthenticateResult.Fail("Sesión vencida.");
        var identity = new ClaimsIdentity([
            new(ClaimTypes.NameIdentifier, result.User.Id.ToString()), new(ClaimTypes.Name, result.User.DisplayName),
            new("sid", result.Session.TokenHash), new("registered", (result.User.Email is not null).ToString())], Scheme.Name);
        if (result.User.AvatarUrl is { } avatar) identity.AddClaim(new("avatar", avatar));
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), new AuthenticationProperties {ExpiresUtc = result.Session.ExpiresAt}, Scheme.Name));
    }
}
public static class ListenerIdentity
{
    public static Guid ListenerId(this ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
