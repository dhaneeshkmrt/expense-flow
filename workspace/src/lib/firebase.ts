
'use client';

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:'AIzaSyCiSGpV5tBNgkQmg0bYXc8XiOslGk2eBEM',
  authDomain: 'money-purse-7aee4.firebaseapp.com',
  projectId: "money-purse-7aee4",
  storageBucket:'money-purse-7aee4.firebasestorage.app',
  messagingSenderId: "714772765127",
  appId: "1:714772765127:web:234c8899a08159dab121e2",
  measurementId: "G-EXZFQ0KECN"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

export { db, auth };
