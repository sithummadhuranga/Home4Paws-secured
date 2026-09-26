const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

// The access token lives in an httpOnly cookie, so every call below pairs this
// with credentials: 'include' instead of an Authorization header
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
});

// Dashboard Stats
export const getDashboardStats = async () => {
  const response = await fetch(`${API_BASE_URL}/orders/admin/dashboard-stats`, {
    credentials: 'include',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }

  return await response.json();
};

// Orders Management
export const getAllOrders = async (
  page: number = 1,
  pageSize: number = 20,
  status?: string,
  search?: string,
  startDate?: string,
  endDate?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (status && status !== 'All') params.append('status', status);
  if (search) params.append('search', search);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await fetch(`${API_BASE_URL}/orders/admin/all?${params}`, {
    credentials: 'include',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }

  return await response.json();
};

export const updateOrderStatus = async (
  orderId: number,
  status: string
) => {
  const response = await fetch(`${API_BASE_URL}/orders/admin/${orderId}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update order status');
  }

  return await response.json();
};

export const deleteOrder = async (orderId: number) => {
  const response = await fetch(`${API_BASE_URL}/orders/admin/${orderId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete order');
  }
};

// Users Management
export const getAllUsers = async () => {
  // ---- CODE BEFORE FIX (V02) ----
  // const response = await fetch(`${API_BASE_URL}/dev/users`, {
  // ---- END CODE BEFORE FIX (V02) ----
  // ---- FIXED (V02): the public dev endpoint was removed; use the Admin-only endpoint ----
  // (auth now travels in the httpOnly cookie from V09, hence credentials: 'include')
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    credentials: 'include',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return await response.json();
};

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface CreateUpdateCategoryDto {
  name: string;
  description?: string | null;
}

// Get all categories (public)
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

// Get single category
export const getCategoryById = async (id: number): Promise<Category | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch category');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
};

// Create category (Admin only)
export const createCategory = async (
  data: CreateUpdateCategoryDto
): Promise<Category> => {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create category');
  }

  return await response.json();
};

// Update category (Admin only)
export const updateCategory = async (
  id: number,
  data: CreateUpdateCategoryDto
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update category');
  }
};

// Delete category (Admin only)
export const deleteCategory = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to delete category');
  }
};
