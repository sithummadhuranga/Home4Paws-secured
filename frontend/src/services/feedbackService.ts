import { Feedback, CreateFeedbackDto } from '@/types'; // ✅ Add this import

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

// The access token lives in an httpOnly cookie, so every call below pairs this
// with credentials: 'include' instead of an Authorization header
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
});

export const getFeaturedFeedbacks = async (count: number = 6): Promise<Feedback[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/feedbacks/featured?count=${count}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch featured feedbacks');
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching featured feedbacks:', error);
    return [];
  }
};

export const getApprovedFeedbacks = async (): Promise<Feedback[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/feedbacks/approved`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch feedbacks');
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    return [];
  }
};

export const getMyFeedbacks = async (): Promise<Feedback[]> => {
  const response = await fetch(`${API_BASE_URL}/feedbacks/my`, {
    credentials: 'include',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Failed to fetch your feedbacks');
  return await response.json();
};

export const createFeedback = async (data: CreateFeedbackDto): Promise<Feedback> => {
  const response = await fetch(`${API_BASE_URL}/feedbacks`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to create feedback');
  return await response.json();
};

export const deleteFeedback = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/feedbacks/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to delete feedback');
};