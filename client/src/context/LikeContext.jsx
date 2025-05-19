import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Create a context for managing likes
const LikeContext = createContext();

export const useLikes = () => useContext(LikeContext);

export const LikeProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [likedBlogs, setLikedBlogs] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Load liked blogs from localStorage when the component mounts
  useEffect(() => {
    try {
      const storedLikes = localStorage.getItem('likedBlogs');
      if (storedLikes) {
        setLikedBlogs(JSON.parse(storedLikes));
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Error loading liked blogs from localStorage:', error);
      setLikedBlogs({});
      setIsInitialized(true);
    }
  }, []);

  // Save liked blogs to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('likedBlogs', JSON.stringify(likedBlogs));
      } catch (error) {
        console.error('Error saving liked blogs to localStorage:', error);
      }
    }
  }, [likedBlogs, isInitialized]);

  // Check if a blog is liked
  const isLiked = (blogId) => {
    return likedBlogs[blogId] === true;
  };

  // Add a blog to liked blogs
  const addLike = (blogId) => {
    setLikedBlogs(prev => ({
      ...prev,
      [blogId]: true
    }));
  };

  // Remove a blog from liked blogs
  const removeLike = (blogId) => {
    setLikedBlogs(prev => {
      const newLikedBlogs = { ...prev };
      delete newLikedBlogs[blogId];
      return newLikedBlogs;
    });
  };

  // Toggle like status
  const toggleLike = (blogId) => {
    if (isLiked(blogId)) {
      removeLike(blogId);
      return false; // Return new state (unliked)
    } else {
      addLike(blogId);
      return true; // Return new state (liked)
    }
  };

  // Clear all likes (useful for logout)
  const clearLikes = () => {
    setLikedBlogs({});
  };

  // The value that will be provided to consumers of this context
  const value = {
    likedBlogs,
    isLiked,
    addLike,
    removeLike,
    toggleLike,
    clearLikes
  };

  return (
    <LikeContext.Provider value={value}>
      {children}
    </LikeContext.Provider>
  );
};

export default LikeContext;
