using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Home4Paws.API.Data;

namespace Home4Paws.API.Controllers
{
    // ---- FIXED (V02): replacement for the unauthenticated GET /api/dev/users ----
    // The user list (names, emails, roles, last login) is only needed by the admin panel
    // (admin/users and admin/analytics pages), so it now lives behind an Admin-only route.
    [ApiController]
    [Route("api/admin/users")]
    [Authorize(Roles = "Admin")]
    public class AdminUsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AdminUsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// List all users (Admin only)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            // Same fields the admin pages already consume; no password hashes or tokens
            var users = await _context.Users
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    u.Email,
                    u.Role,
                    u.IsActive,
                    u.EmailVerified,
                    u.CreatedAt,
                    u.LastLoginAt
                })
                .ToListAsync();

            return Ok(users);
        }
    }
}
