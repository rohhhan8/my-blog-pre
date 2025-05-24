import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCurrentUserProfile, getUserProfile } from '../services/profileService';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import BLogoLoader from '../components/BLogoLoader';

const Profile = () => {
  const { username } = useParams();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        let profileData;

        // Only attempt to fetch profile if user is logged in
        if (currentUser) {
          console.log('Fetching profile for logged in user:', currentUser.displayName);

          // If no username is provided or it matches the current user, fetch the current user's profile
          if (!username || username === currentUser.displayName) {
            try {
              profileData = await getCurrentUserProfile();

              // Check if there's an auth warning in the response
              if (profileData.auth_warning) {
                console.log('Auth warning from server:', profileData.auth_warning);
                setError('Authentication warning: ' + profileData.auth_warning);
              }

              setIsOwnProfile(true);
            } catch (profileErr) {
              console.error('Error fetching own profile:', profileErr);

              // Handle different error cases
              if (profileErr.response) {
                console.log('Profile error response status:', profileErr.response.status);
                console.log('Profile error response data:', profileErr.response.data);

                // If profile doesn't exist yet or authentication failed, create a default profile view
                if (profileErr.response.status === 404 || profileErr.response.status === 403) {
                  console.log('Creating default profile due to 404 or 403 error');
                  profileData = {
                    username: currentUser.displayName || currentUser.email.split('@')[0],
                    display_name: currentUser.displayName || '',
                    bio: profileErr.response.status === 403 ?
                      'Unable to fetch your complete profile due to an authentication issue. Try logging out and back in.' :
                      'Your profile has not been set up yet. Click Edit Profile to add your details.',
                    profession: '',
                    gender: '',
                    location: '',
                    website: '',
                    avatar_url: currentUser.photoURL || '',
                    blog_count: 0,
                    member_since: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    created_at: new Date().toISOString()
                  };

                  // Set a warning message for authentication errors
                  if (profileErr.response.status === 403) {
                    setError('Authentication issue detected. Some profile features may be limited. Try logging out and back in.');
                  }
                } else {
                  throw profileErr;
                }
              } else {
                // For network errors or other issues, create a basic profile
                console.log('Creating default profile due to non-response error');
                profileData = {
                  username: currentUser.displayName || currentUser.email.split('@')[0],
                  display_name: currentUser.displayName || '',
                  bio: 'Unable to fetch your profile due to a network issue. Please check your connection.',
                  profession: '',
                  gender: '',
                  location: '',
                  website: '',
                  avatar_url: currentUser.photoURL || '',
                  blog_count: 0,
                  member_since: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                  created_at: new Date().toISOString()
                };

                setError('Network issue detected. Unable to fetch your complete profile.');
              }
            }
          } else {
            // Otherwise, fetch the specified user's public profile
            try {
              console.log(`Attempting to fetch profile for username: ${username}`);
              // Decode the username in case it was URL-encoded
              const decodedUsername = decodeURIComponent(username);
              profileData = await getUserProfile(decodedUsername);
              console.log('Successfully fetched profile:', profileData);
              setIsOwnProfile(false);
            } catch (err) {
              console.error(`Error fetching profile for ${username}:`, err);

              // Try to get author information from localStorage
              let authorInfo = null;
              try {
                const lastViewedAuthor = localStorage.getItem('lastViewedAuthor');
                if (lastViewedAuthor) {
                  const parsedAuthor = JSON.parse(lastViewedAuthor);
                  console.log('Found author info in localStorage:', parsedAuthor);

                  // Check if this is the author we're looking for
                  if (parsedAuthor.username.toLowerCase() === username.toLowerCase()) {
                    console.log('Using cached author info from localStorage');
                    authorInfo = parsedAuthor;
                  }
                }
              } catch (localStorageErr) {
                console.error('Error reading author info from localStorage:', localStorageErr);
              }

              // Try to extract author information from blogs if not found in localStorage
              if (!authorInfo) {
                try {
                  console.log(`Attempting to find author info for ${username} from blogs`);
                  // This would be a good place to add an API call to search blogs by author
                  // For now, we'll just create a default profile
                } catch (blogErr) {
                  console.error(`Error finding author info from blogs:`, blogErr);
                }
              }

              // Create a default profile with the information we have
              profileData = {
                username: username,
                display_name: authorInfo ? authorInfo.display_name : username,
                bio: 'This author has not created a complete profile yet.',
                profession: 'Writer',
                gender: '',
                location: '',
                website: '',
                avatar_url: '',
                blog_count: 0,
                member_since: 'Unknown',
                created_at: new Date().toISOString()
              };

              // Set a more friendly error message
              setError(`${username}'s profile is not fully set up yet. Showing available information.`);
            }
          }

          // Only set profile if we have data
          if (profileData) {
            setProfile(profileData);
          }
        } else {
          // If not logged in and trying to view own profile, show error
          if (!username) {
            setError('Please log in to view your profile');
          } else {
            // Try to fetch public profile even if not logged in
            try {
              console.log(`Attempting to fetch profile for username (not logged in): ${username}`);
              // Decode the username in case it was URL-encoded
              const decodedUsername = decodeURIComponent(username);
              profileData = await getUserProfile(decodedUsername);
              console.log('Successfully fetched profile (not logged in):', profileData);
              setProfile(profileData);
              setIsOwnProfile(false);
              setError('');
            } catch (err) {
              console.error(`Error fetching public profile for ${username}:`, err);

              // Try to get author information from localStorage
              let authorInfo = null;
              try {
                const lastViewedAuthor = localStorage.getItem('lastViewedAuthor');
                if (lastViewedAuthor) {
                  const parsedAuthor = JSON.parse(lastViewedAuthor);
                  console.log('Found author info in localStorage (not logged in):', parsedAuthor);

                  // Check if this is the author we're looking for
                  if (parsedAuthor.username.toLowerCase() === username.toLowerCase()) {
                    console.log('Using cached author info from localStorage (not logged in)');
                    authorInfo = parsedAuthor;
                  }
                }
              } catch (localStorageErr) {
                console.error('Error reading author info from localStorage (not logged in):', localStorageErr);
              }

              // Try to extract author information from blogs if not found in localStorage
              if (!authorInfo) {
                try {
                  console.log(`Attempting to find author info for ${username} from blogs (not logged in)`);
                  // This would be a good place to add an API call to search blogs by author
                  // For now, we'll just create a default profile
                } catch (blogErr) {
                  console.error(`Error finding author info from blogs (not logged in):`, blogErr);
                }
              }

              // Create a default profile with the information we have
              profileData = {
                username: username,
                display_name: authorInfo ? authorInfo.display_name : username,
                bio: 'This author has not created a complete profile yet.',
                profession: 'Writer',
                gender: '',
                location: '',
                website: '',
                avatar_url: '',
                blog_count: 0,
                member_since: 'Unknown',
                created_at: new Date().toISOString()
              };

              setProfile(profileData);
              // Set a more friendly error message
              setError(`${username}'s profile is not fully set up yet. Showing available information.`);
            }
          }
        }
      } catch (err) {
        console.error('Error in profile fetch process:', err);
        setError('Failed to load profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, currentUser]);

  if (loading) {
    return <BLogoLoader />;
  }

  // We'll only show a full error page for critical errors
  // For profile-related warnings, we'll show them inline
  if (error && !profile) {
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-blog-bg dark:bg-black pt-32 flex justify-center">
        <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 max-w-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Profile Not Found</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">The requested profile could not be found.</p>
          <Link to="/" className="bg-blog-accent text-white px-4 py-2 rounded hover:bg-opacity-90 transition-colors">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blog-bg dark:bg-black pt-24 sm:pt-28 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Warning message for limited profile info */}
          {error && profile && (
            <div className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Header */}
          <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 sm:w-28 md:w-32 sm:h-28 md:h-32 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-4xl font-medium overflow-hidden shadow-md">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (profile.display_name?.charAt(0) || profile.username?.charAt(0) || 'U').toUpperCase()
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                  {profile.display_name || profile.username}
                </h1>

                {profile.profession && (
                  <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg mb-2">
                    {profile.profession}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center sm:justify-start gap-3 sm:gap-4 mt-3 sm:mt-4">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">Member since {profile.member_since}</span>
                  </div>

                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-5a2 2 0 00-2 2v12a2 2 0 002 2h5z" />
                    </svg>
                    <span>{profile.blog_count} {profile.blog_count === 1 ? 'post' : 'posts'}</span>
                  </div>

                  {profile.gender && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{profile.gender}</span>
                    </div>
                  )}

                  {profile.location && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{profile.location}</span>
                    </div>
                  )}
                </div>

                {/* Always show edit button for own profile */}
                {(isOwnProfile || (!username && currentUser)) && (
                  <div className="mt-4 sm:mt-6">
                    <Link to="/profile/edit">
                      <Button variant="secondary" className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base">
                        Edit Profile
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Bio */}
          {profile.bio && (
            <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">About</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line text-sm sm:text-base">{profile.bio}</p>
            </div>
          )}

          {/* Website Link */}
          {profile.website && (
            <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">Website</h2>
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blog-accent hover:underline text-sm sm:text-base break-all"
              >
                {profile.website}
              </a>
            </div>
          )}

          {/* Back Button */}
          <div className="p-4 sm:p-6 md:p-8">
            <Link to="/" className="inline-flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm sm:text-base">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
