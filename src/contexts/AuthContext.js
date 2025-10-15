import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, getRedirectResult } from 'firebase/auth';
import { auth, INITIAL_ALLOWED_EMAILS } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AUTH_LOADING_TIMEOUT, AUTH_RESTORE_DELAY } from '../constants/timings';

const AuthContext = createContext(null);

// Global flag to prevent multiple calls to getRedirectResult in the same render cycle
// This resets on actual page navigation/reload
let redirectCheckInProgress = false;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Failsafe: If loading takes too long, force it to finish
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, AUTH_LOADING_TIMEOUT);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // CRITICAL: Only check redirect result ONCE per mount
    const checkRedirect = async () => {
      if (redirectCheckInProgress) {
        return;
      }

      try {
        redirectCheckInProgress = true;
        // Give Firebase time to restore state from localStorage
        await new Promise(resolve => setTimeout(resolve, AUTH_RESTORE_DELAY));
        await getRedirectResult(auth);
      } catch (error) {
        console.error('Auth redirect error:', error);
      }
    };

    checkRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Validate user against whitelist before accepting them
      const email = firebaseUser.email?.trim().toLowerCase();

      if (!email) {
        console.error('User has no email, signing out');
        await firebaseSignOut(auth);
        setUser(null);
        setLoading(false);
        return;
      }

      // Fetch whitelist from Firestore
      try {
        const whitelistDoc = await getDoc(doc(db, 'settings', 'whitelist'));
        let allowedEmails = INITIAL_ALLOWED_EMAILS.map((e) => e.trim().toLowerCase());

        if (whitelistDoc.exists()) {
          const fetched = whitelistDoc.data().emails || INITIAL_ALLOWED_EMAILS;
          allowedEmails = fetched
            .map((e) => (e ? e.trim().toLowerCase() : null))
            .filter(Boolean);
        }

        if (!allowedEmails.includes(email)) {
          console.warn('Email not in whitelist:', email);
          await firebaseSignOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(firebaseUser);
        setLoading(false);
      } catch (error) {
        console.error('Error validating user:', error);
        // Fallback to initial whitelist
        const allowedEmails = INITIAL_ALLOWED_EMAILS.map((e) => e.trim().toLowerCase());
        if (allowedEmails.includes(email)) {
          setUser(firebaseUser);
        } else {
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
