import axios from 'axios';

/**
 * Get all blogs
 * @returns {Promise<Array>} Array of blogs
 */
export const getAllBlogs = async () => {
  const response = await axios.get('/api/blogs/');
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
    const response = await axios.get(`/api/blogs/${id}/`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // If 404, try without trailing slash
      const response = await axios.get(`/api/blogs/${id}`);
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
  const response = await axios.post(
    `/api/blogs/${id}/like/`,
    {},
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  return response.data;
};

/**
 * Get blogs liked by the current user
 * @param {string} idToken Firebase ID token
 * @returns {Promise<Array>} Array of liked blogs
 */
export const getLikedBlogs = async (idToken) => {
  console.log("Fetching liked blogs with token:", idToken.substring(0, 10) + "...");
  
  try {
    // First try with trailing slash
    const response = await axios.get('/api/blogs/liked/', {
      headers: { 
        Authorization: `Bearer ${idToken}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    console.log("Liked blogs fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching liked blogs with trailing slash:", error);
    
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
      console.error("Error fetching liked blogs without trailing slash:", secondError);
      
      // If both fail, try with a different approach using fetch API
      console.log("Trying with fetch API as last resort");
      const fetchResponse = await fetch('/api/blogs/liked/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`Fetch liked blogs failed with status ${fetchResponse.status}`);
      }
      
      const data = await fetchResponse.json();
      console.log("Liked blogs fetched successfully with fetch API:", data);
      return data;
    }
  }
};

/**
 * Track a view for a blog
 * @param {string} id Blog ID
 * @returns {Promise<Object>} Response with updated view count
 */
export const trackBlogView = async (id) => {
  const response = await axios.get(`/api/blogs/${id}/view/`);
  return response.data;
};
