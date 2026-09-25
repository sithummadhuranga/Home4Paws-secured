using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Home4Paws.API.DataManager;
using Home4Paws.API.Helpers;
using Home4Paws.API.Models.Auth;
using Home4Paws.API.Models.Entities;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Home4Paws.API.Services.Auth
{
    public class GoogleAuthService : IGoogleAuthService
    {
        private const string AuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
        private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
        private const string DiscoveryUrl = "https://accounts.google.com/.well-known/openid-configuration";

        // Google's signing keys are fetched from the discovery document and cached
        private static readonly ConfigurationManager<OpenIdConnectConfiguration> OidcConfig =
            new(DiscoveryUrl, new OpenIdConnectConfigurationRetriever());

        private record LoginState(string Nonce, string CodeVerifier);

        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _cache;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IUserRepository _userRepository;
        private readonly JwtHelper _jwtHelper;
        private readonly ILogger<GoogleAuthService> _logger;

        public GoogleAuthService(
            IConfiguration configuration,
            IMemoryCache cache,
            IHttpClientFactory httpClientFactory,
            IUserRepository userRepository,
            JwtHelper jwtHelper,
            ILogger<GoogleAuthService> logger)
        {
            _configuration = configuration;
            _cache = cache;
            _httpClientFactory = httpClientFactory;
            _userRepository = userRepository;
            _jwtHelper = jwtHelper;
            _logger = logger;
        }

        private string ClientId => _configuration["Google:ClientId"]?.Trim()
            ?? throw new InvalidOperationException("Google:ClientId is not configured");
        private string ClientSecret => _configuration["Google:ClientSecret"]?.Trim()
            ?? throw new InvalidOperationException("Google:ClientSecret is not configured");
        private string RedirectUri => _configuration["Google:RedirectUri"]
            ?? "http://localhost:5185/api/auth/google/callback";

        public string CreateAuthorizationUrl()
        {
            var state = RandomToken();
            var nonce = RandomToken();
            var codeVerifier = RandomToken();
            var codeChallenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier)));

            // Only the server keeps the nonce and verifier, the browser just gets the state
            _cache.Set("google-state:" + state, new LoginState(nonce, codeVerifier), TimeSpan.FromMinutes(10));

            var query = new Dictionary<string, string>
            {
                ["client_id"] = ClientId,
                ["redirect_uri"] = RedirectUri,
                ["response_type"] = "code",
                ["scope"] = "openid email profile",
                ["state"] = state,
                ["nonce"] = nonce,
                ["code_challenge"] = codeChallenge,
                ["code_challenge_method"] = "S256",
                ["prompt"] = "select_account"
            };

            return AuthorizationEndpoint + "?" + string.Join("&",
                query.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
        }

        public async Task<(string? Code, string? Error)> HandleCallbackAsync(
            string? code, string? state, string? error, string ipAddress)
        {
            if (!string.IsNullOrEmpty(error))
            {
                _logger.LogWarning("Google returned an error: {Error}", error);
                return (null, "google_denied");
            }

            if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
                return (null, "invalid_request");

            // State must be one we issued, and it can only be used once
            var cacheKey = "google-state:" + state;
            if (!_cache.TryGetValue(cacheKey, out LoginState? saved) || saved == null)
            {
                _logger.LogWarning("Google callback with unknown or expired state");
                return (null, "invalid_state");
            }
            _cache.Remove(cacheKey);

            try
            {
                var idToken = await ExchangeCodeAsync(code, saved.CodeVerifier);
                if (idToken == null)
                    return (null, "token_exchange_failed");

                var jwt = await ValidateIdTokenAsync(idToken);
                if (jwt == null)
                    return (null, "invalid_id_token");

                if (jwt.Payload.TryGetValue("nonce", out var nonce) is false || nonce?.ToString() != saved.Nonce)
                {
                    _logger.LogWarning("Google ID token nonce mismatch");
                    return (null, "invalid_id_token");
                }

                var email = jwt.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
                var emailVerified = jwt.Claims.FirstOrDefault(c => c.Type == "email_verified")?.Value;
                if (string.IsNullOrEmpty(email) || !string.Equals(emailVerified, "true", StringComparison.OrdinalIgnoreCase))
                    return (null, "email_not_verified");

                var firstName = jwt.Claims.FirstOrDefault(c => c.Type == "given_name")?.Value;
                var lastName = jwt.Claims.FirstOrDefault(c => c.Type == "family_name")?.Value;

                var user = await FindOrCreateUserAsync(email, firstName, lastName);
                if (user == null || !user.IsActive)
                    return (null, "account_unavailable");

                await _userRepository.UpdateLastLoginAsync(user.Id, DateTime.UtcNow);

                var response = new AuthResponse
                {
                    Success = true,
                    Message = "Login successful",
                    User = new UserInfo
                    {
                        Id = user.Id,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Email = user.Email,
                        Role = user.Role,
                        EmailVerified = user.EmailVerified,
                        CreatedAt = user.CreatedAt,
                        LastLoginAt = DateTime.UtcNow
                    },
                    Tokens = new TokenInfo
                    {
                        AccessToken = _jwtHelper.GenerateJwtToken(user),
                        RefreshToken = _jwtHelper.GenerateRefreshToken(),
                        ExpiresAt = _jwtHelper.GetTokenExpiry(false)
                    }
                };

                // The app tokens never go in the redirect URL, only this short-lived code does
                var loginCode = RandomToken();
                _cache.Set("google-login:" + loginCode, response, TimeSpan.FromSeconds(60));
                return (loginCode, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Google sign-in failed");
                return (null, "server_error");
            }
        }

        public AuthResponse? RedeemLoginCode(string loginCode)
        {
            var cacheKey = "google-login:" + loginCode;
            if (_cache.TryGetValue(cacheKey, out AuthResponse? response))
            {
                _cache.Remove(cacheKey);
                return response;
            }
            return null;
        }

        private async Task<string?> ExchangeCodeAsync(string code, string codeVerifier)
        {
            var client = _httpClientFactory.CreateClient();
            var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = ClientId,
                ["client_secret"] = ClientSecret,
                ["redirect_uri"] = RedirectUri,
                ["grant_type"] = "authorization_code",
                ["code_verifier"] = codeVerifier
            });

            var response = await client.PostAsync(TokenEndpoint, form);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Google token endpoint returned {Status}", (int)response.StatusCode);
                return null;
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return doc.RootElement.TryGetProperty("id_token", out var idToken) ? idToken.GetString() : null;
        }

        private async Task<JwtSecurityToken?> ValidateIdTokenAsync(string idToken)
        {
            var config = await OidcConfig.GetConfigurationAsync(CancellationToken.None);

            var parameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuers = new[] { "https://accounts.google.com", "accounts.google.com" },
                ValidateAudience = true,
                ValidAudience = ClientId,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = config.SigningKeys,
                ClockSkew = TimeSpan.FromMinutes(2)
            };

            try
            {
                new JwtSecurityTokenHandler().ValidateToken(idToken, parameters, out var validated);
                return validated as JwtSecurityToken;
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "Google ID token validation failed");
                return null;
            }
        }

        private async Task<User?> FindOrCreateUserAsync(string email, string? firstName, string? lastName)
        {
            email = email.ToLowerInvariant().Trim();
            var existing = await _userRepository.GetUserByEmailAsync(email);

            if (existing != null)
            {
                // A local account that never verified its email could have been registered by
                // someone else, so drop its password before linking it to the Google identity.
                if (!existing.EmailVerified)
                {
                    await _userRepository.UpdatePasswordHashAsync(existing.Id, UnusablePasswordHash());
                }
                return existing;
            }

            var user = new User
            {
                FirstName = string.IsNullOrWhiteSpace(firstName) ? email.Split('@')[0] : firstName.Trim(),
                LastName = string.IsNullOrWhiteSpace(lastName) ? "-" : lastName.Trim(),
                Email = email,
                PasswordHash = UnusablePasswordHash(),
                Role = "User",
                IsActive = true,
                EmailVerified = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            user.Id = await _userRepository.CreateUserAsync(user);
            return user;
        }

        // Google-only accounts still need a password hash value, nobody knows the password
        private static string UnusablePasswordHash() =>
            BCrypt.Net.BCrypt.HashPassword(RandomToken(), workFactor: 12);

        private static string RandomToken() => Base64Url(RandomNumberGenerator.GetBytes(32));

        private static string Base64Url(byte[] bytes) =>
            Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
