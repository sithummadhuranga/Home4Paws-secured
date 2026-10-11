// src/services/apiService.ts

import { Product, ProductFormData, Category } from '@/types';

// --- THIS IS THE FIX ---
// Use the EXACT same logic as AuthContext.tsx to get the API URL.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

// The access token lives in an httpOnly cookie, so authenticated requests just
// need credentials: 'include' - there's no header for us to attach anymore.
const authHeaders = {
  'Content-Type': 'application/json',
};


// --- Product Service Functions ---

// This function can be called by anyone, so it doesn't need a token.
export const getProducts = async (): Promise<Product[]> => {
  try {
    console.log(`Fetching products from: ${API_BASE_URL}/products`);
    const response = await fetch(`${API_BASE_URL}/products`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      // Return empty array instead of throwing
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return empty array instead of throwing
    return [];
  }
};

export const getProductById = async (id: number): Promise<Product | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch product with id: ${id}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

// These functions are for ADMINS ONLY, so they REQUIRE the session cookie.
export const createProduct = async (data: ProductFormData): Promise<Product> => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders,
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create product');
  return response.json();
};

export const updateProduct = async (id: number, data: ProductFormData): Promise<Response> => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders,
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update product');
  return response;
};

export const deleteProduct = async (id: number): Promise<Response> => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders,
  });
  if (!response.ok) throw new Error('Failed to delete product');
  return response;
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    // If query is empty, return all products
    if (!query || !query.trim()) {
      console.log('Empty search query - fetching all products');
      return await getProducts();
    }
    
    const trimmedQuery = query.trim();
    const searchUrl = `${API_BASE_URL}/products/search?query=${encodeURIComponent(trimmedQuery)}`;
    
    console.log(`Searching products: ${searchUrl}`);
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Search API error: ${response.status} ${response.statusText}`, errorText);
      
      // If 400 error, try to parse the error message
      if (response.status === 400) {
        console.error('Bad Request - Query might be malformed:', trimmedQuery);
      }
      
      // Return empty array instead of throwing
      return [];
    }
    
    const data = await response.json();
    console.log(`Search found ${data?.length || 0} products`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
};


// --- Category Service Functions ---

// This can also be public.
export const getCategories = async (): Promise<Category[]> => {
  try {
    console.log(`Fetching categories from: ${API_BASE_URL}/categories`);
    const response = await fetch(`${API_BASE_URL}/categories`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      console.error(`Categories API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};