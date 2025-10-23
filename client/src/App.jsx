import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { isTokenValid } from './utils/auth';

// Import all necessary pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EditWorkout from './pages/EditWorkout';
import WorkoutHistory from './pages/WorkoutHistory';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import StartSession from './pages/StartSession';
import NotFound from './pages/NotFound';


function App() {
  // Use useLocation hook to get the current URL path
  const location = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authed = token && isTokenValid(token);
  
  // Array of paths where the Navbar should be hidden
  const hideNavbarOn = ['/login', '/register'];
  
  // Check if the current path is NOT in the hideNavbarOn array
  const shouldShowNavbar = !hideNavbarOn.includes(location.pathname);

  return (
    // Note: The <BrowserRouter> tag must be outside of App.jsx, usually in main.jsx
    <ErrorBoundary>
      {/* Conditionally render the Navbar component */}
      {shouldShowNavbar && <Navbar />}
      
      {/* Define all application routes */}
      <Routes>
        {/* Default route: send unauthenticated users to login */}
        <Route path="/" element={authed ? <Home /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
  {/* Removed /log-workout route */}
  <Route path="/edit-workout/:id" element={<ProtectedRoute><EditWorkout /></ProtectedRoute>} />
  <Route path="/history" element={<ProtectedRoute><WorkoutHistory /></ProtectedRoute>} />
  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
  <Route path="/start-session" element={<ProtectedRoute><StartSession /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;