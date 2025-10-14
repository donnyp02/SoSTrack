import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (console && console.error) {
      console.error('ErrorBoundary caught:', error, info);
    }
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      return (
        <div className="error-boundary" style={{ padding: 16 }}>
          <h3>Something went wrong.</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(error)}</pre>
          {this.props.fallback}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
