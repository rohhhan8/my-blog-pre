import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BLogoLoader from './BLogoLoader';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <BLogoLoader />;
  }

  if (!currentUser) {
    // Redirect to login page but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

