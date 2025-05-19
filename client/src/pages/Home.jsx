import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import BlogCard from "../components/BlogCard";
import { useAuth } from "../context/AuthContext";

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

  // Effect for fetching blogs
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/blogs/");
        const data = response.data;
        if (Array.isArray(data)) {
          setBlogs(data);
          setFilteredBlogs(data);
          // Delay animation to ensure smooth loading
          setTimeout(() => setAnimateBlogs(true), 100);
          setError("");
        } else {
          throw new Error("Invalid response structure");
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
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
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
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 mb-6">
                  <div className="relative">
                    <div className="text-6xl font-black text-gray-900 dark:text-white font-serif tracking-tighter">
                      B
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-900 dark:bg-white rounded-full"></div>
                    <div className="absolute -bottom-1 left-0 w-full h-1 bg-gray-900 dark:bg-white"></div>
                  </div>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight px-2">
                <span className="block">Share Your Stories</span>
                <span className="block mt-2">
                  <span className="gradient-text">Express Yourself</span>
                </span>
              </h1>

              <div className="relative mb-6 md:mb-10">
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-4 md:mb-6 animate-fade-in-up animation-delay-300 leading-relaxed font-light px-2 sm:px-4">
                  Words have power. Share your unique perspective, inspire others, and leave your mark on the world through thoughtful storytelling.
                </p>
              </div>

              {/* Smaller, more subtle date/time display */}
              <div className="inline-flex flex-col xs:flex-row items-center gap-2 xs:gap-3 mb-4 md:mb-6 animate-fade-in-up animation-delay-500 text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-black/80 px-3 xs:px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 xs:w-4 xs:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span className="text-xs xs:text-sm font-medium">
                    {currentDateTime.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <span className="hidden xs:block w-px h-4 bg-gray-300 dark:bg-gray-700"></span>

                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 xs:w-4 xs:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-xs xs:text-sm font-mono">
                    {currentDateTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2 sm:px-0">
                <Link
                  to={currentUser ? "/create" : "/login"}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 w-full sm:w-auto py-2.5 sm:py-3 px-5 sm:px-7 text-sm sm:text-base rounded-md flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:transform hover:scale-[1.02]"
                >
                  {currentUser ? "Write a Blog" : "Start Writing"}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <a
                  href="#blogs"
                  className="bg-white dark:bg-black text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 w-full sm:w-auto py-2.5 sm:py-3 px-5 sm:px-7 text-sm sm:text-base rounded-md flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:transform hover:scale-[1.02]"
                >
                  Explore Blogs
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator with monochromatic design */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-gray-900 dark:text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>

      {/* Blog content section with monochromatic design */}
      <div id="blogs" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-28 pb-12 sm:pb-16 bg-white dark:bg-black">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white font-playfair mb-3 sm:mb-6 tracking-tight px-2">
            Latest <span className="relative inline-block">
              Blogs
              <span className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-[2px] bg-gray-900 dark:bg-white"></span>
            </span>
          </h2>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 max-w-2xl mx-auto font-light px-2 sm:px-4 mb-4 sm:mb-6">
            Explore the latest thoughts, ideas, and stories from our community of writers.
          </p>

          {/* Search bar */}
          <div className="max-w-xs sm:max-w-sm md:max-w-md mx-auto relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-9 pr-9 text-sm sm:text-base rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-white"></div>
          </div>
        ) : error ? (
          <div className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-6 rounded-md max-w-3xl mx-auto border border-gray-200 dark:border-gray-700">
            {error}
          </div>
        ) : filteredBlogs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
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
          <div className="text-center py-16 border border-gray-200 dark:border-gray-700 rounded-lg">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <p className="text-2xl font-medium text-gray-900 dark:text-white mb-2">No results found</p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Try a different search term or browse all blogs.</p>
            <button onClick={() => setSearchTerm("")} className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-all transform hover:translate-y-[-5px] shadow-md font-medium tracking-wide inline-block">
              Clear Search
            </button>
          </div>
        ) : (
          <div className="text-center py-16 border border-gray-200 dark:border-gray-700 rounded-lg">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
            </svg>
            <p className="text-2xl font-medium text-gray-900 dark:text-white mb-2">No blogs found</p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Be the first to share your thoughts with the world.</p>
            <Link to="/create" className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-all transform hover:translate-y-[-5px] shadow-md font-medium tracking-wide inline-block">
              Create a Blog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
