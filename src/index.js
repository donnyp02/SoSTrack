import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './contexts/AuthContext';

// CRITICAL: Set up debug logging BEFORE anything else so we capture ALL logs
// AND write to DOM directly so we can see it even if React doesn't mount
const addDebugLog = (message) => {
  try {
    const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
    const newLogs = [...logs.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`];
    localStorage.setItem('debug_logs', JSON.stringify(newLogs));
  } catch (e) {
    // Ignore errors
  }

  // ALSO write directly to DOM for immediate visibility
  try {
    let debugDiv = document.getElementById('emergency-debug');
    if (!debugDiv) {
      debugDiv = document.createElement('div');
      debugDiv.id = 'emergency-debug';
      debugDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:5px;font-size:10px;z-index:99999;max-height:100px;overflow:auto;font-family:monospace;';
      document.body.appendChild(debugDiv);
    }
    debugDiv.innerHTML = `<strong>EMERGENCY DEBUG:</strong> ${message}<br>` + debugDiv.innerHTML;
  } catch (e) {
    // Ignore if DOM not ready
  }
};

// Override console.log and console.error to capture to localStorage
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  originalLog(...args);
  const msg = args.join(' ');
  addDebugLog(msg);
};

console.error = (...args) => {
  originalError(...args);
  addDebugLog('ERROR: ' + args.join(' '));
};

console.log('=================================================');
console.log('[index.js] React app initializing...');
console.log('[index.js] Current URL:', window.location.href);
console.log('[index.js] Pathname:', window.location.pathname);
console.log('[index.js] Search:', window.location.search);
console.log('[index.js] Hash:', window.location.hash);
console.log('[index.js] Timestamp:', new Date().toISOString());
console.log('=================================================');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
