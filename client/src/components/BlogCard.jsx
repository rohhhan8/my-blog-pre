import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';

const BlogCard = ({ blog }) => {
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

  // Generate a random pastel color for blogs without a specific color
  const getRandomPastelColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsla(${hue}, 70%, 80%, 0.8)`;
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
      <Link to={`/blog/${blog._id}`} className="block h-full">
        <div className="flex flex-col h-full">
          {/* Image if available, otherwise show color accent */}
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

          <div className="p-6 flex-grow flex flex-col">
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

            <div className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-300 text-gray-900 dark:text-white rounded-md text-sm font-medium transition-all duration-300 hover:bg-gray-900 hover:text-white hover:border-gray-900 dark:hover:bg-white dark:hover:text-gray-900 dark:hover:border-white group">
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
            </div>
          </div>
        </div>
      </Link>
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

