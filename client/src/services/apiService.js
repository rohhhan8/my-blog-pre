import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(async (config) => {
  // Get current user from Firebase or localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  if (currentUser?.getIdToken) {
    try {
      const token = await currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;

// Then use this api instance in your components


