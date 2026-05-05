import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCviPc_MqKuwwHLDLokzfNz74ndkhiFwA0",
  authDomain: "ib-grade-tracker.firebaseapp.com",
  projectId: "ib-grade-tracker",
  storageBucket: "ib-grade-tracker.firebasestorage.app",
  messagingSenderId: "196825943087",
  appId: "1:196825943087:web:d215b93f2e31dcff77cada",
  measurementId: "G-Q6FG84DVHS"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const FIREBASE_CONFIGURED = true;
