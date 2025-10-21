function NotFound() {
  return (
    <div style={{ maxWidth: 800, margin: '80px auto', padding: 16, color: '#fff', textAlign: 'center' }}>
      <h1 style={{ fontSize: 36, marginBottom: 12 }}>404 - Page Not Found</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>The page you're looking for doesn't exist.</p>
      <a href="/" style={{ color: '#93c5fd', textDecoration: 'underline', fontWeight: 700 }}>Return Home</a>
    </div>
  );
}

export default NotFound;
