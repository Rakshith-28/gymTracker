import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';

// Import all necessary pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import LogWorkout from './pages/LogWorkout';
import EditWorkout from './pages/EditWorkout';
import WorkoutHistory from './pages/WorkoutHistory';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';

function App() {
  // Use useLocation hook to get the current URL path
  const location = useLocation();
  
  // Array of paths where the Navbar should be hidden
  const hideNavbarOn = ['/login', '/register'];
  
  // Check if the current path is NOT in the hideNavbarOn array
  const shouldShowNavbar = !hideNavbarOn.includes(location.pathname);

  return (
    // Note: The <BrowserRouter> tag must be outside of App.jsx, usually in main.jsx
    <>
      {/* Conditionally render the Navbar component */}
      {shouldShowNavbar && <Navbar />}
      
      {/* Define all application routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/log-workout" element={<LogWorkout />} />
        <Route path="/edit-workout/:id" element={<EditWorkout />} />
        <Route path="/history" element={<WorkoutHistory />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </>
  );
}

export default App;