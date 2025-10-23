import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { isTokenValid } from './utils/auth';
import { WorkoutProvider, useWorkout } from './context/WorkoutContext.jsx';
import ActiveSessionSidebar from './components/ActiveSessionSidebar.jsx';

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


function AppShell({ authed }) {
  const location = useLocation();
  const { isSessionActive } = useWorkout();
  const hideNavbarOn = ['/login', '/register'];
  const shouldShowNavbar = !hideNavbarOn.includes(location.pathname);
  const showActiveSidebar = authed && shouldShowNavbar && isSessionActive && location.pathname !== '/workout-in-progress';

  return (
    <>
      {shouldShowNavbar && <Navbar />}
      {showActiveSidebar && <ActiveSessionSidebar />}
      <div className={showActiveSidebar ? 'sessionActiveOffset' : ''}>
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
          {/* Alias route for in-progress session view */}
          <Route path="/workout-in-progress" element={<ProtectedRoute><StartSession /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  const location = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authed = token && isTokenValid(token);
  return (
    // Note: The <BrowserRouter> tag must be outside of App.jsx, usually in main.jsx
    <WorkoutProvider>
      <ErrorBoundary>
        <AppShell authed={authed} key={location.pathname} />
      </ErrorBoundary>
    </WorkoutProvider>
  );
}

export default App;