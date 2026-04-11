import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBkfutPFoLrmgpgY-9bxFnXN6adgsl4HFs",
  authDomain: "projeto-tg-edef9.firebaseapp.com",
  projectId: "projeto-tg-edef9",
  storageBucket: "projeto-tg-edef9.firebasestorage.app",
  messagingSenderId: "882195229531",
  appId: "1:882195229531:android:3b211ca537c72eeb92887e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);   // ← Adicione esta linha

export default app;