import { createContext, useState, useContext, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig'; // Must be correctly initialized
import apiClient from '../services/apiClient';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Email/Password Signup
  async function signup(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      return userCredential.user;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  }

  // Email/Password Login
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Google Sign-In
  async function signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error("Google Sign-In error:", error);
      throw error;
    }
  }

  // Logout
  function logout() {
    return signOut(auth);
  }

  // Update user profile
  async function updateUserProfile(displayName, photoURL) {
    if (!currentUser) {
      throw new Error("No user is currently logged in");
    }

    try {
      await updateProfile(currentUser, {
        displayName: displayName || currentUser.displayName,
        photoURL: photoURL || currentUser.photoURL
      });

      // Force a refresh of the user object
      const user = auth.currentUser;
      setCurrentUser({ ...user });

      return user;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[Auth] User state changed:', user);

      if (user) {
        try {
          // Get the ID token
          const idToken = await user.getIdToken(true);
          console.log('[Auth] Got fresh ID token');

          // Store token in localStorage
          localStorage.setItem('authToken', idToken);

          // Extract uid from token
          let uid = '';
          try {
            const tokenParts = idToken.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              uid = payload.user_id || payload.sub || '';

              // Store uid separately for easier access
              localStorage.setItem('userUid', uid);
            }
          } catch (e) {
            console.error("Error extracting uid from token:", e);
          }

          // Store user info in localStorage
          const userInfo = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || ''
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfo));

          // Set the token in apiClient
          apiClient.setAuthToken(idToken, userInfo);

          console.log('[Auth] Token stored in localStorage and set in apiClient');

          // Update profile name in localStorage to ensure it's immediately available
          // This fixes the issue where the name remains as "Kuldeep" until profile section is clicked
          if (user.displayName) {
            try {
              // Store current user profile with the correct name
              const profileData = {
                username: user.email,
                display_name: user.displayName,
                email: user.email,
                uid: user.uid,
                updated_at: new Date().toISOString()
              };

              localStorage.setItem('currentUserProfile', JSON.stringify(profileData));

              // Update any name mappings
              localStorage.setItem(`nameMapping_Kuldeep`, user.displayName);
              localStorage.setItem(`nameMapping_Official Editz`, user.displayName);

              console.log('[Auth] Updated profile name in localStorage:', user.displayName);

              // Replace "Kuldeep" and "Official Editz" with the current user's name in cached blogs
              try {
                const cachedBlogs = sessionStorage.getItem('cachedBlogs');
                if (cachedBlogs) {
                  const blogs = JSON.parse(cachedBlogs);
                  if (Array.isArray(blogs)) {
                    const updatedBlogs = blogs.map(blog => {
                      if (blog.author === 'Kuldeep' || blog.author === 'Official Editz') {
                        blog.author = user.displayName;
                      }
                      if (blog.author_name === 'Kuldeep' || blog.author_name === 'Official Editz') {
                        blog.author_name = user.displayName;
                      }
                      return blog;
                    });

                    sessionStorage.setItem('cachedBlogs', JSON.stringify(updatedBlogs));
                    console.log('[Auth] Updated author names in cached blogs');
                  }
                }
              } catch (cacheError) {
                console.error('[Auth] Error updating cached blogs:', cacheError);
              }
            } catch (profileError) {
              console.error('[Auth] Error updating profile in localStorage:', profileError);
            }
          }
        } catch (error) {
          console.error('[Auth] Error getting ID token:', error);
        }
      } else {
        // User is signed out, clear token and user info
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userUid');
        localStorage.removeItem('currentUserProfile');
        apiClient.setAuthToken(null);
        console.log('[Auth] Token removed from localStorage and apiClient');
      }

      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    signInWithGoogle,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
}
