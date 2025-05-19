import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const BlogDetail = () => {
  const { id, _id, "*": splat } = useParams();  // Handle all route parameter formats
  const location = useLocation();

  // Extract blog ID from various possible sources
  const extractBlogId = () => {
    // First try the direct params
    if (id) return id;
    if (_id) return _id;

    // If we have a splat parameter (from catch-all routes), try to extract ID
    if (splat) {
      const splatMatch = splat.match(/([a-zA-Z0-9]+)/);
      if (splatMatch && splatMatch[1]) return splatMatch[1];
    }

    // Try to extract from the full path as a last resort
    const pathMatch = location.pathname.match(/\/blog[s]?\/([a-zA-Z0-9]+)/);
    if (pathMatch && pathMatch[1]) return pathMatch[1];

    return null;
  };

  const blogId = extractBlogId();
  console.log("Extracted blog ID:", blogId, "from params:", { id, _id, splat, pathname: location.pathname });

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [showShareToast, setShowShareToast] = useState(false);

  // Set share URL when component mounts
  useEffect(() => {
    // Create a consistent URL format for sharing
    const baseUrl = window.location.origin;
    // Use a clean URL format without any query parameters or hash
    const cleanShareUrl = `${baseUrl}/blog/${blogId}`;
    console.log("Setting share URL:", cleanShareUrl);
    setShareUrl(cleanShareUrl);
  }, [blogId]);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        console.log("Fetching blog with ID:", blogId);

        // Try different URL formats to handle potential API inconsistencies
        let response;
        try {
          // First try with trailing slash
          response = await axios.get(`/api/blogs/${blogId}/`);
        } catch (error) {
          if (error.response && error.response.status === 404) {
            // If 404, try without trailing slash
            response = await axios.get(`/api/blogs/${blogId}`);
          } else {
            // If other error, rethrow
            throw error;
          }
        }

        console.log("Blog data:", response.data);
        setBlog(response.data);

        // Set like status and counts
        if (response.data.is_liked !== undefined) {
          setIsLiked(response.data.is_liked);
        }

        if (response.data.like_count !== undefined) {
          setLikeCount(response.data.like_count);
        }

        if (response.data.views !== undefined) {
          setViewCount(response.data.views);
        }

        setError("");

        // Track view after fetching blog
        try {
          const viewResponse = await axios.get(`/api/blogs/${blogId}/view/`);
          if (viewResponse.data.views) {
            setViewCount(viewResponse.data.views);
          }
        } catch (viewErr) {
          console.error("Error tracking view:", viewErr);
        }
      } catch (err) {
        console.error("Error fetching blog:", err);
        console.error("Response data:", err.response?.data);

        // Try to fetch all blogs to see if we can find the blog by ID
        try {
          const allBlogsResponse = await axios.get('/api/blogs/');
          const foundBlog = allBlogsResponse.data.find(blog => blog._id === blogId);

          if (foundBlog) {
            console.log("Found blog in all blogs:", foundBlog);
            setBlog(foundBlog);

            // Set like status and counts
            if (foundBlog.is_liked !== undefined) {
              setIsLiked(foundBlog.is_liked);
            }

            if (foundBlog.like_count !== undefined) {
              setLikeCount(foundBlog.like_count);
            }

            if (foundBlog.views !== undefined) {
              setViewCount(foundBlog.views);
            }

            setError("");

            // Track view after fetching blog
            try {
              const viewResponse = await axios.get(`/api/blogs/${blogId}/view/`);
              if (viewResponse.data.views) {
                setViewCount(viewResponse.data.views);
              }
            } catch (viewErr) {
              console.error("Error tracking view:", viewErr);
            }

            return;
          }
        } catch (listErr) {
          console.error("Error fetching all blogs:", listErr);
        }

        setError("Blog not found or unable to fetch.");
      } finally {
        setLoading(false);
      }
    };

    // Clear any redirect attempt flags when loading a blog directly
    sessionStorage.removeItem('redirectAttempt');

    if (blogId) {
      console.log("Fetching blog with ID:", blogId);
      fetchBlog();

      // If we're not on the canonical URL format, redirect to it
      const canonicalPath = `/blog/${blogId}`;
      if (location.pathname !== canonicalPath) {
        console.log("Redirecting to canonical URL:", canonicalPath);
        navigate(canonicalPath, { replace: true });
      }
    } else {
      console.error("Invalid blog ID");
      setError("Invalid blog ID");
      setLoading(false);
    }
  }, [blogId, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-blog-bg dark:bg-black pt-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blog-bg dark:bg-black pt-24 flex justify-center">
        <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 max-w-lg">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
          <Link to="/" className="bg-blog-accent text-white px-4 py-2 rounded hover:bg-opacity-90 transition-colors">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!blog) return null;

  // Format the date
  const formattedDate = blog.created_at
    ? formatDistanceToNow(new Date(blog.created_at), { addSuffix: true })
    : 'Unknown date';

  // Handle like/unlike
  const handleLike = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    try {
      console.log("Liking blog with ID:", blogId);
      const idToken = await currentUser.getIdToken();

      const response = await axios.post(
        `/api/blogs/${blogId}/like/`,
        {},
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      console.log("Like response:", response.data);

      if (response.data.status === 'liked') {
        setIsLiked(true);
        setLikeCount(prev => response.data.like_count);
        console.log("Blog liked successfully");
      } else if (response.data.status === 'unliked') {
        setIsLiked(false);
        setLikeCount(prev => response.data.like_count);
        console.log("Blog unliked successfully");
      }
    } catch (err) {
      console.error("Error liking post:", err);
      console.error("Error details:", err.response?.data || err.message);
    }
  };

  // Handle share
  const handleShare = async () => {
    try {
      // Ensure we have a valid URL to share
      if (!shareUrl) {
        const baseUrl = window.location.origin;
        setShareUrl(`${baseUrl}/blog/${blogId}`);
      }

      console.log("Sharing URL:", shareUrl);

      // Store the blog ID in localStorage to help with redirection
      localStorage.setItem('lastSharedBlogId', blogId);

      if (navigator.share) {
        // Use Web Share API if available
        await navigator.share({
          title: blog.title,
          text: `Check out this blog post: ${blog.title}`,
          url: shareUrl,
        });
        console.log("Shared successfully using Web Share API");
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 5000);
        console.log("Copied to clipboard:", shareUrl);
      }
    } catch (err) {
      console.error("Error sharing:", err);
      // Show error toast
      alert(`Error sharing: ${err.message}`);
    }
  };

  // Check if current user is the author - handle different author formats
  console.log("Checking if user is author:");
  console.log("Blog author:", blog.author);
  console.log("Blog author_id:", blog.author_id);
  console.log("Current user:", currentUser);

  let isAuthor = false;

  if (currentUser) {
    // Check multiple possible author formats
    const authorIsString = typeof blog.author === 'string';
    const authorIsObject = typeof blog.author === 'object';

    // Check if author is a string that matches user ID
    const matchByUid = authorIsString && blog.author === currentUser.uid;
    console.log("Match by UID:", matchByUid);

    // Check if author is an object with uid that matches user ID
    const matchByObjectUid = authorIsObject && blog.author?.uid === currentUser.uid;
    console.log("Match by object UID:", matchByObjectUid);

    // Check if author_id matches user ID
    const matchByAuthorId = blog.author_id === currentUser.uid;
    console.log("Match by author_id:", matchByAuthorId);

    // Check if author matches user email
    const matchByEmail = authorIsString && blog.author === currentUser.email;
    console.log("Match by email:", matchByEmail);

    // Check if author name matches display name
    const matchByDisplayName = blog.author_name === currentUser.displayName;
    console.log("Match by display name:", matchByDisplayName);

    isAuthor = matchByUid || matchByObjectUid || matchByAuthorId || matchByEmail || matchByDisplayName;
    console.log("Is author:", isAuthor);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-20 sm:pt-24 pb-12 relative">
      {/* Share toast notification */}
      {showShareToast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in">
          Link copied to clipboard!
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
        <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Banner Image */}
          {blog.image_url && (
            <div className="w-full h-48 sm:h-64 md:h-96 overflow-hidden">
              <img
                src={blog.image_url}
                alt={blog.title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="p-4 sm:p-6 md:p-10">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 dark:text-white font-playfair mb-4 sm:mb-6">
              {blog.title}
            </h1>

            {/* Author and date */}
            <div className="flex flex-col sm:flex-row sm:items-center mb-6 sm:mb-8 border-b border-gray-200 dark:border-gray-700 pb-4 sm:pb-6 gap-4">
              <div className="flex items-center">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 font-medium text-lg">
                  {blog.author?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    {blog.author_name || blog.author || 'Anonymous'}
                  </p>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-x-2 sm:space-x-4">
                    <span>{formattedDate}</span>
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {viewCount} views
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-3 sm:ml-auto mt-2 sm:mt-0">
                {/* Like button */}
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-full border ${
                    isLiked
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                      : 'bg-white dark:bg-black text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900'
                  } transition-colors text-xs sm:text-sm`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill={isLiked ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{likeCount}</span>
                </button>

                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-full border bg-white dark:bg-black text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-xs sm:text-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </button>

                {/* Edit button if user is author */}
                {isAuthor && (
                  <Link
                    to={`/edit/${blogId}`}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 sm:px-5 py-1 sm:py-2 rounded text-xs sm:text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                  >
                    Edit Post
                  </Link>
                )}
              </div>
            </div>

            {/* Content */}
            <article className="prose dark:prose-invert max-w-none prose-base sm:prose-lg md:prose-xl">
              {blog.content.split('\n').map((paragraph, index) => (
                paragraph ? <p key={index} className="mb-4 sm:mb-6 text-gray-800 dark:text-gray-100 text-sm sm:text-base md:text-lg">{paragraph}</p> : <br key={index} />
              ))}
            </article>

            {/* Back to home button */}
            <div className="mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/"
                className="inline-flex items-center text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm sm:text-base"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to all blogs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetail;
