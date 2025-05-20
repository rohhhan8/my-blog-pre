import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoading } from '../context/LoadingContext';

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('page-slide-in');
  const { setLoading } = useLoading();

  // Scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('page-slide-out');
      setLoading(true);

      const timeout = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('page-slide-in');

        // Hide loader after a short delay to ensure content is ready
        setTimeout(() => {
          setLoading(false);
        }, 200);
      }, 300); // Faster transition (was 500ms)

      return () => clearTimeout(timeout);
    }

    const enterTimeout = setTimeout(() => {
      setTransitionStage('page-slide-in-active');
    }, 10);

    return () => clearTimeout(enterTimeout);
  }, [location, displayLocation, setLoading]);

  return (
    <div className={`page-transition ${transitionStage} transition-all duration-500`}>
      {children}
    </div>
  );
};

export default PageTransition;
