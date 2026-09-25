import type {
  AdoptionListing,
  CreateAdoptionListingInput,
  UpdateAdoptionListingInput,
  AdoptionApplication,
  CreateAdoptionApplicationInput,
  AdoptionMessage,
  SendAdoptionMessageInput
} from '@/types/adoption'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api'

// The access token lives in an httpOnly cookie, so every call below pairs this
// with credentials: 'include' instead of an Authorization header
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
})

export const adoptionService = {
  // Public
  async list(params: { petType?: string; city?: string; page?: number; pageSize?: number }): Promise<{ total: number; items: AdoptionListing[] }>{
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString()
    const url = `${API_BASE_URL}/adoptions${queryString ? `?${queryString}` : ''}`
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) throw new Error('Failed to fetch listings')
    return res.json()
  },
  async get(id: number): Promise<AdoptionListing> {
    const res = await fetch(`${API_BASE_URL}/adoptions/${id}`, { headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) throw new Error('Failed to fetch listing')
    return res.json()
  },

  // User listings
  async myListings(): Promise<AdoptionListing[]> {
    const res = await fetch(`${API_BASE_URL}/adoptions/my-listings`, {
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch my listings')
    return res.json()
  },
  async create(input: CreateAdoptionListingInput): Promise<AdoptionListing> {
    const res = await fetch(`${API_BASE_URL}/adoptions`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error('Failed to create listing')
    return res.json()
  },
  async update(id: number, input: UpdateAdoptionListingInput): Promise<AdoptionListing> {
    const res = await fetch(`${API_BASE_URL}/adoptions/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error('Failed to update listing')
    return res.json()
  },
  async remove(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/adoptions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to delete listing')
  },
  async markAdopted(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/adoptions/${id}/adopted`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to mark as adopted')
  },

  // Applications
  async submitApplication(input: CreateAdoptionApplicationInput): Promise<AdoptionApplication> {
    const res = await fetch(`${API_BASE_URL}/adoption-applications`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error('Failed to submit application')
    return res.json()
  },
  async applicationsByListing(listingId: number): Promise<AdoptionApplication[]> {
    const res = await fetch(`${API_BASE_URL}/adoption-applications/listing/${listingId}`, {
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch applications')
    return res.json()
  },
  async myApplications(): Promise<AdoptionApplication[]> {
    const res = await fetch(`${API_BASE_URL}/adoption-applications/my-applications`, {
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch my applications')
    return res.json()
  },
  async updateApplicationStatus(id: number, status: 'Approved' | 'Rejected', ownerNotes?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/adoption-applications/${id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, ownerNotes })
    })
    if (!res.ok) throw new Error('Failed to update application status')
  },
  async withdrawApplication(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/adoption-applications/${id}/withdraw`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to withdraw application')
  },

  // Admin
  async pendingApprovals(): Promise<AdoptionListing[]> {
    const res = await fetch(`${API_BASE_URL}/adoptions/admin/pending`, {
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch pending listings')
    return res.json()
  },
  async approve(id: number, notes?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/adoptions/admin/${id}/approve`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes })
    })
    if (!res.ok) throw new Error('Failed to approve listing')
  },
  async reject(id: number, rejectionReason: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/adoptions/admin/${id}/reject`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rejectionReason })
    })
    if (!res.ok) throw new Error('Failed to reject listing')
  },

  // Admin - All listings
  async allListings(status?: string): Promise<AdoptionListing[]> {
    const url = status 
      ? `${API_BASE_URL}/adoptions/admin/all?status=${encodeURIComponent(status)}`
      : `${API_BASE_URL}/adoptions/admin/all`
    const res = await fetch(url, {
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch all listings')
    return res.json()
  },

  async adminDelete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/adoptions/admin/${id}/delete`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to delete listing')
  },

  // Messaging
  async sendMessage(input: SendAdoptionMessageInput): Promise<AdoptionMessage> {
    const res = await fetch(`${API_BASE_URL}/adoption-messages`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error('Failed to send message')
    return res.json()
  },

  async getConversation(listingId: number): Promise<AdoptionMessage[]> {
    const res = await fetch(`${API_BASE_URL}/adoption-messages/conversation/${listingId}`, {
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch conversation')
    return res.json()
  },

  async myMessages(): Promise<AdoptionMessage[]> {
    const res = await fetch(`${API_BASE_URL}/adoption-messages/my-messages`, {
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch messages')
    return res.json()
  },

  async markMessageRead(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/adoption-messages/${id}/mark-read`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to mark message as read')
  },

  async unreadCount(): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/adoption-messages/unread-count`, {
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch unread count')
    return res.json()
  },

  async unreadCountsByListing(): Promise<Record<number, number>> {
    const res = await fetch(`${API_BASE_URL}/adoption-messages/unread-counts-by-listing`, {
      credentials: 'include',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch unread counts')
    return res.json()
  }
}
