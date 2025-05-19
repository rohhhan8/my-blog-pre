import React from 'react';

const LogoLoader = () => {
  return (
    <div className="fixed inset-0 bg-white dark:bg-black flex items-center justify-center z-50">
      <div className="flex flex-col items-center">
        {/* Logo with enhanced animations */}
        <div className="relative mb-6 transform transition-all duration-1000 animate-float">
          <div className="text-7xl font-black text-gray-900 dark:text-white font-serif tracking-tighter animate-pulse">
            BlogHub
          </div>
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-gray-900 dark:bg-white rounded-full animate-ping"></div>
          <div className="absolute -bottom-2 left-0 w-full h-2 bg-gray-900 dark:bg-white animate-pulse"></div>

          {/* Decorative elements */}
          <div className="absolute -top-8 -left-8 w-16 h-16 border border-gray-300 dark:border-gray-700 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-8 -right-8 w-20 h-20 border border-gray-400 dark:border-gray-600 rounded-full opacity-10 animate-pulse animation-delay-500"></div>
        </div>

        {/* Loading text */}
        <div className="text-gray-600 dark:text-gray-400 text-sm mb-4 animate-pulse">
          Loading amazing content...
        </div>

        {/* Loading indicator */}
        <div className="relative w-48 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-gray-900 dark:bg-white animate-loading-bar"></div>
        </div>

        {/* Bouncing dots */}
        <div className="mt-6 flex space-x-3">
          <div className="w-2.5 h-2.5 bg-gray-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2.5 h-2.5 bg-gray-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2.5 h-2.5 bg-gray-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LogoLoader;
