using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Home4Paws.API.DataManager;
using Home4Paws.API.Helpers;
using Home4Paws.API.Models.Entities;
using Home4Paws.API.Models.Pets;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Home4Paws.API.Services.Pets
{
    public class PetReportService : IPetReportService
    {
        private readonly IPetReportRepository _repository;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png" };
        private const int MaxFileSize = 5 * 1024 * 1024; // 5MB

        public PetReportService(IPetReportRepository repository, IWebHostEnvironment webHostEnvironment)
        {
            _repository = repository;
            _webHostEnvironment = webHostEnvironment;
        }

        public async Task<IEnumerable<PetReportResponse>> GetAllAsync(PetReportSearchParams searchParams)
        {
            var reports = await _repository.GetAllAsync(searchParams);
            return reports.Select(MapToResponse);
        }

        public async Task<PetReportResponse> GetByIdAsync(Guid id)
        {
            var report = await _repository.GetByIdAsync(id);
            if (report == null) return null;
            return MapToResponse(report);
        }

        public async Task<PetReportResponse> CreateAsync(CreatePetReportRequest request)
        {
            await ValidatePhotos(request.Photos);

            var photoUrls = await SavePhotos(request.Photos);

            var petReport = new PetReport
            {
                Type = request.Type,
                Name = request.Name ?? "Unknown",
                Breed = request.Breed ?? "Unknown",
                Age = request.Age ?? "Unknown",
                Gender = request.Gender ?? "Unknown",
                Size = request.Size ?? "Medium",
                Color = request.Color,
                Description = request.Description,
                ReportType = request.ReportType,
                Status = "Pending Confirmation",
                LostOrFoundDate = request.LostOrFoundDate.Kind == DateTimeKind.Utc 
                    ? request.LostOrFoundDate 
                    : DateTime.SpecifyKind(request.LostOrFoundDate, DateTimeKind.Utc),
                Location = request.Location,
                ContactName = request.ContactName,
                Phone = request.Phone,
                Email = request.Email,
                PhotoUrls = photoUrls.ToArray(),
                IdentifyingFeatures = string.Empty,
                MedicalConditions = string.Empty,
                IsChipped = false,
                ChipNumber = string.Empty,
                HasReward = false,
                RewardAmount = string.Empty,
                Views = 0,
                IsUrgent = false,
                IsClosed = false,
                ClosureReason = string.Empty,
                AdminNotes = string.Empty
            };

            await _repository.CreateAsync(petReport);
            return MapToResponse(petReport);
        }

        public async Task<PetReportResponse> UpdateAsync(Guid id, UpdatePetReportRequest request)
        {
            var report = await _repository.GetByIdAsync(id);
            if (report == null) return null;

            if (!await _repository.IsPendingAsync(id))
            {
                throw new InvalidOperationException("Only pending reports can be updated");
            }

            // Update allowed fields
            if (!string.IsNullOrWhiteSpace(request.Breed)) report.Breed = request.Breed;
            if (!string.IsNullOrWhiteSpace(request.Color)) report.Color = request.Color;
            if (!string.IsNullOrWhiteSpace(request.Description)) report.Description = request.Description;
            if (!string.IsNullOrWhiteSpace(request.Location)) report.Location = request.Location;
            if (!string.IsNullOrWhiteSpace(request.ContactName)) report.ContactName = request.ContactName;
            if (!string.IsNullOrWhiteSpace(request.Phone)) report.Phone = request.Phone;
            if (!string.IsNullOrWhiteSpace(request.Email)) report.Email = request.Email;

            // Handle new photos if provided
            if (request.NewPhotos != null && request.NewPhotos.Any())
            {
                await ValidatePhotos(request.NewPhotos);
                var newPhotoUrls = await SavePhotos(request.NewPhotos);
                
                // Delete old photos
                DeletePhotos(report.PhotoUrls);
                
                report.PhotoUrls = newPhotoUrls.ToArray();
            }

            await _repository.UpdateAsync(report);
            return MapToResponse(report);
        }

        public async Task<PetReportResponse> UpdateStatusAsync(Guid id, string status, string? adminNotes)
        {
            var report = await _repository.GetByIdAsync(id);
            if (report == null) return null;

            // Update status and admin notes
            report.Status = status;
            if (!string.IsNullOrWhiteSpace(adminNotes))
            {
                report.AdminNotes = adminNotes;
            }

            // If status is being set to closed/resolved, update closure fields
            if (status.Equals("Closed", StringComparison.OrdinalIgnoreCase) || 
                status.Equals("Resolved", StringComparison.OrdinalIgnoreCase))
            {
                report.IsClosed = true;
                report.ClosedAt = DateTime.UtcNow;
                if (!string.IsNullOrWhiteSpace(adminNotes))
                {
                    report.ClosureReason = adminNotes;
                }
            }

            report.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(report);
            return MapToResponse(report);
        }

        public async Task DeleteAsync(Guid id)
        {
            var report = await _repository.GetByIdAsync(id);
            if (report == null) return;

            if (!await _repository.IsPendingAsync(id))
            {
                throw new InvalidOperationException("Only pending reports can be deleted");
            }

            // Delete photos
            DeletePhotos(report.PhotoUrls);

            await _repository.DeleteAsync(id);
        }

        private async Task ValidatePhotos(IFormFile[] photos)
        {
            if (photos == null || !photos.Any())
                throw new ArgumentException("At least one photo is required");

            if (photos.Length > 3)
                throw new ArgumentException("Maximum 3 photos are allowed");

            foreach (var photo in photos)
            {
                if (photo.Length > MaxFileSize)
                    throw new ArgumentException($"File {photo.FileName} exceeds maximum size of 5MB");

                var extension = Path.GetExtension(photo.FileName).ToLowerInvariant();
                if (!_allowedExtensions.Contains(extension))
                    throw new ArgumentException($"File {photo.FileName} has invalid extension. Allowed: jpg, jpeg, png");

                if (await ImageFileValidator.GetImageExtensionAsync(photo) == null)
                    throw new ArgumentException($"File {photo.FileName} is not a valid JPEG or PNG image");
            }
        }

        private async Task<List<string>> SavePhotos(IFormFile[] photos)
        {
            var photoUrls = new List<string>();
            var uploadsFolder = Path.Combine(_webHostEnvironment.WebRootPath, "uploads");
            Directory.CreateDirectory(uploadsFolder);

            foreach (var photo in photos)
            {
                var realExtension = await ImageFileValidator.GetImageExtensionAsync(photo);
                var uniqueFileName = $"{Guid.NewGuid()}{realExtension}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await photo.CopyToAsync(fileStream);
                }

                photoUrls.Add($"/uploads/{uniqueFileName}");
            }

            return photoUrls;
        }

        private void DeletePhotos(string[] photoUrls)
        {
            if (photoUrls == null) return;

            foreach (var url in photoUrls)
            {
                var fileName = Path.GetFileName(url);
                var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "uploads", fileName);

                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
        }

        private static PetReportResponse MapToResponse(PetReport report)
        {
            return new PetReportResponse
            {
                Id = report.Id,
                Type = report.Type,
                Name = report.Name,
                Breed = report.Breed,
                Color = report.Color,
                Age = report.Age,
                Gender = report.Gender,
                Size = report.Size,
                Description = report.Description,
                ReportType = report.ReportType,
                Status = report.Status,
                DateReported = report.DateReported,
                LostOrFoundDate = report.LostOrFoundDate,
                Location = report.Location,
                ContactName = report.ContactName,
                Phone = report.Phone,
                Email = report.Email,
                PhotoUrls = report.PhotoUrls,
                IdentifyingFeatures = report.IdentifyingFeatures,
                MedicalConditions = report.MedicalConditions,
                IsChipped = report.IsChipped,
                ChipNumber = report.ChipNumber,
                HasReward = report.HasReward,
                RewardAmount = report.RewardAmount,
                Views = report.Views,
                IsUrgent = report.IsUrgent,
                IsClosed = report.IsClosed,
                ClosedAt = report.ClosedAt,
                ClosureReason = report.ClosureReason,
                CreatedAt = report.CreatedAt,
                UpdatedAt = report.UpdatedAt
            };
        }

        public async Task<PetReportStatistics> GetStatisticsAsync()
        {
            var reports = await _repository.GetAllAsync(new PetReportSearchParams());

            return new PetReportStatistics
            {
                ReportsByType = reports.GroupBy(r => r.Type)
                    .ToDictionary(g => g.Key, g => g.Count()),
                ReportsByStatus = reports.GroupBy(r => r.Status)
                    .ToDictionary(g => g.Key, g => g.Count()),
                ReportsByLocation = reports.GroupBy(r => r.Location)
                    .ToDictionary(g => g.Key, g => g.Count())
            };
        }
    }
}