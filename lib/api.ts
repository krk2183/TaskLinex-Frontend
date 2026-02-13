// lib/api.ts or utils/api.ts
// Universal API helper for making authenticated requests

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.113:8000';

interface RequestOptions {
  method: string;
  headers: HeadersInit;
  body?: string;
  cache?: RequestCache;
}

export const api = {
  /**
   * GET request
   * @param endpoint - API endpoint (e.g., '/users/123')
   * @param token - JWT token for authentication
   */
  get: async (endpoint: string, token?: string | null) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  },

  /**
   * POST request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param token - JWT token for authentication
   */
  post: async (endpoint: string, data: any, token?: string | null) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  },

  /**
   * PUT request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param token - JWT token for authentication
   */
  put: async (endpoint: string, data: any, token?: string | null) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  },

  /**
   * PATCH request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param token - JWT token for authentication
   */
  patch: async (endpoint: string, data: any, token?: string | null) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  },

  /**
   * DELETE request
   * @param endpoint - API endpoint
   * @param token - JWT token for authentication
   */
  delete: async (endpoint: string, token?: string | null) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Check if API is healthy
   */
  healthCheck: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};

// Helper to format error messages
export const getErrorMessage = (error: any): string => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};