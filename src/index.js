import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './contexts/AuthContext';

console.log('=================================================');
console.log('[index.js] React app initializing...');
console.log('[index.js] Current URL:', window.location.href);
console.log('[index.js] Pathname:', window.location.pathname);
console.log('[index.js] Search:', window.location.search);
console.log('[index.js] Hash:', window.location.hash);
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
