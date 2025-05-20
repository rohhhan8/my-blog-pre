import axios from 'axios';

/**
 * Custom API client with authentication handling
 */
class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      // Reduced timeout for faster response
      timeout: 8000,
    });

    // Add request interceptor to include auth token from localStorage
    this.client.interceptors.request.use(
      async (config) => {
        try {
          // Get token from localStorage if available
          const token = localStorage.getItem('authToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('Added auth token from localStorage to request');

            // Extract uid directly from token for Firebase auth
            try {
              const tokenParts = token.split('.');
              if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                const uid = payload.user_id || payload.sub || '';

                // Add uid directly to headers for Firebase auth
                if (uid) {
                  config.headers['uid'] = uid;
                  config.headers['firebase-uid'] = uid;
                  config.headers['X-Firebase-UID'] = uid;
                }
              }
            } catch (tokenError) {
              console.error('Error extracting uid from token:', tokenError);
            }
          }

          // Get uid from localStorage as fallback
          const userUid = localStorage.getItem('userUid');
          if (userUid) {
            config.headers['uid'] = userUid;
            config.headers['firebase-uid'] = userUid;
            config.headers['X-Firebase-UID'] = userUid;
          }

          // Add user info headers if available
          const userInfo = localStorage.getItem('userInfo');
          if (userInfo) {
            try {
              const parsedUserInfo = JSON.parse(userInfo);
              if (parsedUserInfo.uid) {
                config.headers['X-User-ID'] = parsedUserInfo.uid;
                config.headers['uid'] = parsedUserInfo.uid;
                config.headers['firebase-uid'] = parsedUserInfo.uid;
                config.headers['X-Firebase-UID'] = parsedUserInfo.uid;
              }
              if (parsedUserInfo.email) {
                config.headers['X-User-Email'] = parsedUserInfo.email;
              }
              if (parsedUserInfo.displayName) {
                config.headers['X-User-Name'] = parsedUserInfo.displayName;
              }
            } catch (e) {
              console.error('Error parsing user info from localStorage:', e);
            }
          }
        } catch (error) {
          console.error('Error in request interceptor:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => {
        // Replace author names with the current user's name in response data
        if (response.data) {
          const replaceAuthorNames = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;

            // Get current user's display name from localStorage
            let currentUserName = '';
            try {
              const userInfo = localStorage.getItem('userInfo');
              if (userInfo) {
                const parsedUserInfo = JSON.parse(userInfo);
                if (parsedUserInfo.displayName) {
                  currentUserName = parsedUserInfo.displayName;
                }
              }
            } catch (e) {
              console.error('Error getting current user name:', e);
            }

            if (Array.isArray(obj)) {
              return obj.map(item => replaceAuthorNames(item));
            }

            const result = { ...obj };
            for (const key in result) {
              if ((key === 'author' || key === 'author_name')) {
                // Check if this is "Official Editz" or "Kuldeep"
                if (result[key] === 'Official Editz' || result[key] === 'Kuldeep') {
                  // If we have the current user's name, use it
                  if (currentUserName) {
                    result[key] = currentUserName;
                  } else {
                    // Otherwise, use "Kuldeep" as fallback
                    result[key] = 'Kuldeep';
                  }
                }

                // Check if we have a name mapping for this author
                try {
                  const nameMapping = localStorage.getItem(`nameMapping_${result[key]}`);
                  if (nameMapping) {
                    result[key] = nameMapping;
                  }
                } catch (e) {
                  console.error('Error checking name mapping:', e);
                }
              } else if (typeof result[key] === 'object' && result[key] !== null) {
                result[key] = replaceAuthorNames(result[key]);
              }
            }
            return result;
          };

          response.data = replaceAuthorNames(response.data);
        }

        return response;
      },
      error => {
        console.error('API Error:', error);

        // Handle authentication errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('Authentication error detected');

          // Clear token if it's invalid
          if (localStorage.getItem('authToken')) {
            console.log('Clearing invalid auth token');
            localStorage.removeItem('authToken');
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Set the authentication token for all future requests
   * @param {string} token - Firebase ID token
   * @param {Object} userInfo - User information to include in headers
   */
  setAuthToken(token, userInfo = null) {
    if (token) {
      // Set token in headers
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Store token in localStorage for persistence
      localStorage.setItem('authToken', token);
      console.log('Auth token stored in localStorage');

      // If user info is provided, store it as well
      if (userInfo) {
        try {
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
          console.log('User info stored in localStorage');
        } catch (e) {
          console.error('Error storing user info in localStorage:', e);
        }
      }
    } else {
      // Remove token from headers
      delete this.client.defaults.headers.common['Authorization'];

      // Remove token from localStorage
      localStorage.removeItem('authToken');
      console.log('Auth token removed from localStorage');
    }
  }

  /**
   * Make a GET request
   * @param {string} url - API endpoint
   * @param {Object} config - Axios config
   * @returns {Promise} - Axios response
   */
  async get(url, config = {}) {
    try {
      return await this.client.get(url, config);
    } catch (error) {
      console.error(`GET request to ${url} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request
   * @param {string} url - API endpoint
   * @param {Object} data - Request body
   * @param {Object} config - Axios config
   * @returns {Promise} - Axios response
   */
  async post(url, data = {}, config = {}) {
    try {
      return await this.client.post(url, data, config);
    } catch (error) {
      console.error(`POST request to ${url} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a PUT request
   * @param {string} url - API endpoint
   * @param {Object} data - Request body
   * @param {Object} config - Axios config
   * @returns {Promise} - Axios response
   */
  async put(url, data = {}, config = {}) {
    try {
      return await this.client.put(url, data, config);
    } catch (error) {
      console.error(`PUT request to ${url} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a DELETE request
   * @param {string} url - API endpoint
   * @param {Object} config - Axios config
   * @returns {Promise} - Axios response
   */
  async delete(url, config = {}) {
    try {
      // First try with the provided URL
      return await this.client.delete(url, config);
    } catch (error) {
      console.error(`DELETE request to ${url} failed:`, error);

      // If the URL doesn't end with a slash, try adding one
      if (!url.endsWith('/')) {
        try {
          console.log(`Retrying DELETE with trailing slash: ${url}/`);
          return await this.client.delete(`${url}/`, config);
        } catch (retryError) {
          console.error(`DELETE retry to ${url}/ failed:`, retryError);
        }
      }

      // If the URL ends with a slash, try removing it
      if (url.endsWith('/')) {
        try {
          const urlWithoutSlash = url.slice(0, -1);
          console.log(`Retrying DELETE without trailing slash: ${urlWithoutSlash}`);
          return await this.client.delete(urlWithoutSlash, config);
        } catch (retryError) {
          console.error(`DELETE retry to ${url.slice(0, -1)} failed:`, retryError);
        }
      }

      // If all attempts fail, throw the original error
      throw error;
    }
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;
