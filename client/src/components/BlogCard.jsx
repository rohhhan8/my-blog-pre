import React from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const BlogCard = ({ blog }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = React.useState(blog.is_liked || false);
  const [likeCount, setLikeCount] = React.useState(blog.like_count || 0);
  const [viewCount, setViewCount] = React.useState(blog.views || 0);

  // Format date in two ways for better display
  const relativeDate = blog.created_at
    ? formatDistanceToNow(new Date(blog.created_at), { addSuffix: true })
    : 'Unknown date';

  const formattedDate = blog.created_at
    ? format(new Date(blog.created_at), 'MMM d, yyyy • h:mm a')
    : 'Unknown date';

  const truncateContent = (content, maxLength = 120) => {
    if (!content) return '';

    // First, remove any line breaks to get a clean paragraph
    const cleanContent = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // For longer content (blogs without images), try to end at a sentence or punctuation
    if (maxLength > 200 && cleanContent.length > maxLength) {
      // Try to find a sentence end (period, question mark, exclamation point) near the maxLength
      const punctuationRegex = /[.!?]/g;
      const matches = [...cleanContent.matchAll(punctuationRegex)];

      // Find the last punctuation before maxLength
      let lastPunctIndex = -1;
      for (const match of matches) {
        if (match.index <= maxLength) {
          lastPunctIndex = match.index;
        } else {
          break;
        }
      }

      // If we found a punctuation mark, use it as the end point
      if (lastPunctIndex > 0) {
        return cleanContent.substring(0, lastPunctIndex + 1) + '...';
      }
    }

    // Default truncation
    return cleanContent.length <= maxLength
      ? cleanContent
      : cleanContent.substring(0, maxLength) + '...';
  };

  // Handle like/unlike
  const handleLike = async (e) => {
    e.preventDefault(); // Prevent navigation to blog detail
    e.stopPropagation(); // Stop event propagation

    if (!currentUser) {
      navigate("/login");
      return;
    }

    try {
      const idToken = await currentUser.getIdToken();
      const response = await axios.post(
        `/api/blogs/${blog._id}/like/`,
        {},
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      setIsLiked(response.data.status === 'liked');
      setLikeCount(response.data.like_count);
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  // Handle share
  const handleShare = async (e) => {
    e.preventDefault(); // Prevent navigation to blog detail
    e.stopPropagation(); // Stop event propagation

    try {
      // Ensure we're using a consistent URL format for sharing
      // Use absolute URL with origin to ensure it works properly when shared
      const shareUrl = `${window.location.origin}/blog/${blog._id}`;
      console.log("Sharing URL from BlogCard:", shareUrl);

      // Store the blog ID in localStorage to help with redirection
      localStorage.setItem('lastSharedBlogId', blog._id);

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
        console.log("Copied to clipboard:", shareUrl);

        // Use a toast notification instead of an alert
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in';
        toast.innerHTML = `
          <div class="flex flex-col">
            <span>Link copied to clipboard!</span>
            <span class="text-xs mt-1">URL: ${shareUrl}</span>
          </div>
        `;
        document.body.appendChild(toast);

        // Remove the toast after 3 seconds
        setTimeout(() => {
          toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
          setTimeout(() => {
            if (document.body.contains(toast)) {
              document.body.removeChild(toast);
            }
          }, 300);
        }, 5000);
      }
    } catch (err) {
      console.error("Error sharing:", err);
      // Show error toast
      const errorToast = document.createElement('div');
      errorToast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in';
      errorToast.textContent = `Error sharing: ${err.message}`;
      document.body.appendChild(errorToast);

      // Remove the error toast after 5 seconds
      setTimeout(() => {
        errorToast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => {
          if (document.body.contains(errorToast)) {
            document.body.removeChild(errorToast);
          }
        }, 300);
      }, 5000);
    }
  };

  // Use a consistent color based on the blog ID
  const getBlogColor = () => {
    if (!blog._id) return 'bg-blog-accent';

    // Simple hash function to get a number from the blog ID
    const hash = blog._id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-lg dark:hover:shadow-gray-700/30 hover:border-gray-300 dark:hover:border-gray-500 hover:transform hover:scale-[1.02] hover:-translate-y-1 h-[32rem] flex flex-col relative">
      <div className="flex flex-col h-full w-full">
        {/* Image if available, otherwise show a decorative header with title overlay */}
        <Link to={`/blog/${blog._id}`} className="block">
          {blog.image_url ? (
            <div className="h-40 w-full overflow-hidden">
              <img
                src={blog.image_url}
                alt={blog.title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  // Create a decorative header with blog title
                  const headerDiv = document.createElement('div');
                  headerDiv.className = 'h-40 w-full flex items-center justify-center p-4 relative';
                  headerDiv.style.backgroundColor = getBlogColor();

                  // Add a pattern overlay for visual interest
                  const patternDiv = document.createElement('div');
                  patternDiv.className = 'absolute inset-0 opacity-10';
                  patternDiv.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")';
                  headerDiv.appendChild(patternDiv);

                  // Add the title
                  const titleDiv = document.createElement('div');
                  titleDiv.className = 'text-white text-xl font-bold text-center z-10 font-playfair';
                  titleDiv.textContent = blog.title;
                  headerDiv.appendChild(titleDiv);

                  e.target.parentNode.appendChild(headerDiv);
                }}
              />
            </div>
          ) : (
            <div
              className="h-40 w-full flex items-center justify-center p-4 relative"
              style={{ backgroundColor: getBlogColor() }}
            >
              {/* Pattern overlay for visual interest */}
              <div className="absolute inset-0 opacity-10"
                style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")'}}
              ></div>

              {/* Title overlay */}
              <h2 className="text-white text-xl font-bold text-center z-10 font-playfair line-clamp-3">
                {blog.title}
              </h2>
            </div>
          )}
        </Link>

        <div className="px-5 py-4 flex-grow flex flex-col justify-between">
          <div className="flex flex-col h-full justify-between">
            <Link to={`/blog/${blog._id}`} className="block mb-auto overflow-hidden">
              {/* Only show title here if we don't have it in the header (when there's an image) */}
              {blog.image_url && (
                <h2 className="text-lg font-bold text-gray-900 dark:text-white font-playfair mb-2 line-clamp-2 h-12">
                  {blog.title}
                </h2>
              )}

              <div className="flex items-center mb-3">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium border border-gray-200 dark:border-gray-400"
                  style={{ backgroundColor: getBlogColor() }}
                >
                  {blog.author_name?.charAt(0)?.toUpperCase() || blog.author?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {blog.author_name || blog.author || 'Anonymous'}
                  </p>
                  <div className="flex flex-col">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {relativeDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded content preview for blogs without images */}
              <div className={`text-gray-700 dark:text-gray-200 text-sm overflow-hidden ${blog.image_url ? 'line-clamp-4 mb-3' : 'line-clamp-9 mb-3'}`} style={{ maxHeight: blog.image_url ? '5rem' : '13rem' }}>
                {truncateContent(blog.content, blog.image_url ? 180 : 450)}
              </div>

              {/* Add tags if available */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {blog.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>

            {/* Stats and actions - fixed at bottom */}
            <div className="flex flex-col space-y-2 mt-auto">
              {/* Stats and actions in a more visually appealing layout */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                {/* Stats row with improved styling */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {/* Views with improved styling */}
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{viewCount}</span>
                    </div>

                    {/* Likes with improved styling */}
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{likeCount}</span>
                    </div>

                    {/* Reading time estimate (new feature) */}
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {Math.max(1, Math.ceil(blog.content.split(' ').length / 200))} min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions row with improved styling */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    {/* Like button with improved styling */}
                    <button
                      onClick={handleLike}
                      className={`p-2 rounded-full transition-all duration-300 ${
                        isLiked
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-500 border border-red-200 dark:border-red-700'
                          : 'bg-white dark:bg-black text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      aria-label={isLiked ? "Unlike this post" : "Like this post"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>

                    {/* Share button with improved styling */}
                    <button
                      onClick={handleShare}
                      className="p-2 rounded-full bg-white dark:bg-black text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
                      aria-label="Share this post"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>

                  {/* Read More button with improved styling */}
                  <Link
                    to={`/blog/${blog._id}`}
                    className="inline-flex items-center px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md text-sm font-medium transition-all duration-300 hover:bg-gray-800 dark:hover:bg-gray-100 group shadow-sm"
                    aria-label="Read the full article"
                  >
                    Read More
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-2 transform transition-transform duration-300 group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

BlogCard.propTypes = {
  blog: PropTypes.shape({
    _id: PropTypes.string, // remove `.isRequired` temporarily
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    author: PropTypes.string,
    created_at: PropTypes.string,
  }).isRequired,
};


export default BlogCard;

