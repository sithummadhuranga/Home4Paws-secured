using BCrypt.Net;
using Home4Paws.API.DataManager;
using Home4Paws.API.Helpers;
using Home4Paws.API.Models.Auth;
using Home4Paws.API.Models.Entities;

namespace Home4Paws.API.Services.Auth
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly JwtHelper _jwtHelper;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            IUserRepository userRepository, 
            JwtHelper jwtHelper, 
            ILogger<AuthService> logger)
        {
            _userRepository = userRepository;
            _jwtHelper = jwtHelper;
            _logger = logger;
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request, string ipAddress)
        {
            try
            {
                _logger.LogInformation("🔐 Login attempt for: {Email}", request.Email);

                // Validate input
                if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                {
                    _logger.LogWarning("❌ Login failed - empty email or password");
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Email and password are required."
                    };
                }

                // Get user from database
                _logger.LogInformation("🔍 Looking up user: {Email}", request.Email);
                var user = await _userRepository.GetUserByEmailAsync(request.Email.ToLowerInvariant());
                
                if (user == null)
                {
                    _logger.LogWarning("❌ Login failed - user not found: {Email}", request.Email);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Invalid email or password."
                    };
                }

                _logger.LogInformation("✅ User found: {UserId} ({Email})", user.Id, user.Email);

                if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
                {
                    var minutesLeft = (int)Math.Ceiling((user.LockoutEnd.Value - DateTime.UtcNow).TotalMinutes);
                    _logger.LogWarning("❌ Login blocked - account locked: {Email}, unlocks in {Minutes} min", request.Email, minutesLeft);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = $"Too many failed attempts. Try again in {minutesLeft} minute(s)."
                    };
                }

                // Check if user is active
                if (!user.IsActive)
                {
                    _logger.LogWarning("❌ Login failed - user inactive: {Email}", request.Email);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "This account has been deactivated."
                    };
                }

                // Verify password
                if (string.IsNullOrEmpty(user.PasswordHash))
                {
                    _logger.LogError("❌ User has no password hash: {Email}", request.Email);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Account setup incomplete. Please contact support."
                    };
                }

                _logger.LogInformation("🔐 Verifying password for user: {Email}", request.Email);
                bool isValid;
                try
                {
                    isValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Password verification error for user: {Email}", request.Email);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Authentication failed. Please try again."
                    };
                }

                if (!isValid)
                {
                    user.FailedLoginAttempts += 1;
                    if (user.FailedLoginAttempts >= 5)
                    {
                        user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
                        _logger.LogWarning("🔒 Account locked after {Attempts} failed attempts: {Email}", user.FailedLoginAttempts, request.Email);
                    }
                    await _userRepository.UpdateUserAsync(user);

                    _logger.LogWarning("❌ Login failed - invalid password: {Email}", request.Email);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Invalid email or password."
                    };
                }

                _logger.LogInformation("✅ Password verified for user: {Email}", request.Email);

                if (user.FailedLoginAttempts != 0 || user.LockoutEnd != null)
                {
                    user.FailedLoginAttempts = 0;
                    user.LockoutEnd = null;
                    await _userRepository.UpdateUserAsync(user);
                }

                // Update last login time
                try
                {
                    await _userRepository.UpdateLastLoginAsync(user.Id, DateTime.UtcNow);
                    _logger.LogInformation("✅ Updated last login for user: {UserId}", user.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "⚠️ Failed to update last login for user: {UserId}", user.Id);
                    // Don't fail login for this
                }

                // Generate tokens
                _logger.LogInformation("🎫 Generating tokens for user: {UserId}", user.Id);
                string accessToken, refreshToken;
                DateTime expiresAt;
                
                try
                {
                    accessToken = _jwtHelper.GenerateJwtToken(user);
                    refreshToken = _jwtHelper.GenerateRefreshToken();
                    expiresAt = _jwtHelper.GetTokenExpiry(request.RememberMe);
                    _logger.LogInformation("✅ Tokens generated successfully for user: {UserId}", user.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Token generation failed for user: {UserId}", user.Id);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Authentication service temporarily unavailable. Please try again."
                    };
                }

                // expiresAt here is the refresh token's lifetime, not the access token's -
                // the access token's own exp claim stays short regardless of remember-me
                await _userRepository.CreateUserSessionAsync(new UserSession
                {
                    UserId = user.Id,
                    Token = accessToken,
                    RefreshToken = refreshToken,
                    ExpiresAt = expiresAt,
                    DeviceInfo = request.DeviceInfo,
                    IpAddress = ipAddress
                });

                _logger.LogInformation("🎉 Login successful for user: {UserId} ({Email})", user.Id, user.Email);

                // Return successful response
                return new AuthResponse
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
                        LastLoginAt = DateTime.UtcNow,
                        AuthProvider = user.AuthProvider
                    },
                    Tokens = new TokenInfo
                    {
                        AccessToken = accessToken,
                        RefreshToken = refreshToken,
                        ExpiresAt = expiresAt
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "💥 Unexpected login error for: {Email}", request?.Email ?? "unknown");
                return new AuthResponse
                {
                    Success = false,
                    Message = "An error occurred during login. Please try again."
                };
            }
        }

        public async Task<AuthResponse> SignupAsync(SignupRequest request, string ipAddress)
        {
            try
            {
                _logger.LogInformation("📝 Signup attempt for: {Email}", request.Email);

                // Validate input
                if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName) ||
                    string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                {
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "All fields are required."
                    };
                }

                if (request.Password != request.ConfirmPassword)
                {
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Passwords do not match."
                    };
                }

                // Check if user already exists
                var existingUser = await _userRepository.GetUserByEmailAsync(request.Email.ToLowerInvariant());
                if (existingUser != null)
                {
                    _logger.LogWarning("❌ Signup failed - user already exists: {Email}", request.Email);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "An account with this email already exists."
                    };
                }

                // Create password hash with proper security
                string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12);
                _logger.LogDebug("🔐 Password hash created for: {Email}", request.Email);

                // Create new user
                var user = new User
                {
                    FirstName = request.FirstName.Trim(),
                    LastName = request.LastName.Trim(),
                    Email = request.Email.ToLowerInvariant().Trim(),
                    PasswordHash = passwordHash,
                    Role = "User",
                    IsActive = true,
                    EmailVerified = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Save to database
                var userId = await _userRepository.CreateUserAsync(user);
                user.Id = userId;

                // Generate tokens for immediate login
                var accessToken = _jwtHelper.GenerateJwtToken(user);
                var refreshToken = _jwtHelper.GenerateRefreshToken();
                var expiresAt = _jwtHelper.GetTokenExpiry(false);

                await _userRepository.CreateUserSessionAsync(new UserSession
                {
                    UserId = user.Id,
                    Token = accessToken,
                    RefreshToken = refreshToken,
                    ExpiresAt = expiresAt,
                    DeviceInfo = request.DeviceInfo,
                    IpAddress = ipAddress
                });

                _logger.LogInformation("✅ Signup successful for user: {UserId} ({Email})", userId, user.Email);

                return new AuthResponse
                {
                    Success = true,
                    Message = "Account created successfully",
                    User = new UserInfo
                    {
                        Id = user.Id,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Email = user.Email,
                        Role = user.Role,
                        EmailVerified = user.EmailVerified,
                        CreatedAt = user.CreatedAt,
                        AuthProvider = user.AuthProvider
                    },
                    Tokens = new TokenInfo
                    {
                        AccessToken = accessToken,
                        RefreshToken = refreshToken,
                        ExpiresAt = expiresAt
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "💥 Signup error for: {Email}", request?.Email);
                return new AuthResponse
                {
                    Success = false,
                    Message = "An error occurred during account creation."
                };
            }
        }

        public async Task<AuthResponse> RefreshTokenAsync(string refreshToken, string ipAddress)
        {
            try
            {
                if (string.IsNullOrEmpty(refreshToken))
                {
                    return new AuthResponse { Success = false, Message = "Invalid or expired refresh token." };
                }

                var session = await _userRepository.GetUserSessionAsync(refreshToken);
                if (session == null || session.ExpiresAt < DateTime.UtcNow)
                {
                    if (session != null)
                    {
                        await _userRepository.DeactivateUserSessionAsync(refreshToken);
                    }
                    return new AuthResponse { Success = false, Message = "Invalid or expired refresh token." };
                }

                var user = await _userRepository.GetUserByIdAsync(session.UserId);
                if (user == null || !user.IsActive)
                {
                    await _userRepository.DeactivateUserSessionAsync(refreshToken);
                    return new AuthResponse { Success = false, Message = "Invalid or expired refresh token." };
                }

                // Rotation: the old refresh token is retired the moment a new one is issued,
                // so a stolen-and-replayed token stops working as soon as the real client refreshes
                await _userRepository.DeactivateUserSessionAsync(refreshToken);

                var newAccessToken = _jwtHelper.GenerateJwtToken(user);
                var newRefreshToken = _jwtHelper.GenerateRefreshToken();

                // Keep whatever session length the original login chose (remember-me or not)
                // instead of resetting everyone to the same default on every refresh
                var sessionLength = session.ExpiresAt - session.CreatedAt;
                var newExpiresAt = DateTime.UtcNow.Add(sessionLength);

                await _userRepository.CreateUserSessionAsync(new UserSession
                {
                    UserId = user.Id,
                    Token = newAccessToken,
                    RefreshToken = newRefreshToken,
                    ExpiresAt = newExpiresAt,
                    DeviceInfo = session.DeviceInfo,
                    IpAddress = ipAddress
                });

                return new AuthResponse
                {
                    Success = true,
                    Message = "Token refreshed",
                    User = new UserInfo
                    {
                        Id = user.Id,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Email = user.Email,
                        Role = user.Role,
                        EmailVerified = user.EmailVerified,
                        CreatedAt = user.CreatedAt,
                        LastLoginAt = user.LastLoginAt,
                        AuthProvider = user.AuthProvider
                    },
                    Tokens = new TokenInfo
                    {
                        AccessToken = newAccessToken,
                        RefreshToken = newRefreshToken,
                        ExpiresAt = newExpiresAt
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "💥 Refresh token error");
                return new AuthResponse
                {
                    Success = false,
                    Message = "An error occurred during token refresh."
                };
            }
        }

        public async Task<LogoutResponse> LogoutAsync(string? refreshToken, bool logoutFromAllDevices)
        {
            try
            {
                if (logoutFromAllDevices && !string.IsNullOrEmpty(refreshToken))
                {
                    var session = await _userRepository.GetUserSessionAsync(refreshToken);
                    if (session != null)
                    {
                        await _userRepository.DeactivateAllUserSessionsAsync(session.UserId);
                    }
                }
                else if (!string.IsNullOrEmpty(refreshToken))
                {
                    await _userRepository.DeactivateUserSessionAsync(refreshToken);
                }

                return new LogoutResponse
                {
                    Success = true,
                    Message = "Logout successful"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "💥 Logout error");
                return new LogoutResponse
                {
                    Success = false,
                    Message = "An error occurred during logout."
                };
            }
        }

        public async Task<UserInfo?> GetUserInfoAsync(int userId)
        {
            try
            {
                var user = await _userRepository.GetUserByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("❌ User not found: {UserId}", userId);
                    return null;
                }

                return new UserInfo
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    Role = user.Role,
                    EmailVerified = user.EmailVerified,
                    CreatedAt = user.CreatedAt,
                    LastLoginAt = user.LastLoginAt,
                    AuthProvider = user.AuthProvider
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "💥 Error getting user info for: {UserId}", userId);
                return null;
            }
        }

        public async Task<bool> CleanupExpiredSessionsAsync()
        {
            return true;
        }
    }
}