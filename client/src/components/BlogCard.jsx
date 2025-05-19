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

    // Then truncate
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
      const shareUrl = `${window.location.origin}/blog/${blog._id}`;

      if (navigator.share) {
        // Use Web Share API if available
        await navigator.share({
          title: blog.title,
          text: `Check out this blog post: ${blog.title}`,
          url: shareUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);

        // Use a toast notification instead of an alert
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in';
        toast.textContent = 'Link copied to clipboard!';
        document.body.appendChild(toast);

        // Remove the toast after 3 seconds
        setTimeout(() => {
          toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
          setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
      }
    } catch (err) {
      console.error("Error sharing:", err);
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
    <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-400 overflow-hidden transition-all duration-300 hover:shadow-blog-card-light-hover dark:hover:shadow-blog-card-dark-hover hover:border-gray-300 dark:hover:border-gray-300 hover:transform hover:scale-[1.02] hover:-translate-y-1">
      <div className="flex flex-col h-full">
        {/* Image if available, otherwise show color accent */}
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
                  // Show the color accent as fallback
                  const accentDiv = document.createElement('div');
                  accentDiv.className = 'h-1 w-full rounded-full';
                  accentDiv.style.backgroundColor = getBlogColor();
                  e.target.parentNode.appendChild(accentDiv);
                }}
              />
            </div>
          ) : (
            <div
              className="h-1 w-full rounded-full"
              style={{ backgroundColor: getBlogColor() }}
            ></div>
          )}
        </Link>

        <div className="p-6 flex-grow flex flex-col">
          <Link to={`/blog/${blog._id}`} className="block">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white font-playfair mb-3">
              {blog.title}
            </h2>

            <div className="flex items-center mb-4">
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

            <div className="text-gray-700 dark:text-gray-200 text-sm line-clamp-3 mb-4 flex-grow">
              {truncateContent(blog.content, 120)}
            </div>
          </Link>

          {/* Stats and actions */}
          <div className="flex flex-col space-y-3">
            {/* Stats row */}
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                {/* Views */}
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{viewCount}</span>
                </div>

                {/* Likes */}
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{likeCount}</span>
                </div>
              </div>
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {/* Like button */}
                <button
                  onClick={handleLike}
                  className={`p-1.5 rounded-full border ${
                    isLiked
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                      : 'bg-white dark:bg-black text-gray-900 dark:text-white border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>

                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="p-1.5 rounded-full border bg-white dark:bg-black text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>

              <Link to={`/blog/${blog._id}`} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-300 text-gray-900 dark:text-white rounded-md text-sm font-medium transition-all duration-300 hover:bg-gray-900 hover:text-white hover:border-gray-900 dark:hover:bg-white dark:hover:text-gray-900 dark:hover:border-white group">
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

