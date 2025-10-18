import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// ------------------------------------------------------------------
// 🔑 CORRECTED IMPORT: The 'jwt-decode' package often requires 
// a NAMED IMPORT (with curly braces) for its main function.
// This is the fix for the "does not provide an export named 'default'" error.
import { jwtDecode } from 'jwt-decode'; 
// ------------------------------------------------------------------
import styles from './Home.module.css';

function Home() {
  const [userName, setUserName] = useState('');
  const isLoggedIn = !!localStorage.getItem('token'); // Simple check for login status

  useEffect(() => {
    // If the user is logged in, decode the token to get their name
    if (isLoggedIn) {
      try {
        const token = localStorage.getItem('token');
        // The jwtDecode function is now called directly because it was named imported
        const decodedToken = jwtDecode(token); 
        
        // Assuming the name is stored in the token in a 'name' field
        // Adjust 'decodedToken.name' if your brother stored it differently
        setUserName(decodedToken.name);
      } catch (error) {
        // If decoding fails (token is malformed or expired), log the error
        console.error("Failed to decode token:", error);
        // Fallback name
        setUserName('Fitness Fanatic');
      }
    }
  }, [isLoggedIn]); // This effect re-runs if the login status changes

  return (
    <div className={styles.homeContainer}>
      {/* Reusing the same animated background for a consistent feel */}
      <div className={styles.backgroundEffects}>
        <div className={styles.glow1}></div>
        <div className={styles.glow2}></div>
        <div className={styles.glow3}></div>
        <div className={styles.gridPattern}></div>
      </div>

      <main className={styles.heroSection}>
        {isLoggedIn ? (
          <>
            {/* --- Logged-In View --- */}
            <h1 className={styles.mainHeadline}>
              Welcome back, <span className={styles.userName}>{userName}</span>!
            </h1>
            <p className={styles.subHeadline}>
              Ready to crush your goals? Every rep, every set, every step counts. Let's get to work.
            </p>
            <div className={styles.ctaContainer}>
              <Link to="/workouts" className={`${styles.button} ${styles.primaryButton}`}>
                Log a Workout
              </Link>
              <Link to="/dashboard" className={`${styles.button} ${styles.secondaryButton}`}>
                View Dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* --- Guest View --- */}
            <h1 className={styles.mainHeadline}>
              Unleash Your <span>Inner Athlete</span>
            </h1>
            <p className={styles.subHeadline}>
              The ultimate platform to track your workouts, monitor your progress, and achieve peak performance. Join IRON CORE today and transform your fitness journey.
            </p>
            <div className={styles.ctaContainer}>
              <Link to="/register" className={`${styles.button} ${styles.primaryButton}`}>
                Get Started
              </Link>
              <Link to="/login" className={`${styles.button} ${styles.secondaryButton}`}>
                Sign In
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Home;