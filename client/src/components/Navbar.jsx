import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';

// Self-contained SVG icon for the logo (adopted from the feature branch)
const DumbbellIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.4 14.4 9.6 9.6M9.6 14.4 14.4 9.6M21 7h-2.3a4 4 0 0 0-3.5 2.1L14 11.5M3 17h2.3a4 4 0 0 0 3.5-2.1L10 12.5M12 12a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-5ZM12 12a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-5Z" />
  </svg>
);

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Adopted the user object check from the HEAD branch to display the name
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  // Use useEffect to check login status once on mount (adopted from feature branch)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    // Clear ALL user data from storage (including the 'user' object from HEAD)
    localStorage.removeItem('token');
    localStorage.removeItem('user'); 
    // Update state and redirect
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.logoContainer}>
        <div className={styles.logoIcon}>
          <DumbbellIcon />
        </div>
        <span className={styles.logoText}>IRON CORE</span>
      </Link>

      {/* Main navigation links */}
      <div className={styles.navLinks}>
        {isLoggedIn ? (
          <>
            {/* Display the welcome message with user name (from HEAD branch) */}
            <span className={styles.welcomeText}>Welcome, {user.name || 'User'}!</span>
            
            {/* Logged-in links (Combined and fixed to match HEAD routes) */}
            <Link to="/log-workout" className={styles.navLink}>Log Workout</Link>
            <Link to="/history" className={styles.navLink}>History</Link>
            <Link to="/analytics" className={styles.navLink}>Analytics</Link>
            <Link to="/profile" className={styles.navLink}>Profile</Link>
            
            <button
              onClick={handleLogout}
              className={`${styles.button} ${styles.secondaryButton}`}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            {/* Guest links (Adopted cleaner styling from feature branch) */}
            <Link
              to="/login"
              className={`${styles.button} ${styles.secondaryButton}`}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className={`${styles.button} ${styles.primaryButton}`}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
      
      {/* Mobile Menu Icon (from feature branch) */}
      <button className={styles.menuButton}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
    </nav>
  );
}

export default Navbar;