using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
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
        ILogger<AuthController> logger) : ControllerBase
    {
        private readonly IAuthService _authService = authService;
        private readonly IGoogleAuthService _googleAuthService = googleAuthService;
        private readonly IConfiguration _configuration = configuration;
        private readonly ILogger<AuthController> _logger = logger;

        /// <summary>
        /// User login endpoint
        /// </summary>
        /// <param name="request">Login credentials</param>
        /// <returns>Authentication response with user info and tokens</returns>
        [HttpPost("login")]
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

            return Ok(response);
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

            return CreatedAtAction(nameof(Signup), response);
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
        /// Refresh access token using refresh token
        /// </summary>
        /// <param name="request">Refresh token</param>
        /// <returns>New authentication tokens</returns>
        [HttpPost("refresh")]
        public async Task<ActionResult<AuthResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
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
            var response = await _authService.RefreshTokenAsync(request, ipAddress);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }

        /// <summary>
        /// User logout endpoint
        /// </summary>
        /// <param name="request">Logout options</param>
        /// <returns>Logout response</returns>
        [HttpPost("logout")]
        public async Task<ActionResult<LogoutResponse>> Logout([FromBody] LogoutRequest request)
        {
            var response = await _authService.LogoutAsync(request);
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
        [HttpPost("cleanup-sessions")]
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

            return Ok(response);
        }

        private string GetClientIpAddress()
        {
            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        }
    }
}