using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using Home4Paws.API.DataManager;
using Home4Paws.API.Services.Auth;
using Home4Paws.API.Helpers;
using Home4Paws.API.Middleware;
// using Home4Paws.API.Services.Pet; // Removed because the namespace 'Pet' does not exist
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using Home4Paws.API.Data;
using Home4Paws.API.Services.Pets; 
using Home4Paws.API.Services.Adoption;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Memory Cache for session management
builder.Services.AddMemoryCache();

// Enhanced CORS Configuration
var allowedOrigins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:3001"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(corsBuilder =>
    {
        corsBuilder
            .WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .SetPreflightMaxAge(TimeSpan.FromSeconds(86400)); // Cache preflight for 24 hours
    });

    // Add a more permissive policy for development
    options.AddPolicy("DevelopmentPolicy", corsBuilder =>
    {
        corsBuilder
            .WithOrigins("http://localhost:3000", "http://localhost:3001", "https://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .SetIsOriginAllowed(_ => builder.Environment.IsDevelopment()); // Allow any origin in dev
    });
});

// Configure JSON options
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

// Add JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
// The signing key is never stored in appsettings - it comes from dotnet user-secrets
// locally and from the JwtSettings__SecretKey environment variable in Docker/production
var secretKey = jwtSettings.GetValue<string>("SecretKey");
if (string.IsNullOrWhiteSpace(secretKey) || Encoding.ASCII.GetByteCount(secretKey) < 32)
{
    throw new InvalidOperationException(
        "JwtSettings:SecretKey is missing or shorter than 32 characters. Set it with " +
        "'dotnet user-secrets set \"JwtSettings:SecretKey\" \"<random 64-char value>\"' " +
        "or the JwtSettings__SecretKey environment variable.");
}
var issuer = jwtSettings.GetValue<string>("Issuer") ?? throw new ArgumentNullException("JwtSettings:Issuer", "JWT Issuer is required");
var audience = jwtSettings.GetValue<string>("Audience") ?? throw new ArgumentNullException("JwtSettings:Audience", "JWT Audience is required");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero
        };

        // The frontend no longer sends an Authorization header - the access token
        // lives in an httpOnly cookie instead, so pull it from there when present
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (string.IsNullOrEmpty(context.Token) && context.Request.Cookies.TryGetValue("h4p_at", out var cookieToken))
                {
                    context.Token = cookieToken;
                }
                return Task.CompletedTask;
            }
        };
    });

// Login gets its own limiter so a brute-force attempt can't just be spread across
// endpoints, without throttling normal use of the rest of the API
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", limiterOptions =>
    {
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.PermitLimit = 10;
        limiterOptions.QueueLimit = 0;
    });
    options.OnRejected = (context, _) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        return new ValueTask();
    };
});

// Add Entity Framework with PostgreSQL Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' not found. Set it with dotnet user-secrets " +
        "or the ConnectionStrings__DefaultConnection environment variable.");

builder.Services.AddDbContext<Home4Paws.API.Data.ApplicationDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.UseNetTopologySuite(); // For spatial data support
        npgsqlOptions.CommandTimeout(60);
    });
    
    // EnableSensitiveDataLogging is deliberately not used: it writes SQL parameter
    // values (password hashes, refresh tokens) into the logs
    if (builder.Environment.IsDevelopment())
    {
        options.EnableDetailedErrors();
    }
    
    Console.WriteLine("🔧 Using PostgreSQL Database");
});

// Register Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPetReportRepository, PetReportRepository>();
builder.Services.AddScoped<IAdoptionListingRepository, AdoptionListingRepository>();
builder.Services.AddScoped<IAdoptionApplicationRepository, AdoptionApplicationRepository>();
builder.Services.AddScoped<IAdoptionMessageRepository, AdoptionMessageRepository>();

// Register Pet Adoption Repositories
builder.Services.AddScoped<IPetListingRepository, PetListingRepository>();
builder.Services.AddScoped<IPetInquiryRepository, PetInquiryRepository>();
builder.Services.AddScoped<IPetFavoriteRepository, PetFavoriteRepository>();

// Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddScoped<JwtHelper>();
builder.Services.AddScoped<IAdoptionService, AdoptionService>();
builder.Services.AddScoped<IAdoptionApplicationService, AdoptionApplicationService>();
builder.Services.AddScoped<IAdoptionMessageService, AdoptionMessageService>();

// Register Pet Adoption Services
builder.Services.AddScoped<IPetListingService, PetListingService>();
builder.Services.AddScoped<IPetInquiryService, PetInquiryService>();

// Register AutoMapper
builder.Services.AddAutoMapper(cfg => cfg.AddMaps(typeof(MappingProfiles)));
// Register Pet Services
builder.Services.AddScoped<IPetReportService, PetReportService>();
builder.Services.AddScoped<ILocationSearchService, LocationSearchService>();
builder.Services.AddScoped<IImageSimilarityService, ImageSimilarityService>();

