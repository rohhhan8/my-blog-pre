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

    // Check if this is a shared blog link
    const blogIdMatch = path.match(/\/blog[s]?\/([a-zA-Z0-9]+)/);

    if (blogIdMatch && blogIdMatch[1]) {
      const blogId = blogIdMatch[1];
      console.log("Found blog ID in URL:", blogId);
      setRedirecting(true);

      // Start countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Redirect to the blog page with the clean URL
            navigate(`/blog/${blogId}`, { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [location, navigate]);

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
