import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyBEsnLT8otVqY-q6AKTvUZhxyq1ZdMufQ8",
  authDomain: "sintha-2999b.firebaseapp.com",
  projectId: "sintha-2999b",
  storageBucket: "sintha-2999b.firebasestorage.app",
  messagingSenderId: "26480972128",
  appId: "1:26480972128:web:76d90d4e4cc9ddb6794e05",
  measurementId: "G-LG3F1Z21YJ"
}

// Initialize Firebase (prevent re-initialization in dev mode)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Auth
export const auth = getAuth(app)

// Firestore
export const firestore = getFirestore(app)

// Storage
export const storage = getStorage(app)

export default app
