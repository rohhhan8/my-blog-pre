import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import BlogCard from "../components/BlogCard";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/profileService";
import { getAllBlogs } from "../services/blogService";

const Home = () => {
  const { currentUser } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [animateBlogs, setAnimateBlogs] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const timerRef = useRef(null);

  // Function to refresh author profiles
  const refreshAuthorProfiles = async (blogs) => {
    // Create a Set to store unique author names
    const uniqueAuthors = new Set();

    // Collect all unique author names from blogs
    blogs.forEach(blog => {
      if (blog.author_name) {
        uniqueAuthors.add(blog.author_name);
      } else if (blog.author) {
        uniqueAuthors.add(blog.author);
      }
    });

    console.log(`Refreshing profiles for ${uniqueAuthors.size} unique authors`);

    // First, check if we have a current user's profile to use
    const currentUserProfile = localStorage.getItem('currentUserProfile');
    let currentUserData = null;

    if (currentUserProfile) {
      try {
        currentUserData = JSON.parse(currentUserProfile);
        console.log('Found current user profile in localStorage:', currentUserData);

        // If the current user's name is in our list of authors, update it
        if (currentUserData.display_name && uniqueAuthors.has(currentUserData.old_name)) {
          console.log(`Updating author name from "${currentUserData.old_name}" to "${currentUserData.display_name}"`);

          // Update localStorage with the latest name
          localStorage.setItem(`author_${currentUserData.old_name}`, JSON.stringify({
            display_name: currentUserData.display_name,
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error parsing current user profile:', error);
      }
    }

    // For each unique author, try to get their profile
    const authorProfiles = {};
    for (const authorName of uniqueAuthors) {
      try {
        // First check if this is the current user
        if (currentUserData && currentUserData.old_name === authorName) {
          authorProfiles[authorName] = currentUserData.display_name;
          continue;
        }

        // Otherwise try to fetch the profile
        // Use direct axios call to avoid auth issues
        try {
          // Get all blogs and filter by author
          const response = await axios.get('/api/blogs/');

          if (response.data && Array.isArray(response.data)) {
            // Filter blogs by this author
            const authorBlogs = response.data.filter(blog =>
              (blog.author_name && blog.author_name.includes(authorName)) ||
              (blog.author && blog.author.includes(authorName))
            );

            if (authorBlogs.length > 0) {
              // Get the most recent blog by this author
              const latestBlog = authorBlogs.sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
              )[0];

              const displayName = latestBlog.author_name || authorName;
              authorProfiles[authorName] = displayName;

              // Update localStorage with the latest name
              localStorage.setItem(`author_${authorName}`, JSON.stringify({
                display_name: displayName,
                timestamp: new Date().toISOString()
              }));

              console.log(`Updated profile for ${authorName} to ${displayName} from blogs`);
            }
          }
        } catch (error) {
          console.error(`Error fetching blogs for author ${authorName}:`, error);
        }
      } catch (error) {
        console.error(`Error refreshing profile for ${authorName}:`, error);
      }
    }

    return authorProfiles;
  };

  // Effect for fetching blogs
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);

        // First check if we have prefetched data in sessionStorage
        const prefetchedData = sessionStorage.getItem('prefetched_blogs');
        let data;

        if (prefetchedData) {
          console.log('Using prefetched blog data from sessionStorage');
          data = JSON.parse(prefetchedData);

          // Set blogs immediately for instant display
          setBlogs(data);
          setFilteredBlogs(data);

          // Show animation immediately
          setAnimateBlogs(true);
          setError("");
          setLoading(false);

          // Refresh author profiles in the background
          refreshAuthorProfiles(data).catch(err => {
            console.error("Error refreshing author profiles:", err);
          });

          // Fetch fresh data in the background
          getAllBlogs().then(freshData => {
            if (Array.isArray(freshData) && freshData.length > 0) {
              console.log(`Updated with ${freshData.length} blogs from API`);
              setBlogs(freshData);
              setFilteredBlogs(freshData);

              // Update sessionStorage with fresh data
              sessionStorage.setItem('prefetched_blogs', JSON.stringify(freshData));
              sessionStorage.setItem('prefetch_timestamp', Date.now().toString());
            }
          }).catch(err => {
            console.error("Background refresh error:", err);
          });
        } else {
          // No prefetched data, fetch from API
          console.log('No prefetched data, fetching from API');
          data = await getAllBlogs();

          if (Array.isArray(data)) {
            setBlogs(data);
            setFilteredBlogs(data);

            // Delay animation to ensure smooth loading
            setTimeout(() => setAnimateBlogs(true), 100);
            setError("");

            // Store in sessionStorage for future use
            sessionStorage.setItem('prefetched_blogs', JSON.stringify(data));
            sessionStorage.setItem('prefetch_timestamp', Date.now().toString());

            // Refresh author profiles in the background
            refreshAuthorProfiles(data).catch(err => {
              console.error("Error refreshing author profiles:", err);
            });
          } else {
            throw new Error("Invalid response structure");
          }
        }
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setError("Failed to load blogs. Please try again later.");
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  // Effect for updating the date/time display
  useEffect(() => {
    // Update time every second
    timerRef.current = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    // Clean up interval on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Effect for filtering blogs based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredBlogs(blogs);
    } else {
      const filtered = blogs.filter(blog =>
        blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (blog.author_name && blog.author_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredBlogs(filtered);
    }
  }, [searchTerm, blogs]);

  return (
    <div className="bg-blog-bg dark:bg-black min-h-screen transition-all duration-500">
      {/* Full-screen hero section with monochromatic design */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden pt-6 sm:pt-10">
        {/* Background with subtle pattern */}
        <div className="absolute inset-0 bg-white dark:bg-black">
          <div className="absolute inset-0 opacity-5 dark:opacity-10"
               style={{
                 backgroundImage: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23000000" fill-opacity="0.8" fill-rule="evenodd"%3E%3Ccircle cx="3" cy="3" r="1"/%3E%3Ccircle cx="13" cy="13" r="1"/%3E%3C/g%3E%3C/svg%3E")',
                 backgroundSize: '20px 20px'
               }}>
          </div>
        </div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 border border-gray-200 dark:border-gray-700 rounded-full opacity-20 dark:opacity-10 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 border border-gray-300 dark:border-gray-700 rounded-full opacity-10 dark:opacity-5 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 right-1/3 w-48 h-48 border border-gray-200 dark:border-gray-700 rounded-full opacity-15 dark:opacity-10 animate-pulse animation-delay-1000"></div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <div className="max-w-4xl mx-auto">
            {/* Modern monochromatic typography and animations */}
            <div className="text-center">
              <div className="mb-2 sm:mb-4 -mt-16 sm:-mt-24">
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 mb-2 sm:mb-4">
                  <div className="relative">
                    <div className="text-5xl sm:text-7xl font-black text-gray-900 dark:text-white font-serif tracking-tighter">
                      B
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gray-900 dark:bg-white rounded-full"></div>
                    <div className="absolute -bottom-1 left-0 w-full h-1.5 bg-gray-900 dark:bg-white"></div>
                  </div>
                </div>
              </div>

              <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-5 tracking-tight leading-tight px-2">
                <span className="block">Ideas That Inspire</span>
                <span className="block mt-1 sm:mt-2">
                  <span className="gradient-text">Stories That Matter</span>
                </span>
              </h1>

              <div className="relative mb-3 sm:mb-4 md:mb-6">
                <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 dark:text-gray-300 max-w-4xl mx-auto mb-4 sm:mb-5 md:mb-7 animate-fade-in-up animation-delay-300 leading-relaxed font-light px-2 sm:px-4">
                  Discover thought-provoking content from diverse voices. Connect with ideas that challenge and inspire in our curated digital space.
                </p>
              </div>

              {/* Search bar moved above date/time display */}
              <div className="max-w-sm sm:max-w-md md:max-w-lg mx-auto relative mb-5 md:mb-7 animate-fade-in-up animation-delay-400">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search blogs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-10 pr-10 text-base sm:text-lg rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white shadow-sm"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center px-2 sm:px-0">
                <Link
                  to={currentUser ? "/create" : "/login"}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 w-full sm:w-auto py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg rounded-md flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-lg hover:transform hover:scale-[1.02] font-medium"
                >
                  {currentUser ? "Write a Blog" : "Start Writing"}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <a
                  href="#blogs"
                  className="bg-white dark:bg-black text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 w-full sm:w-auto py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg rounded-md flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-lg hover:transform hover:scale-[1.02] font-medium"
                >
                  Explore Blogs
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              </div>

              {/* Date and time display below buttons - hidden on mobile */}
              <div className="mt-8 sm:mt-10 hidden sm:flex flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-600">
                <div className="flex items-center gap-3 bg-white/80 dark:bg-black/80 px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span className="text-base sm:text-lg font-medium">
                    {currentDateTime.toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-white/80 dark:bg-black/80 px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-base sm:text-lg font-mono">
                    {currentDateTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator with monochromatic design - positioned better for mobile */}
        <div className="scroll-down-arrow">
          <a href="#blogs" className="block">
            <div className="scroll-down-arrow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 sm:h-10 sm:w-10 text-gray-900 dark:text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              <span className="sr-only">Scroll down to view blogs</span>
            </div>
          </a>
        </div>
      </div>

      {/* Blog content section with monochromatic design */}
      <div id="blogs" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-28 pb-12 sm:pb-20 bg-white dark:bg-black">
        <div className="text-center mb-8 sm:mb-10 md:mb-14">
          <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white font-playfair mb-3 sm:mb-4 md:mb-7 tracking-tight px-2">
            Latest <span className="relative inline-block">
              Blogs
              <span className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-[3px] bg-gray-900 dark:bg-white"></span>
            </span>
          </h2>
          <p className="text-sm xs:text-base sm:text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto font-light px-2 sm:px-4 mb-4 sm:mb-5 md:mb-7">
            Explore insightful perspectives and expert analysis from our community of thought leaders.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-80">
            <div className="animate-spin rounded-full h-16 w-16 border-3 border-t-transparent border-gray-900 dark:border-white"></div>
          </div>
        ) : error ? (
          <div className="bg-gray-100 dark:bg-black text-gray-700 dark:text-gray-300 p-8 rounded-md max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 text-lg">
            {error}
          </div>
        ) : filteredBlogs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {filteredBlogs.map((blog, index) => {
              if (!blog || !blog._id) {
                console.warn("Blog missing _id:", blog);
                return null;
              }
              return (
                <div
                  key={blog._id}
                  className={`transform transition-all duration-700 ${
                    animateBlogs
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-12 opacity-0'
                  }`}
                  style={{ transitionDelay: `${Math.min(index * 100, 500)}ms` }}
                >
                  <BlogCard blog={blog} />
                </div>
              );
            })}
          </div>
        ) : searchTerm ? (
          <div className="text-center py-20 border border-gray-200 dark:border-gray-700 rounded-lg">
            <svg className="w-20 h-20 mx-auto mb-6 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <p className="text-3xl font-medium text-gray-900 dark:text-white mb-3">No results found</p>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">Try a different search term or browse all blogs.</p>
            <button onClick={() => setSearchTerm("")} className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-all transform hover:translate-y-[-5px] shadow-md font-medium tracking-wide inline-block text-lg">
              Clear Search
            </button>
          </div>
        ) : (
          <div className="text-center py-20 border border-gray-200 dark:border-gray-700 rounded-lg">
            <svg className="w-20 h-20 mx-auto mb-6 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
            </svg>
            <p className="text-3xl font-medium text-gray-900 dark:text-white mb-3">No blogs found</p>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">Be the first to share your thoughts with the world.</p>
            <Link to="/create" className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-all transform hover:translate-y-[-5px] shadow-md font-medium tracking-wide inline-block text-lg">
              Create a Blog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
