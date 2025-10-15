// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
} from "firebase/auth";

// Your web app's Firebase configuration
// CRITICAL: For OAuth redirects to work on Vercel, authDomain MUST match the actual domain
const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

// MUST use Firebase authDomain - Vercel doesn't have /__/auth/handler endpoint
// Popup mode works fine with any authDomain
const authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: authDomain,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Enable offline persistence for Firestore
// This allows the app to work offline and sync when back online
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('Offline persistence: Multiple tabs open, using memory cache only');
  } else if (err.code === 'unimplemented') {
    // The current browser doesn't support persistence
    console.warn('Offline persistence: Browser does not support offline mode');
  }
});

// Initialize Firebase Auth
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initial whitelist - removed from client code for privacy
// Whitelist is now managed entirely in Firestore
export const INITIAL_ALLOWED_EMAILS = [];

export { db, auth, googleProvider };
