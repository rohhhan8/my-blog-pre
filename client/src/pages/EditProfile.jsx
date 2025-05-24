import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCurrentUserProfile, updateProfile, uploadProfileImage } from '../services/profileService';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import BLogoLoader from '../components/BLogoLoader';

const EditProfile = () => {
  const { currentUser, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    display_name: '',
    bio: '',
    profession: '',
    gender: '',
    location: '',
    website: '',
    avatar_url: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        if (!currentUser) {
          setError('You must be logged in to edit your profile');
          setLoading(false);
          return;
        }

        // Check for pending profile updates in localStorage
        const pendingUpdate = localStorage.getItem('pendingProfileUpdate');
        if (pendingUpdate) {
          try {
            const pendingData = JSON.parse(pendingUpdate);
            console.log('Found pending profile update:', pendingData);

            // Ask user if they want to use the pending data
            const useLocalData = window.confirm(
              'We found profile changes that were not saved due to an authentication issue. Would you like to use these changes?'
            );

            if (useLocalData) {
              setProfile(pendingData);
              if (pendingData.avatar_url) {
                setAvatarPreview(pendingData.avatar_url);
              }
              setSuccess('Your previous changes have been loaded. Click Save Changes to try updating your profile again.');

              // Don't remove the pending data yet - only remove it after a successful save
            } else {
              // User declined, remove the pending data
              localStorage.removeItem('pendingProfileUpdate');
            }
          } catch (parseErr) {
            console.error('Error parsing pending profile update:', parseErr);
            localStorage.removeItem('pendingProfileUpdate');
          }
        }

        try {
          // Try to get existing profile
          const profileData = await getCurrentUserProfile();

          // Check if there's an auth warning in the response
          if (profileData.auth_warning) {
            console.log('Auth warning from server:', profileData.auth_warning);
            setError('Authentication warning: ' + profileData.auth_warning +
                     ' Your changes will be saved locally until you log out and back in.');
          }

          // Only set the profile if we didn't already set it from pending data
          if (!pendingUpdate || !JSON.parse(pendingUpdate)) {
            setProfile({
              display_name: profileData.display_name || '',
              bio: profileData.bio || '',
              profession: profileData.profession || '',
              gender: profileData.gender || '',
              location: profileData.location || '',
              website: profileData.website || '',
              avatar_url: profileData.avatar_url || ''
            });

            if (profileData.avatar_url) {
              setAvatarPreview(profileData.avatar_url);
            }
          }
        } catch (err) {
          console.error('Error fetching profile:', err);

          // Only set default values if we didn't already set from pending data
          if (!pendingUpdate || !JSON.parse(pendingUpdate)) {
            // If profile doesn't exist yet or auth failed, initialize with default values
            if (err.response && (err.response.status === 404 || err.response.status === 403)) {
              console.log(`Profile not found or auth failed (${err.response.status}), initializing with defaults`);
              setProfile({
                display_name: currentUser.displayName || '',
                bio: '',
                profession: '',
                gender: '',
                location: '',
                website: '',
                avatar_url: currentUser.photoURL || ''
              });

              if (currentUser.photoURL) {
                setAvatarPreview(currentUser.photoURL);
              }

              if (err.response.status === 403) {
                setError('Authentication issue detected. Your changes will be saved locally until you log out and back in.');
              }
            } else {
              setError('Failed to load profile. Please try again later.');
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      console.log('Starting profile update process...');
      console.log('Current profile data:', profile);

      // If there's a new avatar file, upload it first
      let updatedProfile = { ...profile };

      if (avatarFile) {
        try {
          console.log('Uploading avatar file...');
          const avatarUrl = await uploadProfileImage(avatarFile);
          console.log('Avatar uploaded successfully:', avatarUrl);
          updatedProfile.avatar_url = avatarUrl;
        } catch (uploadError) {
          console.error('Error uploading avatar:', uploadError);
          setError('Failed to upload avatar. Profile update will continue without the new avatar.');
        }
      }

      // Add user information if not present
      if (!updatedProfile.user) {
        updatedProfile.user = currentUser.uid;
      }

      // Add display_name if not present
      if (!updatedProfile.display_name && currentUser.displayName) {
        updatedProfile.display_name = currentUser.displayName;
      }

      console.log('Sending profile update with data:', updatedProfile);

      try {
        // Update the profile in our backend
        const result = await updateProfile(updatedProfile);
        console.log('Profile update result:', result);

        // Clear any pending profile update in localStorage
        localStorage.removeItem('pendingProfileUpdate');

        // Store the current user's profile information in localStorage
        // This will be used to update author names across the application
        const oldName = currentUser.displayName || profile.display_name;
        localStorage.setItem('currentUserProfile', JSON.stringify({
          old_name: oldName,
          display_name: updatedProfile.display_name,
          timestamp: new Date().toISOString()
        }));

        // Also update all cached author entries that match the old name
        try {
          const cachedAuthors = Object.keys(localStorage)
            .filter(key => key.startsWith('author_'));

          for (const key of cachedAuthors) {
            const authorName = key.replace('author_', '');
            if (authorName === oldName) {
              localStorage.setItem(key, JSON.stringify({
                display_name: updatedProfile.display_name,
                timestamp: new Date().toISOString()
              }));
              console.log(`Updated cached author: ${authorName} -> ${updatedProfile.display_name}`);
            }
          }
        } catch (cacheError) {
          console.error('Error updating cached authors:', cacheError);
        }

        // Also update the Firebase user's displayName to keep it in sync
        if (updatedProfile.display_name && currentUser) {
          try {
            await updateUserProfile(updatedProfile.display_name, updatedProfile.avatar_url || null);
            console.log('Firebase displayName updated to:', updatedProfile.display_name);
          } catch (firebaseError) {
            console.error('Error updating Firebase displayName:', firebaseError);
            // Continue anyway, this is not critical
          }
        }

        setSuccess('Profile updated successfully!');

        // Navigate back to profile page after a short delay
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      } catch (updateErr) {
        console.error('Error updating profile:', updateErr);

        // Handle authentication errors
        if (updateErr.response && updateErr.response.status === 403) {
          setError('Authentication error. Please try logging out and back in, then try again.');

          // Still save the profile data locally so it's not lost
          localStorage.setItem('pendingProfileUpdate', JSON.stringify(updatedProfile));
          setSuccess('Your changes have been saved locally and will be applied when you log back in.');
        } else {
          setError(`Failed to update profile: ${updateErr.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Unexpected error in profile update:', err);
      setError(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <BLogoLoader />;
  }

  return (
    <div className="min-h-screen bg-blog-bg dark:bg-black page-content">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Edit Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Update your profile information
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Success and Error Messages */}
            {success && (
              <div className="bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {error && (
              <div className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Avatar Upload */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Profile Picture</label>
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-4xl font-medium overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (profile.display_name?.charAt(0) || currentUser?.displayName?.charAt(0) || 'U').toUpperCase()
                  )}
                </div>

                <div>
                  <label className="block">
                    <span className="sr-only">Choose profile photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded file:border-0
                        file:text-sm file:font-medium
                        file:bg-gray-100 file:text-gray-700
                        dark:file:bg-gray-800 dark:file:text-gray-300
                        hover:file:bg-gray-200 dark:hover:file:bg-gray-700"
                    />
                  </label>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>

            {/* Display Name */}
            <Input
              id="display_name"
              name="display_name"
              label="Display Name"
              value={profile.display_name}
              onChange={handleChange}
              placeholder="How you want to be known on the site"
            />

            {/* Profession */}
            <Input
              id="profession"
              name="profession"
              label="Profession"
              value={profile.profession}
              onChange={handleChange}
              placeholder="e.g. Software Developer, Student, Writer"
            />

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={profile.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              >
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Location */}
            <Input
              id="location"
              name="location"
              label="Location"
              value={profile.location}
              onChange={handleChange}
              placeholder="e.g. New York, USA"
            />

            {/* Website */}
            <Input
              id="website"
              name="website"
              label="Website"
              value={profile.website}
              onChange={handleChange}
              placeholder="https://yourwebsite.com"
            />

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                rows={5}
                className="w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Submit and Cancel Buttons */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/profile')}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={saving}
              >
                {saving ? <Spinner size="sm" /> : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
