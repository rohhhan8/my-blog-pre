import React from 'react';
import { useLoading } from '../context/LoadingContext';

const GlobalLoader = () => {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-md flex items-center justify-center z-50 transition-all duration-300">
      <div className="flex flex-col items-center">
        <div className="relative transform transition-all duration-500 animate-float">
          {/* Simple B logo with minimal animation */}
          <div className="relative">
            <div className="text-6xl font-black text-gray-900 dark:text-white font-serif tracking-tighter">
              B
            </div>
            
            {/* Bottom line only */}
            <div className="absolute -bottom-1 left-0 w-full h-1.5 bg-gray-900 dark:bg-white"></div>
          </div>
        </div>
        
        {/* Loading indicator */}
        <div className="mt-6 w-16 h-0.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gray-900 dark:bg-white loading-progress-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoader;
