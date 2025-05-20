import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PageLoader = () => {
  return (
    <div className="fixed inset-0 bg-white dark:bg-black flex items-center justify-center z-[9999] transition-all duration-300">
      {/* Overlay to prevent any clicks during loading */}
      <div className="absolute inset-0 bg-white dark:bg-black opacity-100"></div>

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

  // Scroll to top when location changes, but only after the transition is complete
  useEffect(() => {
    // Only scroll to top when the page is fully loaded and transition is complete
    if (!isLoading && transitionStage === 'page-slide-in-active') {
      window.scrollTo({
        top: 0,
        behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visual issues
      });
    }
  }, [isLoading, transitionStage, location.pathname]);

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
              setIsLoading(false);
            }, 100);
          }, 300); // Reduced timing for better responsiveness

          return () => clearTimeout(hideLoader);
        }, 300); // Reduced timing for better responsiveness
      }, 300); // Reduced timing for better responsiveness

      return () => clearTimeout(timeout);
    }

    // If we're not changing location, just activate the entrance animation
    const enterTimeout = setTimeout(() => {
      setTransitionStage('page-slide-in-active');
    }, 100); // Increased for more reliable animation

    return () => clearTimeout(enterTimeout);
  }, [location, displayLocation]);

  return (
    <>
      {isLoading && <PageLoader />}
      <div
        className={`page-transition ${transitionStage} transition-all duration-500`}
        style={{
          visibility: isLoading ? 'hidden' : 'visible',
          position: 'relative',
          zIndex: isLoading ? -1 : 1
        }}
      >
        {children}
      </div>
    </>
  );
};

export default PageTransition;
