import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, onSnapshot, query, where } from 'firebase/firestore'

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

let db = null

if (firebaseConfig.projectId) {
  try {
    const app = initializeApp(firebaseConfig)
    db = getFirestore(app)
  } catch (e) {
    console.warn('Firebase init failed:', e.message)
  }
}

export { db, collection, addDoc, onSnapshot, query, where }
