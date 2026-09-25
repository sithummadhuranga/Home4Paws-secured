using Home4Paws.API.Models.Auth;

namespace Home4Paws.API.Services.Auth
{
    public interface IAuthService
    {
        Task<AuthResponse> LoginAsync(LoginRequest request, string ipAddress);
        Task<AuthResponse> SignupAsync(SignupRequest request, string ipAddress);
        Task<AuthResponse> RefreshTokenAsync(string refreshToken, string ipAddress);
        Task<LogoutResponse> LogoutAsync(string? refreshToken, bool logoutFromAllDevices);
        Task<UserInfo?> GetUserInfoAsync(int userId);
        Task<bool> CleanupExpiredSessionsAsync();
    }
}