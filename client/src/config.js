/**
 * Application configuration
 * 
 * This file handles environment-specific configuration
 * for both development and production environments.
 */

// API URL - defaults to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Firebase configuration (if applicable)
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Export configuration
export default {
  API_URL,
  FIREBASE_CONFIG,
  IS_PRODUCTION: import.meta.env.PROD
};
