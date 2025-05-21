import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/profileService";
import BLogoLoader from "../components/BLogoLoader";

const BlogDetail = () => {
  const { id, _id, "*": splat } = useParams();  // Handle all route parameter formats
  const location = useLocation();

  // Generate a consistent color for the blog based on its ID - EXACT SAME as BlogCard component
  const getBlogColor = (blogId) => {
    if (!blogId) return '#000000'; // Default to black if no ID

    // Use a hash of the blog ID to generate a consistent color for each blog
    const hash = blogId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Define a wide variety of solid colors for blog cards
    const colorPalette = [
      // Reds
      '#FF0000', // Red
      '#DC2626', // Red-600
      '#B91C1C', // Red-700
      '#991B1B', // Red-800
      '#7F1D1D', // Red-900
      '#EF4444', // Red-500

      // Oranges
      '#FF8C00', // Dark Orange
      '#F97316', // Orange-500
      '#EA580C', // Orange-600
      '#C2410C', // Orange-700
      '#FF4500', // OrangeRed
      '#FB923C', // Orange-400

      // Yellows
      '#FFFF00', // Yellow
      '#FACC15', // Yellow-400
      '#EAB308', // Yellow-500
      '#CA8A04', // Yellow-600
      '#A16207', // Yellow-700
      '#FEF08A', // Yellow-200

      // Greens
      '#00FF00', // Lime
      '#22C55E', // Green-500
      '#16A34A', // Green-600
      '#15803D', // Green-700
      '#166534', // Green-800
      '#4ADE80', // Green-400
      '#84CC16', // Lime-500
      '#65A30D', // Lime-600
      '#008000', // Green

      // Blues
      '#0000FF', // Blue
      '#3B82F6', // Blue-500
      '#2563EB', // Blue-600
      '#1D4ED8', // Blue-700
      '#1E40AF', // Blue-800
      '#60A5FA', // Blue-400
      '#0284C7', // Sky-600
      '#0369A1', // Sky-700
      '#0EA5E9', // Sky-500

      // Purples/Violets
      '#800080', // Purple
      '#8B5CF6', // Violet-500
      '#7C3AED', // Violet-600
      '#6D28D9', // Violet-700
      '#5B21B6', // Violet-800
      '#A78BFA', // Violet-400
      '#9333EA', // Purple-600
      '#7E22CE', // Purple-700
      '#6B21A8', // Purple-800

      // Pinks
      '#FFC0CB', // Pink
      '#EC4899', // Pink-500
      '#DB2777', // Pink-600
      '#BE185D', // Pink-700
      '#9D174D', // Pink-800
      '#F472B6', // Pink-400
      '#FF1493', // Deep Pink

      // Browns
      '#A52A2A', // Brown
      '#92400E', // Amber-800
      '#78350F', // Amber-900
      '#B45309', // Amber-700
      '#D97706', // Amber-600
      '#F59E0B', // Amber-500

      // Teals/Cyans
      '#008080', // Teal
      '#0D9488', // Teal-600
      '#0F766E', // Teal-700
      '#115E59', // Teal-800
      '#14B8A6', // Teal-500
      '#2DD4BF', // Teal-400
      '#06B6D4', // Cyan-500
      '#0891B2', // Cyan-600
      '#00FFFF', // Cyan

      // Grays/Blacks
      '#000000', // Black
      '#18181B', // Zinc-900
      '#27272A', // Zinc-800
      '#3F3F46', // Zinc-700
      '#52525B', // Zinc-600
      '#71717A', // Zinc-500
      '#1E293B', // Slate-800
      '#334155', // Slate-700
      '#475569', // Slate-600

      // Other colors
      '#4B0082', // Indigo
      '#9400D3', // DarkViolet
      '#8A2BE2', // BlueViolet
      '#9370DB', // MediumPurple
      '#6A0DAD', // Purple
      '#FF00FF', // Magenta
      '#C71585', // MediumVioletRed
      '#FF6347', // Tomato
      '#FF7F50', // Coral
      '#20B2AA', // LightSeaGreen
      '#3CB371', // MediumSeaGreen
      '#2E8B57', // SeaGreen
      '#228B22', // ForestGreen
      '#32CD32', // LimeGreen
      '#00FA9A', // MediumSpringGreen
      '#00CED1', // DarkTurquoise
      '#5F9EA0', // CadetBlue
      '#4682B4', // SteelBlue
      '#6495ED', // CornflowerBlue
      '#4169E1', // RoyalBlue
      '#191970', // MidnightBlue
      '#8B4513', // SaddleBrown
      '#A0522D', // Sienna
      '#CD853F', // Peru
      '#DEB887', // BurlyWood
      '#8B0000', // DarkRed
      '#800000', // Maroon
      '#B22222', // FireBrick
      '#DC143C', // Crimson
    ];

    // Use the hash to select a color from the palette
    const colorIndex = Math.abs(hash) % colorPalette.length;
    return colorPalette[colorIndex];
  };

  // Function to determine if text should be white or black based on background color - EXACT SAME as BlogCard component
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
  // Check localStorage for liked status
  const checkLikedStatus = (blogId) => {
    try {
      const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
      return likedBlogs[blogId] === true;
    } catch (error) {
      console.error("Error checking liked status:", error);
      return false;
    }
  };

  const [isLiked, setIsLiked] = useState(checkLikedStatus(blogId));
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [showShareToast, setShowShareToast] = useState(false);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [authorName, setAuthorName] = useState("");
  const [blogColor, setBlogColor] = useState("#000000");
  const [textColor, setTextColor] = useState("#FFFFFF");

  // Set share URL when component mounts
  useEffect(() => {
    // Create a consistent URL format for sharing
    const baseUrl = window.location.origin;
    // Use a clean URL format without any query parameters or hash
    const cleanShareUrl = `${baseUrl}/blog/${blogId}`;
    console.log("Setting share URL:", cleanShareUrl);
    setShareUrl(cleanShareUrl);
  }, [blogId]);

  // Function to fetch fresh blog data in the background
  const fetchFreshBlogData = async (blogId) => {
    if (!blogId) return;

    try {
      console.log("Fetching fresh blog data in background for ID:", blogId);

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
          throw error;
        }
      }

      if (response && response.data) {
        console.log("Got fresh blog data:", response.data);

        // Update the blog data
        setBlog(response.data);

        // Update like status and counts
        if (response.data.is_liked !== undefined) {
          setIsLiked(response.data.is_liked);
        }

        if (response.data.like_count !== undefined) {
          setLikeCount(response.data.like_count);
        }

        if (response.data.views !== undefined) {
          setViewCount(response.data.views);
        }

        // Cache the blog data
        try {
          sessionStorage.setItem(`blog_${blogId}`, JSON.stringify(response.data));
          sessionStorage.setItem(`blog_${blogId}_timestamp`, Date.now().toString());
        } catch (storageError) {
          console.error("Error caching blog:", storageError);
        }

        // Track view
        try {
          const viewResponse = await axios.get(`/api/blogs/${blogId}/view/`);
          if (viewResponse.data.views) {
            setViewCount(viewResponse.data.views);
          }
        } catch (viewErr) {
          console.error("Error tracking view:", viewErr);
        }
      }
    } catch (err) {
      console.error("Error fetching fresh blog data:", err);
    }
  };

  // Function to fetch author profile
  const fetchAuthorProfile = async (authorName) => {
    if (!authorName) return;

    // First check if this is the current user's blog
    try {
      const currentUserProfile = localStorage.getItem('currentUserProfile');
      if (currentUserProfile) {
        const userData = JSON.parse(currentUserProfile);
        if (userData.old_name === authorName && userData.display_name) {
          setAuthorName(userData.display_name);
          console.log(`Using current user's updated name: ${userData.display_name}`);
          return; // Skip other checks if we've found a match
        }
      }
    } catch (error) {
      console.error("Error checking current user profile:", error);
    }

    // Then check if we have a cached name in localStorage
    try {
      const cachedAuthor = localStorage.getItem(`author_${authorName}`);
      if (cachedAuthor) {
        const authorData = JSON.parse(cachedAuthor);
        if (authorData.display_name) {
          setAuthorName(authorData.display_name);
          console.log("Using cached author name:", authorData.display_name);
        }
      }
    } catch (error) {
      console.error("Error reading cached author data:", error);
    }

    // Then fetch the latest profile
    try {
      console.log("Fetching profile for author:", authorName);

      // Force cache busting by adding a timestamp to the request
      const timestamp = new Date().getTime();
      const profile = await getUserProfile(`${authorName}?_=${timestamp}`);
      console.log("Author profile:", profile);

      if (profile) {
        setAuthorProfile(profile);
        // Use the display_name from the profile if available
        if (profile.display_name) {
          setAuthorName(profile.display_name);
          console.log("Updated author name to:", profile.display_name);

          // Update localStorage with the latest name to ensure consistency
          localStorage.setItem(`author_${authorName}`, JSON.stringify({
            display_name: profile.display_name,
            timestamp: new Date().toISOString()
          }));

          // Also update the lastViewedAuthor for profile navigation
          localStorage.setItem('lastViewedAuthor', JSON.stringify({
            username: authorName,
            display_name: profile.display_name,
            timestamp: new Date().toISOString()
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching author profile:", error);
      // If we can't fetch the profile, we'll use the author_name from the blog
    }
  };

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        console.log("Fetching blog with ID:", blogId);

        // Check if we have a cached version of this blog
        const cachedBlog = sessionStorage.getItem(`blog_${blogId}`);
        const cacheTimestamp = sessionStorage.getItem(`blog_${blogId}_timestamp`);
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
        const cacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes cache validity

        // If we have a valid cached blog, use it immediately
        if (cachedBlog && cacheValid) {
          try {
            const parsedBlog = JSON.parse(cachedBlog);
            console.log("Using cached blog from sessionStorage");
            setBlog(parsedBlog);

            // Set like status and counts
            if (parsedBlog.is_liked !== undefined) {
              setIsLiked(parsedBlog.is_liked);
            }

            if (parsedBlog.like_count !== undefined) {
              setLikeCount(parsedBlog.like_count);
            }

            if (parsedBlog.views !== undefined) {
              setViewCount(parsedBlog.views);
            }

            // Set initial author name from blog data
            if (parsedBlog.author_name) {
              setAuthorName(parsedBlog.author_name);
            }

            // Continue with author profile fetching in the background
            const authorToCheck = parsedBlog.author_name || parsedBlog.author;
            if (authorToCheck) {
              fetchAuthorProfile(authorToCheck).catch(err => {
                console.error("Error fetching author profile:", err);
              });
            }

            // Fetch fresh data in the background
            setTimeout(() => {
              fetchFreshBlogData(blogId).catch(err => {
                console.error("Error fetching fresh blog data:", err);
              });
            }, 1000);

            return;
          } catch (cacheError) {
            console.error("Error parsing cached blog:", cacheError);
          }
        }

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

        // Set initial author name from blog data
        if (response.data.author_name) {
          setAuthorName(response.data.author_name);
        }

        // Cache the blog data for future visits
        try {
          sessionStorage.setItem(`blog_${blogId}`, JSON.stringify(response.data));
          sessionStorage.setItem(`blog_${blogId}_timestamp`, Date.now().toString());
          console.log("Blog data cached in sessionStorage");
        } catch (storageError) {
          console.error("Error caching blog:", storageError);
        }

        // Check if this is the current user's blog
        const authorToCheck = response.data.author_name || response.data.author;
        let isCurrentUserBlog = false;

        try {
          const currentUserProfile = localStorage.getItem('currentUserProfile');
          if (currentUserProfile && authorToCheck) {
            const userData = JSON.parse(currentUserProfile);
            if (userData.old_name === authorToCheck && userData.display_name) {
              setAuthorName(userData.display_name);
              console.log(`Using current user's updated name: ${userData.display_name}`);
              isCurrentUserBlog = true;
            }
          }
        } catch (error) {
          console.error("Error checking current user profile:", error);
        }

        // Only fetch the author's profile if it's not the current user
        if (!isCurrentUserBlog) {
          // Fetch the author's profile to get the most up-to-date name
          if (response.data.author_name) {
            await fetchAuthorProfile(response.data.author_name);
          } else if (response.data.author) {
            await fetchAuthorProfile(response.data.author);
          }
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

            // Set initial author name from blog data
            if (foundBlog.author_name) {
              setAuthorName(foundBlog.author_name);
            }

            // Check if this is the current user's blog
            const authorToCheck = foundBlog.author_name || foundBlog.author;
            let isCurrentUserBlog = false;

            try {
              const currentUserProfile = localStorage.getItem('currentUserProfile');
              if (currentUserProfile && authorToCheck) {
                const userData = JSON.parse(currentUserProfile);
                if (userData.old_name === authorToCheck && userData.display_name) {
                  setAuthorName(userData.display_name);
                  console.log(`Using current user's updated name: ${userData.display_name}`);
                  isCurrentUserBlog = true;
                }
              }
            } catch (error) {
              console.error("Error checking current user profile:", error);
            }

            // Only fetch the author's profile if it's not the current user
            if (!isCurrentUserBlog) {
              // Fetch the author's profile to get the most up-to-date name
              if (foundBlog.author_name) {
                await fetchAuthorProfile(foundBlog.author_name);
              } else if (foundBlog.author) {
                await fetchAuthorProfile(foundBlog.author);
              }
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

  // Use state to control content visibility for smoother transitions
  const [contentReady, setContentReady] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // When loading completes, prepare content with a slight delay
  useEffect(() => {
    if (!loading && blog) {
      // Mark content as loaded
      setContentLoaded(true);

      // Set the blog color based on the blog ID - EXACTLY like BlogCard component
      const color = getBlogColor(blog._id);
      setBlogColor(color);

      // Set the text color based on the blog color - EXACTLY like BlogCard component
      const text = getTextColor(color);
      setTextColor(text);

      console.log("Blog color set to:", color, "with text color:", text);

      // Preload the blog image if it exists
      if (blog.image_url) {
        const img = new Image();
        img.src = blog.image_url;
        img.onload = () => {
          console.log("Blog image preloaded");
        };
      }

      // Preload any images in the content
      if (blog.content) {
        // Create a temporary div to parse the content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = blog.content;

        // Find all images in the content
        const contentImages = tempDiv.querySelectorAll('img');
        contentImages.forEach(imgEl => {
          if (imgEl.src) {
            const img = new Image();
            img.src = imgEl.src;
            console.log("Preloading content image:", imgEl.src);
          }
        });
      }
    }
  }, [loading, blog]);

  // When content is marked as ready by the loader, start rendering it in the background
  useEffect(() => {
    if (contentReady && contentLoaded) {
      // Longer delay before showing content to ensure smooth transition
      const timer = setTimeout(() => {
        setShowContent(true);

        // Dispatch a custom event to signal that content is fully ready
        // This will be caught by the BLogoLoader component
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('blogContentReady'));
          console.log("Dispatched blogContentReady event");
        }, 500);
      }, 1500); // Increased delay for smoother transition

      return () => clearTimeout(timer);
    }
  }, [contentReady, contentLoaded]);

  // Handle the loader display
  if (loading || !showContent) {
    return (
      <>
        <BLogoLoader
          onBeforeHide={() => setContentReady(true)}
          onContentReady={(ready) => {
            // This callback is triggered when the loader is ready to start
            // transitioning out, but we'll keep it visible until content is ready
            setContentReady(ready);
          }}
        />

        {/* Pre-render the content but keep it hidden - this is crucial for performance */}
        {contentLoaded && (
          <div className="hidden">
            {/* Pre-load the blog image if it exists */}
            {blog?.image_url && (
              <img
                src={blog.image_url}
                alt="Preload"
                onLoad={() => console.log("Blog image preloaded in hidden div")}
                style={{ display: 'none' }}
              />
            )}
            {/* Pre-render text content */}
            <div style={{ display: 'none' }}>
              {blog?.title && <h1>{blog.title}</h1>}
              {blog?.content && <div dangerouslySetInnerHTML={{ __html: blog.content }} />}
            </div>
          </div>
        )}
      </>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blog-bg dark:bg-black pt-32 flex justify-center">
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

        // Store the like status in localStorage
        try {
          const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
          likedBlogs[blogId] = true;
          localStorage.setItem('likedBlogs', JSON.stringify(likedBlogs));
        } catch (storageErr) {
          console.error("Error updating localStorage:", storageErr);
        }
      } else if (response.data.status === 'unliked') {
        setIsLiked(false);
        setLikeCount(prev => response.data.like_count);
        console.log("Blog unliked successfully");

        // Remove the like status from localStorage
        try {
          const likedBlogs = JSON.parse(localStorage.getItem('likedBlogs') || '{}');
          delete likedBlogs[blogId];
          localStorage.setItem('likedBlogs', JSON.stringify(likedBlogs));
        } catch (storageErr) {
          console.error("Error updating localStorage:", storageErr);
        }
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
    <div
      className={`min-h-screen bg-white dark:bg-black pt-28 sm:pt-32 pb-12 relative transition-all duration-1500 ease-in-out ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{
        willChange: 'opacity, transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'subpixel-antialiased',
        transform: showContent ? 'translateZ(0)' : 'translateZ(0) translateY(4px)',
        visibility: showContent ? 'visible' : 'hidden' // Hide content completely until ready
      }}
      onLoad={() => {
        // Dispatch event when the main content is loaded
        window.dispatchEvent(new CustomEvent('blogContentReady'));
      }}
    >
      {/* Share toast notification */}
      {showShareToast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in">
          Link copied to clipboard!
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
        <div className="rounded-lg shadow-md border overflow-hidden" style={{
          background: blogColor,
          color: textColor,
          borderColor: `${textColor}30`
        }}>
          {/* Banner Image */}
          {blog.image_url && (
            <div className="w-full h-48 sm:h-64 md:h-96 overflow-hidden">
              <img
                src={blog.image_url}
                alt={blog.title}
                loading="eager"
                decoding="async"
                fetchpriority="high"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                style={{
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'translateZ(0)'
                }}
                onLoad={() => {
                  console.log("Blog image loaded in main view");
                  // Dispatch event when the image is loaded
                  window.dispatchEvent(new CustomEvent('blogContentReady'));
                }}
                onError={(e) => {
                  console.error("Error loading blog image:", e);
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  // Still dispatch the event even if image fails to load
                  window.dispatchEvent(new CustomEvent('blogContentReady'));
                }}
              />
            </div>
          )}

          <div className="p-4 sm:p-6 md:p-10">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 dark:text-white font-playfair mb-4 sm:mb-6" style={{ color: textColor }}>
              {blog.title}
            </h1>

            {/* Author and date */}
            <div className="flex flex-col sm:flex-row sm:items-center mb-6 sm:mb-8 border-b border-gray-200 dark:border-gray-700 pb-4 sm:pb-6 gap-4">
              <div className="flex items-center">
                {/* Author avatar with link to profile */}
                <Link
                  to={`/profile/${encodeURIComponent(authorName || blog.author_name || blog.author || 'anonymous')}`}
                  className="block"
                  onClick={(e) => {
                    // Log the author info for debugging
                    console.log('Author info:', {
                      author: blog.author,
                      author_name: blog.author_name,
                      updated_name: authorName,
                      author_id: blog.author_id
                    });

                    // Prevent navigation if author is anonymous
                    if ((authorName || blog.author_name || blog.author) === 'anonymous') {
                      e.preventDefault();
                      alert('This author does not have a profile');
                    }

                    // Store the author info in localStorage to help with profile lookup
                    const authorToStore = authorName || blog.author_name || blog.author;
                    if (authorToStore) {
                      localStorage.setItem('lastViewedAuthor', JSON.stringify({
                        username: authorToStore,
                        display_name: authorToStore,
                        timestamp: new Date().toISOString()
                      }));
                    }
                  }}
                >
                  <div
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center font-medium text-lg hover:shadow-md transition-shadow"
                    style={{
                      backgroundColor: blogColor,
                      color: textColor,
                      border: `1px solid ${textColor}30`
                    }}
                  >
                    {authorName?.charAt(0)?.toUpperCase() || blog.author_name?.charAt(0)?.toUpperCase() || blog.author?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                </Link>
                <div className="ml-3 sm:ml-4">
                  {/* Author name with link to profile */}
                  <Link
                    to={`/profile/${encodeURIComponent(authorName || blog.author_name || blog.author || 'anonymous')}`}
                    className="text-sm sm:text-base font-medium hover:underline"
                    style={{ color: textColor }}
                    onClick={(e) => {
                      // Log the author info for debugging
                      console.log('Author info (from name link):', {
                        author: blog.author,
                        author_name: blog.author_name,
                        updated_name: authorName,
                        author_id: blog.author_id
                      });

                      // Prevent navigation if author is anonymous
                      if ((authorName || blog.author_name || blog.author) === 'anonymous') {
                        e.preventDefault();
                        alert('This author does not have a profile');
                      }

                      // Store the author info in localStorage to help with profile lookup
                      const authorToStore = authorName || blog.author_name || blog.author;
                      if (authorToStore) {
                        localStorage.setItem('lastViewedAuthor', JSON.stringify({
                          username: authorToStore,
                          display_name: authorToStore,
                          timestamp: new Date().toISOString()
                        }));
                      }
                    }}
                  >
                    {authorName || blog.author_name || blog.author || 'Anonymous'}
                  </Link>
                  <div className="flex items-center text-xs sm:text-sm space-x-2 sm:space-x-4" style={{ color: textColor, opacity: 0.8 }}>
                    <span>{formattedDate}</span>
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke={textColor} style={{ opacity: 0.8 }}>
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
                  className="flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-full border transition-colors text-xs sm:text-sm"
                  style={{
                    backgroundColor: isLiked ? `${textColor}30` : 'transparent',
                    borderColor: `${textColor}40`,
                    color: textColor
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill={isLiked ? textColor : "none"}
                    viewBox="0 0 24 24"
                    stroke={textColor}
                    style={{
                      opacity: isLiked ? 1 : 0.8,
                      transform: isLiked ? 'scale(1.1)' : 'scale(1)'
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{likeCount}</span>
                </button>

                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-full border transition-colors text-xs sm:text-sm"
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: `${textColor}40`,
                    color: textColor
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke={textColor}
                    style={{ opacity: 0.8 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </button>

                {/* Edit button if user is author */}
                {isAuthor && (
                  <Link
                    to={`/edit/${blogId}`}
                    className="inline-flex items-center px-3 sm:px-5 py-1 sm:py-2 rounded text-xs sm:text-sm transition-all duration-300 shadow-sm"
                    style={{
                      backgroundColor: textColor,
                      color: blogColor,
                      border: `1px solid ${textColor}30`
                    }}
                  >
                    Edit Post
                  </Link>
                )}
              </div>
            </div>

            {/* Content */}
            <article
              className="prose dark:prose-invert max-w-none prose-base sm:prose-lg md:prose-xl"
              style={{ color: textColor }}
              ref={(el) => {
                if (el) {
                  // Dispatch event when the content is rendered
                  window.dispatchEvent(new CustomEvent('blogContentReady'));
                  console.log("Content rendered, dispatched blogContentReady event");
                }
              }}
            >
              {blog.content && typeof blog.content === 'string' && blog.content.includes('<') && blog.content.includes('>') ? (
                // If content appears to be HTML, render it as HTML
                <div dangerouslySetInnerHTML={{ __html: blog.content }} />
              ) : (
                // Otherwise, render it as plain text with paragraph breaks
                blog.content.split('\n').map((paragraph, index) => (
                  paragraph ? <p key={index} className="mb-4 sm:mb-6 text-gray-800 dark:text-gray-100 text-sm sm:text-base md:text-lg" style={{ color: textColor }}>{paragraph}</p> : <br key={index} />
                ))
              )}
            </article>

            {/* Back to home button */}
            <div className="mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/"
                className="inline-flex items-center text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm sm:text-base"
                style={{ color: textColor }}
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
