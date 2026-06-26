import { initializeApp, getApps } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyBEsnLT8otVqY-q6AKTvUZhxyq1ZdMufQ8",
  authDomain: "sintha-2999b.firebaseapp.com",
  projectId: "sintha-2999b",
  storageBucket: "sintha-2999b.firebasestorage.app",
  messagingSenderId: "26480972128",
  appId: "1:26480972128:web:76d90d4e4cc9ddb6794e05",
  measurementId: "G-LG3F1Z21YJ"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)

// Skip language detection network call (saves 100-200ms)
auth.languageCode = 'en'

// Force local persistence — returning users auto-sign-in instantly
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {})
}

export default app