// Register HTTP Client for Image Similarity Service
builder.Services.AddHttpClient("ImageSimilarityService", client =>
{
    client.BaseAddress = new Uri(builder.Configuration.GetValue<string>("ImageSimilarityService:BaseUrl") ?? "http://localhost:5000");
    client.Timeout = TimeSpan.FromSeconds(30);
});

// Configure static files for uploads
builder.Services.AddDirectoryBrowser();

// Add health checks (simplified for in-memory database)
builder.Services.AddHealthChecks();

var app = builder.Build();

// Enhanced environment logging with clear branding
var logger = app.Services.GetRequiredService<ILogger<Program>>();
var environmentBadge = app.Environment.IsDevelopment() ? "🔧 DEVELOPMENT" : "🚀 PRODUCTION";
var appName = builder.Configuration.GetValue<string>("ApplicationSettings:ApplicationName", "Home4Paws Platform");

logger.LogInformation("═══════════════════════════════════════════════════════");
logger.LogInformation("🐾 {AppName}", appName);
logger.LogInformation("{EnvironmentBadge} Environment: {Environment}", environmentBadge, app.Environment.EnvironmentName.ToUpper());
logger.LogInformation("📊 Database: ✅ PostgreSQL");
logger.LogInformation("🌐 Base URL: {BaseUrl}", builder.Configuration.GetValue<string>("ExternalServices:BaseUrl"));
logger.LogInformation("🔐 JWT: ✅ Configured with {Issuer}", issuer);
logger.LogInformation("💾 Cache: ✅ Memory Cache Enabled");
logger.LogInformation("🌍 CORS: ✅ Configured for origins: {Origins}", string.Join(", ", allowedOrigins));
logger.LogInformation("═══════════════════════════════════════════════════════");

// Add Global Exception Middleware
app.UseMiddleware<GlobalExceptionMiddleware>();

// Security headers on every response. The CSP is scoped to /api so it doesn't fight
// with Swagger's own page, which needs to run its own inline scripts to render
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Cross-Origin-Resource-Policy"] = "same-site";
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
    }
    await next();
});

// Configure the HTTP request pipeline
var enableSwagger = builder.Configuration.GetValue<bool>("Features:EnableSwagger", false);

if (app.Environment.IsDevelopment() || enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Home4Paws API v1");
        options.RoutePrefix = "swagger";
        options.DocumentTitle = $"🐾 Home4Paws API - {app.Environment.EnvironmentName.ToUpper()}";
        
        // Customize Swagger UI based on environment
        if (app.Environment.IsDevelopment())
        {
            options.DefaultModelsExpandDepth(-1);
            options.DisplayRequestDuration();
        }
    });
    logger.LogInformation("📖 Swagger UI: ✅ Enabled at /swagger");
}
else
{
    logger.LogInformation("📖 Swagger UI: ❌ Disabled (Production Mode)");
}

if (app.Environment.IsProduction())
{
    // Errors are handled by GlobalExceptionMiddleware above - there is no /Error page
    app.UseHsts();
    logger.LogInformation("🔒 Security: ✅ HSTS enabled");
}

// IMPORTANT: CORS must be before Authentication/Authorization
// Remove HTTPS redirect that might cause preflight issues
if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

// Apply CORS policy
if (app.Environment.IsDevelopment())
{
    app.UseCors("DevelopmentPolicy");
}
else
{
    app.UseCors();
}

// Add this if you use controllers (MVC)
app.UseRouting();

// Configure static file serving
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Stop browsers from guessing a different content type for uploaded files
        ctx.Context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    }
});

// Add Authentication & Authorization (AFTER CORS)
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// Map Controllers
app.MapControllers();

