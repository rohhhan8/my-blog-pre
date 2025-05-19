import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Login = () => {
  const { login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await login(email, password);

      // Force token refresh to ensure we have the latest token
      const token = await userCredential.user.getIdToken(true);

      // Store token in localStorage for API requests
      localStorage.setItem('authToken', token);

      // Also store user info for better UX
      const user = userCredential.user;
      localStorage.setItem('userDisplayName', user.displayName || '');
      localStorage.setItem('userEmail', user.email || '');

      console.log('Login successful, token stored');
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);

      // Provide more specific error messages based on Firebase error codes
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later or reset your password.');
      } else {
        setError('Failed to log in. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const user = await signInWithGoogle();

      // Force token refresh to ensure we have the latest token
      const token = await user.getIdToken(true);

      // Store token in localStorage for API requests
      localStorage.setItem('authToken', token);

      // Also store user info for better UX
      localStorage.setItem('userDisplayName', user.displayName || '');
      localStorage.setItem('userEmail', user.email || '');

      console.log('Google sign-in successful, token stored');
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Google sign-in error:', err);

      // Provide more specific error messages based on error type
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups for this site.');
      } else {
        setError('Failed to sign in with Google. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-blog-bg dark:bg-black transition-colors duration-200">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-black p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-blog-card-light-hover dark:hover:shadow-blog-card-dark-hover hover:border-gray-300 dark:hover:border-gray-500">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-playfair">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account to continue
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
            />
            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/signup" className="font-medium text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200">
                Don't have an account? Sign up
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-black text-gray-500 dark:text-gray-400">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-black text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.79-1.677-4.184-2.702-6.735-2.702-5.522 0-10 4.478-10 10s4.478 10 10 10c8.396 0 10.249-7.85 9.426-11.748l-9.426 0.082z" fill="#4285F4" />
                <path d="M12.545 10.239l-9.426 0.082c-0.293 1.388-0.449 2.828-0.449 4.301h9.875v-4.383z" fill="#34A853" />
                <path d="M7.223 14.622l-4.553 0c0 1.473 0.156 2.913 0.449 4.301l4.104 0c-0.226-1.357-0.226-2.944 0-4.301z" fill="#FBBC05" />
                <path d="M12.545 19.776c2.8 0 4.734-1.657 5.445-3.972l-5.445-3.821v7.793z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
