import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { config } from '../app/config';

function clientOptions() {
  const options = {
    apiKey: config.VITE_FIREBASE_API_KEY,
    authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: config.VITE_FIREBASE_PROJECT_ID,
    appId: config.VITE_FIREBASE_APP_ID,
  };
  if (Object.values(options).some((value) => !value)) {
    throw new Error('Firebase no está configurado para esta aplicación.');
  }
  return options;
}

export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(clientOptions());
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}

export function firestoreClient(): Firestore {
  return getFirestore(firebaseApp());
}