// Health check endpoints
app.MapHealthChecks("/health");
// FIXED (V07): the database exception (host, port, auth failure) is logged, never
// returned, and the environment name is no longer exposed. The result of
// CanConnectAsync is now checked - it used to report "healthy" with the DB down.
app.MapGet("/health/database", async (Home4Paws.API.Data.ApplicationDbContext dbContext, ILogger<Program> healthLogger) =>
{
    try
    {
        if (!await dbContext.Database.CanConnectAsync())
        {
            return Results.Json(new { status = "unhealthy", database = "unreachable" }, statusCode: 503);
        }
        return Results.Ok(new { 
            status = "healthy", 
            database = "connected",
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        healthLogger.LogError(ex, "Database health check failed");
        return Results.Json(new { status = "unhealthy", database = "unreachable" }, statusCode: 503);
    }
})
.WithName("DatabaseHealth")
.WithOpenApi();

// Enhanced API info endpoint
app.MapGet("/api/info", (IConfiguration config, IWebHostEnvironment env) => new
{
    Application = new
    {
        Name = config.GetValue<string>("ApplicationSettings:ApplicationName", "Home4Paws Platform"),
        Version = config.GetValue<string>("ApplicationSettings:Version", "1.0.0"),
        Environment = env.EnvironmentName,
        Schema = env.IsDevelopment() ? "development" : "production"
    },
    Configuration = new
    {
        DatabaseConfigured = true,
        BaseUrl = config.GetValue<string>("ExternalServices:BaseUrl"),
        CorsEnabled = true,
        AllowedOrigins = allowedOrigins,
        Features = new
        {
            EnableSwagger = config.GetValue<bool>("Features:EnableSwagger"),
            EnableDetailedErrors = config.GetValue<bool>("Features:EnableDetailedErrors"),
            EnableChatbot = config.GetValue<bool>("Features:EnableChatbot"),
            EnableFileUpload = config.GetValue<bool>("Features:EnableFileUpload")
        }
    },
    Runtime = new
    {
        Timestamp = DateTime.UtcNow,
        MachineName = Environment.MachineName,
        ProcessId = Environment.ProcessId
    }
})
.WithName("GetApiInfo")
.WithOpenApi()
.WithSummary("Get comprehensive API information and configuration");

logger.LogInformation("🎯 Home4Paws API started successfully!");
logger.LogInformation("📋 Available endpoints:");
logger.LogInformation("   POST /api/auth/login");
logger.LogInformation("   POST /api/auth/signup");
logger.LogInformation("   POST /api/auth/refresh");
logger.LogInformation("   POST /api/auth/logout");
logger.LogInformation("   GET  /api/auth/health");
logger.LogInformation("   GET  /api/reports");
logger.LogInformation("   POST /api/reports");

// Apply database migrations automatically
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<Home4Paws.API.Data.ApplicationDbContext>();
    
    try
    {
        // Check if database connection is working
        var canConnect = await context.Database.CanConnectAsync();
        
        if (!canConnect)
        {
            logger.LogWarning("⚠️ Cannot connect to database. Skipping migrations.");
        }
        else
        {
            // Apply any pending migrations
            var pendingMigrations = context.Database.GetPendingMigrations().ToList();
            
            if (pendingMigrations.Any())
            {
                logger.LogInformation("📦 Applying {Count} pending migrations...", pendingMigrations.Count);
                try
                {
                    context.Database.Migrate();
                    logger.LogInformation("✅ Database migrations applied successfully");
                }
                catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P07")
                {
                    // Table already exists - this is okay, just log and continue
                    logger.LogWarning("⚠️ Some tables already exist. Database is ready to use.");
                }
            }
            else
            {
                logger.LogInformation("✅ Database is up to date");
            }
            
            // First Admin account. There is no built-in default account any more: the
            // email and password come from SeedAdmin:Email / SeedAdmin:Password
            // (user-secrets locally, SeedAdmin__Email / SeedAdmin__Password env vars
            // elsewhere), the password must be strong, and it is never logged.
            if (!context.Users.Any(u => u.Role == "Admin"))
            {
                var seedEmail = builder.Configuration["SeedAdmin:Email"]?.Trim().ToLowerInvariant();
                var seedPassword = builder.Configuration["SeedAdmin:Password"];

                if (string.IsNullOrWhiteSpace(seedEmail) || string.IsNullOrWhiteSpace(seedPassword))
                {
                    logger.LogWarning("⚠️ No Admin account exists. Set SeedAdmin:Email and SeedAdmin:Password and restart to create one.");
                }
                // 12+ characters with upper and lower case, a number and a symbol
                else if (!System.Text.RegularExpressions.Regex.IsMatch(seedPassword, @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$"))
                {
                    logger.LogError("❌ SeedAdmin:Password is too weak (needs 12+ characters with upper and lower case, a number and a symbol). Admin account not created.");
                }
                else if (context.Users.Any(u => u.Email == seedEmail))
                {
                    logger.LogError("❌ SeedAdmin:Email {Email} already belongs to a non-admin account. Admin account not created.", seedEmail);
                }
                else
                {
                    context.Users.Add(new Home4Paws.API.Models.Entities.User
                    {
                        FirstName = "Admin",
                        LastName = "User",
                        Email = seedEmail,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(seedPassword, workFactor: 12),
                        Role = "Admin",
                        IsActive = true,
                        EmailVerified = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    await context.SaveChangesAsync();
                    logger.LogInformation("👤 Admin account created for {Email}. Remove SeedAdmin:Password from configuration now.", seedEmail);
                }
            }
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ An error occurred while migrating or seeding the database");
        // Don't throw - allow the app to start even if migrations fail
        logger.LogWarning("⚠️ Starting application anyway. Database may need manual migration.");
    }
}

app.Run();
