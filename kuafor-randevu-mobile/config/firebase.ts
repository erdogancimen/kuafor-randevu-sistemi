import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyCxn28upfPJbYRljb1k8d1AvJe_FmcyGVU",
  authDomain: "kufaor-randevu.firebaseapp.com",
  projectId: "kufaor-randevu",
  storageBucket: "kufaor-randevu.firebasestorage.app",
  messagingSenderId: "458781052508",
  appId: "1:458781052508:web:6f63c8dc3373aa15d2a099",
};

// Firebase'i başlat
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };