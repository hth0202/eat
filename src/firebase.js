import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyBY_c_z6l6uY8GY_ehbRDF9LJ4hXMIoH6s',
  authDomain: 'kkinilog.firebaseapp.com',
  projectId: 'kkinilog',
  storageBucket: 'kkinilog.firebasestorage.app',
  messagingSenderId: '945942920504',
  appId: '1:945942920504:web:7f2ea690d1e95038ed15cd',
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
