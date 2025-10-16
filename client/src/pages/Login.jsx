import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });
      
      // Save token to localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      
      alert('Login successful!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

return (
  <div className={styles.loginContainer}>
    <form onSubmit={handleSubmit} className={styles.formWrapper}>
      <h1 className={styles.title}>Login </h1>

      <div className={styles.inputGroup}>
        <label htmlFor="email" className={styles.label}>Email</label>
        <input 
          type="email" 
          id="email"
          className={styles.input}
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="password" className={styles.label}>Password</label>
        <input 
          type="password" 
          id="password"
          className={styles.input}
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
      </div>

      <button type="submit" className={styles.button}>Login</button>
      
      {/* We'll style this link in the next step */}
      <p className={styles.redirectText}> 
  Don't have an account?{' '}
  <a href="/register" className={styles.redirectLink}>Register</a>
</p>
    </form>
  </div>
);
}

export default Login;