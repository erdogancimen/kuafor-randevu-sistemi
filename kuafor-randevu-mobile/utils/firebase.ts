import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
  authDomain: "kuafor-randevu.firebaseapp.com",
  projectId: "kuafor-randevu",
  storageBucket: "kuafor-randevu.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:1234567890123456789012"
};

const app = initializeApp(firebaseConfig);

export default app; 