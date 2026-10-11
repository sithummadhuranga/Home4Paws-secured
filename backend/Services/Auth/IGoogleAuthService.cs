using Home4Paws.API.Models.Auth;

namespace Home4Paws.API.Services.Auth
{
    public interface IGoogleAuthService
    {
        // Builds the Google consent URL and remembers state, nonce and the PKCE verifier
        string CreateAuthorizationUrl();

        // Handles Google's redirect. Returns a one-time code for the frontend, or an error key.
        Task<(string? Code, string? Error)> HandleCallbackAsync(string? code, string? state, string? error, string ipAddress);

        // Swaps the one-time code for the normal app tokens (single use)
        AuthResponse? RedeemLoginCode(string loginCode);
    }
}
