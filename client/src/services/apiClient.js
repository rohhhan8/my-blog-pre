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
    });
  }

  /**
   * Set the authentication token for all future requests
   * @param {string} token - Firebase ID token
   */
  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
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
      
      // If the error is a 403 and we're trying to access liked blogs,
      // try to get the liked blogs from localStorage as a fallback
      if (error.response?.status === 403 && url.includes('/blogs/liked')) {
        console.log("Using localStorage fallback for liked blogs");
        try {
          const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
          const likedBlogIds = Object.keys(likedBlogs).filter(id => likedBlogs[id]);
          
          if (likedBlogIds.length > 0) {
            // Try to fetch each blog individually
            const allBlogs = await this.get('/blogs/');
            if (allBlogs.data && Array.isArray(allBlogs.data)) {
              const likedBlogsData = allBlogs.data.filter(blog => 
                likedBlogIds.includes(blog._id)
              );
              
              // Mark these blogs as liked
              likedBlogsData.forEach(blog => {
                blog.is_liked = true;
              });
              
              return { data: likedBlogsData };
            }
          }
          
          // If we can't get the blogs, return an empty array
          return { data: [] };
        } catch (fallbackError) {
          console.error("Fallback for liked blogs failed:", fallbackError);
          throw error; // Re-throw the original error
        }
      }
      
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
      return await this.client.delete(url, config);
    } catch (error) {
      console.error(`DELETE request to ${url} failed:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;
