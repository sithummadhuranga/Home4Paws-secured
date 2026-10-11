using Microsoft.AspNetCore.Http;

namespace Home4Paws.API.Helpers
{
    // Checks the real content of an uploaded image instead of trusting
    // the file name or the Content-Type sent by the client.
    public static class ImageFileValidator
    {
        private static readonly byte[] JpegSignature = { 0xFF, 0xD8, 0xFF };
        private static readonly byte[] PngSignature = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };

        // Returns ".jpg" or ".png" when the file starts with a known image
        // signature, otherwise null.
        public static async Task<string?> GetImageExtensionAsync(IFormFile file)
        {
            var header = new byte[PngSignature.Length];
            using var stream = file.OpenReadStream();
            var read = await stream.ReadAsync(header, 0, header.Length);

            if (read >= PngSignature.Length && header.Take(PngSignature.Length).SequenceEqual(PngSignature))
                return ".png";

            if (read >= JpegSignature.Length && header.Take(JpegSignature.Length).SequenceEqual(JpegSignature))
                return ".jpg";

            return null;
        }
    }
}
