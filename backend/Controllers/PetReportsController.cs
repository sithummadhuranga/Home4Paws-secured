using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Home4Paws.API.Models.Pets;
using Home4Paws.API.Services.Pets;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Home4Paws.API.Controllers
{
    // ---- CODE BEFORE FIX (V03) ----
    // [ApiController]
    // [Route("api/reports")]
    // public class PetReportsController : ControllerBase
    // ---- END CODE BEFORE FIX (V03) ----
    // ---- FIXED (V03): the controller had no [Authorize] at all, so anyone could change the
    // status of, edit or delete any report. Now deny-by-default: every action needs a login
    // unless it is explicitly marked [AllowAnonymous] (public browsing + anonymous reporting),
    // and status change / edit / delete are Admin-only. ----
    [ApiController]
    [Route("api/reports")]
    [Authorize]
    public class PetReportsController : ControllerBase
    {
        private readonly IPetReportService _petReportService;
        private readonly ILocationSearchService _locationSearchService;
        private readonly IImageSimilarityService _imageSimilarityService;

        public PetReportsController(
            IPetReportService petReportService,
            ILocationSearchService locationSearchService,
            IImageSimilarityService imageSimilarityService)
        {
            _petReportService = petReportService;
            _locationSearchService = locationSearchService;
            _imageSimilarityService = imageSimilarityService;
        }

        // ---- FIXED (V03): public read, stays anonymous (lost/found browsing) ----
        [AllowAnonymous]
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll([FromQuery] PetReportSearchParams searchParams)
        {
            // FIXED (V07): used to return ex.ToString() (full stack trace) to the caller.
            // Unexpected errors now go to GlobalExceptionMiddleware, which logs them and
            // returns a generic 500 with a trace ID.
            var reports = await _petReportService.GetAllAsync(searchParams);
            return Ok(reports);
        }

        // ---- FIXED (V03): public read, stays anonymous (lost/found browsing) ----
        [AllowAnonymous]
        [HttpGet("simple")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllSimple()
        {
            // FIXED (V07): same stack-trace leak as GetAll, now handled by GlobalExceptionMiddleware
            var reports = await _petReportService.GetAllAsync(new PetReportSearchParams());
            return Ok(reports);
        }

        // ---- FIXED (V03): public read, stays anonymous (lost/found browsing) ----
        [AllowAnonymous]
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(Guid id)
        {
            var report = await _petReportService.GetByIdAsync(id);
            if (report == null) return NotFound();
            return Ok(report);
        }

        // ---- FIXED (V03): IDOR - any caller could request /user/{anyId}. Now requires login
        // (controller-level [Authorize]) and the caller may only request their OWN id unless
        // they are an Admin; otherwise 403. ----
        [HttpGet("user/{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetByUserId(int userId)
        {
            var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!User.IsInRole("Admin") && callerId != userId.ToString())
            {
                return Forbid();
            }

            // KNOWN LIMITATION (not fixed, see report): reports do not store who created them,
            // so this still cannot filter to the caller's own reports and returns the same list
            // that the public GET /api/reports already exposes.
            var searchParams = new PetReportSearchParams(); // Can add UserId filter here if needed
            var reports = await _petReportService.GetAllAsync(searchParams);
            // For now, return all reports - this can be filtered by userId in the service layer
            return Ok(reports);
        }

        // ---- FIXED (V03): status change (approve/reject/resolve + admin notes) was open to
        // anyone. Admin-only now. ----
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
        {
            try
            {
                var updatedReport = await _petReportService.UpdateStatusAsync(id, request.Status, request.AdminNotes);
                if (updatedReport == null) return NotFound();
                
                return Ok(updatedReport);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ---- FIXED (V03): anonymous lost/found reporting is still allowed (group decision) ----
        [AllowAnonymous]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Create([FromForm] CreatePetReportRequest request)
        {
            try
            {
                var report = await _petReportService.CreateAsync(request);
                return CreatedAtAction(nameof(GetById), new { id = report.Id }, report);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ---- FIXED (V03): edit was open to anyone. Reports have no stored owner and can be
        // submitted anonymously, so only an Admin may edit. ----
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(Guid id, [FromForm] UpdatePetReportRequest request)
        {
            try
            {
                var report = await _petReportService.UpdateAsync(id, request);
                if (report == null) return NotFound();
                return Ok(report);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ---- FIXED (V03): delete was open to anyone. Admin-only for the same reason as edit. ----
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                await _petReportService.DeleteAsync(id);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ---- FIXED (V03): public read, stays anonymous (lost/found browsing) ----
        [AllowAnonymous]
        [HttpGet("statistics")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetStatistics([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var stats = await _petReportService.GetStatisticsAsync();
            return Ok(stats);
        }

        // ---- FIXED (V03): public read, stays anonymous (lost/found browsing) ----
        [AllowAnonymous]
        [HttpGet("hotspots")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetHotspots()
        {
            var hotspots = await _locationSearchService.GetHotspotAreas();
            return Ok(hotspots);
        }

        // ---- FIXED (V03): public read, stays anonymous (lost/found browsing) ----
        [AllowAnonymous]
        [HttpGet("similar/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> FindSimilar(Guid id)
        {
            var report = await _petReportService.GetByIdAsync(id);
            if (report == null) return NotFound();

            var similarReports = await _imageSimilarityService.FindSimilarPets(
                report,
                (await _petReportService.GetAllAsync(new PetReportSearchParams
                {
                    Type = report.Type,
                    ReportType = report.ReportType == "Lost" ? "Found" : "Lost"
                })).ToList()
            );

            return Ok(similarReports);
        }

        // ---- FIXED (V03): public read, stays anonymous (lost/found browsing) ----
        [AllowAnonymous]
        [HttpGet("nearby")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> SearchNearby(
            [FromQuery] double latitude,
            [FromQuery] double longitude,
            [FromQuery] double radiusKm,
            [FromQuery] PetReportSearchParams filters)
        {
            var results = await _locationSearchService.SearchByRadius(latitude, longitude, radiusKm, filters);
            return Ok(results);
        }
    }
}