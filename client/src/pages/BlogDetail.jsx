import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const BlogDetail = () => {
  const { id, _id } = useParams();  // Handle both route parameter formats
  const blogId = id || _id;  // Use whichever parameter is available
  const { currentUser } = useAuth();
  const [blog, setBlog] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
        setError("");
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
            setError("");
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

    if (blogId) {
      fetchBlog();
    } else {
      setError("Invalid blog ID");
      setLoading(false);
    }
  }, [blogId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-blog-bg dark:bg-gray-900 pt-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blog-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blog-bg dark:bg-gray-900 pt-24 flex justify-center">
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
    <div className="min-h-screen bg-white dark:bg-black pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Banner Image */}
          {blog.image_url && (
            <div className="w-full h-64 md:h-96 overflow-hidden">
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

          <div className="p-6 md:p-10">
            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white font-playfair mb-6">
              {blog.title}
            </h1>

            {/* Author and date */}
            <div className="flex items-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
              <div className="h-12 w-12 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 font-medium text-lg">
                {blog.author?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="ml-4">
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {blog.author_name || blog.author || 'Anonymous'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formattedDate}
                </p>
              </div>

              {/* Edit button if user is author */}
              {isAuthor && (
                <div className="ml-auto">
                  <Link
                    to={`/edit/${blogId}`}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2 rounded text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                  >
                    Edit Post
                  </Link>
                </div>
              )}
            </div>

            {/* Content */}
            <article className="prose dark:prose-invert max-w-none prose-lg md:prose-xl">
              {blog.content.split('\n').map((paragraph, index) => (
                paragraph ? <p key={index} className="mb-6 text-gray-800 dark:text-gray-100">{paragraph}</p> : <br key={index} />
              ))}
            </article>

            {/* Back to home button */}
            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/"
                className="inline-flex items-center text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
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
