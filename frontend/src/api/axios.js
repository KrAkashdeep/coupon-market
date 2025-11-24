import axios from 'axios';

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to include JWT token in Authorization header
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');

    // If token exists, add it to Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    // Return successful response as-is
    return response;
  },
  (error) => {
    // Log error in development mode
    if (import.meta.env.DEV) {
      console.error('API Error:', error.response?.data || error.message);
    }

    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token and user from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect to login page
      window.location.href = '/login';
    }

    // Handle 403 Forbidden errors
    if (error.response && error.response.status === 403) {
      console.error('Access forbidden:', error.response.data?.error);
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error: Please check your internet connection');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
