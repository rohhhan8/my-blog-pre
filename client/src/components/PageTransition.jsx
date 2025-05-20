import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PageLoader = () => {
  return (
    <div className="fixed inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-md flex items-center justify-center z-40 transition-all duration-300">
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

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('page-slide-in');
  const [isLoading, setIsLoading] = useState(false);

  // Scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
            setIsLoading(false);
          }, 500); // Increased to 500ms for smoother transition

          return () => clearTimeout(hideLoader);
        }, 500); // Increased to 500ms to ensure content is ready
      }, 400); // Slightly longer transition timing for better animation

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
      <div className={`page-transition ${transitionStage} transition-all duration-500`}>
        {children}
      </div>
    </>
  );
};

export default PageTransition;
