import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web uygulamanızla aynı Firebase projesinin yapılandırması
const firebaseConfig = {
  // Bu değerleri Firebase Console'dan alın
  apiKey: "AIzaSyCxn28upfPJbYRljb1k8d1AvJe_FmcyGVU",
  authDomain: "kufaor-randevu.firebaseapp.com",
  projectId: "kufaor-randevu",
  storageBucket: "kufaor-randevu.firebasestorage.app",
  messagingSenderId: "458781052508",
  appId: "1:458781052508:web:6f63c8dc3373aa15d2a099"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };