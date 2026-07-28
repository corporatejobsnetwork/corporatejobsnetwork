import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDLtxrwevl56-68Q3Yiq-pSekEZKFpBH4c",
  authDomain: "corporate-jobs-network.firebaseapp.com",
  projectId: "corporate-jobs-network",
  storageBucket: "corporate-jobs-network.firebasestorage.app",
  messagingSenderId: "713078308931",
  appId: "1:713078308931:web:c719dc08bd81be2ced94f6",
  measurementId: "G-YRYDS5ZXK0",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;