using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Home4Paws.API.Helpers;

namespace Home4Paws.API.Controllers
{
    [ApiController]
    [Route("api/media")]
    [Authorize]
    public class MediaController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;
        private static readonly string[] AllowedExtensions = new[] { ".jpg", ".jpeg", ".png" };
        private const int MaxFileSize = 5 * 1024 * 1024; // 5MB

        public MediaController(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        [HttpPost("upload-adoption")]
        [RequestSizeLimit(20 * 1024 * 1024)] // 20MB total
        public async Task<ActionResult<object>> UploadAdoptionPhotos([FromForm] IFormFile[] files)
        {
            if (files == null || files.Length == 0)
            {
                return BadRequest(new { message = "No files uploaded" });
            }

            var uploadsDir = Path.Combine(_environment.WebRootPath, "uploads", "adoptions");
            Directory.CreateDirectory(uploadsDir);

            var urls = new List<string>();

            foreach (var file in files)
            {
                if (file.Length == 0) continue;
                if (file.Length > MaxFileSize)
                {
                    return BadRequest(new { message = $"File {file.FileName} exceeds the 5MB limit" });
                }

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!AllowedExtensions.Contains(ext))
                {
                    return BadRequest(new { message = $"Invalid file type for {file.FileName}. Allowed: jpg, jpeg, png" });
                }

                // The extension alone can be faked, so check the file header too
                var realExt = await ImageFileValidator.GetImageExtensionAsync(file);
                if (realExt == null)
                {
                    return BadRequest(new { message = $"{file.FileName} is not a valid JPEG or PNG image" });
                }

                var name = $"{Guid.NewGuid()}{realExt}";
                var path = Path.Combine(uploadsDir, name);
                using (var stream = new FileStream(path, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
                urls.Add($"/uploads/adoptions/{name}");
            }

            return Ok(new { urls });
        }
    }
}


