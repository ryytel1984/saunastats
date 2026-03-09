import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBLDW1zvw-31GJTIbh4mBXtXwpNpDJK1uI",
  authDomain: "saunastats-f3807.firebaseapp.com",
  projectId: "saunastats-f3807",
  storageBucket: "saunastats-f3807.firebasestorage.app",
  messagingSenderId: "396824416968",
  appId: "1:396824416968:web:1236de8cc9d1e824e1cbfd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);