/**
 * Unified Blog Service - Optimized and Consistent
 * Handles all blog operations with proper error handling and caching
 */

// Unified API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_ENDPOINTS = {
  blogs: `${API_BASE_URL}/api/blogs/`,
  blogDetail: (id) => `${API_BASE_URL}/api/blogs/${id}/`,
  blogLike: (id) => `${API_BASE_URL}/api/blogs/${id}/like/`,
  blogView: (id) => `${API_BASE_URL}/api/blogs/${id}/view/`,
  likedBlogs: `${API_BASE_URL}/api/blogs/liked/`,
};

// Unified request function with consistent error handling
const makeRequest = async (url, options = {}) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const requestOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  console.log(`🌐 ${requestOptions.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, requestOptions);
    console.log(`📥 Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText}`);
    }

    if (response.status === 204) {
      return { success: true, status: 204 };
    }

    const data = await response.json();
    console.log(`✅ Success`);
    return data;
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    throw error;
  }
};

// Cache management
const CACHE_DURATION = 30 * 1000; // 30 seconds for instant updates
const getCachedData = (key) => {
  try {
    const cached = sessionStorage.getItem(key);
    const timestamp = sessionStorage.getItem(`${key}_timestamp`);
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }
  return null;
};

const setCachedData = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
    sessionStorage.setItem(`${key}_timestamp`, Date.now().toString());
  } catch (error) {
    console.warn('Cache write error:', error);
  }
};

const clearCache = () => {
  try {
    const keys = ['cachedBlogs', 'cachedUserBlogs', 'likedBlogs'];
    keys.forEach(key => {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(`${key}_timestamp`);
    });
    console.log('🗑️ Cache cleared');
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
};

// Authentication helper
const getAuthHeaders = (idToken) => {
  if (!idToken) {
    throw new Error('Authentication token is required');
  }
  return {
    'Authorization': `Bearer ${idToken}`,
  };
};

/**
 * Get all blogs
 */
export const getAllBlogs = async () => {
  try {
    const cached = getCachedData('cachedBlogs');
    if (cached) {
      setTimeout(() => refreshBlogs(), 100);
      return cached;
    }
    return await refreshBlogs();
  } catch (error) {
    console.error('Error getting blogs:', error);
    const staleCache = sessionStorage.getItem('cachedBlogs');
    if (staleCache) {
      return JSON.parse(staleCache);
    }
    throw error;
  }
};

const refreshBlogs = async () => {
  const blogs = await makeRequest(API_ENDPOINTS.blogs);
  setCachedData('cachedBlogs', blogs);
  return blogs;
};

/**
 * Get blog by ID
 */
export const getBlogById = async (id) => {
  if (!id) throw new Error('Blog ID is required');
  return await makeRequest(API_ENDPOINTS.blogDetail(id));
};

/**
 * Create new blog
 */
export const createBlog = async (blogData, idToken) => {
  console.log('🆕 Creating new blog');
  
  const response = await makeRequest(API_ENDPOINTS.blogs, {
    method: 'POST',
    headers: getAuthHeaders(idToken),
    body: JSON.stringify(blogData),
  });

  clearCache();
  console.log('✅ Blog created successfully');
  return response;
};

/**
 * Update blog
 */
export const updateBlog = async (id, blogData, idToken) => {
  console.log(`📝 Updating blog ${id}`);
  
  const response = await makeRequest(API_ENDPOINTS.blogDetail(id), {
    method: 'PUT',
    headers: getAuthHeaders(idToken),
    body: JSON.stringify(blogData),
  });

  clearCache();
  console.log('✅ Blog updated successfully');
  return response;
};

/**
 * Delete blog
 */
export const deleteBlog = async (id, idToken) => {
  console.log(`🗑️ Deleting blog ${id}`);
  
  const response = await makeRequest(API_ENDPOINTS.blogDetail(id), {
    method: 'DELETE',
    headers: getAuthHeaders(idToken),
  });

  clearCache();
  console.log('✅ Blog deleted successfully');
  return response;
};

/**
 * Like/unlike blog
 */
export const likeBlog = async (id, idToken) => {
  console.log(`❤️ Toggling like for blog ${id}`);
  
  const response = await makeRequest(API_ENDPOINTS.blogLike(id), {
    method: 'POST',
    headers: getAuthHeaders(idToken),
    body: JSON.stringify({}),
  });

  try {
    const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
    if (response.status === 'liked') {
      likedBlogs[id] = true;
    } else {
      delete likedBlogs[id];
    }
    localStorage.setItem('likedBlogs', JSON.stringify(likedBlogs));
  } catch (error) {
    console.warn('Error updating like status in localStorage:', error);
  }

  clearCache();
  return response;
};

/**
 * Get liked blogs
 */
export const getLikedBlogs = async (idToken) => {
  console.log('💖 Getting liked blogs');
  
  const response = await makeRequest(API_ENDPOINTS.likedBlogs, {
    headers: getAuthHeaders(idToken),
  });

  try {
    const likedBlogsMap = {};
    response.forEach(blog => {
      likedBlogsMap[blog._id] = true;
    });
    localStorage.setItem('likedBlogs', JSON.stringify(likedBlogsMap));
  } catch (error) {
    console.warn('Error updating liked blogs in localStorage:', error);
  }

  return response;
};

/**
 * Track blog view
 */
export const trackBlogView = async (id) => {
  try {
    return await makeRequest(API_ENDPOINTS.blogView(id));
  } catch (error) {
    console.warn('Error tracking view:', error);
    return { views: 0, message: 'Error tracking view' };
  }
};

export { clearCache };
