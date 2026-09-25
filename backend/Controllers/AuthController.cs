using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Home4Paws.API.Models.Auth;
using Home4Paws.API.Services.Auth;
using System.Security.Claims;

namespace Home4Paws.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(IAuthService authService, ILogger<AuthController> logger) : ControllerBase
    {
        private readonly IAuthService _authService = authService;
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
        // ---- CODE BEFORE FIX (V14) ----
        // [HttpPost("logout")]
        // ---- END CODE BEFORE FIX (V14) ----
        // ---- FIXED (V14): logout accepted anonymous calls. Now requires an authenticated caller.
        // Note: LogoutAsync is still a stub (no refresh tokens are stored yet), so real token
        // revocation depends on the session work in V09. ----
        [HttpPost("logout")]
        [Authorize]
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

        private string GetClientIpAddress()
        {
            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        }
    }
}