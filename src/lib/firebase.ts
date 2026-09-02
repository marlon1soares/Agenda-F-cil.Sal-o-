import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfigRaw from '../../firebase-applet-config.json';

export const firebaseConfig = {
  projectId: firebaseConfigRaw.projectId || "model-stratum-7ds98",
  appId: firebaseConfigRaw.appId || "1:221064326950:web:c41941de6dd78165bd5be7",
  apiKey: firebaseConfigRaw.apiKey || "AIzaSyAFOjF32Tr6pNX_L1LQyH-wLKA9kjGXU0k",
  authDomain: firebaseConfigRaw.authDomain || "model-stratum-7ds98.firebaseapp.com",
  firestoreDatabaseId: firebaseConfigRaw.firestoreDatabaseId || "ai-studio-agendafcilsalo-e0eeea50-2a43-473c-bf9b-e4bcd870a0b4",
  storageBucket: firebaseConfigRaw.storageBucket || "model-stratum-7ds98.firebasestorage.app",
  messagingSenderId: firebaseConfigRaw.messagingSenderId || "221064326950"
};

let appInstance: any = null;
let dbInstance: Firestore | null = null;

try {
  appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
    dbInstance = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(appInstance);
  }
} catch (err) {
  console.warn('[Firebase] Initialization error:', err);
}

export const app = appInstance;
export const db = dbInstance;
