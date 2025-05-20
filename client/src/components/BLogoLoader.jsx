import React, { useEffect, useState, useRef } from 'react';

// A simplified B logo loader component that matches the page transition loader
const BLogoLoader = ({ onBeforeHide, onContentReady }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isRendered, setIsRendered] = useState(true);
  const [contentIsReady, setContentIsReady] = useState(false);
  const loaderRef = useRef(null);

  // This effect handles the fade-out animation before unmounting
  useEffect(() => {
    // If onBeforeHide is provided, call it when the component is about to be hidden
    return () => {
      if (onBeforeHide && typeof onBeforeHide === 'function') {
        onBeforeHide();
      }
    };
  }, [onBeforeHide]);

  // This ensures the component stays visible for at least 800ms
  useEffect(() => {
    const minDisplayTime = setTimeout(() => {
      setIsVisible(true);
    }, 800);

    return () => clearTimeout(minDisplayTime);
  }, []);

  // This effect handles the content ready callback
  useEffect(() => {
    if (onContentReady && typeof onContentReady === 'function') {
      // Signal that content can start loading in the background
      // but don't hide the loader yet
      onContentReady(true);
      setContentIsReady(true);
    }
  }, [onContentReady]);

  // Handle the actual unmounting after fade-out animation completes
  const handleTransitionEnd = () => {
    if (!isVisible) {
      setIsRendered(false);
    }
  };

  // This function is called when we want to start hiding the loader
  const startHiding = () => {
    // Only start hiding if content is ready
    if (contentIsReady) {
      setIsVisible(false);
    }
  };

  if (!isRendered) return null;

  return (
    <div
      ref={loaderRef}
      className="fixed inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-md flex items-center justify-center z-50 transition-opacity duration-700"
      style={{ opacity: isVisible ? 1 : 0 }}
      onTransitionEnd={handleTransitionEnd}
    >
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
          <div
            className="h-full bg-gray-900 dark:bg-white loading-progress-bar"
            onAnimationIteration={() => {
              // After a few iterations of the loading bar animation,
              // if content is ready, start hiding the loader
              if (contentIsReady) {
                startHiding();
              }
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default BLogoLoader;
