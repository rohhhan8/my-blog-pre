import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PageLoader = () => {
  // Force the body to be fixed position during loading
  React.useEffect(() => {
    // Save the current scroll position
    const scrollY = window.scrollY;

    // Prevent scrolling during loading
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    // Restore scrolling when component unmounts
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';

      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-white dark:bg-black flex items-center justify-center z-[9999] transition-all duration-300"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        position: 'fixed',
        minHeight: '100vh',
        minWidth: '100vw'
      }}
    >
      {/* Overlay to prevent any clicks during loading */}
      <div
        className="absolute inset-0 bg-white dark:bg-black opacity-100"
        style={{ minHeight: '100vh' }}
      ></div>

      <div className="flex flex-col items-center relative z-10">
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
          <div className="h-full bg-gray-900 dark:bg-white loading-progress-bar"></div>
        </div>

        {/* Loading text */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Loading...
        </div>
      </div>
    </div>
  );
};

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('page-slide-in');
  const [isLoading, setIsLoading] = useState(false);

  // Handle scrolling in a more controlled way
  useEffect(() => {
    // Store the current scroll position when starting a transition
    let savedScrollY = 0;

    if (location !== displayLocation) {
      // Save current scroll position before transition starts
      savedScrollY = window.scrollY;

      // Don't scroll yet - wait until content is ready
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else if (!isLoading && transitionStage === 'page-slide-in-active') {
      // Only restore scrolling when the page is fully loaded and transition is complete
      document.body.style.overflow = '';
      document.body.style.height = '';

      // Now it's safe to scroll to top
      window.scrollTo({
        top: 0,
        behavior: 'auto'
      });
    }

    // Cleanup function to ensure scrolling is always restored
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isLoading, transitionStage, location, displayLocation]);

  useEffect(() => {
    if (location !== displayLocation) {
      // Start the exit animation
      setTransitionStage('page-slide-out');
      setIsLoading(true);

      // Wait for the exit animation to complete
      const timeout = setTimeout(() => {
        // Update the location and start the entrance animation
        setDisplayLocation(location);
        setTransitionStage('page-slide-in');

        // Preload any images or resources needed for the new page
        const preloadResources = () => {
          // Find all images in the new page and preload them
          const images = document.querySelectorAll('img');
          images.forEach(img => {
            if (img.getAttribute('src') && !img.complete) {
              img.setAttribute('loading', 'eager');
            }
          });
        };

        // Wait longer before hiding the loader to ensure content is fully ready
        // This prevents the white flash between loader and content
        setTimeout(() => {
          preloadResources();

          // Only hide the loader after the content has started to appear and resources are preloaded
          const hideLoader = setTimeout(() => {
            // Dispatch a custom event to signal that we're about to show content
            window.dispatchEvent(new CustomEvent('pageContentReady'));

            // Set a small delay before actually hiding the loader
            setTimeout(() => {
              // Make sure the page is at the top before showing content
              window.scrollTo(0, 0);

              // Now it's safe to hide the loader and show the content
              setIsLoading(false);

              // After a small delay, activate the entrance animation
              setTimeout(() => {
                setTransitionStage('page-slide-in-active');
              }, 50);
            }, 100);
          }, 300);

          return () => clearTimeout(hideLoader);
        }, 300);
      }, 300);

      return () => clearTimeout(timeout);
    } else if (!isLoading) {
      // If we're not changing location and not loading, activate the entrance animation
      const enterTimeout = setTimeout(() => {
        setTransitionStage('page-slide-in-active');
      }, 100);

      return () => clearTimeout(enterTimeout);
    }
  }, [location, displayLocation, isLoading]);

  return (
    <>
      {isLoading && <PageLoader />}
      <div
        className={`page-transition ${transitionStage} transition-all duration-500`}
        style={{
          visibility: isLoading ? 'hidden' : 'visible',
          position: 'relative',
          zIndex: isLoading ? -1 : 1,
          opacity: isLoading ? 0 : 1,
          transform: transitionStage === 'page-slide-out' ? 'translateY(-10px)' :
                    transitionStage === 'page-slide-in' ? 'translateY(10px)' : 'translateY(0)',
          minHeight: '100vh',
          width: '100%'
        }}
      >
        {children}
      </div>
    </>
  );
};

export default PageTransition;
