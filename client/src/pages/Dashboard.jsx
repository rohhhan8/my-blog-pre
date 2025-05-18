import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger a refresh

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const fetchUserBlogs = async () => {
      setLoading(true);
      setError("");

      try {
        // Simple approach: Just fetch all blogs without authentication
        // This is a fallback approach that should work regardless of auth issues
        try {
          console.log("Fetching all blogs without authentication");
          const response = await axios.get("/api/blogs/");

          if (Array.isArray(response.data) && response.data.length > 0) {
            console.log("All blogs fetched:", response.data);

            // Filter blogs by the current user
            const userBlogs = response.data.filter(blog => {
              // Extract author identifier based on different possible formats
              let authorId;
              if (typeof blog.author === "object") {
                authorId = blog.author.id || blog.author._id || blog.author.username;
              } else {
                authorId = blog.author;
              }

              // Also check the author_id field if available
              const authorIdFromField = blog.author_id;

              // Log for debugging
              console.log(`Blog ${blog._id} - Title: ${blog.title}`);
              console.log(`  Author: ${blog.author}, Author ID: ${authorIdFromField}`);
              console.log(`  Current user: ${currentUser.uid}, Email: ${currentUser.email}`);

              // Compare with multiple possible user identifiers
              const isMatch = (
                authorId === currentUser.uid ||
                authorId === currentUser.email ||
                (blog.author_id && blog.author_id.toString() === currentUser.uid) ||
                (blog.author_name && currentUser.displayName &&
                  blog.author_name.includes(currentUser.displayName))
              );

              console.log(`  Is user's blog? ${isMatch}`);
              return isMatch;
            });

            console.log("Filtered user blogs:", userBlogs);
            setBlogs(userBlogs);
            return;
          }
        } catch (error) {
          console.error("Error fetching all blogs:", error);
        }

        // If we get here, the simple approach failed, try with authentication
        console.log("Trying with authentication...");

        // Get a fresh token
        const idToken = await currentUser.getIdToken(true);

        console.log("Fetching blogs for user:", currentUser.uid);

        // Try to fetch all blogs with authentication
        const authResponse = await axios.get("/api/blogs/", {
          headers: { Authorization: `Bearer ${idToken}` }
        });

        console.log("Blogs fetched with auth:", authResponse.data);

        if (Array.isArray(authResponse.data)) {
          // Filter blogs by the current user
          const userBlogs = authResponse.data.filter(blog => {
            // Extract author identifier
            let authorId = typeof blog.author === "object"
              ? (blog.author.id || blog.author._id || blog.author.username)
              : blog.author;

            // Compare with user identifiers
            return (
              authorId === currentUser.uid ||
              authorId === currentUser.email ||
              blog.author_id === currentUser.uid
            );
          });

          console.log("Final user blogs:", userBlogs);
          setBlogs(userBlogs);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load your blogs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserBlogs();
  }, [currentUser, navigate, refreshKey]); // Add refreshKey to dependencies to trigger refresh

  const handleDeleteClick = (blogId) => {
    setDeleteId(blogId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    setDeleteLoading(true);
    try {
      // Get the blog to delete for debugging
      const blogToDelete = blogs.find(blog => blog._id === deleteId);
      console.log("Attempting to delete blog:", blogToDelete);

      // Force token refresh to get a fresh token
      await currentUser.getIdToken(true);

      // Add a small delay to ensure token is valid (helps with clock skew issues)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get a fresh token after forcing refresh
      const idToken = await currentUser.getIdToken();
      console.log("Using fresh token for delete");
      console.log("Current user:", currentUser);
      console.log("User ID:", currentUser.uid);
      console.log("User email:", currentUser.email);

      // Log the request we're about to make
      console.log(`Making DELETE request to /api/blogs/${deleteId}/`);
      console.log("With authorization header:", `Bearer ${idToken.substring(0, 10)}...`);

      // Try the delete operation - First with trailing slash
      let response;
      try {
        response = await axios.delete(`/api/blogs/${deleteId}/`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
      } catch (error) {
        // If that fails, try without trailing slash as fallback
        console.log("Delete with trailing slash failed, trying without slash");
        response = await axios.delete(`/api/blogs/${deleteId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
      }

      console.log("Delete successful:", response);

      // If successful, update UI
      setBlogs(prev => prev.filter(blog => blog._id !== deleteId));
      setShowDeleteModal(false);
      setDeleteId(null);
      setError("");

      // Trigger a refresh of the blog list
      setRefreshKey(prevKey => prevKey + 1);

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMessage.textContent = 'Blog deleted successfully';
      document.body.appendChild(successMessage);

      // Remove the success message after 3 seconds
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);

    } catch (err) {
      console.error("Delete error:", err);

      // Log detailed error information
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);
        console.error("Response headers:", err.response.headers);

        const status = err.response.status;
        const detail = err.response.data?.detail || err.message;

        // Set appropriate error message
        setError(
          status === 403
            ? "Permission denied. You can only delete your own blogs."
            : status === 404
            ? "Blog not found. It may have been already deleted."
            : `Failed to delete blog: ${detail}`
        );

        // Close the modal only for 404 errors (blog already deleted)
        if (status === 404) {
          setShowDeleteModal(false);
          setDeleteId(null);
          // Remove from UI if it's a 404
          setBlogs(prev => prev.filter(blog => blog._id !== deleteId));
        }
      } else {
        console.error("Error object:", err);
        setError(`Failed to delete blog: ${err.message}`);
      }

      // For server errors, close the modal
      if (!err.response || err.response.status >= 500) {
        setShowDeleteModal(false);
        setDeleteId(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white dark:bg-black p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-serif">
              My Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Manage your blog posts and see your stats
            </p>
          </div>
        </div>

        {/* Create New */}
        <div className="mb-8">
          <Link
            to="/create"
            className="inline-flex items-center px-5 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-md hover:shadow-lg"
          >
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" />
            </svg>
            Create New Blog
          </Link>
        </div>

        {/* Blog List */}
        <div className="bg-white dark:bg-black rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                My Blog Posts
              </h2>
              <button
                onClick={() => setRefreshKey(prevKey => prevKey + 1)}
                className="flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                disabled={loading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 mr-1 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-white"></div>
              </div>
            ) : error ? (
              <div className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                {error}
              </div>
            ) : blogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  You haven't created any blog posts yet.
                </p>
                <Link to="/create" className="text-gray-900 dark:text-white hover:underline">
                  Create your first blog post
                </Link>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-500">
                <thead className="bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-600">
                  {blogs.map(blog => (
                    <tr key={blog._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{blog.title}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {blog.created_at
                          ? formatDistanceToNow(new Date(blog.created_at), { addSuffix: true })
                          : "Unknown"}
                      </td>
                      <td className="px-6 py-4 flex space-x-4">
                        <Link to={`/blog/${blog._id}`} className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:underline">View</Link>
                        <Link to={`/edit/${blog._id}`} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1 rounded-sm text-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(blog._id)}
                          className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Delete Modal (you can customize this further) */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="bg-white dark:bg-black p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4 dark:text-white">Delete Blog</h2>
              <p className="mb-4 dark:text-gray-300">Are you sure you want to delete this blog?</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
