console.log("Main.jsx starting...");
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log("Imports done.");

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h1>CRASHED</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}>Reset</button>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
  console.log("React render called");
} catch (e) {
  console.error("Top level render failed", e);
  document.body.innerHTML = "<h1>Top level render failed</h1><pre>" + e.toString() + "</pre>";
}
