import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBnhiJ4H7QFRJve75x_zuQj-HFk34u1Pe0",
  authDomain: "expenseflow-54862.firebaseapp.com",
  projectId: "expenseflow-54862",
  storageBucket: "expenseflow-54862.firebasestorage.app",
  messagingSenderId: "457212274922",
  appId: "1:457212274922:web:eec997b72d073022c0cf93",
  measurementId: "G-LW7QDMHECM"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
