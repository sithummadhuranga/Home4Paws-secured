using System.Diagnostics;
using System.Net;
using System.Text.Json;

namespace Home4Paws.API.Middleware
{
    // Catches every unhandled exception, logs the full details on the server and returns
    // a generic JSON error with a trace ID. Stack traces, inner exceptions and framework
    // messages never reach the client, in any environment - the trace ID is what support
    // uses to find the matching log entry.
    public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        private readonly RequestDelegate _next = next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger = logger;

        // Cached JsonSerializerOptions to avoid creating new instances
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
                _logger.LogError(ex, "Unhandled exception on {Method} {Path} (traceId {TraceId})",
                    context.Request.Method, context.Request.Path, traceId);

                if (context.Response.HasStarted)
                {
                    throw;
                }
                await HandleExceptionAsync(context, ex, traceId);
            }
        }

        private static async Task HandleExceptionAsync(HttpContext context, Exception exception, string traceId)
        {
            // Business-rule exceptions our own services throw ("Maximum 3 photos are allowed",
            // "Owners cannot apply to their own listing") are written for users, so they keep
            // their status code and message. The same exception types thrown by EF Core,
            // Npgsql or the framework can contain table names, SQL or connection details, so
            // anything not thrown by our code is a plain 500 with no message.
            var ownException = IsThrownByOurCode(exception);
            var (status, message) = exception switch
            {
                ArgumentException when ownException => (HttpStatusCode.BadRequest, "Invalid request parameters."),
                UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Unauthorized access."),
                KeyNotFoundException when ownException => (HttpStatusCode.NotFound, "Resource not found."),
                InvalidOperationException when ownException => (HttpStatusCode.Conflict, "Operation cannot be completed."),
                _ => (HttpStatusCode.InternalServerError, "An internal server error occurred.")
            };

            var errors = ownException && status != HttpStatusCode.InternalServerError
                ? new List<string> { exception.Message }
                : new List<string>();

            context.Response.Clear();
            context.Response.StatusCode = (int)status;
            context.Response.ContentType = "application/json";

            var response = new
            {
                success = false,
                message,
                errors,
                traceId,
                timestamp = DateTime.UtcNow
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOptions));
        }

        // True when the exception was thrown from a Home4Paws.* namespace (our services),
        // false when it came from EF Core, Npgsql or the framework
        private static bool IsThrownByOurCode(Exception exception) =>
            exception.TargetSite?.DeclaringType?.Namespace?.StartsWith("Home4Paws.", StringComparison.Ordinal) == true;
    }
}
