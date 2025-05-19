import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

const CreateBlog = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError("Please select an image file");
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setImageFile(file);
    setError(""); // Clear any previous errors

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);
    setPreviewImage(true);
  };

  // Upload image to a storage service (like Firebase Storage)
  const uploadImage = async (file, idToken) => {
    if (!file) return null;

    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('image', file);

      // Upload the image to your server or a storage service
      const uploadResponse = await axios.post('/api/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${idToken}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      // Return the URL of the uploaded image
      return uploadResponse.data.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image. " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !content.trim()) {
      return setError("Title and content are required");
    }

    if (!currentUser) {
      return setError("You must be logged in to create a blog post.");
    }

    setLoading(true);

    try {
      const idToken = await currentUser.getIdToken();

      // Make sure we're using the correct API endpoint
      const backendUrl = "/api/blogs/";
      console.log("Posting to:", backendUrl);

      // If we have a file, upload it first
      let finalImageUrl = imageUrl;
      if (imageFile) {
        try {
          finalImageUrl = await uploadImage(imageFile, idToken);
        } catch (uploadError) {
          // If upload fails but we have a URL, we can still proceed
          if (!imageUrl) {
            throw uploadError; // Rethrow if we don't have a fallback URL
          }
          console.warn("Image upload failed, using provided URL instead:", uploadError);
        }
      }

      // Create the blog post
      const response = await axios.post(
        backendUrl,
        {
          title,
          content,
          image_url: finalImageUrl?.trim() || null
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const newBlogId = response.data._id || response.data.id;
      if (!newBlogId) {
        throw new Error("No blog ID returned from server");
      }

      navigate(`/blog/${newBlogId}`);
    } catch (err) {
      console.error("Failed to create blog:", err);
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.detail ||
            err.response?.data?.message ||
            err.message ||
            "Failed to create blog"
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200 pt-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 md:p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-playfair mb-6">
              Create New Blog Post
            </h1>

            {error && (
              <div className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 p-3 rounded-md mb-6 text-sm border border-gray-200 dark:border-gray-700">
                {error}
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

              <div className="space-y-1">
                <label
                  htmlFor="bannerImage"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Banner Image (optional)
                </label>

                {/* File Upload */}
                <div className="mt-1">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="dropzone-file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 hover:bg-gray-100 dark:border-gray-600"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg
                          className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 20 16"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                          />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG or GIF (MAX. 5MB)
                        </p>
                      </div>
                      <input
                        id="dropzone-file"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                    <div
                      className="bg-blog-accent h-2.5 rounded-full dark:bg-blue-500"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}

                {/* OR Divider */}
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                  <span className="flex-shrink mx-4 text-gray-400 dark:text-gray-500 text-sm">OR</span>
                  <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                </div>

                {/* Image URL Input */}
                <label
                  htmlFor="imageUrl"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Image URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="url"
                    name="imageUrl"
                    id="imageUrl"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blog-accent focus:border-blog-accent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImageFile(null); // Clear file selection when URL is entered
                    }}
                  />
                </div>

                {/* Image Preview */}
                {imageUrl && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(!previewImage)}
                      className="text-sm text-blog-accent hover:text-blog-accent/80 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {previewImage ? 'Hide preview' : 'Show preview'}
                    </button>
                    {previewImage && (
                      <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                        <img
                          src={imageUrl}
                          alt="Banner preview"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/800x400?text=Invalid+Image+URL';
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your blog content here..."
                  rows={12}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blog-accent focus:border-blog-accent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? "Creating..." : "Create Post"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBlog;
