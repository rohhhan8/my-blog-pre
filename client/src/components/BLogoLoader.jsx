import React, { useEffect, useState, useRef } from 'react';

// A completely redesigned loader component that NEVER disappears until content is fully ready
const BLogoLoader = ({ onBeforeHide, onContentReady }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isRendered, setIsRendered] = useState(true);
  const [contentIsReady, setContentIsReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [hideRequested, setHideRequested] = useState(false);
  const [contentConfirmedReady, setContentConfirmedReady] = useState(false);
  const loaderRef = useRef(null);
  const animationIterations = useRef(0);
  const hideTimer = useRef(null);

  // This effect handles the fade-out animation before unmounting
  useEffect(() => {
    // If onBeforeHide is provided, call it when the component is about to be hidden
    return () => {
      if (onBeforeHide && typeof onBeforeHide === 'function') {
        onBeforeHide();
      }
    };
  }, [onBeforeHide]);

  // This ensures the component stays visible for at least 2500ms
  // to prevent flickering on slow connections
  useEffect(() => {
    const minDisplayTime = setTimeout(() => {
      setMinTimeElapsed(true);
      // Only hide if a hide was already requested AND content is confirmed ready
      if (hideRequested && contentIsReady && contentConfirmedReady) {
        setIsVisible(false);
      }
    }, 2500);

    return () => clearTimeout(minDisplayTime);
  }, [hideRequested, contentIsReady, contentConfirmedReady]);

  // This effect handles the content ready callback
  useEffect(() => {
    if (onContentReady && typeof onContentReady === 'function') {
      // Signal that content can start loading in the background
      // but don't hide the loader yet
      onContentReady(true);
      setContentIsReady(true);

      // Set up a global event listener to detect when content is actually ready
      const handleContentReady = () => {
        setContentConfirmedReady(true);
      };

      // Listen for a custom event that will be triggered when content is fully loaded
      window.addEventListener('blogContentReady', handleContentReady);

      // Clean up the event listener
      return () => {
        window.removeEventListener('blogContentReady', handleContentReady);
      };
    }
  }, [onContentReady]);

  // Handle the actual unmounting after fade-out animation completes
  const handleTransitionEnd = () => {
    if (!isVisible) {
      // Add a significant delay before actually removing the loader
      // to ensure a smooth transition and no white flash
      hideTimer.current = setTimeout(() => {
        setIsRendered(false);
      }, 300);
    }
  };

  // Clean up any timers when component unmounts
  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  // This function is called when we want to start hiding the loader
  const startHiding = () => {
    // Request hiding - will only happen after min time has elapsed
    setHideRequested(true);

    // Only actually hide if min time has elapsed and content is confirmed ready
    if (minTimeElapsed && contentIsReady && contentConfirmedReady) {
      setIsVisible(false);
    }
  };

  if (!isRendered) return null;

  return (
    <div
      ref={loaderRef}
      className="fixed inset-0 bg-white dark:bg-black flex items-center justify-center z-[9999] transition-opacity duration-1000"
      style={{
        opacity: isVisible ? 1 : 0,
        willChange: 'opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Overlay to prevent any clicks during loading */}
      <div className="absolute inset-0 bg-white dark:bg-black opacity-100"></div>

      <div className="flex flex-col items-center relative z-10">
        <div className="relative transform transition-all duration-500 animate-float">
          {/* B logo with enhanced animation */}
          <div className="relative">
            <div className="text-7xl font-black text-gray-900 dark:text-white font-serif tracking-tighter">
              B
            </div>

            {/* Bottom line with animation */}
            <div className="absolute -bottom-1 left-0 w-full h-2 bg-gray-900 dark:bg-white"></div>

            {/* Dot with pulse animation */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-900 dark:bg-white rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Loading indicator - wider and more visible */}
        <div className="mt-8 w-32 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 dark:bg-white loading-progress-bar"
            onAnimationIteration={() => {
              // Count animation iterations
              animationIterations.current += 1;

              // After several iterations of the loading bar animation,
              // if content is ready, start hiding the loader
              if (contentIsReady && animationIterations.current > 3) {
                startHiding();
              }
            }}
          ></div>
        </div>

        {/* Loading text with animation */}
        <div className="mt-4 text-base text-gray-700 dark:text-gray-300 font-medium animate-pulse">
          Loading blog content...
        </div>

        {/* Additional loading message */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Please wait while we prepare your content
        </div>
      </div>
    </div>
  );
};

export default BLogoLoader;
