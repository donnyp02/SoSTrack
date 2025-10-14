import React, { useState, useEffect, useCallback, useRef } from 'react';
import { signInWithRedirect, getRedirectResult, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, INITIAL_ALLOWED_EMAILS } from '../firebase';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState(
    INITIAL_ALLOWED_EMAILS.map((email) => email.trim().toLowerCase())
  );
  const [whitelistLoaded, setWhitelistLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const processedUserRef = useRef(null);

  // Load whitelist from Firestore on component mount
  useEffect(() => {
    const loadWhitelist = async () => {
      try {
        const whitelistDoc = await getDoc(doc(db, 'settings', 'whitelist'));
        if (whitelistDoc.exists()) {
          const fetched = whitelistDoc.data().emails || INITIAL_ALLOWED_EMAILS;
          const normalized = fetched
            .map((email) => (email ? email.trim().toLowerCase() : null))
            .filter(Boolean);
          setAllowedEmails(normalized);
        } else {
          // Initialize whitelist in Firestore if it doesn't exist
          const normalizedInitial = INITIAL_ALLOWED_EMAILS.map((email) =>
            email.trim().toLowerCase()
          );
          await setDoc(doc(db, 'settings', 'whitelist'), {
            emails: normalizedInitial,
            updatedAt: new Date()
          });
          setAllowedEmails(normalizedInitial);
        }
      } catch (error) {
        console.error('Error loading whitelist:', error);
        setAllowedEmails(
          INITIAL_ALLOWED_EMAILS.map((email) => email.trim().toLowerCase())
        );
      } finally {
        setWhitelistLoaded(true);
      }
    };
    loadWhitelist();
  }, []);

  const handleAuthResult = useCallback(async (result) => {
    if (!result) return;
    const user = result.user;
    if (!user) return;
    processedUserRef.current = user.uid;
    const email = user.email?.trim().toLowerCase();
    console.debug('[Login] Processing auth result for UID:', user.uid, 'email:', email);
    if (!email) {
      toast.error('Failed to retrieve email from Google. Please try again.');
      setStatusMessage('Google did not return an email address. Please retry.');
      setLoading(false);
      return;
    }
    setStatusMessage(`Signed in as ${email}, verifying access…`);
    console.debug('[Login] Received auth result for', email);
    if (!allowedEmails.includes(email)) {
      await auth.signOut();
      toast.error(`Access denied. ${email} is not authorized to access this application.`);
      setStatusMessage(`Access denied for ${email}. Add it to the whitelist to continue.`);
      setLoading(false);
      return;
    }
    toast.success('Welcome to SoSTrack!');
    setStatusMessage('Access granted. Loading app…');
    setLoading(false);
  }, [allowedEmails]);

  useEffect(() => {
    if (!whitelistLoaded) return;
    let isMounted = true;
    const resolveRedirect = async () => {
      try {
        setLoading(true);
        setStatusMessage('Checking for a previous Google sign-in…');
        const result = await getRedirectResult(auth);
        if (!isMounted) return;
        if (result) {
          console.debug('[Login] redirect result returned', result);
          await handleAuthResult(result);
        } else if (auth.currentUser) {
          console.debug('[Login] no redirect result, using currentUser', auth.currentUser.uid);
          await handleAuthResult({ user: auth.currentUser });
        } else {
          console.warn('[Login] No redirect result and no current user after redirect. Likely the sign-in was cancelled or blocked.');
          setStatusMessage('No Google session detected. If the sign-in window closed immediately, please ensure cookies are enabled and the domain is authorized in Firebase.');
        }
        setLoading(false);
      } catch (error) {
        console.error('Redirect sign-in error:', error);
        if (isMounted) {
          const message = error.code === 'auth/unauthorized-domain'
            ? 'This URL is not authorized in your Firebase project. Add it to the allowed domains list or use an approved hostname.'
            : 'Failed to sign in. Please try again.';
          toast.error(message);
          setStatusMessage(`Redirect error: ${message} (${error.code || 'unknown'})`);
          setLoading(false);
        }
      }
    };
    resolveRedirect();
    return () => {
      isMounted = false;
    };
  }, [handleAuthResult, whitelistLoaded]);

  useEffect(() => {
    if (!whitelistLoaded) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        processedUserRef.current = null;
        setStatusMessage('');
        setLoading(false);
        return;
      }
      if (processedUserRef.current === user.uid) return;
      await handleAuthResult({ user });
    });
    return () => unsubscribe();
  }, [handleAuthResult, whitelistLoaded]);

  const shouldUseRedirect = () => {
    if (typeof window === 'undefined') return true;
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    return isMobile || isStandalone;
  };

  const handleGoogleSignIn = async () => {
    if (!whitelistLoaded) return;
    setLoading(true);
    setStatusMessage('Starting Google sign-in…');
    try {
      if (shouldUseRedirect()) {
        setStatusMessage('Redirecting to Google…');
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      setStatusMessage('Opening Google sign-in popup…');
      const result = await signInWithPopup(auth, googleProvider);
      await handleAuthResult(result);
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        try {
          setStatusMessage('Popup blocked, falling back to redirect…');
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          console.error('Redirect fallback failed:', redirectError);
          const message = redirectError.code === 'auth/unauthorized-domain'
            ? 'This URL is not authorized for Google sign-in. Update the Authorized Domains in Firebase Authentication settings.'
            : `Failed to start Google sign-in (${redirectError.code || 'unknown error'}).`;
          toast.error(message);
          setStatusMessage(`Redirect fallback failed: ${message}`);
        }
      } else {
        const message = error.code === 'auth/unauthorized-domain'
          ? 'This URL is not authorized for Google sign-in. Update the Authorized Domains in Firebase Authentication settings.'
          : `Failed to start Google sign-in (${error.code || 'unknown error'}).`;
        toast.error(message);
        setStatusMessage(`Google sign-in failed: ${message}`);
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

          {allowedEmails.length === 0 && (
            <div className="warning-notice">
              <strong>⚠️ Setup Required:</strong> No email whitelist configured.
              Please add allowed emails in src/firebase.js
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="login-status">
            {statusMessage}
          </div>
        )}

        <div className="login-footer">
          <p>Secure access for authorized users only</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
