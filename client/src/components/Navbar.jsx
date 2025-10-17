import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav style={{
      backgroundColor: '#333',
      padding: '15px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '20px', fontWeight: 'bold' }}>
          💪 Gym Tracker
        </Link>
        
        {token && (
          <>
            <Link to="/log-workout" style={{ color: 'white', textDecoration: 'none' }}>
              Log Workout
            </Link>
            <Link to="/history" style={{ color: 'white', textDecoration: 'none' }}>
              History
            </Link>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        {token ? (
          <>
            <span style={{ color: 'white' }}>Welcome, {user.name}!</span>
            <button onClick={handleLogout} style={{
              padding: '8px 15px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>
              Login
            </Link>
            <Link to="/register" style={{ color: 'white', textDecoration: 'none' }}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;