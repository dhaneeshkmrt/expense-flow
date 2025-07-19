
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Replace the following with your app's Firebase project configuration
// For more information on how to get this, visit:
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "AIzaSyCiSGpV5tBNgkQmg0bYXc8XiOslGk2eBEM",
  authDomain: "money-purse-7aee4.firebaseapp.com",
  projectId: "money-purse-7aee4",
  storageBucket: "money-purse-7aee4.firebasestorage.app",
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

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
