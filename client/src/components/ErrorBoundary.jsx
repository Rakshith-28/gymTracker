import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Optionally log to an error reporting service
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: 800, margin: '80px auto', padding: 16, color: '#fff' }}>
          <h2 style={{ marginBottom: 8 }}>Something went wrong.</h2>
          <p style={{ opacity: 0.8 }}>Try refreshing the page, or navigate back to Home.</p>
          <div style={{ marginTop: 16 }}>
            <a href="/" style={{ color: '#93c5fd', textDecoration: 'underline' }}>Go Home</a>
          </div>
          <pre style={{ marginTop: 16, background: '#111827', padding: 12, borderRadius: 8, overflow: 'auto' }}>
            {String(this.state.error)}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
