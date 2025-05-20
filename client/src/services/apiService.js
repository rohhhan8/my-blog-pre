import axios from 'axios';

// Create axios instance with default config
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const apiURL = `${baseURL}/api`;
console.log('API Service Base URL:', apiURL);

const api = axios.create({
  baseURL: apiURL,
  timeout: 8000, // Reduced timeout for faster response
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(async (config) => {
  try {
    // Log the request URL for debugging
    console.log('Making API request to:', config.url);

    // First try to get token from localStorage as a faster option
    let token = localStorage.getItem('authToken');
    let tokenRefreshed = false;

    // Import Firebase auth directly to get the current user
    const { auth } = await import('../firebase/firebaseConfig');
    const currentUser = auth.currentUser;

    if (currentUser) {
      try {
        // Force token refresh if we're making an authenticated request
        // This helps prevent token expiration issues
        if (!token || config.url.includes('/profile') || config.url.includes('/likes') || config.url.includes('/blogs/')) {
          token = await currentUser.getIdToken(true);
          localStorage.setItem('authToken', token);
          tokenRefreshed = true;
          console.log('Token refreshed for authenticated request');
        }

        config.headers.Authorization = `Bearer ${token}`;
        console.log('Added auth token to request', tokenRefreshed ? '(refreshed)' : '(from cache)');
      } catch (error) {
        console.error('Error getting auth token:', error);
        // If we can't refresh the token but have a cached one, use it as fallback
        if (!tokenRefreshed && token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('Using cached token as fallback');
        }
      }
    } else {
      console.log('No current user found for authentication');
      // Clear token from localStorage if user is not logged in
      if (token) {
        localStorage.removeItem('authToken');
        console.log('Cleared stored token since user is logged out');
      }
    }
  } catch (error) {
    console.error('Error in auth interceptor:', error);
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for debugging and error handling
api.interceptors.response.use(
  (response) => {
    console.log('API response from:', response.config.url, 'Status:', response.status);

    // Replace all instances of "Official Editz" with "Kuldeep" in the response data
    if (response.data) {
      // Function to recursively replace author names in an object
      const replaceAuthorNames = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        // If it's an array, process each item
        if (Array.isArray(obj)) {
          return obj.map(item => replaceAuthorNames(item));
        }

        // Process object properties
        const result = { ...obj };
        for (const key in result) {
          // If this is an author name field
          if ((key === 'author' || key === 'author_name') &&
              (result[key] === 'Official Editz' || result[key] === 'Official Editz')) {
            result[key] = 'Kuldeep';
            console.log(`Replaced author name in ${key} field`);
          }
          // If this is a nested object or array
          else if (typeof result[key] === 'object' && result[key] !== null) {
            result[key] = replaceAuthorNames(result[key]);
          }
        }
        return result;
      };

      // Apply the replacement to the response data
      response.data = replaceAuthorNames(response.data);
    }

    return response;
  },
  async (error) => {
    console.error('API error:', error.config?.url, 'Status:', error.response?.status, 'Message:', error.message);

    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('Authentication error detected. Attempting to refresh token...');

      try {
        // Try to refresh the token
        const { auth } = await import('../firebase/firebaseConfig');
        const currentUser = auth.currentUser;

        if (currentUser) {
          // Force token refresh
          const newToken = await currentUser.getIdToken(true);
          localStorage.setItem('authToken', newToken);
          console.log('Token refreshed after 401 error');

          // Retry the request with the new token
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Prevent infinite retry loops
          originalRequest._retry = true;

          return api(originalRequest);
        } else {
          console.log('No user found to refresh token after 401 error');
          // Clear any stored token
          localStorage.removeItem('authToken');
        }
      } catch (refreshError) {
        console.error('Failed to refresh token after 401:', refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Then use this api instance in your components


