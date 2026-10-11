// backend/Controllers/ProductsController.cs

using AutoMapper;
using Home4Paws.API.Data;
using Home4Paws.API.DTOs;
using Home4Paws.API.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Home4Paws.API.Controllers;

[ApiController]
[Route("api/[controller]")] // Sets the base route to /api/products
public class ProductsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(ApplicationDbContext context, IMapper mapper, ILogger<ProductsController> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    // GET: api/products
    // Public endpoint for anyone (customers) to view all active products.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts()
    {
        try
        {
            var products = await _context.Products
                .Include(p => p.Category) // Eager load the related Category data to avoid N+1 query issues
                .Where(p => p.IsActive)   // Best practice: Only show active products on the public store
                .OrderBy(p => p.Name)     // Provide a consistent ordering
                .ToListAsync();
            
            // Use AutoMapper to convert the Product entities to ProductDto objects
            return Ok(_mapper.Map<IEnumerable<ProductDto>>(products));
        }
        catch (Exception ex)
        {
            // FIXED (V07): details stay in the server log only, the client gets a generic
            // message and a trace ID to quote
            _logger.LogError(ex, "Error getting products (traceId {TraceId})", HttpContext.TraceIdentifier);

            return StatusCode(500, new { error = "Failed to retrieve products", traceId = HttpContext.TraceIdentifier });
        }
    }

    // GET: api/products/5
    // Public endpoint to view a single product by its ID.
    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> GetProduct(int id)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null)
        {
            return NotFound(new { Message = $"Product with ID {id} not found." }); // Return a helpful 404 message
        }

        return Ok(_mapper.Map<ProductDto>(product));
    }

    // --- PROTECTED ADMIN ROUTES ---
    // The following actions require the user to be authenticated and have the "Admin" role.

    // POST: api/products
    // Admin-only endpoint to create a new product.
    // ---- CODE BEFORE FIX (V04) ----
    // [HttpPost]
    // //[Authorize(Roles = "Admin")]
    // ---- END CODE BEFORE FIX (V04) ----
    // ---- FIXED (V04): the admin check was commented out, so anyone (even without a token)
    // could create products. Restored so only authenticated users in the Admin role can
    // create products, matching PUT and DELETE below. ----
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductDto>> CreateProduct([FromBody] CreateUpdateProductDto productDto)
    {
        // Use AutoMapper to convert the incoming DTO to a Product entity
        var product = _mapper.Map<Product>(productDto);
        
        // Fix: Use DateCreated and DateUpdated instead of CreatedAt and UpdatedAt
        product.DateCreated = DateTime.UtcNow;
        product.DateUpdated = DateTime.UtcNow;

        await _context.Products.AddAsync(product);
        await _context.SaveChangesAsync();

        // It's good practice to return the fully created object, including its new ID and related data.
        // We need to explicitly load the Category to map the CategoryName correctly for the response.
        await _context.Entry(product).Reference(p => p.Category).LoadAsync();
        
        var productToReturn = _mapper.Map<ProductDto>(product);

        // Return a 201 Created status code with a link to the new resource and the resource itself
        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, productToReturn);
    }

    // PUT: api/products/5
    // Admin-only endpoint to update an existing product.
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] CreateUpdateProductDto productDto)
    {
        var productFromDb = await _context.Products.FindAsync(id);
        
        if (productFromDb == null)
        {
            return NotFound(new { Message = $"Product with ID {id} not found for update." });
        }

        // Use AutoMapper to apply the changes from the DTO onto the existing entity from the database
        _mapper.Map(productDto, productFromDb);
        // Fix: Use DateUpdated instead of UpdatedAt
        productFromDb.DateUpdated = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent(); // Standard HTTP 204 response for a successful update
    }

    // DELETE: api/products/5
    // Admin-only endpoint to delete a product.
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
        {
            return NotFound(new { Message = $"Product with ID {id} not found for deletion." });
        }

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        return NoContent(); // Standard HTTP 204 response for a successful delete
    }

    // GET: api/products/search
    // Public endpoint to search for products by a query string.
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<ProductDto>>> SearchProducts([FromQuery] string? query)
    {
        try
        {
            _logger.LogInformation("Search request received with query: {Query}", query ?? "empty");
            
            // Test database connectivity first
            if (!await _context.Database.CanConnectAsync())
            {
                _logger.LogError("Database connection failed");
                return StatusCode(503, new { 
                    success = false, 
                    message = "Database is currently unavailable. Please try again in a moment.",
                    error = "Database connection failed"
                });
            }
            
            // If query is null or empty, return all active products
            if (string.IsNullOrWhiteSpace(query))
            {
                _logger.LogInformation("Empty query - returning all products");
                var allProducts = await _context.Products
                    .Include(p => p.Category)
                    .Where(p => p.IsActive)
                    .OrderBy(p => p.Name)
                    .AsNoTracking() // Add this for better performance
                    .ToListAsync();
                
                return Ok(_mapper.Map<IEnumerable<ProductDto>>(allProducts));
            }

            var searchTerm = query.Trim().ToLower();
            _logger.LogInformation("Searching for: {SearchTerm}", searchTerm);

            var products = await _context.Products
                .Include(p => p.Category)
                .Where(p => p.IsActive && 
                       (p.Name.ToLower().Contains(searchTerm) ||
                        p.Description.ToLower().Contains(searchTerm) ||
                        p.Sku.ToLower().Contains(searchTerm) ||
                        (p.Category != null && p.Category.Name.ToLower().Contains(searchTerm))))
                .OrderBy(p => p.Name)
                .AsNoTracking() // Add this for better performance
                .ToListAsync();
            
            _logger.LogInformation("Found {Count} products matching '{SearchTerm}'", products.Count, searchTerm);
            return Ok(_mapper.Map<IEnumerable<ProductDto>>(products));
        }
        catch (Npgsql.NpgsqlException ex)
        {
            _logger.LogError(ex, "Database connection error during search: {Message}", ex.Message);
            return StatusCode(503, new { 
                success = false, 
                message = "Database is temporarily unavailable. Please try again in a moment.",
                error = "Database connection error"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching products with query: {Query}", query ?? "null");
            // FIXED (V07): ex.Message is no longer returned to the client
            return StatusCode(500, new { 
                success = false, 
                message = "An error occurred while searching products",
                traceId = HttpContext.TraceIdentifier
            });
        }
    }
}