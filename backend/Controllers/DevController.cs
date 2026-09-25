using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Home4Paws.API.DataManager;
using Home4Paws.API.Services.Auth;
using Home4Paws.API.Models.Auth;
using Home4Paws.API.Data;

namespace Home4Paws.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DevController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IAuthService _authService;
        private readonly ILogger<DevController> _logger;
        private readonly IWebHostEnvironment _environment;
        private readonly ApplicationDbContext _context;

        public DevController(
            IUserRepository userRepository, 
            IAuthService authService,
            ILogger<DevController> logger, 
            IWebHostEnvironment environment,
            ApplicationDbContext context)
        {
            _userRepository = userRepository;
            _authService = authService;
            _logger = logger;
            _environment = environment;
            _context = context;
        }

        /// <summary>
        /// Reset password for a user (Development only)
        /// </summary>
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            // Only allow in development
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            try
            {
                var user = await _userRepository.GetUserByEmailAsync(request.Email);
                if (user == null)
                {
                    return BadRequest(new { success = false, message = "User not found" });
                }

                // Hash the new password properly
                var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
                
                // Update password hash in database
                await _userRepository.UpdatePasswordHashAsync(user.Id, newPasswordHash);

                _logger.LogInformation("Password reset successfully for user: {Email}", request.Email);
                return Ok(new { success = true, message = "Password reset successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password for user: {Email}", request.Email);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // ---- CODE BEFORE FIX (V02) ----
        // /// <summary>
        // /// List all users (Development only or Admin in production)
        // /// </summary>
        // [HttpGet("users")]
        // public async Task<IActionResult> GetUsers()
        // {
        //     try
        //     {
        //         // Get all users from database using Entity Framework
        //         var users = await _context.Users
        //             .OrderByDescending(u => u.CreatedAt)
        //             .Select(u => new
        //             {
        //                 u.Id,
        //                 u.FirstName,
        //                 u.LastName,
        //                 u.Email,
        //                 u.Role,
        //                 u.IsActive,
        //                 u.EmailVerified,
        //                 u.CreatedAt,
        //                 u.LastLoginAt
        //             })
        //             .ToListAsync();
        //
        //         _logger.LogInformation("Retrieved {Count} users", users.Count);
        //         return Ok(users);
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting users");
        //         return BadRequest(new { success = false, message = ex.Message });
        //     }
        // }
        // ---- END CODE BEFORE FIX (V02) ----
        // ---- FIXED (V02): GET /api/dev/users had no [Authorize] and no environment check, so
        // anyone could list every user's name, email, role and last login. Removed here and
        // replaced by the Admin-only GET /api/admin/users in AdminUsersController. ----

        /// <summary>
        /// Health check endpoint
        /// </summary>
        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new { 
                status = "healthy",
                environment = _environment.EnvironmentName,
                timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Create a test user (Development only)
        /// </summary>
        [HttpPost("create-test-user")]
        public async Task<IActionResult> CreateTestUser([FromBody] CreateTestUserRequest request)
        {
            // Only allow in development
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            try
            {
                _logger.LogInformation("🧪 Creating test user: {Email}", request.Email);

                // Use the existing SignupRequest model
                var signupRequest = new SignupRequest
                {
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Email = request.Email,
                    Password = request.Password,
                    ConfirmPassword = request.Password,
                    AgreeToTerms = true
                };

                // Use the AuthService to create the user
                var result = await _authService.SignupAsync(signupRequest, "127.0.0.1");

                if (result.Success)
                {
                    _logger.LogInformation("✅ Test user created successfully: {Email}", request.Email);
                    
                    return Ok(new { 
                        success = true, 
                        message = "Test user created successfully",
                        userId = result.User?.Id,
                        email = result.User?.Email,
                        name = $"{result.User?.FirstName} {result.User?.LastName}",
                        tokens = result.Tokens
                    });
                }
                else
                {
                    _logger.LogWarning("❌ Failed to create test user: {Email} - {Message}", request.Email, result.Message);
                    return BadRequest(new { 
                        success = false, 
                        message = result.Message,
                        errors = result.Errors 
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "💥 Error creating test user: {Email}", request.Email);
                return BadRequest(new { 
                    success = false, 
                    message = ex.Message 
                });
            }
        }

        /// <summary>
        /// Make a user admin (Development only)
        /// </summary>
        [HttpPost("make-admin")]
        public async Task<IActionResult> MakeUserAdmin([FromBody] MakeAdminRequest request)
        {
            // Only allow in development
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            try
            {
                _logger.LogInformation("👑 Making user admin: {Email}", request.Email);

                var user = await _userRepository.GetUserByEmailAsync(request.Email);
                if (user == null)
                {
                    return BadRequest(new { success = false, message = "User not found" });
                }

                var result = await _userRepository.UpdateUserRoleAsync(user.Id, "Admin");
                
                if (result)
                {
                    _logger.LogInformation("✅ User {Email} is now an admin", request.Email);
                    return Ok(new { 
                        success = true, 
                        message = "User promoted to admin successfully",
                        userId = user.Id,
                        email = user.Email,
                        role = "Admin"
                    });
                }
                else
                {
                    return BadRequest(new { success = false, message = "Failed to update user role" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "💥 Error making user admin: {Email}", request.Email);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }

    public class CreateTestUserRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class MakeAdminRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}