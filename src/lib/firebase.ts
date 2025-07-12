
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Replace the following with your app's Firebase project configuration
// For more information on how to get this, visit:
// https://firebase.google.com/docs/web/setup#available-libraries

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
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
