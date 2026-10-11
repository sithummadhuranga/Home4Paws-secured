import { SavedAddress, CreateUpdateAddressDto } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

// The access token lives in an httpOnly cookie, so every call below pairs this
// with credentials: 'include' instead of an Authorization header
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
});

export const getUserAddresses = async (): Promise<SavedAddress[]> => {
  try {
    console.log('Fetching user addresses...');
    const response = await fetch(`${API_BASE_URL}/useraddresses`, {
      credentials: 'include',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Unauthorized - session expired');
        throw new Error('Please log in again');
      }
      if (response.status === 404) {
        console.log('No addresses found for user');
        return [];
      }
      console.error(`Failed to fetch addresses: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch addresses: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully loaded addresses:', data.length);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching addresses:', error);
    if (error instanceof Error && error.message === 'Please log in again') {
      throw error;
    }
    return [];
  }
};

export const getDefaultAddress = async (): Promise<SavedAddress | null> => {
  try {
    console.log('Fetching default address...');
    const response = await fetch(`${API_BASE_URL}/useraddresses/default`, {
      credentials: 'include',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Unauthorized - session expired');
        throw new Error('Please log in again');
      }
      if (response.status === 404) {
        console.log('No default address found');
        return null;
      }
      console.error(`Failed to fetch default address: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch default address: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully loaded default address');
    return data;
  } catch (error) {
    console.error('Error fetching default address:', error);
    if (error instanceof Error && error.message === 'Please log in again') {
      throw error;
    }
    return null;
  }
};

export const createAddress = async (data: CreateUpdateAddressDto): Promise<SavedAddress> => {
  const response = await fetch(`${API_BASE_URL}/useraddresses`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Failed to create address:', response.status, errorData);
    throw new Error('Failed to create address');
  }
  return await response.json();
};

export const updateAddress = async (id: number, data: CreateUpdateAddressDto): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/useraddresses/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to update address');
};

export const deleteAddress = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/useraddresses/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to delete address');
};

export const setDefaultAddress = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/useraddresses/${id}/set-default`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to set default address');
};
