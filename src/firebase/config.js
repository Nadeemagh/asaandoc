// src/firebase/config.js
// ─────────────────────────────────────────────────────────────────
//  STEP 1: Go to https://console.firebase.google.com
//  STEP 2: Create project "asaandoc-appointments"
//  STEP 3: Add Web App → copy your config values below
//  STEP 4: Enable Authentication → Email/Password
//  STEP 5: Enable Firestore Database → Start in test mode
// ─────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
