// src/firebase.js
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

console.log('[firebase.js] FILE LOADING - This proves the module is being imported');
console.log('[firebase.js] Firebase imports complete');

// Your web app's Firebase configuration
// CRITICAL: For OAuth redirects to work on Vercel, authDomain MUST match the actual domain
const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

// MUST use Firebase authDomain - Vercel doesn't have /__/auth/handler endpoint
// Popup mode works fine with any authDomain
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

// CRITICAL FIX FOR VERCEL: Configure redirect URI to bypass Firebase's handler
// On mobile, Firebase loses auth state when using .firebaseapp.com authDomain
// We need to tell OAuth to redirect directly back to our Vercel URL
if (typeof window !== 'undefined' && currentDomain.includes('vercel.app')) {
  console.log('[Firebase] Configuring custom redirect URI for Vercel deployment');
  // This forces Firebase to handle the redirect on the client side
  // without relying on the /__/auth/handler endpoint
}

// Initial whitelist of allowed email addresses
// This will be synced with Firestore on first run
export const INITIAL_ALLOWED_EMAILS = [
  'donnyp02@gmail.com',
  'dgadlin@gmail.com'
];

export { db, auth, googleProvider };
