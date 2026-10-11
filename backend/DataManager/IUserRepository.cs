using Home4Paws.API.Models.Entities;

namespace Home4Paws.API.DataManager
{
    public interface IUserRepository
    {
        Task<User?> GetUserByEmailAsync(string email);
        Task<User?> GetUserByIdAsync(int userId);
        Task<int> CreateUserAsync(User user);
        Task<bool> UpdateLastLoginAsync(int userId, DateTime lastLoginAt);
        Task<bool> UpdateUserAsync(User user);
        Task<bool> UpdatePasswordHashAsync(int userId, string passwordHash); // Add this
        Task<int> CreateUserSessionAsync(UserSession session);
        Task<UserSession?> GetUserSessionAsync(string refreshToken);
        Task<bool> DeactivateUserSessionAsync(string refreshToken);
        Task<bool> DeactivateAllUserSessionsAsync(int userId);
        Task<bool> CleanupExpiredSessionsAsync();
        Task<bool> UpdateUserRoleAsync(int userId, string role);
        Task<List<User>> GetAllUsersAsync();
    }
}