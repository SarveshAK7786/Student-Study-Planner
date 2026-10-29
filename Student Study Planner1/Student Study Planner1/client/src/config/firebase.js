import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyArRyfKBlCfPljlK5aJ7Ylo35o3Chxk-2E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "software-engineering-b50a1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "software-engineering-b50a1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "software-engineering-b50a1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "848315293242",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:848315293242:web:df6c9c5e7ab923090e5f03",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-K3D6BFS8PL"
};

export const isFirebaseConfigured = () => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIzaSy'));
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app };

/**
 * Sign in with Google using Firebase — tries popup first, falls back to redirect.
 */
export async function signInWithGoogleFirebase() {
  try {
    // Try popup first
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      google_id: user.uid,
      avatar_url: user.photoURL,
    };
  } catch (popupErr) {
    // If popup is blocked or unauthorized domain, use redirect
    const redirectCodes = [
      'auth/popup-blocked',
      'auth/unauthorized-domain',
      'auth/operation-not-supported-in-this-environment',
    ];
    if (redirectCodes.includes(popupErr.code)) {
      // Trigger redirect — page will reload after Google sign-in
      await signInWithRedirect(auth, googleProvider);
      // This line never reached during redirect, but needed for type safety
      return null;
    }
    throw popupErr;
  }
}

/**
 * Check if we came back from a Google redirect sign-in.
 * Call this once on app load. Returns user data if redirect completed, else null.
 */
export async function checkGoogleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) return null;
    const user = result.user;
    return {
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      google_id: user.uid,
      avatar_url: user.photoURL,
    };
  } catch (err) {
    console.warn('Redirect result check:', err.code, err.message);
    return null;
  }
}

/**
 * Register with Email & Password using Firebase Authentication
 */
export async function registerWithEmailFirebase(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Sign in with Email & Password using Firebase Authentication
 */
export async function loginWithEmailFirebase(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Sign out of Firebase
 */
export async function signOutFirebase() {
  await signOut(auth);
}

export function getStoredFirebaseConfig() {
  return firebaseConfig;
}

export function saveFirebaseConfig(cfg) {
  // Config already baked into .env and source
}
