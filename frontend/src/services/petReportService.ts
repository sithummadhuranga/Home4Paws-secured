import { PetFinderDto, UserPetReportDto, AdminPetReportDto, UpdateReportStatusRequest } from '@/types/petReport'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185'

/**
 * Service for managing pet reports
 */

/**
 * Fetch active pet reports for public Pet Finder page
 */
export async function getActivePetReports(): Promise<PetFinderDto[]> {
  const response = await fetch(`${API_URL}/api/reports/active`)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch current user's pet reports
 */
export async function getUserPetReports(): Promise<UserPetReportDto[]> {
  const response = await fetch(`${API_URL}/api/reports/user/my-reports`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please login again')
    }
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * Admin: Fetch all pet reports for admin dashboard
 */
export async function getAllPetReportsForAdmin(): Promise<AdminPetReportDto[]> {
  const response = await fetch(`${API_URL}/api/reports/admin/all`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please login again')
    }
    if (response.status === 403) {
      throw new Error('Forbidden - admin access required')
    }
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * Admin: Update report status
 */
export async function updateReportStatus(
  reportId: string,
  statusUpdate: UpdateReportStatusRequest
): Promise<void> {
  const response = await fetch(`${API_URL}/api/reports/${reportId}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statusUpdate),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please login again')
    }
    if (response.status === 403) {
      throw new Error('Forbidden - admin access required')
    }
    if (response.status === 404) {
      throw new Error('Report not found')
    }
    throw new Error(`HTTP error! status: ${response.status}`)
  }
}

/**
 * Submit a new pet report (Lost or Found)
 */
export async function submitPetReport(formData: FormData): Promise<{ id: string }> {
  const response = await fetch(`${API_URL}/api/reports`, {
    method: 'POST',
    body: formData, // FormData automatically sets correct Content-Type
  })

  if (!response.ok) {
    if (response.status === 400) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Invalid form data')
    }
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  return { id: result.id }
}