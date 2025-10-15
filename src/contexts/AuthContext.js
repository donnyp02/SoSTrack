import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, getRedirectResult } from 'firebase/auth';
import { auth, INITIAL_ALLOWED_EMAILS } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AuthContext = createContext(null);

// Global flag to prevent multiple calls to getRedirectResult in the same render cycle
// This resets on actual page navigation/reload
let redirectCheckInProgress = false;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Failsafe: If loading takes more than 10 seconds, force it to finish
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.error('[AuthContext] ⚠️ FAILSAFE: Loading timeout after 10s, forcing loading=false');
      setLoading(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    console.log('[AuthContext] AuthProvider mounted/re-mounted');
    console.log('[AuthContext] redirectCheckInProgress:', redirectCheckInProgress);

    // CRITICAL: Only check redirect result ONCE per mount
    const checkRedirect = async () => {
      if (redirectCheckInProgress) {
        console.log('[AuthContext] Redirect check already in progress, skipping duplicate call');
        return;
      }

      try {
        redirectCheckInProgress = true;
        console.log('[AuthContext] Starting redirect check...');

        // Give Firebase time to restore state from localStorage
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('[AuthContext] Checking for redirect result...');
        console.log('[AuthContext] Current URL:', window.location.href);
        console.log('[AuthContext] Current auth state before check:', auth.currentUser ? auth.currentUser.email : 'no user');

        const result = await getRedirectResult(auth);

        console.log('[AuthContext] getRedirectResult returned:', result ? 'USER FOUND' : 'NULL');
        if (result) {
          console.log('[AuthContext] ✓✓✓ REDIRECT RESULT FOUND ✓✓✓');
          console.log('[AuthContext] User email:', result.user?.email);
          console.log('[AuthContext] User ID:', result.user?.uid);
        } else {
          console.log('[AuthContext] No redirect result');
          console.log('[AuthContext] Auth state after null result:', auth.currentUser ? auth.currentUser.email : 'still no user');
        }
      } catch (error) {
        console.error('[AuthContext] Error checking redirect result:', error);
        console.error('[AuthContext] Error details:', error.code, error.message);
      } finally {
        // Don't reset the flag - we only want to check once per app load
        console.log('[AuthContext] Redirect check complete');
      }
    };

    checkRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] Auth state changed:', firebaseUser ? firebaseUser.email : 'no user');

      if (!firebaseUser) {
        console.log('[AuthContext] No user, setting state to null');
        setUser(null);
        setLoading(false);
        return;
      }

      // Validate user against whitelist before accepting them
      const email = firebaseUser.email?.trim().toLowerCase();
      console.log('[AuthContext] Validating user email:', email);

      if (!email) {
        console.error('[AuthContext] User has no email, signing out');
        await firebaseSignOut(auth);
        setUser(null);
        setLoading(false);
        return;
      }

      // Fetch whitelist from Firestore
      try {
        console.log('[AuthContext] Fetching whitelist...');
        const whitelistDoc = await getDoc(doc(db, 'settings', 'whitelist'));
        let allowedEmails = INITIAL_ALLOWED_EMAILS.map((e) => e.trim().toLowerCase());

        if (whitelistDoc.exists()) {
          const fetched = whitelistDoc.data().emails || INITIAL_ALLOWED_EMAILS;
          allowedEmails = fetched
            .map((e) => (e ? e.trim().toLowerCase() : null))
            .filter(Boolean);
        }

        console.log('[AuthContext] Whitelist loaded, checking if email is allowed:', allowedEmails);

        if (!allowedEmails.includes(email)) {
          console.warn('[AuthContext] Email not in whitelist, signing out:', email);
          await firebaseSignOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        console.log('[AuthContext] User validated, setting user state');
        setUser(firebaseUser);
        setLoading(false);
      } catch (error) {
        console.error('[AuthContext] Error validating user:', error);
        // Fallback to initial whitelist
        const allowedEmails = INITIAL_ALLOWED_EMAILS.map((e) => e.trim().toLowerCase());
        if (allowedEmails.includes(email)) {
          console.log('[AuthContext] User validated with fallback whitelist');
          setUser(firebaseUser);
        } else {
          console.warn('[AuthContext] User not in fallback whitelist, signing out');
          await firebaseSignOut(auth);
          setUser(null);
        }
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
