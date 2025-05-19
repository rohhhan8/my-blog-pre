import axios from 'axios';
import apiClient from './apiClient';

/**
 * Get all blogs
 * @returns {Promise<Array>} Array of blogs
 */
export const getAllBlogs = async () => {
  const response = await apiClient.get('/blogs/');
  return response.data;
};

/**
 * Get a single blog by ID
 * @param {string} id Blog ID
 * @returns {Promise<Object>} Blog object
 */
export const getBlogById = async (id) => {
  try {
    // Try with trailing slash first
    const response = await apiClient.get(`/blogs/${id}/`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // If 404, try without trailing slash
      const response = await apiClient.get(`/blogs/${id}`);
      return response.data;
    }
    throw error;
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

  // Try multiple approaches to delete the blog
  try {
    // First try with trailing slash
    console.log(`Making DELETE request to /api/blogs/${id}/`);
    console.log("With headers:", headers);
    const response = await axios.delete(`/api/blogs/${id}/`, { headers });
    console.log("Delete successful with trailing slash:", response);
    return response;
  } catch (error) {
    console.log("Delete with trailing slash failed:", error);

    // If that fails, try without trailing slash
    try {
      console.log(`Making DELETE request to /api/blogs/${id}`);
      const response = await axios.delete(`/api/blogs/${id}`, { headers });
      console.log("Delete successful without trailing slash:", response);
      return response;
    } catch (secondError) {
      console.log("Delete without trailing slash failed:", secondError);

      // If both fail, try with a different approach using fetch API
      console.log("Trying with fetch API as last resort");
      const fetchResponse = await fetch(`/api/blogs/${id}/`, {
        method: 'DELETE',
        headers: headers
      });

      if (!fetchResponse.ok) {
        throw new Error(`Fetch delete failed with status ${fetchResponse.status}`);
      }

      console.log("Delete successful with fetch API:", fetchResponse);
      return { status: fetchResponse.status };
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
  // Set the auth token for the API client
  apiClient.setAuthToken(idToken);

  try {
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
    } catch (storageErr) {
      console.error("Error updating localStorage:", storageErr);
    }

    return response.data;
  } catch (error) {
    console.error("Error liking blog:", error);
    throw error;
  }
};

/**
 * Get blogs liked by the current user
 * @param {string} idToken Firebase ID token
 * @returns {Promise<Array>} Array of liked blogs
 */
export const getLikedBlogs = async (idToken) => {
  console.log("Fetching liked blogs with token:", idToken.substring(0, 10) + "...");

  // Set the auth token for the API client
  apiClient.setAuthToken(idToken);

  try {
    // Use our API client which has built-in fallback for liked blogs
    const response = await apiClient.get('/blogs/liked/');
    console.log("Liked blogs fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching liked blogs:", error);

    // Fallback to localStorage if API fails
    try {
      console.log("Using localStorage fallback for liked blogs");
      const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
      const likedBlogIds = Object.keys(likedBlogs).filter(id => likedBlogs[id]);

      if (likedBlogIds.length > 0) {
        // Try to fetch each blog individually
        const allBlogsResponse = await apiClient.get('/blogs/');
        if (allBlogsResponse.data && Array.isArray(allBlogsResponse.data)) {
          const likedBlogsData = allBlogsResponse.data.filter(blog =>
            likedBlogIds.includes(blog._id)
          );

          // Mark these blogs as liked
          likedBlogsData.forEach(blog => {
            blog.is_liked = true;
          });

          return likedBlogsData;
        }
      }

      // If we can't get the blogs, return an empty array
      return [];
    } catch (fallbackError) {
      console.error("Fallback for liked blogs failed:", fallbackError);
      return []; // Return empty array instead of throwing
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
    const response = await apiClient.get(`/blogs/${id}/view/`);
    return response.data;
  } catch (error) {
    console.error("Error tracking blog view:", error);
    // Return a default response to avoid breaking the UI
    return { views: 0, message: 'Error tracking view' };
  }
};
