import { useState, useEffect } from 'react';
import { signInWithRedirect, signInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);

  // Note: getRedirectResult is handled in AuthContext to avoid calling it twice

  // Load existing logs from localStorage on mount (console override is now in index.js)
  useEffect(() => {
    try {
      const savedLogs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
      setDebugInfo(savedLogs);
    } catch (e) {
      console.error('Failed to load debug logs', e);
    }
  }, []);

  // Refresh logs periodically to show new entries
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const savedLogs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
        setDebugInfo(savedLogs);
      } catch (e) {
        // Ignore
      }
    }, 500); // Refresh every 500ms

    return () => clearInterval(interval);
  }, []);

  const shouldUseRedirect = () => {
    // Use redirect on mobile devices for better UX (avoids popup blockers)
    // Now that authDomain matches the actual domain, redirect should work
    if (typeof window === 'undefined') return true;
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    console.log('[Login] shouldUseRedirect - isMobile:', isMobile, 'isStandalone:', isStandalone);
    return isMobile || isStandalone;
  };

  const handleBypassAuth = () => {
    // Create a fake user object for testing
    const fakeUser = {
      uid: 'test-user-bypass',
      email: 'test@bypass.com',
      displayName: 'Test User (Bypass)',
      photoURL: null
    };

    // Manually set the user in AuthContext by triggering onAuthStateChanged
    // Note: This is a hack for testing only - in production you'd never do this
    console.log('[Login] BYPASS: Simulating authenticated user');
    toast.info('Authentication bypassed for testing');

    // Force a page reload to trigger the app with a "logged in" state
    // We'll use sessionStorage to pass the bypass flag
    sessionStorage.setItem('auth_bypass', 'true');
    window.location.reload();
  };

  const handleGoogleSignIn = async () => {
    console.log('[Login] Starting Google sign in...');
    setLoading(true);

    try {
      const useRedirect = shouldUseRedirect();
      console.log('[Login] Using', useRedirect ? 'REDIRECT' : 'POPUP', 'flow');

      if (useRedirect) {
        // CRITICAL: Set persistence BEFORE redirect for mobile
        console.log('[Login] Setting LOCAL persistence before redirect...');
        console.log('[Login] Current URL:', window.location.href);
        console.log('[Login] Auth domain being used:', auth.config.authDomain);

        try {
          await setPersistence(auth, browserLocalPersistence);
          console.log('[Login] Persistence set, starting redirect...');

          // Ensure we redirect back to the current domain
          await signInWithRedirect(auth, googleProvider);
          console.log('[Login] ⚠️ This log should NOT appear - redirect should have started');
          // Execution stops here - page will redirect
          return;
        } catch (redirectError) {
          console.error('[Login] REDIRECT FAILED:', redirectError);
          console.error('[Login] Error code:', redirectError.code);
          console.error('[Login] Error message:', redirectError.message);
          toast.error(`Redirect failed: ${redirectError.message}`);
          setLoading(false);
          return;
        }
      } else {
        // Desktop: use popup
        const result = await signInWithPopup(auth, googleProvider);
        console.log('[Login] Popup sign-in successful:', result.user?.email);
        toast.success('Signing in...');
      }
    } catch (error) {
      console.error('[Login] Login error:', error);

      // Fallback to redirect if popup blocked
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        console.log('[Login] Popup blocked, falling back to redirect');
        try {
          await setPersistence(auth, browserLocalPersistence);
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          console.error('[Login] Redirect fallback failed:', redirectError);
          toast.error(`Failed to start Google sign-in (${redirectError.code || 'unknown error'}).`);
        }
      } else {
        const message = error.code === 'auth/unauthorized-domain'
          ? 'This URL is not authorized for Google sign-in. Update the Authorized Domains in Firebase Authentication settings.'
          : `Failed to start Google sign-in (${error.code || 'unknown error'}).`;
        toast.error(message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>SoSTrack</h1>
          <p>Production & Inventory Management</p>
        </div>

        <div className="login-body">
          <button
            className="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <button
            className="google-signin-btn"
            onClick={handleBypassAuth}
            disabled={loading}
            style={{
              marginTop: '10px',
              backgroundColor: '#ff6b6b',
              border: '1px solid #ff5252'
            }}
          >
            🔓 Bypass Auth (Testing Only)
          </button>
        </div>

        <div className="login-footer">
          <p>Secure access for authorized users only</p>
          <p style={{ fontSize: '10px', marginTop: '10px', color: '#666' }}>
            v2.0.18 | Build: {new Date().toISOString().split('T')[0]}
          </p>
        </div>

        {debugInfo.length > 0 && (
          <div style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
            maxHeight: '200px',
            overflow: 'auto',
            color: '#333'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <strong>Debug Log (survives redirect):</strong>
              <button
                onClick={() => {
                  localStorage.removeItem('debug_logs');
                  setDebugInfo([]);
                }}
                style={{ fontSize: '10px', padding: '2px 5px' }}
              >
                Clear
              </button>
            </div>
            {debugInfo.map((log, i) => (
              <div key={i} style={{ borderBottom: '1px solid #ddd', padding: '2px 0' }}>
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
