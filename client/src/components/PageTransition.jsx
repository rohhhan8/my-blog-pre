import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('page-slide-in');

  // Scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('page-slide-out');

      const timeout = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('page-slide-in');
      }, 500); // Match this with your CSS transition duration

      return () => clearTimeout(timeout);
    }

    const enterTimeout = setTimeout(() => {
      setTransitionStage('page-slide-in-active');
    }, 10);

    return () => clearTimeout(enterTimeout);
  }, [location, displayLocation]);

  return (
    <div className={`page-transition ${transitionStage} transition-all duration-500`}>
      {children}
    </div>
  );
};

export default PageTransition;
