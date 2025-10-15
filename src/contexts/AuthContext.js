import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, getRedirectResult } from 'firebase/auth';
import { auth, INITIAL_ALLOWED_EMAILS } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Setting up auth state listener');

    // Check for redirect result first
    const checkRedirect = async () => {
      try {
        console.log('[AuthContext] Checking for redirect result on mount...');
        const result = await getRedirectResult(auth);

        if (result) {
          console.log('[AuthContext] Redirect result found:', result.user?.email);
        } else {
          console.log('[AuthContext] No redirect result');
        }
      } catch (error) {
        console.error('[AuthContext] Error checking redirect result:', error);
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
