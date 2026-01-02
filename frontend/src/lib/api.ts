// Centralized API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: '/signup',
    LOGIN: '/login',
    LOGOUT: '/logout',
    TOKEN: '/token',
  },
  USERS: {
    GET_ALL: '/users',
    GET_ONE: (id: number) => `/users/${id}`,
  },
  PRODUCTS: {
    GET_ALL: '/products/all',
    GET_ONE: (id: number) => `/products/${id}`,
    CREATE: '/products',
    UPDATE: (id: number) => `/products/${id}`,
    DELETE: (id: number) => `/products/${id}`,
  },
};

export const buildUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};
