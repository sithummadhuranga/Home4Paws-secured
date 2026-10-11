using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Home4Paws.API.Models.Auth;
using Home4Paws.API.Services.Auth;
using System.Security.Claims;

namespace Home4Paws.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(
        IAuthService authService,
        IGoogleAuthService googleAuthService,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<AuthController> logger) : ControllerBase
    {
        private readonly IAuthService _authService = authService;
        private readonly IGoogleAuthService _googleAuthService = googleAuthService;
        private readonly IConfiguration _configuration = configuration;
        private readonly IWebHostEnvironment _environment = environment;
        private readonly ILogger<AuthController> _logger = logger;

        private const string AccessCookieName = "h4p_at";
        private const string RefreshCookieName = "h4p_rt";

        // Refresh/logout only ever need this cookie on /api/auth/* requests, so it's
        // scoped there instead of riding along on every request like the access cookie
        private void SetAuthCookies(TokenInfo tokens)
        {
            var isProduction = !_environment.IsDevelopment();

            Response.Cookies.Append(AccessCookieName, tokens.AccessToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = isProduction,
                SameSite = SameSiteMode.Lax,
                Path = "/",
                Expires = DateTimeOffset.UtcNow.AddMinutes(_configuration.GetValue("JwtSettings:ExpiryInMinutes", 15))
            });

            Response.Cookies.Append(RefreshCookieName, tokens.RefreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = isProduction,
                SameSite = SameSiteMode.Lax,
                Path = "/api/auth",
                Expires = tokens.ExpiresAt
            });
        }

        private void ClearAuthCookies()
        {
            Response.Cookies.Delete(AccessCookieName, new CookieOptions { Path = "/" });
            Response.Cookies.Delete(RefreshCookieName, new CookieOptions { Path = "/api/auth" });
        }

        // The frontend never needs the raw tokens once the cookies are set - returning
        // them in the JSON body too would let anything that can read a fetch() response
        // (an XSS payload included) grab them straight back out
        private static AuthResponse WithoutTokens(AuthResponse response)
        {
            response.Tokens = null;
            return response;
        }

        /// <summary>
        /// User login endpoint
        /// </summary>
        /// <param name="request">Login credentials</param>
        /// <returns>Authentication response with user info and tokens</returns>
        [HttpPost("login")]
        [EnableRateLimiting("login")]
        public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid input data.",
                    Errors = errors
                });
            }

            var ipAddress = GetClientIpAddress();
            var response = await _authService.LoginAsync(request, ipAddress);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            SetAuthCookies(response.Tokens!);
            return Ok(WithoutTokens(response));
        }

        /// <summary>
        /// User signup endpoint
        /// </summary>
        /// <param name="request">User registration data</param>
        /// <returns>Authentication response with user info and tokens</returns>
        [HttpPost("signup")]
        public async Task<ActionResult<AuthResponse>> Signup([FromBody] SignupRequest request)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid input data.",
                    Errors = errors
                });
            }

            var ipAddress = GetClientIpAddress();
            var response = await _authService.SignupAsync(request, ipAddress);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            SetAuthCookies(response.Tokens!);
            return CreatedAtAction(nameof(Signup), WithoutTokens(response));
        }

        /// <summary>
        /// Verify JWT token and get user info
        /// </summary>
        [HttpGet("verify")]
        [Authorize]
        public async Task<ActionResult<AuthResponse>> VerifyToken()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new AuthResponse
                    {
                        Success = false,
                        Message = "Invalid token."
                    });
                }

                var userInfo = await _authService.GetUserInfoAsync(userId);
                
                if (userInfo == null)
                {
                    return Unauthorized(new AuthResponse
                    {
                        Success = false,
                        Message = "User not found."
                    });
                }

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "Token verified successfully.",
                    User = userInfo
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying token");
                return Unauthorized(new AuthResponse
                {
                    Success = false,
                    Message = "Token verification failed."
                });
            }
        }

        /// <summary>
        /// Refresh access token using the refresh token cookie
        /// </summary>
        /// <returns>New authentication tokens</returns>
        [HttpPost("refresh")]
        public async Task<ActionResult<AuthResponse>> RefreshToken()
        {
            var refreshToken = Request.Cookies[RefreshCookieName];
            if (string.IsNullOrEmpty(refreshToken))
            {
                return BadRequest(new AuthResponse { Success = false, Message = "No refresh token found." });
            }

            var ipAddress = GetClientIpAddress();
            var response = await _authService.RefreshTokenAsync(refreshToken, ipAddress);

            if (!response.Success)
            {
                ClearAuthCookies();
                return BadRequest(response);
            }

            SetAuthCookies(response.Tokens!);
            return Ok(WithoutTokens(response));
        }

        /// <summary>
        /// User logout endpoint
        /// </summary>
        /// <param name="request">Logout options</param>
        /// <returns>Logout response</returns>
        // ---- CODE BEFORE FIX (V14) ----
        // [HttpPost("logout")]
        // ---- END CODE BEFORE FIX (V14) ----
        // ---- FIXED (V14): logout now really revokes the refresh token, which lives in an
        // httpOnly cookie (V09). It deliberately has no [Authorize]: the access cookie expires
        // after 15 minutes, and a 401 at that point would skip revocation and leave the user's
        // session alive. Possession of the refresh cookie is the proof here; an anonymous call
        // without it revokes nothing. cleanup-sessions below stays Admin-only. ----
        [HttpPost("logout")]
        public async Task<ActionResult<LogoutResponse>> Logout([FromBody] LogoutRequest request)
        {
            var refreshToken = Request.Cookies[RefreshCookieName];
            var response = await _authService.LogoutAsync(refreshToken, request.LogoutFromAllDevices);
            ClearAuthCookies();
            return Ok(response);
        }

        /// <summary>
        /// Health check endpoint for authentication service
        /// </summary>
        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new
            {
                status = "healthy",
                service = "Auth Service",
                timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Cleanup expired sessions (admin endpoint)
        /// </summary>
        // ---- CODE BEFORE FIX (V14) ----
        // [HttpPost("cleanup-sessions")]
        // ---- END CODE BEFORE FIX (V14) ----
        // ---- FIXED (V14): documented as an admin endpoint but had no [Authorize], so anyone
        // could trigger session maintenance. Admin-only now. ----
        [HttpPost("cleanup-sessions")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CleanupExpiredSessions()
        {
            var result = await _authService.CleanupExpiredSessionsAsync();
            return Ok(new
            {
                success = result,
                message = "Expired sessions cleanup completed.",
                timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Starts "Sign in with Google" (authorization code flow with PKCE)
        /// </summary>
        [HttpGet("google/start")]
        public IActionResult GoogleStart()
        {
            if (string.IsNullOrEmpty(_configuration["Google:ClientId"]) ||
                string.IsNullOrEmpty(_configuration["Google:ClientSecret"]))
            {
                return StatusCode(503, new { message = "Google sign-in is not configured." });
            }

            return Redirect(_googleAuthService.CreateAuthorizationUrl());
        }

        /// <summary>
        /// Google redirects here after the user signs in. Sends the browser back to the frontend.
        /// </summary>
        [HttpGet("google/callback")]
        public async Task<IActionResult> GoogleCallback(
            [FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error)
        {
            var frontend = (_configuration["ExternalServices:BaseUrl"] ?? "http://localhost:3000").TrimEnd('/');
            var (loginCode, failure) = await _googleAuthService.HandleCallbackAsync(code, state, error, GetClientIpAddress());

            if (loginCode == null)
            {
                return Redirect($"{frontend}/auth/google/callback?error={Uri.EscapeDataString(failure ?? "server_error")}");
            }

            return Redirect($"{frontend}/auth/google/callback?code={Uri.EscapeDataString(loginCode)}");
        }

        /// <summary>
        /// Frontend swaps the one-time code from the callback redirect for the app tokens
        /// </summary>
        [HttpPost("google/exchange")]
        public ActionResult<AuthResponse> GoogleExchange([FromBody] GoogleExchangeRequest request)
        {
            var response = _googleAuthService.RedeemLoginCode(request.Code ?? string.Empty);
            if (response == null)
            {
                return BadRequest(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid or expired sign-in code."
                });
            }

            SetAuthCookies(response.Tokens!);
            return Ok(WithoutTokens(response));
        }

        private string GetClientIpAddress()
        {
            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        }
    }
}