import React, { useEffect, useState, useRef } from 'react';

// An improved B logo loader component that ensures content is fully loaded before hiding
const BLogoLoader = ({ onBeforeHide, onContentReady }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isRendered, setIsRendered] = useState(true);
  const [contentIsReady, setContentIsReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [hideRequested, setHideRequested] = useState(false);
  const loaderRef = useRef(null);
  const animationIterations = useRef(0);

  // This effect handles the fade-out animation before unmounting
  useEffect(() => {
    // If onBeforeHide is provided, call it when the component is about to be hidden
    return () => {
      if (onBeforeHide && typeof onBeforeHide === 'function') {
        onBeforeHide();
      }
    };
  }, [onBeforeHide]);

  // This ensures the component stays visible for at least 1500ms
  // to prevent flickering on slow connections
  useEffect(() => {
    const minDisplayTime = setTimeout(() => {
      setMinTimeElapsed(true);
      // Only hide if a hide was already requested
      if (hideRequested && contentIsReady) {
        setIsVisible(false);
      }
    }, 1500);

    return () => clearTimeout(minDisplayTime);
  }, [hideRequested, contentIsReady]);

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
      // Add a small delay before actually removing the loader
      // to ensure a smooth transition
      setTimeout(() => {
        setIsRendered(false);
      }, 100);
    }
  };

  // This function is called when we want to start hiding the loader
  const startHiding = () => {
    // Request hiding - will only happen after min time has elapsed
    setHideRequested(true);

    // Only actually hide if min time has elapsed and content is ready
    if (minTimeElapsed && contentIsReady) {
      setIsVisible(false);
    }
  };

  if (!isRendered) return null;

  return (
    <div
      ref={loaderRef}
      className="fixed inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-md flex items-center justify-center z-50 transition-opacity duration-700"
      style={{
        opacity: isVisible ? 1 : 0,
        willChange: 'opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
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
        <div className="mt-6 w-24 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 dark:bg-white loading-progress-bar"
            onAnimationIteration={() => {
              // Count animation iterations
              animationIterations.current += 1;

              // After several iterations of the loading bar animation,
              // if content is ready, start hiding the loader
              if (contentIsReady && animationIterations.current > 2) {
                startHiding();
              }
            }}
          ></div>
        </div>

        {/* Loading text */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Loading...
        </div>
      </div>
    </div>
  );
};

export default BLogoLoader;
