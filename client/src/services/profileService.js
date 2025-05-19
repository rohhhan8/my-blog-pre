import axios from 'axios';
import api from './apiService';

// Base URL for API requests
// Don't include '/api' as it's already in the baseURL of apiService
const API_URL = '/profiles/';

// Debug the actual URL being used
console.log('Profile API URL:', API_URL);

/**
 * Get the current user's profile
 * @returns {Promise} Promise that resolves to the user's profile data
 */
export const getCurrentUserProfile = async () => {
  try {
    const response = await api.get(`${API_URL}me/`);

    // Check for auth warnings in the response
    if (response.data && response.data.auth_warning) {
      console.log('Auth warning in profile response:', response.data.auth_warning);
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching current user profile:', error);

    // If there's a 403 error (authentication failed), check if we have a saved profile
    if (error.response && error.response.status === 403) {
      try {
        const savedProfile = localStorage.getItem('pendingProfileUpdate');
        if (savedProfile) {
          console.log('Found saved profile data, using as fallback');
          const profileData = JSON.parse(savedProfile);

          // Add an auth warning to the profile data
          profileData.auth_warning = 'Using locally saved profile due to authentication error';

          return profileData;
        }
      } catch (localStorageError) {
        console.error('Error reading from localStorage:', localStorageError);
      }
    }

    throw error;
  }
};

/**
 * Get a user's public profile by username or ID
 * @param {string} usernameOrId - The username or ID of the user
 * @returns {Promise} Promise that resolves to the user's public profile data
 */
export const getUserProfile = async (usernameOrId) => {
  try {
    // Clean up the username - remove any special characters that might cause issues
    const cleanUsername = usernameOrId.trim().replace(/[^\w\s]/g, '');
    console.log(`Original username: "${usernameOrId}", Cleaned username: "${cleanUsername}"`);

    // Try multiple approaches to find the profile
    const approaches = [
      // 1. Try the public endpoint with the original username
      async () => {
        console.log(`Approach 1: Trying public endpoint with original username: ${API_URL}${usernameOrId}/public/`);
        const response = await api.get(`${API_URL}${usernameOrId}/public/`);
        console.log('Approach 1 succeeded');
        return response.data;
      },

      // 2. Try the public endpoint with the cleaned username
      async () => {
        if (cleanUsername !== usernameOrId) {
          console.log(`Approach 2: Trying public endpoint with cleaned username: ${API_URL}${cleanUsername}/public/`);
          const response = await api.get(`${API_URL}${cleanUsername}/public/`);
          console.log('Approach 2 succeeded');
          return response.data;
        }
        throw new Error('Skipping approach 2 - username already clean');
      },

      // 3. Try searching by the original username
      async () => {
        console.log(`Approach 3: Trying search by original username: ${API_URL}?username=${usernameOrId}`);
        const response = await api.get(`${API_URL}`, {
          params: { username: usernameOrId }
        });

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log('Approach 3 succeeded - found profile in array');
          return response.data[0];
        } else if (response.data && !Array.isArray(response.data)) {
          console.log('Approach 3 succeeded - found single profile');
          return response.data;
        }
        throw new Error('No profiles found in search results');
      },

      // 4. Try searching by the cleaned username
      async () => {
        if (cleanUsername !== usernameOrId) {
          console.log(`Approach 4: Trying search by cleaned username: ${API_URL}?username=${cleanUsername}`);
          const response = await api.get(`${API_URL}`, {
            params: { username: cleanUsername }
          });

          if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            console.log('Approach 4 succeeded - found profile in array');
            return response.data[0];
          } else if (response.data && !Array.isArray(response.data)) {
            console.log('Approach 4 succeeded - found single profile');
            return response.data;
          }
        }
        throw new Error('No profiles found in search results or username already clean');
      },

      // 5. Try to get user info from blogs
      async () => {
        console.log(`Approach 5: Trying to find user info from blogs by author name: ${usernameOrId}`);
        // This would require a new endpoint to search blogs by author name
        // For now, we'll just throw an error
        throw new Error('Blog search not implemented yet');
      }
    ];

    // Try each approach in sequence
    for (let i = 0; i < approaches.length; i++) {
      try {
        return await approaches[i]();
      } catch (err) {
        console.log(`Approach ${i+1} failed:`, err.message);
        // Continue to the next approach
      }
    }

    // If we get here, all approaches failed
    throw new Error(`Could not find profile for ${usernameOrId} after trying all approaches`);
  } catch (error) {
    console.error(`Error fetching profile for ${usernameOrId}:`, error);
    throw error;
  }
};

/**
 * Update the current user's profile
 * @param {Object} profileData - The profile data to update
 * @returns {Promise} Promise that resolves to the updated profile data
 */
export const updateProfile = async (profileData) => {
  try {
    console.log('Updating profile with data:', profileData);

    // Always use the 'me' endpoint which handles both creation and updates
    const response = await api.patch(`${API_URL}me/`, profileData);
    console.log('Profile update response:', response.data);

    // Check for auth warnings in the response
    if (response.data && response.data.auth_warning) {
      console.log('Auth warning in profile update response:', response.data.auth_warning);

      // Save the profile data to localStorage as a backup
      localStorage.setItem('pendingProfileUpdate', JSON.stringify(profileData));
      console.log('Saved profile data to localStorage due to auth warning');
    }

    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    console.error('Error details:', error.response?.data || error.message);

    // Save the profile data to localStorage on error
    localStorage.setItem('pendingProfileUpdate', JSON.stringify(profileData));
    console.log('Saved profile data to localStorage due to error');

    throw error;
  }
};

/**
 * Upload a profile avatar image
 * @param {File} file - The image file to upload
 * @returns {Promise} Promise that resolves to the uploaded image URL
 */
export const uploadProfileImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/api/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.url;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};
