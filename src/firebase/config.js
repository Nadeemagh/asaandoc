// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || "AIzaSyCyjAolnXqdVfC4rnUqpQyE3BYy9VFP6HA",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || "asaandoc-e0581.firebaseapp.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || "asaandoc-e0581",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || "asaandoc-e0581.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID|| "63617925934",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || "1:63617925934:web:d01d70de45592a153030bf",
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
