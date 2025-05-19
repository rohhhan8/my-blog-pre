import axios from 'axios';

// Create axios instance with default config
const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/api';
console.log('API Service Base URL:', baseURL);

const api = axios.create({
  baseURL: baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(async (config) => {
  try {
    // Log the request URL for debugging
    console.log('Making API request to:', config.baseURL + config.url);

    // Import Firebase auth directly to get the current user
    const { auth } = await import('../firebase/firebaseConfig');
    const currentUser = auth.currentUser;

    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true);
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Added auth token to request');
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
    } else {
      console.log('No current user found for authentication');
    }
  } catch (error) {
    console.error('Error in auth interceptor:', error);
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API response from:', response.config.url, 'Status:', response.status);
    return response;
  },
  (error) => {
    console.error('API error:', error.config?.url, 'Status:', error.response?.status, 'Message:', error.message);
    return Promise.reject(error);
  }
);

export default api;

// Then use this api instance in your components


