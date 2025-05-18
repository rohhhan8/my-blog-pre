import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner'; // You can create a small spinner component

const Signup = () => {
  const { signup, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const validatePassword = (pwd) => pwd.length >= 6 && /[A-Z]/.test(pwd);

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  if (!validateEmail(email)) {
    return setError('Please enter a valid email address.');
  }

  if (!displayName.trim()) {
    return setError('Please enter a display name.');
  }

  if (!validatePassword(password)) {
    return setError('Password must be at least 6 characters and contain an uppercase letter.');
  }

  if (password !== confirmPassword) {
    return setError('Passwords do not match.');
  }

  setLoading(true);

  try {
    // signup returns user directly (per your AuthContext)
    const user = await signup(email, password, displayName);

    if (!user) {
      throw new Error('User not properly authenticated after signup.');
    }

    // Set the display name if not already set
    if (!user.displayName) {
      try {
        await user.updateProfile({
          displayName: displayName
        });
        console.log("Display name set successfully:", displayName);
      } catch (profileError) {
        console.error("Error setting display name:", profileError);
        // Continue anyway, this is not critical
      }
    }

    const token = await user.getIdToken(true); // Force refresh to include updated claims
    localStorage.setItem('authToken', token);

    navigate('/');
  } catch (err) {
    console.error(err);
    setError('Failed to create an account. ' + err.message);
  } finally {
    setLoading(false);
  }
};


  const handleGoogleSignIn = async () => {
  setError('');
  setLoading(true);

  try {
    const user = await signInWithGoogle(); // from AuthContext

    if (!user) {
      throw new Error("Google Sign-In failed, user is null.");
    }

    const idToken = await user.getIdToken(); // ✅ Only if user is valid
    console.log("Google ID Token:", idToken);

    navigate('/'); // or wherever you want to go
  } catch (error) {
    console.error("Google Sign-In error:", error.message);
    setError("Failed to sign in with Google: " + error.message);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-blog-bg dark:bg-black transition-colors duration-200">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-black p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-blog-card-light-hover dark:hover:shadow-blog-card-dark-hover hover:border-gray-300 dark:hover:border-gray-500">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-playfair">Create an account</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Join our community of writers and readers
          </p>
        </div>

        {error && (
          <div className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 p-3 rounded-md text-sm border border-gray-200 dark:border-gray-700">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />

            <Input
              id="displayName"
              type="text"
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
              placeholder="How you want to be known on the site"
            />

            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              label="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <div className="flex items-center">
              <input
                id="show-password"
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
                className="mr-2"
              />
              <label htmlFor="show-password" className="text-sm text-gray-700 dark:text-gray-300">
                Show Passwords
              </label>
            </div>
          </div>

          <div className="text-sm">
            <Link
              to="/login"
              className="font-medium text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
            >
              Already have an account? Sign in
            </Link>
          </div>

          <div className="space-y-3">
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? <Spinner /> : 'Sign up'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-black text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-black text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.79-1.677-4.184-2.702-6.735-2.702-5.522 0-10 4.478-10 10s4.478 10 10 10c8.396 0 10.249-7.85 9.426-11.748l-9.426 0.082z"
                  fill="#4285F4"
                />
                <path
                  d="M12.545 10.239l-9.426 0.082c-0.293 1.388-0.449 2.828-0.449 4.301h9.875v-4.383z"
                  fill="#34A853"
                />
                <path
                  d="M7.223 14.622l-4.553 0c0 1.473 0.156 2.913 0.449 4.301l4.104 0c-0.226-1.357-0.226-2.944 0-4.301z"
                  fill="#FBBC05"
                />
                <path
                  d="M12.545 19.776c2.8 0 4.734-1.657 5.445-3.972l-5.445-3.821v7.793z"
                  fill="#EA4335"
                />
              </svg>
              Sign up with Google
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
