using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using Home4Paws.API.DataManager;
using Home4Paws.API.Services.Auth;
using Home4Paws.API.Helpers;
using Home4Paws.API.Middleware;
// using Home4Paws.API.Services.Pet; // Removed because the namespace 'Pet' does not exist
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
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
var secretKey = jwtSettings.GetValue<string>("SecretKey") ?? throw new ArgumentNullException("JwtSettings:SecretKey", "JWT SecretKey is required");
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
    });

// Add Entity Framework with PostgreSQL Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<Home4Paws.API.Data.ApplicationDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.UseNetTopologySuite(); // For spatial data support
        npgsqlOptions.CommandTimeout(60);
    });
    
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
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
logger.LogInformation("📊 Database: ✅ PostgreSQL (Supabase)");
logger.LogInformation("🌐 Base URL: {BaseUrl}", builder.Configuration.GetValue<string>("ExternalServices:BaseUrl"));
logger.LogInformation("🔐 JWT: ✅ Configured with {Issuer}", issuer);
logger.LogInformation("💾 Cache: ✅ Memory Cache Enabled");
logger.LogInformation("🌍 CORS: ✅ Configured for origins: {Origins}", string.Join(", ", allowedOrigins));
logger.LogInformation("═══════════════════════════════════════════════════════");

// Add Global Exception Middleware
app.UseMiddleware<GlobalExceptionMiddleware>();

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
    app.UseExceptionHandler("/Error");
    app.UseHsts();
    logger.LogInformation("🔒 Security: ✅ HSTS and Exception Handling enabled");
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
app.UseStaticFiles();

// Add Authentication & Authorization (AFTER CORS)
app.UseAuthentication();
app.UseAuthorization();

// Map Controllers
app.MapControllers();

// Health check endpoints
app.MapHealthChecks("/health");
app.MapGet("/health/database", async (Home4Paws.API.Data.ApplicationDbContext dbContext) =>
{
    try
    {
        await dbContext.Database.CanConnectAsync();
        return Results.Ok(new { 
            status = "healthy", 
            database = "connected",
            environment = app.Environment.EnvironmentName,
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            detail: ex.Message,
            statusCode: 503,
            title: "Database connection failed"
        );
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
            
            // Seed test admin user if not exists (only in development)
            if (app.Environment.IsDevelopment() && !context.Users.Any())
            {
                var adminUser = new Home4Paws.API.Models.Entities.User
                {
                    FirstName = "Admin",
                    LastName = "User", 
                    Email = "admin@home4paws.lk",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                    Role = "Admin",
                    IsActive = true,
                    EmailVerified = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                context.Users.Add(adminUser);
                await context.SaveChangesAsync();
                logger.LogInformation("👤 Admin user seeded: admin@home4paws.lk / Admin123!");
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
