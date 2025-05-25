import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getBlogById, updateBlog } from '../services/blogService';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import BLogoLoader from '../components/BLogoLoader';

const EditBlog = () => {
  const { _id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Fetch blog data
  useEffect(() => {
    const fetchBlog = async () => {
      if (!_id) {
        setError('No blog ID provided');
        setFetchLoading(false);
        return;
      }

      try {
        console.log("Fetching blog with ID:", _id);

        // Try to fetch the blog directly by ID with trailing slash
        let response;
        try {
          response = await axios.get(`/api/blogs/${_id}/`);
        } catch (error) {
          if (error.response && error.response.status === 404) {
            // If 404, try without trailing slash
            response = await axios.get(`/api/blogs/${_id}`);
          } else {
            throw error;
          }
        }

        const blogData = response.data;
        console.log("Blog data:", blogData);

        // Set form data
        setTitle(blogData.title || '');
        setContent(blogData.content || '');
        setImageUrl(blogData.image_url || '');
        setFetchLoading(false);
      } catch (err) {
        console.error("Error fetching blog:", err);
        setError('Failed to fetch blog. Please try again.');
        setFetchLoading(false);
      }
    };

    fetchBlog();
  }, [_id]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !content.trim()) {
      return setError('Title and content are required');
    }

    setLoading(true);

    try {
      // Get authentication token
      if (!currentUser) {
        setError('You must be logged in to edit a blog post');
        setLoading(false);
        return;
      }

      const idToken = await currentUser.getIdToken();

      // Create update data
      const updateData = {
        title,
        content,
        image_url: imageUrl
      };

      // Try multiple approaches to update the blog
      let response;

      try {
        // First try a direct PUT request without trailing slash
        console.log("Trying direct PUT request without trailing slash");
        response = await axios.put(
          `/api/blogs/${_id}`,
          updateData,
          {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (putError) {
        console.error("PUT request without trailing slash failed:", putError);

        try {
          // Try with trailing slash
          console.log("Trying PUT request with trailing slash");
          response = await axios.put(
            `/api/blogs/${_id}/`,
            updateData,
            {
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (putWithSlashError) {
          console.error("PUT request with trailing slash failed:", putWithSlashError);

          try {
            // If both PUT attempts fail, try PATCH
            console.log("Trying PATCH request");
            response = await axios.patch(
              `/api/blogs/${_id}`,
              updateData,
              {
                headers: {
                  'Authorization': `Bearer ${idToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
          } catch (patchError) {
            console.error("PATCH request failed:", patchError);

            try {
              // Final fallback: use axios with method override
              console.log("Trying final fallback with axios request");
              response = await axios({
                method: 'post',
                url: `/api/blogs/${_id}/`,
                data: {
                  ...updateData,
                  _method: 'PUT'
                },
                headers: {
                  'Authorization': `Bearer ${idToken}`,
                  'Content-Type': 'application/json',
                  'X-HTTP-Method-Override': 'PUT'
                }
              });
            } catch (postError) {
              console.error("POST with method override failed:", postError);

              // Last resort: try a direct fetch request
              console.log("Trying direct fetch request as last resort");

              const fetchResponse = await fetch(`/api/blogs/${_id}/`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${idToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
              });

              if (!fetchResponse.ok) {
                throw new Error(`Fetch request failed with status ${fetchResponse.status}`);
              }

              response = { data: await fetchResponse.json() };
            }
          }
        }
      }

      console.log("Update successful:", response.data);
      setSuccess('Blog updated successfully! Redirecting...');

      // Redirect after a short delay
      setTimeout(() => {
        navigate(`/blog/${_id}`);
      }, 1500);
    } catch (err) {
      console.error("Error updating blog:", err);

      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);

        if (err.response.status === 403) {
          setError('Permission denied. You do not have permission to edit this blog.');
        } else if (err.response.status === 404) {
          setError('Blog not found. It may have been deleted.');
        } else if (err.response.status === 500) {
          setError('Server error. Please try again later or contact support.');
        } else if (err.response.status === 400) {
          // Bad request - show validation errors
          const errorDetail = err.response.data?.detail || JSON.stringify(err.response.data);
          setError(`Validation error: ${errorDetail}`);
        } else {
          setError(`Error (${err.response.status}): ${err.response.data?.detail || err.response.statusText || 'Failed to update blog'}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error("Request made but no response received:", err.request);
        setError('No response from server. Please check your connection and try again.');
      } else {
        // Something happened in setting up the request
        console.error("Error setting up request:", err.message);
        setError(`Error: ${err.message}`);
      }

      setLoading(false);
    }
  };

  // Loading state
  if (fetchLoading) {
    return <BLogoLoader />;
  }

  // Error state
  if (error && !title && !content) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-white dark:bg-black px-4">
        <div className="max-w-md w-full bg-white dark:bg-black p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Error</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200 pt-24 sm:pt-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 md:p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-playfair mb-4">
              Edit Blog Post
            </h1>

            {error && (
              <div className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 p-3 rounded-md mb-6 text-sm border border-gray-200 dark:border-gray-700">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 p-3 rounded-md mb-6 text-sm border border-green-200 dark:border-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                id="title"
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a catchy title"
                required
              />

              <Input
                id="imageUrl"
                label="Image URL (optional)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Enter an image URL for your blog"
              />

              <div className="space-y-1">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your blog content here..."
                  rows={8}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blog-accent focus:border-blog-accent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/blog/${_id}`)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Post'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBlog;
