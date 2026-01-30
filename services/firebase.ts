import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase configuration from the Firebase Console
// If these values remain as placeholders, the app will run in "Demo Mode" (Offline).
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForRefactoringReplaceMe",
  authDomain: "sman1-padangan-grad.firebaseapp.com",
  projectId: "sman1-padangan-grad",
  storageBucket: "sman1-padangan-grad.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Check if keys are still dummy values
export const isFirebaseConfigured = firebaseConfig.apiKey !== "AIzaSyDummyKeyForRefactoringReplaceMe";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);