import axios from 'axios';
import apiClient from './apiClient';

/**
 * Get all blogs
 * @returns {Promise<Array>} Array of blogs
 */
export const getAllBlogs = async () => {
  try {
    // Try to get cached blogs first for immediate display
    const cachedBlogs = sessionStorage.getItem('cachedBlogs');
    const cacheTimestamp = sessionStorage.getItem('blogsCacheTimestamp');
    const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
    const cacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes cache validity

    if (cachedBlogs && cacheValid) {
      try {
        const parsedBlogs = JSON.parse(cachedBlogs);
        if (Array.isArray(parsedBlogs) && parsedBlogs.length > 0) {
          console.log("Using cached blogs from sessionStorage in getAllBlogs");

          // Fetch fresh data in the background
          setTimeout(() => {
            refreshBlogsInBackground();
          }, 100);

          return parsedBlogs;
        }
      } catch (cacheError) {
        console.error("Error parsing cached blogs:", cacheError);
      }
    }

    // If no valid cache, try apiClient
    const response = await apiClient.get('/blogs/');

    // Cache the successful response
    try {
      sessionStorage.setItem('cachedBlogs', JSON.stringify(response.data));
      sessionStorage.setItem('blogsCacheTimestamp', Date.now().toString());
      console.log("Cached blogs in sessionStorage");
    } catch (storageError) {
      console.error("Error caching blogs:", storageError);
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching all blogs with apiClient:", error);

    // Try to get cached blogs as fallback
    try {
      const cachedBlogs = sessionStorage.getItem('cachedBlogs');
      if (cachedBlogs) {
        const parsedBlogs = JSON.parse(cachedBlogs);
        if (Array.isArray(parsedBlogs) && parsedBlogs.length > 0) {
          console.log("Using cached blogs as fallback after API error");
          return parsedBlogs;
        }
      }
    } catch (cacheError) {
      console.error("Error using cached blogs as fallback:", cacheError);
    }

    // Fallback to direct axios call if apiClient fails and no cache
    try {
      console.log("Trying direct axios call as fallback");
      const fallbackResponse = await axios.get('/api/blogs/');

      // Cache this response too
      try {
        sessionStorage.setItem('cachedBlogs', JSON.stringify(fallbackResponse.data));
        sessionStorage.setItem('blogsCacheTimestamp', Date.now().toString());
      } catch (storageError) {
        console.error("Error caching blogs from fallback:", storageError);
      }

      return fallbackResponse.data;
    } catch (fallbackError) {
      console.error("All attempts to fetch blogs failed:", fallbackError);
      throw fallbackError; // Re-throw to let the caller handle it
    }
  }
};

/**
 * Refresh blogs in the background without affecting the UI
 * @private
 */
const refreshBlogsInBackground = async () => {
  try {
    console.log("Refreshing blogs in background");

    // Try apiClient first
    try {
      const response = await apiClient.get('/blogs/');

      // Update cache with fresh data
      try {
        sessionStorage.setItem('cachedBlogs', JSON.stringify(response.data));
        sessionStorage.setItem('blogsCacheTimestamp', Date.now().toString());
        console.log("Updated cached blogs in background");
      } catch (storageError) {
        console.error("Error updating cached blogs:", storageError);
      }

      return;
    } catch (apiError) {
      console.error("Background refresh with apiClient failed:", apiError);
    }

    // Fallback to direct axios
    const fallbackResponse = await axios.get('/api/blogs/');

    // Update cache with fallback data
    try {
      sessionStorage.setItem('cachedBlogs', JSON.stringify(fallbackResponse.data));
      sessionStorage.setItem('blogsCacheTimestamp', Date.now().toString());
      console.log("Updated cached blogs in background with fallback");
    } catch (storageError) {
      console.error("Error updating cached blogs with fallback:", storageError);
    }
  } catch (error) {
    console.error("Background refresh of blogs failed:", error);
    // Don't throw - this is a background operation
  }
};

/**
 * Get a single blog by ID
 * @param {string} id Blog ID
 * @returns {Promise<Object>} Blog object
 */
export const getBlogById = async (id) => {
  try {
    // Use apiClient which handles trailing slash issues
    const response = await apiClient.get(`/blogs/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching blog ${id}:`, error);

    // Fallback to direct axios call if apiClient fails
    try {
      // Try with trailing slash first
      const response = await axios.get(`/api/blogs/${id}/`);
      return response.data;
    } catch (axiosError) {
      if (axiosError.response && axiosError.response.status === 404) {
        // If 404, try without trailing slash
        const response = await axios.get(`/api/blogs/${id}`);
        return response.data;
      }
      throw axiosError;
    }
  }
};

/**
 * Delete a blog by ID - Simplified and optimized version
 * @param {string} id Blog ID
 * @param {string} idToken Firebase ID token
 * @param {Object} customHeaders Optional custom headers to include
 * @returns {Promise<Object>} Response object
 */
export const deleteBlog = async (id, idToken, customHeaders = {}) => {
  console.log(`🗑️ Starting blog deletion for ID: ${id}`);

  if (!id || !idToken) {
    throw new Error('Blog ID and authentication token are required');
  }

  // Simple, clean headers - only what's necessary
  const headers = {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
    ...customHeaders
  };

  console.log(`📤 Making DELETE request with minimal headers`);

  // Single, direct API call - no complex retry logic
  try {
    const response = await fetch(`/api/blogs/${id}/`, {
      method: 'DELETE',
      headers: headers,
      credentials: 'include'
    });

    console.log(`📥 Response status: ${response.status}`);

    if (response.ok) {
      console.log(`✅ Blog ${id} deleted successfully`);

      // Clean up local storage
      try {
        const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
        delete likedBlogs[id];
        localStorage.setItem('likedBlogs', JSON.stringify(likedBlogs));

        const cachedBlogs = JSON.parse(sessionStorage.getItem('cachedBlogs') || '[]');
        const updatedBlogs = cachedBlogs.filter(blog => blog._id !== id);
        sessionStorage.setItem('cachedBlogs', JSON.stringify(updatedBlogs));
      } catch (storageErr) {
        console.warn('Storage cleanup failed:', storageErr);
      }

      return { status: response.status, success: true };
    } else {
      const errorText = await response.text();
      console.error(`❌ Delete failed: ${response.status} - ${errorText}`);
      throw new Error(`Delete failed with status ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error(`💥 Delete error:`, error);
    throw new Error(`Failed to delete blog: ${error.message}`);
  }
};

/**
 * Like or unlike a blog
 * @param {string} id Blog ID
 * @param {string} idToken Firebase ID token
 * @returns {Promise<Object>} Response with like status and count
 */
export const likeBlog = async (id, idToken) => {
  // Set auth token in apiClient
  apiClient.setAuthToken(idToken);

  try {
    // Use apiClient for the request
    const response = await apiClient.post(`/blogs/${id}/like/`, {});

    // Update localStorage with the like status
    try {
      const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
      if (response.data.status === 'liked') {
        likedBlogs[id] = true;
      } else {
        delete likedBlogs[id];
      }
      localStorage.setItem('likedBlogs', JSON.stringify(likedBlogs));
      console.log(`Updated like status for blog ${id} in localStorage:`, response.data.status);
    } catch (storageErr) {
      console.error("Error updating localStorage:", storageErr);
    }

    return response.data;
  } catch (error) {
    console.error("Error liking blog with apiClient:", error);

    // Fallback to direct axios call
    try {
      const response = await axios.post(
        `/api/blogs/${id}/like/`,
        {},
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      // Still update localStorage even with fallback
      try {
        const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
        if (response.data.status === 'liked') {
          likedBlogs[id] = true;
        } else {
          delete likedBlogs[id];
        }
        localStorage.setItem('likedBlogs', JSON.stringify(likedBlogs));
      } catch (storageErr) {
        console.error("Error updating localStorage:", storageErr);
      }

      return response.data;
    } catch (fallbackError) {
      console.error("Error liking blog with fallback:", fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Get blogs liked by the current user
 * @param {string} idToken Firebase ID token
 * @returns {Promise<Array>} Array of liked blogs
 */
export const getLikedBlogs = async (idToken) => {
  console.log("Fetching liked blogs with token:", idToken.substring(0, 10) + "...");

  // Set auth token in apiClient
  apiClient.setAuthToken(idToken);

  try {
    // Use apiClient for the request
    const response = await apiClient.get('/blogs/liked/', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log("Liked blogs fetched successfully with apiClient:", response.data);

    // Process the response data
    const likedBlogs = Array.isArray(response.data) ? response.data : [];

    // Update localStorage with the liked blogs for offline access
    try {
      const likedBlogsMap = {};
      likedBlogs.forEach(blog => {
        likedBlogsMap[blog._id] = true;
      });
      localStorage.setItem('likedBlogs', JSON.stringify(likedBlogsMap));
      console.log("Updated liked blogs in localStorage");
    } catch (storageErr) {
      console.error("Error updating localStorage:", storageErr);
    }

    return likedBlogs;
  } catch (error) {
    console.error("Error fetching liked blogs with apiClient:", error);

    // Try to get liked blogs from localStorage as fallback
    try {
      console.log("Trying to get liked blogs from localStorage");
      const likedBlogsMap = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
      const likedBlogIds = Object.keys(likedBlogsMap).filter(id => likedBlogsMap[id]);

      if (likedBlogIds.length > 0) {
        console.log("Found liked blog IDs in localStorage:", likedBlogIds);

        // Try to fetch all blogs and filter by liked IDs
        try {
          const allBlogsResponse = await getAllBlogs();
          if (Array.isArray(allBlogsResponse)) {
            const likedBlogs = allBlogsResponse.filter(blog => likedBlogIds.includes(blog._id));

            // Mark these blogs as liked
            likedBlogs.forEach(blog => {
              blog.is_liked = true;
            });

            console.log("Reconstructed liked blogs from localStorage:", likedBlogs);
            return likedBlogs;
          }
        } catch (fetchError) {
          console.error("Error fetching all blogs for liked blogs fallback:", fetchError);
        }
      }
    } catch (storageErr) {
      console.error("Error reading from localStorage:", storageErr);
    }

    // If localStorage fallback fails, try direct API calls
    try {
      // First try with trailing slash
      const response = await axios.get('/api/blogs/liked/', {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log("Liked blogs fetched successfully with direct axios:", response.data);
      return response.data;
    } catch (directError) {
      console.error("Error fetching liked blogs with direct axios:", directError);

      // If that fails, try without trailing slash
      try {
        const response = await axios.get('/api/blogs/liked', {
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        console.log("Liked blogs fetched successfully without trailing slash:", response.data);
        return response.data;
      } catch (secondError) {
        console.error("All attempts to fetch liked blogs failed");
        return []; // Return empty array instead of throwing
      }
    }
  }
};

/**
 * Track a view for a blog
 * @param {string} id Blog ID
 * @returns {Promise<Object>} Response with updated view count
 */
export const trackBlogView = async (id) => {
  try {
    // Use apiClient for the request
    const response = await apiClient.get(`/blogs/${id}/view/`);
    return response.data;
  } catch (error) {
    console.error("Error tracking blog view with apiClient:", error);

    // Fallback to direct axios call
    try {
      const response = await axios.get(`/api/blogs/${id}/view/`);
      return response.data;
    } catch (fallbackError) {
      console.error("Error tracking blog view with fallback:", fallbackError);
      // Return a default response to avoid breaking the UI
      return { views: 0, message: 'Error tracking view' };
    }
  }
};
