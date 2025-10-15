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

// Your web app's Firebase configuration
// IMPORTANT: For OAuth redirects to work, authDomain must match where the app is accessed from
const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

// Determine which authDomain to use based on where we're running
let authDomain;
if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
  // Local development
  authDomain = 'localhost';
} else if (currentDomain.includes('vercel.app')) {
  // Vercel deployment
  authDomain = currentDomain;
} else if (currentDomain.match(/^\d+\.\d+\.\d+\.\d+$/)) {
  // IP address (local network testing)
  authDomain = currentDomain;
} else {
  // Fallback to Firebase default
  authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;
}

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

// Initial whitelist of allowed email addresses
// This will be synced with Firestore on first run
export const INITIAL_ALLOWED_EMAILS = [
  'donnyp02@gmail.com',
  'dgadlin@gmail.com'
];

export { db, auth, googleProvider };
