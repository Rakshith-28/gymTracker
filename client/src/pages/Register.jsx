import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import axios from 'axios';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        name,
        email,
        password
      });
      
      // Save token to localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      
      alert('Registration successful!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

return (
  <div className={styles.loginContainer}>
    <form onSubmit={handleSubmit} className={styles.formWrapper}>
      <h1 className={styles.title}>Create Account</h1>

      {/* This will now use our new error style */}
      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.inputGroup}>
        <label htmlFor="name" className={styles.label}>Name</label>
        <input 
          type="text" 
          id="name"
          className={styles.input}
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
        />
      </div>

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

      <button type="submit" className={styles.button}>Register</button>
      
      <p className={styles.redirectText}> 
        Already have an account?{' '}
        <a href="/login" className={styles.redirectLink}>Login</a>
      </p>

    </form>
  </div>
);
}

export default Register;