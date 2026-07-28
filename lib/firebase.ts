import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDjXQSgyn5gTnSgePaXowhhkIGv8cWFG4s",
  authDomain: "corporate-jobs-network-prod.firebaseapp.com",
  projectId: "corporate-jobs-network-prod",
  storageBucket: "corporate-jobs-network-prod.firebasestorage.app",
  messagingSenderId: "211326481215",
  appId: "1:211326481215:web:65ae79ef9efff52cc8d98a",
  measurementId: "G-8JFTK5K3C6",
}

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;