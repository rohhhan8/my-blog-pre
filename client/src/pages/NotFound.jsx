import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Button from '../components/ui/Button';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Check if the URL contains a blog ID pattern
    const path = location.pathname;
    console.log("404 page loaded with path:", path);

    // First, check if we have a lastSharedBlogId in localStorage
    const lastSharedBlogId = localStorage.getItem('lastSharedBlogId');

    // Check if this is a shared blog link
    const blogIdMatch = path.match(/\/blog[s]?\/([a-zA-Z0-9]+)/);

    // Check if we're already in a redirection process (to prevent loops)
    const isRedirectLoop = sessionStorage.getItem('redirectAttempt');
    const redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0');

    // If we've tried redirecting too many times, stop trying
    if (redirectCount > 3) {
      console.log("Too many redirect attempts, showing normal 404");
      sessionStorage.removeItem('redirectAttempt');
      sessionStorage.removeItem('redirectCount');
      return;
    }

    // Try to extract blog ID from various sources
    let blogId = null;

    // First priority: extract from URL
    if (blogIdMatch && blogIdMatch[1]) {
      blogId = blogIdMatch[1];
      console.log("Found blog ID in URL:", blogId);
    }
    // Second priority: use lastSharedBlogId from localStorage
    else if (lastSharedBlogId) {
      blogId = lastSharedBlogId;
      console.log("Using last shared blog ID from localStorage:", blogId);
    }

    if (blogId && !isRedirectLoop) {
      // Set a flag in session storage to prevent redirect loops
      sessionStorage.setItem('redirectAttempt', 'true');
      sessionStorage.setItem('redirectCount', (redirectCount + 1).toString());

      // Clean the URL to ensure it's in the correct format
      const cleanUrl = `/blog/${blogId}`;
      console.log("Will redirect to:", cleanUrl);

      setRedirecting(true);

      // Start countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Redirect to the blog page with the clean URL
            // Use direct location change with replace to avoid adding to history
            window.location.replace(cleanUrl);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else if (isRedirectLoop) {
      // If we're in a redirect loop, clear the flag and show normal 404
      console.log("Detected redirect loop, showing normal 404");
      sessionStorage.removeItem('redirectAttempt');
      // Don't clear redirectCount to keep track of attempts
    }
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-blog-bg dark:bg-black px-4 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-black p-8 rounded-lg shadow-md text-center border border-gray-200 dark:border-gray-700">
        <h1 className="text-6xl font-bold text-blog-accent mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Page Not Found</h2>

        {redirecting ? (
          <>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We detected a shared blog link. Redirecting you to the correct page...
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Redirecting in {countdown} seconds
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-8">
              <div
                className="bg-blog-accent h-2.5 rounded-full transition-all duration-1000"
                style={{ width: `${(countdown / 5) * 100}%` }}
              ></div>
            </div>
          </>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The page you are looking for doesn't exist or has been moved.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button variant="primary" size="lg">
              Go back home
            </Button>
          </Link>

          {redirecting && (
            <Link to={`/blog/${location.pathname.match(/\/blog[s]?\/([a-zA-Z0-9]+)/)?.[1]}`}>
              <Button variant="secondary" size="lg">
                Go to blog now
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
