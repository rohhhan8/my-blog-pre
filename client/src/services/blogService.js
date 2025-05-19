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
 * Delete a blog by ID
 * @param {string} id Blog ID
 * @param {string} idToken Firebase ID token
 * @param {Object} customHeaders Optional custom headers to include
 * @returns {Promise<Object>} Response object
 */
export const deleteBlog = async (id, idToken, customHeaders = {}) => {
  console.log(`Attempting to delete blog with ID: ${id}`);

  // Get current user info from Firebase token
  let userInfo = {};
  try {
    // Try to extract user info from token
    const tokenParts = idToken.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      userInfo = {
        'X-User-ID': payload.user_id || payload.sub || '',
        'X-User-Email': payload.email || '',
        'X-User-Name': payload.name || ''
      };
      console.log("Extracted user info from token:", userInfo);

      // Store user info in localStorage for future requests
      localStorage.setItem('userInfo', JSON.stringify({
        uid: payload.user_id || payload.sub || '',
        email: payload.email || '',
        displayName: payload.name || ''
      }));
    }
  } catch (e) {
    console.error("Error extracting user info from token:", e);
  }

  // Combine default headers with custom headers
  const headers = {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
    ...userInfo,
    ...customHeaders
  };

  // Store token in localStorage and set in apiClient
  localStorage.setItem('authToken', idToken);

  // Extract uid from token payload for direct use in headers
  let uid = '';
  try {
    const tokenParts = idToken.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      uid = payload.user_id || payload.sub || '';

      // If uid is still missing, try to extract from other fields
      if (!uid && payload.firebase && payload.firebase.identities && payload.firebase.identities.email) {
        uid = payload.firebase.identities.email[0];
        console.log("Using email as uid fallback:", uid);
      }

      // If still no uid but we have email, use that
      if (!uid && payload.email) {
        uid = payload.email;
        console.log("Using email as uid fallback:", uid);
      }

      // Store uid separately for easier access
      localStorage.setItem('userUid', uid);

      // Log the full token payload for debugging
      console.log("Token payload for debugging:", payload);
    }
  } catch (e) {
    console.error("Error extracting uid from token:", e);
  }

  // Add uid to headers in multiple formats to ensure server can find it
  headers['X-User-UID'] = uid;
  headers['uid'] = uid;
  userInfo['uid'] = uid;

  apiClient.setAuthToken(idToken, {
    uid: uid,
    email: userInfo['X-User-Email'],
    displayName: userInfo['X-User-Name']
  });

  // Try using apiClient first (which has built-in retry logic)
  try {
    console.log(`Making DELETE request to /blogs/${id}/ using apiClient`);
    console.log("With headers:", headers);

    const response = await apiClient.delete(`/blogs/${id}/`, { headers });
    console.log("Delete successful with apiClient:", response);

    // Update localStorage to remove this blog from liked blogs if it exists
    try {
      const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
      if (likedBlogs[id]) {
        delete likedBlogs[id];
        localStorage.setItem('likedBlogs', JSON.stringify(likedBlogs));
        console.log(`Removed blog ${id} from liked blogs in localStorage`);
      }
    } catch (storageErr) {
      console.error("Error updating localStorage:", storageErr);
    }

    // Update sessionStorage to remove this blog from cached blogs
    try {
      const cachedBlogs = JSON.parse(sessionStorage.getItem('cachedBlogs') || '[]');
      const updatedBlogs = cachedBlogs.filter(blog => blog._id !== id);
      sessionStorage.setItem('cachedBlogs', JSON.stringify(updatedBlogs));
      console.log(`Removed blog ${id} from cached blogs in sessionStorage`);
    } catch (storageErr) {
      console.error("Error updating sessionStorage:", storageErr);
    }

    return response;
  } catch (apiClientError) {
    console.error("Delete with apiClient failed:", apiClientError);

    // Fall back to direct axios calls
    try {
      // First try with trailing slash
      console.log(`Making DELETE request to /api/blogs/${id}/`);
      const response = await axios.delete(`/api/blogs/${id}/`, { headers });
      console.log("Delete successful with trailing slash:", response);

      // Update sessionStorage to remove this blog from cached blogs
      try {
        const cachedBlogs = JSON.parse(sessionStorage.getItem('cachedBlogs') || '[]');
        const updatedBlogs = cachedBlogs.filter(blog => blog._id !== id);
        sessionStorage.setItem('cachedBlogs', JSON.stringify(updatedBlogs));
      } catch (storageErr) {
        console.error("Error updating sessionStorage:", storageErr);
      }

      return response;
    } catch (error) {
      console.log("Delete with trailing slash failed:", error);

      // If that fails, try without trailing slash
      try {
        console.log(`Making DELETE request to /api/blogs/${id}`);
        const response = await axios.delete(`/api/blogs/${id}`, { headers });
        console.log("Delete successful without trailing slash:", response);

        // Update sessionStorage to remove this blog from cached blogs
        try {
          const cachedBlogs = JSON.parse(sessionStorage.getItem('cachedBlogs') || '[]');
          const updatedBlogs = cachedBlogs.filter(blog => blog._id !== id);
          sessionStorage.setItem('cachedBlogs', JSON.stringify(updatedBlogs));
        } catch (storageErr) {
          console.error("Error updating sessionStorage:", storageErr);
        }

        return response;
      } catch (secondError) {
        console.log("Delete without trailing slash failed:", secondError);

        // If both fail, try with a different approach using fetch API
        console.log("Trying with fetch API as last resort");

        // Add a timestamp to avoid caching issues
        const timestamp = new Date().getTime();
        const url = `/api/blogs/${id}/?_=${timestamp}`;

        const fetchResponse = await fetch(url, {
          method: 'DELETE',
          headers: headers
        });

        if (!fetchResponse.ok) {
          throw new Error(`Fetch delete failed with status ${fetchResponse.status}`);
        }

        console.log("Delete successful with fetch API:", fetchResponse);

        // Update sessionStorage to remove this blog from cached blogs
        try {
          const cachedBlogs = JSON.parse(sessionStorage.getItem('cachedBlogs') || '[]');
          const updatedBlogs = cachedBlogs.filter(blog => blog._id !== id);
          sessionStorage.setItem('cachedBlogs', JSON.stringify(updatedBlogs));
        } catch (storageErr) {
          console.error("Error updating sessionStorage:", storageErr);
        }

        return { status: fetchResponse.status };
      }
    }
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
