// @ts-ignore
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

declare global {
  interface ImportMeta {
    env: Record<string, string | undefined>;
  }
}

// Use optional chaining (?.) to prevent crashes if import.meta.env is undefined.
// We also provide the hardcoded values as fallbacks so the app works immediately 
// in environments where .env files are not automatically loaded (like some web previews).
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyAH5r_KPbccOu7dFOOTvMV3zaWtYGEF1K4",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "kelulusan-dc57b.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "kelulusan-dc57b",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "kelulusan-dc57b.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "596163596690",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:596163596690:web:cd0db479c3d642b94af14b"
};

// Check if the API key is present
export const isFirebaseConfigured = !!firebaseConfig.apiKey;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);