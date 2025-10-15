// src/firebase.js
console.log('[firebase.js] FILE LOADING - This proves the module is being imported');

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
} from "firebase/auth";

console.log('[firebase.js] Firebase imports complete');

// Your web app's Firebase configuration
// CRITICAL: For OAuth redirects on Vercel, we MUST use the Firebase authDomain
// The /__/auth/handler endpoint only exists on *.firebaseapp.com domains
const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

// Always use the Firebase authDomain - it has the proper OAuth handler
const authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;

console.log('[Firebase] Current origin:', currentOrigin);
console.log('[Firebase] Current domain:', currentDomain);
console.log('[Firebase] Using authDomain:', authDomain);

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

// Initialize Firebase Auth
const auth = getAuth(app);

// Set default persistence to LOCAL (required for mobile redirects)
// This needs to happen synchronously before any sign-in attempts
console.log('[Firebase] Initializing auth with LOCAL persistence...');

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// IMPORTANT: Disable Firebase's reserved URLs (/__/auth/handler) for non-Firebase hosting
// This is critical for Vercel deployments
if (typeof window !== 'undefined') {
  // Force Firebase to not use reserved URLs
  auth.settings.appVerificationDisabledForTesting = false;
}

// Initial whitelist of allowed email addresses
// This will be synced with Firestore on first run
export const INITIAL_ALLOWED_EMAILS = [
  'donnyp02@gmail.com',
  'dgadlin@gmail.com'
];

export { db, auth, googleProvider };
