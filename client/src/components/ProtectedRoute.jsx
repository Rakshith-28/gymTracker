import { Navigate } from 'react-router-dom';
import { isTokenValid, clearToken } from '../utils/auth';

export default function ProtectedRoute({ children }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  // Redirect to login if missing or invalid/expired
  if (!token || !isTokenValid(token)) {
    if (token && !isTokenValid(token)) {
      clearToken();
    }
    return <Navigate to="/login" replace />;
  }
  return children;
}
