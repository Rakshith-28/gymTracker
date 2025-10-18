import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Auth.module.css';

// SVG Icon Components
const DumbbellIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.4 14.4 9.6 9.6M9.6 14.4 14.4 9.6M21 7h-2.3a4 4 0 0 0-3.5 2.1L14 11.5M3 17h2.3a4 4 0 0 0 3.5-2.1L10 12.5M12 12a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-5ZM12 12a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-5Z"/></svg>;
const MailIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const LockIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EyeIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>;
const ArrowRightIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const CheckCircleIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>;
const AlertCircleIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>;

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        setSuccess(`Welcome back! Let's crush those goals!`);
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className={styles.authContainer}>
      <div className={styles.backgroundEffects}>
        <div className={styles.glow1}></div>
        <div className={styles.glow2}></div>
        <div className={styles.glow3}></div>
        <div className={styles.gridPattern}></div>
      </div>

      <div className={styles.brandingPanel}>
        <div className={styles.brandingContent}>
          <div className={styles.logoContainer}>
            <div className={styles.logoIconWrapper}>
              <div className={styles.logoIconBg}></div>
              <div className={styles.logoIcon}><DumbbellIcon /></div>
            </div>
            <div className={styles.logoText}>
              <h1>IRON CORE</h1>
              <p>Fitness & Performance</p>
            </div>
          </div>
          <h2 className={styles.tagline}>Transform Your<span>Body & Mind</span></h2>
          <p className={styles.description}>Join thousands of athletes pushing their limits and achieving extraordinary results.</p>
        </div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.formWrapper}>
          <div className={styles.formGradientBar}></div>
          <div className={styles.formContent}>
            <h2 className={styles.formTitle}>Welcome Back!</h2>
            <p className={styles.formSubtitle}>Enter your credentials to continue</p>

            {success && <div className={`${styles.messageBox} ${styles.successBox}`}><CheckCircleIcon /><span>{success}</span></div>}
            {error && <div className={`${styles.messageBox} ${styles.errorBox}`}><AlertCircleIcon /><span>{error}</span></div>}
            
            <div className={styles.formFieldsContainer}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email Address</label>
                <div className={styles.inputWrapper}>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} onKeyPress={handleKeyPress} className={styles.input} placeholder="your@email.com"/>
                  <MailIcon />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <div className={styles.inputWrapper}>
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} onKeyPress={handleKeyPress} className={styles.input} placeholder="••••••••"/>
                  <LockIcon />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.passwordToggle}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={isLoading} className={styles.submitButton}>
                {isLoading ? <div className={styles.loader}></div> : <><span>Sign In</span><ArrowRightIcon /></>}
              </button>
            </div>

            <p className={styles.footerText}>
              Don't have an account?{" "}
              <a href="/register" className={styles.footerLink}>Sign up now</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

