import axios from 'axios';

export interface BreedPrediction {
  class: string;
  class_id: number;
  confidence: number;
}

export interface BreedRecognitionResponse {
  predictions: BreedPrediction[];
}

export interface BreedRecognitionError {
  message: string;
  code?: string;
}

const ROBOFLOW_API_URL = 'https://serverless.roboflow.com/dog-breed-xpaq6/1';
// Read from the environment at build time (frontend/.env.local or the Docker build
// arg) instead of being hard-coded in the source and Git history
const ROBOFLOW_API_KEY = process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY ?? '';

/**
 * Analyzes an image to detect dog breed using Roboflow API
 * @param imageFile - The image file to analyze
 * @returns Promise with breed predictions
 */
export async function recognizeBreed(
  imageFile: File
): Promise<BreedRecognitionResponse> {
  try {
    // Convert file to base64
    const base64Image = await fileToBase64(imageFile);
    
    // Remove data URL prefix if present
    const base64Data = base64Image.split(',')[1] || base64Image;

    const response = await axios.post<BreedRecognitionResponse>(
      ROBOFLOW_API_URL,
      base64Data,
      {
        params: {
          api_key: ROBOFLOW_API_KEY,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to analyze image',
        code: error.code,
      } as BreedRecognitionError;
    }
    throw {
      message: 'An unexpected error occurred',
    } as BreedRecognitionError;
  }
}

/**
 * Converts a File object to base64 string
 * @param file - The file to convert
 * @returns Promise with base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Formats the breed class name to be more readable
 * @param className - The raw class name from API (e.g., "071.German_shepherd_dog")
 * @returns Formatted breed name (e.g., "German Shepherd Dog")
 */
export function formatBreedName(className: string): string {
  // Remove numeric prefix and ID
  const nameWithoutPrefix = className.replace(/^\d+\./g, '');
  
  // Replace underscores with spaces
  const nameWithSpaces = nameWithoutPrefix.replace(/_/g, ' ');
  
  // Capitalize each word
  return nameWithSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validates if the uploaded file is a valid image
 * @param file - The file to validate
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return 'Please upload a valid image file (JPEG, PNG, or WebP)';
  }

  if (file.size > maxSize) {
    return 'Image size must be less than 10MB';
  }

  return null;
}
