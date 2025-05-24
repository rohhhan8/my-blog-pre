import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { deleteBlog, getLikedBlogs, getAllBlogs } from "../services/blogService";
import apiClient from "../services/apiClient";
import BLogoLoader from "../components/BLogoLoader";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [likedBlogs, setLikedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedLoading, setLikedLoading] = useState(true);
  const [error, setError] = useState("");
  const [likedError, setLikedError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger a refresh
  const [activeTab, setActiveTab] = useState("myBlogs"); // "myBlogs" or "likedBlogs"
  const [blogStats, setBlogStats] = useState({}); // Store view and like counts

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const fetchUserBlogs = async () => {
      setLoading(true);
      setError("");

      try {
        // Check if we have cached user blogs in sessionStorage
        const cachedUserBlogs = sessionStorage.getItem('cachedUserBlogs');
        const cacheTimestamp = sessionStorage.getItem('userBlogsCacheTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
        const cacheValid = cacheAge < 2 * 60 * 1000; // 2 minutes cache validity

        // If we have valid cached user blogs, use them immediately
        if (cachedUserBlogs && cacheValid) {
          try {
            const parsedUserBlogs = JSON.parse(cachedUserBlogs);
            if (Array.isArray(parsedUserBlogs)) {
              console.log("Using cached user blogs from sessionStorage");

              // Process blogs to replace "Official Editz" with "Kuldeep"
              const processedBlogs = parsedUserBlogs.map(blog => {
                if (blog.author_name === 'Official Editz') {
                  blog.author_name = 'Kuldeep';
                }
                if (blog.author === 'Official Editz') {
                  blog.author = 'Kuldeep';
                }
                return blog;
              });

              setBlogs(processedBlogs);

              // Set loading to false immediately
              setLoading(false);

              // Refresh in the background
              refreshUserBlogsInBackground();
              return;
            }
          } catch (cacheError) {
            console.error("Error parsing cached user blogs:", cacheError);
          }
        }

        // Simple approach: Just fetch all blogs without authentication
        // This is a fallback approach that should work regardless of auth issues
        try {
          console.log("Fetching all blogs without authentication");
          const response = await getAllBlogs();

          if (Array.isArray(response) && response.length > 0) {
            console.log("All blogs fetched:", response);

            // Process blogs to replace "Official Editz" with "Kuldeep"
            const processedBlogs = response.map(blog => {
              if (blog.author_name === 'Official Editz') {
                blog.author_name = 'Kuldeep';
              }
              if (blog.author === 'Official Editz') {
                blog.author = 'Kuldeep';
              }
              return blog;
            });

            // Filter blogs by the current user
            const userBlogs = processedBlogs.filter(blog => {
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

              // Special case for "Official Editz" / "Kuldeep"
              if (blog.author === 'Kuldeep' || blog.author_name === 'Kuldeep') {
                console.log(`  This is Kuldeep's blog`);
                return true;
              }

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

            // Cache the user blogs in sessionStorage
            try {
              sessionStorage.setItem('cachedUserBlogs', JSON.stringify(userBlogs));
              sessionStorage.setItem('userBlogsCacheTimestamp', Date.now().toString());
            } catch (storageError) {
              console.error("Error caching user blogs:", storageError);
            }

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

        // Set auth token in apiClient
        apiClient.setAuthToken(idToken);

        // Try to fetch all blogs with authentication
        try {
          const authResponse = await apiClient.get("/blogs/");
          console.log("Blogs fetched with apiClient:", authResponse.data);

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

            console.log("Final user blogs from apiClient:", userBlogs);
            setBlogs(userBlogs);

            // Cache the user blogs in sessionStorage
            try {
              sessionStorage.setItem('cachedUserBlogs', JSON.stringify(userBlogs));
              sessionStorage.setItem('userBlogsCacheTimestamp', Date.now().toString());
            } catch (storageError) {
              console.error("Error caching user blogs:", storageError);
            }

            return;
          }
        } catch (apiClientError) {
          console.error("Error fetching blogs with apiClient:", apiClientError);
        }

        // Fallback to direct axios call
        const authResponse = await axios.get("/api/blogs/", {
          headers: { Authorization: `Bearer ${idToken}` }
        });

        console.log("Blogs fetched with direct axios:", authResponse.data);

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

          console.log("Final user blogs from direct axios:", userBlogs);
          setBlogs(userBlogs);

          // Cache the user blogs in sessionStorage
          try {
            sessionStorage.setItem('cachedUserBlogs', JSON.stringify(userBlogs));
            sessionStorage.setItem('userBlogsCacheTimestamp', Date.now().toString());
          } catch (storageError) {
            console.error("Error caching user blogs:", storageError);
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load your blogs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Function to refresh user blogs in the background
    const refreshUserBlogsInBackground = async () => {
      try {
        console.log("Refreshing user blogs in background");

        // Get a fresh token
        const idToken = await currentUser.getIdToken(true);

        // Set auth token in apiClient
        apiClient.setAuthToken(idToken);

        // Try to fetch all blogs
        const response = await getAllBlogs();

        if (Array.isArray(response) && response.length > 0) {
          // Process blogs to replace "Official Editz" with "Kuldeep"
          const processedBlogs = response.map(blog => {
            if (blog.author_name === 'Official Editz') {
              blog.author_name = 'Kuldeep';
            }
            if (blog.author === 'Official Editz') {
              blog.author = 'Kuldeep';
            }
            return blog;
          });

          // Filter blogs by the current user
          const userBlogs = processedBlogs.filter(blog => {
            // Extract author identifier based on different possible formats
            let authorId;
            if (typeof blog.author === "object") {
              authorId = blog.author.id || blog.author._id || blog.author.username;
            } else {
              authorId = blog.author;
            }

            // Special case for "Official Editz" / "Kuldeep"
            if (blog.author === 'Kuldeep' || blog.author_name === 'Kuldeep') {
              return true;
            }

            // Compare with multiple possible user identifiers
            return (
              authorId === currentUser.uid ||
              authorId === currentUser.email ||
              (blog.author_id && blog.author_id.toString() === currentUser.uid) ||
              (blog.author_name && currentUser.displayName &&
                blog.author_name.includes(currentUser.displayName))
            );
          });

          console.log("Updated user blogs in background:", userBlogs);
          setBlogs(userBlogs);

          // Update cache
          try {
            sessionStorage.setItem('cachedUserBlogs', JSON.stringify(userBlogs));
            sessionStorage.setItem('userBlogsCacheTimestamp', Date.now().toString());
          } catch (storageError) {
            console.error("Error updating cached user blogs:", storageError);
          }
        }
      } catch (err) {
        console.error("Error refreshing user blogs in background:", err);
      }
    };

    fetchUserBlogs();
  }, [currentUser, navigate, refreshKey]); // Add refreshKey to dependencies to trigger refresh

  // Fetch liked blogs
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const fetchLikedBlogs = async () => {
      setLikedLoading(true);
      setLikedError("");

      try {
        // Check if we have cached liked blogs in sessionStorage
        const cachedLikedBlogs = sessionStorage.getItem('cachedLikedBlogs');
        const cacheTimestamp = sessionStorage.getItem('likedBlogsCacheTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
        const cacheValid = cacheAge < 2 * 60 * 1000; // 2 minutes cache validity

        // If we have valid cached liked blogs, use them immediately
        if (cachedLikedBlogs && cacheValid) {
          try {
            const parsedLikedBlogs = JSON.parse(cachedLikedBlogs);
            if (Array.isArray(parsedLikedBlogs)) {
              console.log("Using cached liked blogs from sessionStorage");

              // Process blogs to replace "Official Editz" with "Kuldeep"
              const processedBlogs = parsedLikedBlogs.map(blog => {
                if (blog.author_name === 'Official Editz') {
                  blog.author_name = 'Kuldeep';
                }
                if (blog.author === 'Official Editz') {
                  blog.author = 'Kuldeep';
                }
                // Ensure is_liked is set to true for all blogs in the liked section
                blog.is_liked = true;
                return blog;
              });

              setLikedBlogs(processedBlogs);

              // Extract stats for each blog
              const stats = {};
              processedBlogs.forEach(blog => {
                stats[blog._id] = {
                  views: blog.views || 0,
                  likes: blog.like_count || 0
                };
              });
              setBlogStats(prevStats => ({ ...prevStats, ...stats }));

              // Set loading to false immediately
              setLikedLoading(false);

              // Refresh in the background
              refreshLikedBlogsInBackground();
              return;
            }
          } catch (cacheError) {
            console.error("Error parsing cached liked blogs:", cacheError);
          }
        }

        // Get a fresh token
        const idToken = await currentUser.getIdToken(true);

        console.log("Fetching liked blogs for user:", currentUser.uid);

        // Fetch liked blogs using our service
        const likedBlogsData = await getLikedBlogs(idToken);

        console.log("Liked blogs fetched:", likedBlogsData);

        // Process blogs to replace "Official Editz" with "Kuldeep"
        const processedBlogs = Array.isArray(likedBlogsData) ? likedBlogsData.map(blog => {
          if (blog.author_name === 'Official Editz') {
            blog.author_name = 'Kuldeep';
          }
          if (blog.author === 'Official Editz') {
            blog.author = 'Kuldeep';
          }
          // Ensure is_liked is set to true for all blogs in the liked section
          blog.is_liked = true;
          return blog;
        }) : [];

        setLikedBlogs(processedBlogs);

        // Cache the liked blogs in sessionStorage
        try {
          sessionStorage.setItem('cachedLikedBlogs', JSON.stringify(processedBlogs));
          sessionStorage.setItem('likedBlogsCacheTimestamp', Date.now().toString());
        } catch (storageError) {
          console.error("Error caching liked blogs:", storageError);
        }

        // Extract stats for each blog
        const stats = {};
        if (Array.isArray(likedBlogsData)) {
          likedBlogsData.forEach(blog => {
            stats[blog._id] = {
              views: blog.views || 0,
              likes: blog.like_count || 0
            };
          });
          setBlogStats(prevStats => ({ ...prevStats, ...stats }));
        }
      } catch (err) {
        console.error("Error fetching liked blogs:", err);
        setLikedError("Failed to load your liked blogs. Please try again.");

        // Try to get liked blogs from localStorage as fallback
        try {
          console.log("Trying to get liked blogs from localStorage");
          const likedBlogsMap = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
          const likedBlogIds = Object.keys(likedBlogsMap).filter(id => likedBlogsMap[id]);

          if (likedBlogIds.length > 0) {
            console.log("Found liked blog IDs in localStorage:", likedBlogIds);
            setLikedError("Using cached liked blogs. Some information may be outdated.");
          }
        } catch (storageErr) {
          console.error("Error reading from localStorage:", storageErr);
        }

        // Show more detailed error message
        if (err.response) {
          console.error("Response status:", err.response.status);
          console.error("Response data:", err.response.data);
          setLikedError(`Failed to load liked blogs: ${err.response.data?.detail || err.message}`);
        }
      } finally {
        setLikedLoading(false);
      }
    };

    // Function to refresh liked blogs in the background
    const refreshLikedBlogsInBackground = async () => {
      try {
        // Get a fresh token
        const idToken = await currentUser.getIdToken(true);

        console.log("Refreshing liked blogs in background");
        const likedBlogsData = await getLikedBlogs(idToken);

        if (Array.isArray(likedBlogsData)) {
          // Process blogs to replace "Official Editz" with "Kuldeep"
          const processedBlogs = likedBlogsData.map(blog => {
            if (blog.author_name === 'Official Editz') {
              blog.author_name = 'Kuldeep';
            }
            if (blog.author === 'Official Editz') {
              blog.author = 'Kuldeep';
            }
            // Ensure is_liked is set to true for all blogs in the liked section
            blog.is_liked = true;
            return blog;
          });

          setLikedBlogs(processedBlogs);

          // Update cache
          try {
            sessionStorage.setItem('cachedLikedBlogs', JSON.stringify(processedBlogs));
            sessionStorage.setItem('likedBlogsCacheTimestamp', Date.now().toString());
          } catch (storageError) {
            console.error("Error updating cached liked blogs:", storageError);
          }

          // Extract stats for each blog
          const stats = {};
          likedBlogsData.forEach(blog => {
            stats[blog._id] = {
              views: blog.views || 0,
              likes: blog.like_count || 0
            };
          });
          setBlogStats(prevStats => ({ ...prevStats, ...stats }));
        }
      } catch (err) {
        console.error("Error refreshing liked blogs in background:", err);
      }
    };

    fetchLikedBlogs();
  }, [currentUser, refreshKey]);

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

      // Optimistically remove the blog from the UI
      setBlogs(prev => prev.filter(blog => blog._id !== deleteId));

      // Store the blog in localStorage in case we need to restore it
      try {
        localStorage.setItem(`deletedBlog_${deleteId}`, JSON.stringify(blogToDelete));
      } catch (storageErr) {
        console.error("Error storing blog in localStorage:", storageErr);
      }

      // Force token refresh to get a fresh token
      await currentUser.getIdToken(true);

      // Add a small delay to ensure token is valid (helps with clock skew issues)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get a fresh token after forcing refresh
      const idToken = await currentUser.getIdToken();
      console.log("Using fresh token for delete");

      // Store token in localStorage
      localStorage.setItem('authToken', idToken);

      // Store user info in localStorage
      localStorage.setItem('userInfo', JSON.stringify({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || ''
      }));

      // Set the token in apiClient
      apiClient.setAuthToken(idToken, {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || ''
      });

      // Add custom headers to help with authentication
      const customHeaders = {
        'X-User-ID': currentUser.uid,
        'X-User-Email': currentUser.email,
        'X-User-Display-Name': currentUser.displayName || '',
        'X-Firebase-UID': currentUser.uid,  // Add Firebase UID explicitly
        'uid': currentUser.uid,  // Add uid directly for Firebase auth
        'firebase-uid': currentUser.uid,  // Alternative format
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      // Use our blog service to delete the blog with custom headers
      try {
        const response = await deleteBlog(deleteId, idToken, customHeaders);
        console.log("Delete successful:", response);

        // Update cached blogs in sessionStorage
        try {
          const cachedBlogs = JSON.parse(sessionStorage.getItem('cachedBlogs') || '[]');
          const updatedBlogs = cachedBlogs.filter(blog => blog._id !== deleteId);
          sessionStorage.setItem('cachedBlogs', JSON.stringify(updatedBlogs));
          console.log(`Removed blog ${deleteId} from cached blogs in sessionStorage`);
        } catch (storageErr) {
          console.error("Error updating sessionStorage:", storageErr);
        }

        // Update cached user blogs in sessionStorage
        try {
          const cachedUserBlogs = JSON.parse(sessionStorage.getItem('cachedUserBlogs') || '[]');
          const updatedUserBlogs = cachedUserBlogs.filter(blog => blog._id !== deleteId);
          sessionStorage.setItem('cachedUserBlogs', JSON.stringify(updatedUserBlogs));
          console.log(`Removed blog ${deleteId} from cached user blogs in sessionStorage`);
        } catch (storageErr) {
          console.error("Error updating sessionStorage:", storageErr);
        }

        // Close the modal
        setShowDeleteModal(false);
        setDeleteId(null);
        setError("");

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

        // Trigger a refresh of the blog list
        setTimeout(() => {
          setRefreshKey(prevKey => prevKey + 1);
        }, 1000);

        return;
      } catch (deleteError) {
        console.error("Error with deleteBlog service:", deleteError);
        // Continue to alternative approaches
      }

      // If the service function failed, try a direct fetch approach
      try {
        console.log("Trying direct fetch approach");

        // Add a timestamp to avoid caching issues
        const timestamp = new Date().getTime();
        const url = `/api/blogs/${deleteId}/?_=${timestamp}`;

        // Extract uid directly from token for Firebase auth
        let uid = '';
        try {
          const tokenParts = idToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            uid = payload.user_id || payload.sub || '';

            // If uid is still missing, try to extract from other fields
            if (!uid && payload.firebase && payload.firebase.identities && payload.firebase.identities.email) {
              uid = payload.firebase.identities.email[0];
              console.log("Using email as uid fallback:", uid);
            }

            // If still no uid but we have email, use that
            if (!uid && payload.email) {
              uid = payload.email;
              console.log("Using email as uid fallback:", uid);
            }

            // Log the full token payload for debugging
            console.log("Token payload for debugging:", payload);
          }
        } catch (tokenError) {
          console.error('Error extracting uid from token:', tokenError);
        }

        const fetchResponse = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
            'uid': uid || currentUser.uid,  // Add uid directly for Firebase auth
            'firebase-uid': uid || currentUser.uid,  // Alternative format
            'X-Firebase-UID': uid || currentUser.uid,  // Another alternative format
            'X-User-UID': uid || currentUser.uid,  // Another format
            'X-User-Email': currentUser.email,
            'X-User-Display-Name': currentUser.displayName || '',
            'X-Blog-Author': 'true',  // Indicate this user is the author
            ...customHeaders
          }
        });

        if (!fetchResponse.ok) {
          throw new Error(`Fetch delete failed with status ${fetchResponse.status}`);
        }

        console.log("Delete successful with fetch API:", fetchResponse);

        // Update cached blogs in sessionStorage
        try {
          const cachedBlogs = JSON.parse(sessionStorage.getItem('cachedBlogs') || '[]');
          const updatedBlogs = cachedBlogs.filter(blog => blog._id !== deleteId);
          sessionStorage.setItem('cachedBlogs', JSON.stringify(updatedBlogs));
        } catch (storageErr) {
          console.error("Error updating sessionStorage:", storageErr);
        }

        // Close the modal
        setShowDeleteModal(false);
        setDeleteId(null);
        setError("");

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

        // Trigger a refresh of the blog list
        setTimeout(() => {
          setRefreshKey(prevKey => prevKey + 1);
        }, 1000);

        return;
      } catch (fetchError) {
        console.error("Fetch delete approach failed:", fetchError);
      }

      // If all delete attempts failed, restore the blog in the UI
      setBlogs(prev => {
        // Check if the blog is already in the list
        if (prev.some(blog => blog._id === deleteId)) {
          return prev;
        }
        // Otherwise, restore it
        return blogToDelete ? [...prev, blogToDelete] : prev;
      });

      throw new Error("All delete attempts failed");
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
    <div className="min-h-screen bg-white dark:bg-black page-content">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white dark:bg-black p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-serif">
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
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
              <div className="flex flex-wrap gap-4 sm:space-x-4 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab("myBlogs")}
                  className={`text-base sm:text-lg font-medium pb-2 border-b-2 transition-colors ${
                    activeTab === "myBlogs"
                      ? "text-gray-900 dark:text-white border-gray-900 dark:border-white"
                      : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  My Blog Posts
                </button>
                <button
                  onClick={() => setActiveTab("likedBlogs")}
                  className={`text-base sm:text-lg font-medium pb-2 border-b-2 transition-colors ${
                    activeTab === "likedBlogs"
                      ? "text-gray-900 dark:text-white border-gray-900 dark:border-white"
                      : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Liked Blogs
                </button>
              </div>
              <button
                onClick={() => setRefreshKey(prevKey => prevKey + 1)}
                className="flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                disabled={loading || likedLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 mr-1 ${(loading || likedLoading) ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {(loading || likedLoading) ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* My Blogs Tab */}
            {activeTab === "myBlogs" && (
              <>
                {loading ? (
                  <div className="py-8">
                    <BLogoLoader />
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
                  <div className="overflow-x-auto -mx-4 sm:-mx-6">
                    {/* Mobile view - card layout */}
                    <div className="grid grid-cols-1 gap-4 mb-4 sm:hidden">
                      {blogs.map(blog => (
                        <div key={blog._id} className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-start">
                              <h3 className="text-gray-800 dark:text-gray-200 font-medium text-lg">{blog.title}</h3>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {blog.created_at
                                  ? formatDistanceToNow(new Date(blog.created_at), { addSuffix: true })
                                  : "Unknown"}
                              </div>
                            </div>

                            {/* Preview of content if available */}
                            {blog.content && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                {blog.content.substring(0, 100)}...
                              </div>
                            )}
                          </div>

                          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-300 text-sm">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {blog.views || 0}
                                </div>
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                  </svg>
                                  {blog.like_count || 0}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between w-full px-4 py-3">
                              <Link
                                to={`/blog/${blog._id}`}
                                className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </Link>
                              <Link
                                to={`/edit/${blog._id}`}
                                className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDeleteClick(blog._id)}
                                className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop view - table layout */}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-500 hidden sm:table">
                      <thead className="bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider hidden md:table-cell">Stats</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-600">
                        {blogs.map(blog => (
                          <tr key={blog._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="px-6 py-4">
                              <div className="text-gray-800 dark:text-gray-200 font-medium">{blog.title}</div>
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                              {blog.created_at
                                ? formatDistanceToNow(new Date(blog.created_at), { addSuffix: true })
                                : "Unknown"}
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {blog.views || 0}
                                </div>
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                  </svg>
                                  {blog.like_count || 0}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-4 whitespace-nowrap">
                                <Link
                                  to={`/blog/${blog._id}`}
                                  className="inline-flex items-center justify-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </Link>
                                <Link
                                  to={`/edit/${blog._id}`}
                                  className="inline-flex items-center justify-center px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </Link>
                                <button
                                  onClick={() => handleDeleteClick(blog._id)}
                                  className="inline-flex items-center justify-center px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Liked Blogs Tab */}
            {activeTab === "likedBlogs" && (
              <>
                {likedLoading ? (
                  <div className="py-8">
                    <BLogoLoader />
                  </div>
                ) : likedError ? (
                  <div className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                    {likedError}
                  </div>
                ) : likedBlogs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      You haven't liked any blog posts yet.
                    </p>
                    <Link to="/" className="text-gray-900 dark:text-white hover:underline">
                      Explore blogs to like
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:-mx-6">
                    {/* Mobile view - card layout */}
                    <div className="grid grid-cols-1 gap-4 mb-4 sm:hidden">
                      {likedBlogs.map(blog => (
                        <div key={blog._id} className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-start">
                              <h3 className="text-gray-800 dark:text-gray-200 font-medium text-lg">{blog.title}</h3>
                            </div>

                            <div className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                              By {blog.author_name || "Anonymous"}
                            </div>

                            {/* Preview of content if available */}
                            {blog.content && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                {blog.content.substring(0, 100)}...
                              </div>
                            )}
                          </div>

                          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-300 text-sm">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {blog.views || 0}
                                </div>
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                  </svg>
                                  {blog.like_count || 0}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center w-full px-4 py-3">
                              <Link
                                to={`/blog/${blog._id}`}
                                className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Blog
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop view - table layout */}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-500 hidden sm:table">
                      <thead className="bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Author</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider hidden md:table-cell">Stats</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-600">
                        {likedBlogs.map(blog => (
                          <tr key={blog._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="px-6 py-4">
                              <div className="text-gray-800 dark:text-gray-200 font-medium">{blog.title}</div>
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                              {blog.author_name || "Anonymous"}
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {blog.views || 0}
                                </div>
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                  </svg>
                                  {blog.like_count || 0}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <Link
                                  to={`/blog/${blog._id}`}
                                  className="inline-flex items-center justify-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
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
