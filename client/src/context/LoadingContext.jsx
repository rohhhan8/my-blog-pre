import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the loading context
const LoadingContext = createContext({
  isLoading: false,
  setLoading: () => {},
  startLoading: () => {},
  stopLoading: () => {},
  loadingCount: 0
});

// Custom hook to use the loading context
export const useLoading = () => useContext(LoadingContext);

// Loading provider component
export const LoadingProvider = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTimer, setLoadingTimer] = useState(null);

  // Start loading with debounce to prevent flashing for quick operations
  const startLoading = () => {
    setLoadingCount(prev => prev + 1);
    
    // Clear any existing timer
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      setLoadingTimer(null);
    }
  };

  // Stop loading with a minimum display time
  const stopLoading = () => {
    setLoadingCount(prev => Math.max(0, prev - 1));
  };

  // Set loading state directly
  const setLoading = (state) => {
    if (state) {
      startLoading();
    } else {
      stopLoading();
    }
  };

  // Effect to manage loading state based on count
  useEffect(() => {
    if (loadingCount > 0) {
      // Start showing loading after a short delay to prevent flashing
      const timer = setTimeout(() => {
        setIsLoading(true);
      }, 100);
      setLoadingTimer(timer);
      
      return () => {
        clearTimeout(timer);
      };
    } else {
      // Add a small delay before hiding to ensure smooth transitions
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      setLoadingTimer(timer);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [loadingCount]);

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, startLoading, stopLoading, loadingCount }}>
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingContext;
