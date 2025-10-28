
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('[FirebaseConfig] WARNING: Firebase environment variables are not fully set. The app may not connect to Firebase correctly.');
}

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

if (getApps().length === 0) {
  console.log('[FirebaseConfig] Initializing new default Firebase app...');
  try {
    app = initializeApp(firebaseConfig);
    console.log('[FirebaseConfig] Default Firebase app initialized successfully.');
  } catch (initError) {
    console.error('[FirebaseConfig] CRITICAL ERROR DURING FIREBASE INITIALIZATION:', initError);
    const readableError = initError instanceof Error ? initError.message : String(initError);
    throw new Error(`Firebase app initialization failed: ${readableError}. Check console for details and verify your environment variables.`);
  }
} else {
  console.log('[FirebaseConfig] Using existing default Firebase app.');
  app = getApp();
}

try {
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('[FirebaseConfig] Firestore and Auth services initialized successfully.');
} catch (serviceError) {
  console.error('[FirebaseConfig] Error initializing Firestore or Auth services:', serviceError);
  const readableServiceError = serviceError instanceof Error ? serviceError.message : String(serviceError);
  throw new Error(`Failed to initialize Firebase services (Firestore/Auth): ${readableServiceError}.`);
}

export { app, db, auth };
