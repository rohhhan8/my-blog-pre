import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../services/profileService';
import { likeBlog } from '../services/blogService';
import axios from 'axios';

const BlogCard = ({ blog }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  // Check localStorage for liked status
  const checkLocalLikedStatus = () => {
    try {
      const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
      return likedBlogs[blog._id] === true;
    } catch (err) {
      console.error("Error reading liked status from localStorage:", err);
      return false;
    }
  };

  const [isLiked, setIsLiked] = useState(blog.is_liked || checkLocalLikedStatus() || false);
  const [likeCount, setLikeCount] = useState(blog.like_count || 0);
  const [viewCount, setViewCount] = useState(blog.views || 0);
  const [authorProfile, setAuthorProfile] = useState(null);

  // Force the author name to be "Kuldeep" if it's "Official Editz"
  const initialAuthorName =
    blog.author_name === 'Official Editz' ? 'Kuldeep' :
    blog.author === 'Official Editz' ? 'Kuldeep' :
    blog.author_name || blog.author || 'Anonymous';

  const [authorName, setAuthorName] = useState(initialAuthorName);

  // Check localStorage for cached author name when component mounts
  useEffect(() => {
    // If the author is "Official Editz", always use "Kuldeep" instead
    if (blog.author_name === 'Official Editz' || blog.author === 'Official Editz') {
      setAuthorName('Kuldeep');
      console.log(`Forcing author name to Kuldeep for "${blog.title}"`);
      return; // Skip other checks
    }

    const authorToFetch = blog.author_name || blog.author;
    if (!authorToFetch) return;

    // First check if this is the current user's blog
    try {
      const currentUserProfile = localStorage.getItem('currentUserProfile');
      if (currentUserProfile) {
        const userData = JSON.parse(currentUserProfile);
        if (userData.old_name === authorToFetch && userData.display_name) {
          setAuthorName(userData.display_name);
          console.log(`Using current user's updated name for "${blog.title}": ${userData.display_name}`);
          return; // Skip other checks if we've found a match
        }
      }
    } catch (error) {
      console.error("Error checking current user profile:", error);
    }

    // Then check if we have a cached name in localStorage
    try {
      const cachedAuthor = localStorage.getItem(`author_${authorToFetch}`);
      if (cachedAuthor) {
        const authorData = JSON.parse(cachedAuthor);
        if (authorData.display_name) {
          setAuthorName(authorData.display_name);
          console.log(`Using cached author name for "${blog.title}": ${authorData.display_name}`);
        }
      }
    } catch (error) {
      console.error("Error reading cached author data:", error);
    }

    // Then fetch the latest profile in the background
    const fetchAuthorProfile = async () => {
      try {
        // Force cache busting by adding a timestamp to the request
        const timestamp = new Date().getTime();
        const profile = await getUserProfile(`${authorToFetch}?_=${timestamp}`);

        if (profile && profile.display_name) {
          setAuthorProfile(profile);
          setAuthorName(profile.display_name);
          console.log(`Updated author name for blog "${blog.title}" to: ${profile.display_name}`);

          // Update localStorage with the latest name to ensure consistency
          localStorage.setItem(`author_${authorToFetch}`, JSON.stringify({
            display_name: profile.display_name,
            timestamp: new Date().toISOString()
          }));

          // Also update the lastViewedAuthor for profile navigation
          localStorage.setItem('lastViewedAuthor', JSON.stringify({
            username: authorToFetch,
            display_name: profile.display_name,
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error("Error fetching author profile for blog card:", error);
        // Keep using the original author name if profile fetch fails
      }
    };

    fetchAuthorProfile();
  }, [blog.author_name, blog.author, blog.title]);

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

    // Show immediate visual feedback
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount(prevCount => wasLiked ? prevCount - 1 : prevCount + 1);

    // Add a visual pulse effect to the like button
    const likeButton = e.currentTarget;
    likeButton.classList.add('scale-125');
    setTimeout(() => {
      likeButton.classList.remove('scale-125');
    }, 200);

    try {
      const idToken = await currentUser.getIdToken();

      // Use our likeBlog service function
      const response = await likeBlog(blog._id, idToken);

      // Update with the actual server response
      const newLikeStatus = response.status === 'liked';
      setIsLiked(newLikeStatus);
      setLikeCount(response.like_count);

      console.log("Like response:", response);
    } catch (err) {
      console.error("Error liking post:", err);
      // Revert to original state if there was an error
      setIsLiked(wasLiked);
      setLikeCount(prevCount => wasLiked ? prevCount + 1 : prevCount - 1);
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

  // Generate a random color for each blog card
  const getBlogColor = () => {
    if (!blog._id) return '#000000'; // Default to black if no ID

    // Use a hash of the blog ID to generate a consistent color for each blog
    const hash = blog._id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Define a set of dark, vibrant colors for better contrast with white text
    const colorPalette = [
      '#000000', // Black
      '#1a1a1a', // Almost black
      '#2d3748', // Dark slate gray
      '#1a365d', // Dark blue
      '#2c5282', // Navy blue
      '#2b6cb0', // Royal blue
      '#2c7a7b', // Teal
      '#285e61', // Dark teal
      '#22543d', // Dark green
      '#276749', // Forest green
      '#2f855a', // Green
      '#744210', // Brown
      '#7b341e', // Rust
      '#9c4221', // Brick
      '#c53030', // Red
      '#b7791f', // Amber
      '#975a16', // Yellow
      '#702459', // Purple
      '#521b41', // Plum
      '#6b46c1', // Indigo
      '#4c51bf', // Blue
      '#434190', // Indigo
    ];

    // Use the hash to select a color from the palette
    const colorIndex = Math.abs(hash) % colorPalette.length;
    return colorPalette[colorIndex];
  };

  // Function to determine if text should be white or black based on background color
  const getTextColor = (bgColor) => {
    // Convert hex to RGB
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);

    // Calculate luminance - a measure of how bright the color appears
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return white for dark backgrounds, black for light backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  // Get the background color and text color for this blog card
  const bgColor = getBlogColor();
  const textColor = getTextColor(bgColor);

  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-300 hover:transform hover:scale-[1.02] hover:-translate-y-1 h-[24rem] flex flex-col relative"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex flex-col h-full w-full">
        {/* Image if available, otherwise show a decorative header with title overlay */}
        <Link to={`/blog/${blog._id}`} className="block">
          {blog.image_url ? (
            <div className="h-32 w-full overflow-hidden">
              <img
                src={blog.image_url}
                alt={blog.title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  // Create a decorative header with blog title
                  const headerDiv = document.createElement('div');
                  headerDiv.className = 'h-32 w-full flex items-center justify-center p-4 relative';
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
              className="h-32 w-full flex items-center justify-center p-4 relative"
              style={{ backgroundColor: getBlogColor() }}
            >
              {/* Pattern overlay for visual interest */}
              <div className="absolute inset-0 opacity-10"
                style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")'}}
              ></div>

              {/* Title overlay */}
              <h2 className="text-xl font-bold text-center z-10 font-playfair line-clamp-3" style={{ color: textColor }}>
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
                <h2 className="text-lg font-bold font-playfair mb-2 line-clamp-2 h-12" style={{ color: textColor }}>
                  {blog.title}
                </h2>
              )}

              <div className="flex items-center mb-3">
                <Link
                  to={`/profile/${encodeURIComponent(authorName)}`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent navigating to blog detail

                    // Store the author info in localStorage to help with profile lookup
                    localStorage.setItem('lastViewedAuthor', JSON.stringify({
                      username: authorName,
                      display_name: authorName,
                      timestamp: new Date().toISOString()
                    }));
                  }}
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center font-medium border border-white/30 hover:shadow-md transition-shadow"
                    style={{ backgroundColor: bgColor, color: textColor }}
                  >
                    {authorName?.charAt(0)?.toUpperCase() || blog.author_name?.charAt(0)?.toUpperCase() || blog.author?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                </Link>
                <div className="ml-3">
                  <Link
                    to={`/profile/${encodeURIComponent(authorName)}`}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent navigating to blog detail

                      // Store the author info in localStorage to help with profile lookup
                      localStorage.setItem('lastViewedAuthor', JSON.stringify({
                        username: authorName,
                        display_name: authorName,
                        timestamp: new Date().toISOString()
                      }));
                    }}
                    className="text-sm font-medium hover:underline"
                    style={{ color: textColor }}
                  >
                    {authorName}
                  </Link>
                  <div className="flex flex-col">
                    <p className="text-xs" style={{ color: textColor, opacity: 0.8 }}>
                      {relativeDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded content preview for blogs without images */}
              <div className={`text-sm overflow-hidden ${blog.image_url ? 'line-clamp-2 mb-2' : 'line-clamp-5 mb-2'}`}
                style={{ maxHeight: blog.image_url ? '3rem' : '8rem', color: textColor, opacity: 0.9 }}>
                {truncateContent(blog.content, blog.image_url ? 120 : 280)}
              </div>

              {/* Add tags if available */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {blog.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ backgroundColor: `${textColor}20`, color: textColor }}
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
              <div className="border-t pt-2 mt-1" style={{ borderColor: `${textColor}30` }}>
                {/* Stats row with improved styling */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {/* Views with improved styling */}
                    <div className="flex items-center px-2 py-1 rounded-full" style={{ backgroundColor: `${textColor}15` }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke={textColor} style={{ opacity: 0.8 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="text-sm" style={{ color: textColor }}>{viewCount}</span>
                    </div>

                    {/* Likes with improved styling */}
                    <div className="flex items-center px-2 py-1 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: isLiked ? `${textColor}25` : `${textColor}15`,
                        transform: isLiked ? 'scale(1.05)' : 'scale(1)'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1 transition-all duration-300"
                        fill={isLiked ? textColor : "none"}
                        viewBox="0 0 24 24"
                        stroke={isLiked ? textColor : textColor}
                        style={{
                          opacity: isLiked ? 1 : 0.8,
                          transform: isLiked ? 'scale(1.1)' : 'scale(1)'
                        }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="text-sm transition-all duration-300"
                        style={{
                          color: textColor,
                          fontWeight: isLiked ? '600' : '400'
                        }}
                      >
                        {likeCount}
                      </span>
                    </div>

                    {/* Reading time estimate (new feature) */}
                    <div className="flex items-center px-2 py-1 rounded-full" style={{ backgroundColor: `${textColor}15` }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke={textColor} style={{ opacity: 0.8 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm" style={{ color: textColor }}>
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
                      className="p-2 rounded-full transition-all duration-300 border transform hover:scale-110 active:scale-90"
                      style={{
                        backgroundColor: isLiked ? `${textColor}30` : 'transparent',
                        borderColor: `${textColor}40`,
                        color: textColor
                      }}
                      aria-label={isLiked ? "Unlike this post" : "Like this post"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-all duration-300"
                        fill={isLiked ? "currentColor" : "none"}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        style={{
                          transform: isLiked ? 'scale(1.1)' : 'scale(1)',
                          opacity: isLiked ? 1 : 0.8
                        }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>

                    {/* Share button with improved styling */}
                    <button
                      onClick={handleShare}
                      className="p-2 rounded-full transition-all duration-300 border"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: `${textColor}40`,
                        color: textColor
                      }}
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
                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 group shadow-sm"
                    style={{
                      backgroundColor: textColor,
                      color: bgColor
                    }}
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

