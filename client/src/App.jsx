import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PageTransition from './components/PageTransition';
import NameFixer from './components/NameFixer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BlogDetail from './pages/BlogDetail';
import CreateBlog from './pages/CreateBlog';
import EditBlog from './pages/EditBlog';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import NotFound from './pages/NotFound';
import axios from 'axios';
import { getAllBlogs } from './services/blogService';
import apiClient from './services/apiClient';

// Set up axios defaults
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
axios.defaults.withCredentials = true; // Allow cookies to be sent
axios.defaults.headers.common['Content-Type'] = 'application/json';
console.log("Using baseURL:", axios.defaults.baseURL);

// Add global interceptor to replace author names
axios.interceptors.response.use(
  (response) => {
    // Replace all instances of "Official Editz" with "Kuldeep" in the response data
    if (response.data) {
      // Function to recursively replace author names in an object
      const replaceAuthorNames = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        // If it's an array, process each item
        if (Array.isArray(obj)) {
          return obj.map(item => replaceAuthorNames(item));
        }

        // Process object properties
        const result = { ...obj };
        for (const key in result) {
          // If this is an author name field
          if ((key === 'author' || key === 'author_name') &&
              (result[key] === 'Official Editz' || result[key] === 'Official Editz')) {
            result[key] = 'Kuldeep';
            console.log(`Global interceptor: Replaced author name in ${key} field`);
          }
          // If this is a nested object or array
          else if (typeof result[key] === 'object' && result[key] !== null) {
            result[key] = replaceAuthorNames(result[key]);
          }
        }
        return result;
      };

      // Apply the replacement to the response data
      response.data = replaceAuthorNames(response.data);
    }

    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add custom animations to Tailwind
const addCustomAnimations = () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }
    .animate-blob {
      animation: blob 7s infinite;
    }
    .animation-delay-2000 {
      animation-delay: 2s;
    }
    .animation-delay-4000 {
      animation-delay: 4s;
    }
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
      animation: fade-in-up 0.5s ease-out forwards;
    }
    .animation-delay-300 {
      animation-delay: 0.3s;
    }
    .animation-delay-600 {
      animation-delay: 0.6s;
    }
  `;
  document.head.appendChild(style);
};

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);

    // Add custom animations
    addCustomAnimations();
  }, [theme]);

  // Prefetch data for faster page loads
  useEffect(() => {
    // Function to prefetch data
    const prefetchData = async () => {
      try {
        console.log('Prefetching blog data...');
        // Prefetch all blogs
        const blogs = await getAllBlogs();
        console.log(`Prefetched ${blogs.length} blogs`);

        // Store in sessionStorage for quick access
        sessionStorage.setItem('prefetched_blogs', JSON.stringify(blogs));
        sessionStorage.setItem('prefetch_timestamp', Date.now().toString());

        // Prefetch static assets
        const assetsToPreload = [
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png'
        ];

        // Use requestIdleCallback to preload assets when browser is idle
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            assetsToPreload.forEach(asset => {
              const link = document.createElement('link');
              link.rel = 'prefetch';
              link.href = asset;
              document.head.appendChild(link);
            });
          });
        }
      } catch (error) {
        console.error('Error prefetching data:', error);
      }
    };

    // Check if we already have fresh data (less than 5 minutes old)
    const timestamp = sessionStorage.getItem('prefetch_timestamp');
    const fiveMinutes = 5 * 60 * 1000;

    if (!timestamp || (Date.now() - parseInt(timestamp)) > fiveMinutes) {
      prefetchData();
    } else {
      console.log('Using cached prefetched data');
    }
  }, []);

  // Add a global effect to replace author names in the DOM
  useEffect(() => {
    // First, update all localStorage entries
    const updateLocalStorage = () => {
      try {
        // Store the current user's profile information
        localStorage.setItem('currentUserProfile', JSON.stringify({
          old_name: 'Official Editz',
          display_name: 'Kuldeep',
          timestamp: new Date().toISOString()
        }));

        // Update all cached author entries
        const cachedAuthors = Object.keys(localStorage)
          .filter(key => key.startsWith('author_'));

        for (const key of cachedAuthors) {
          const authorName = key.replace('author_', '');
          if (authorName === 'Official Editz') {
            localStorage.setItem(key, JSON.stringify({
              display_name: 'Kuldeep',
              timestamp: new Date().toISOString()
            }));
            console.log(`Updated cached author: ${authorName} -> Kuldeep`);
          }
        }

        // Also check for any JSON strings in localStorage that might contain the old name
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          try {
            const value = localStorage.getItem(key);
            if (value && value.includes('Official Editz')) {
              const updatedValue = value.replace(/Official Editz/g, 'Kuldeep');
              localStorage.setItem(key, updatedValue);
              console.log(`Updated localStorage entry: ${key}`);
            }
          } catch (e) {
            // Ignore errors for non-string values
          }
        }
      } catch (error) {
        console.error('Error updating localStorage:', error);
      }
    };

    // Run localStorage update
    updateLocalStorage();

    // Function to replace text in DOM nodes
    const replaceAuthorNamesInDOM = () => {
      // Create a TreeWalker to iterate through all text nodes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      // Collect nodes that need replacement
      const nodesToReplace = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.nodeValue && node.nodeValue.includes('Official Editz')) {
          nodesToReplace.push(node);
        }
      }

      // Replace text in collected nodes
      nodesToReplace.forEach(node => {
        node.nodeValue = node.nodeValue.replace(/Official Editz/g, 'Kuldeep');
      });
    };

    // Run the replacement immediately
    replaceAuthorNamesInDOM();

    // Set up a MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      replaceAuthorNamesInDOM();
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Clean up the observer when component unmounts
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <NameFixer />
          <Navbar theme={theme} toggleTheme={toggleTheme} />
          <main className="flex-grow">
            <PageTransition>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                {/* Support multiple URL formats for blog posts - simplified and prioritized */}
                <Route path="/blog/:id" element={<BlogDetail />} />
                <Route path="/blogs/:id" element={<BlogDetail />} />

                {/* Catch-all routes for any blog URL pattern */}
                <Route path="/blog/*" element={<BlogDetail />} />
                <Route path="/blogs/*" element={<BlogDetail />} />

                <Route
                  path="/create"
                  element={
                    <ProtectedRoute>
                      <CreateBlog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/edit/:_id"
                  element={
                    <ProtectedRoute>
                      <EditBlog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/edit"
                  element={
                    <ProtectedRoute>
                      <EditProfile />
                    </ProtectedRoute>
                  }
                />
                <Route path="/profile/:username" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;






