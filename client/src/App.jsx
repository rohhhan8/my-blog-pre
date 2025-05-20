import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { LikeProvider } from './context/LikeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PageTransition from './components/PageTransition';
import NameFixer from './components/NameFixer';
import LogoLoader from './components/LogoLoader';
import BLogoLoader from './components/BLogoLoader';
import axios from 'axios';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const CreateBlog = lazy(() => import('./pages/CreateBlog'));
const EditBlog = lazy(() => import('./pages/EditBlog'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const NotFound = lazy(() => import('./pages/NotFound'));

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

    /* Page transition animations */
    .page-slide-in {
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: opacity, transform;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }

    .page-slide-in-active {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: opacity, transform;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }

    .page-slide-out {
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: opacity, transform;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }

    /* Loading bar animation */
    @keyframes loadingProgress {
      0% { width: 0%; opacity: 0.6; }
      20% { width: 20%; opacity: 0.8; }
      50% { width: 60%; opacity: 1; }
      80% { width: 90%; opacity: 0.8; }
      100% { width: 100%; opacity: 0.6; }
    }

    .loading-progress-bar {
      animation: loadingProgress 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      will-change: width, opacity;
    }

    /* Float animation for the B logo */
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }

    .animate-float {
      animation: float 3s ease-in-out infinite;
      will-change: transform;
    }

    .animation-delay-300 {
      animation-delay: 0.3s;
    }
    .animation-delay-500 {
      animation-delay: 0.5s;
    }
    .animation-delay-600 {
      animation-delay: 0.6s;
    }
  `;
  document.head.appendChild(style);
};

function App() {
  const [loading, setLoading] = useState(true);
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

  // Set loading to false immediately - no initial app loader
  useEffect(() => {
    setLoading(false);
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
      <LikeProvider>
        <Router>
          {loading && <LogoLoader />}
          <div className="flex flex-col min-h-screen">
            <NameFixer />
            <Navbar theme={theme} toggleTheme={toggleTheme} />
            <main className="flex-grow">
              <PageTransition>
                <Suspense fallback={<BLogoLoader />}>
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
                </Suspense>
              </PageTransition>
            </main>
          <Footer />
        </div>
      </Router>
    </LikeProvider>
  </AuthProvider>
  );
}

export default App;






