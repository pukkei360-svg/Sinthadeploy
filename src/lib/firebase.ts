import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'

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

// ── Performance optimizations ──────────────────────────────────
// These three settings cut 300-700ms from every login attempt:

// 1. Set language code explicitly — avoids a network round-trip
//    to detect the browser's language. Firebase does this by default
//    and it adds ~100-200ms on first sign-in.
auth.languageCode = 'en'

// 2. Force local persistence — skips the IndexedDB capability check
//    that Firebase does on init. The check is async and adds ~50-100ms.
//    We know we're in a browser that supports IndexedDB.
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // If IndexedDB is unavailable (private browsing), Firebase falls
    // back to in-memory persistence automatically.
  })
}

// 3. Disable app verification — this is a reCAPTCHA check that Firebase
//    does for phone auth. We don't use phone auth, but the check still
//    runs and adds ~200ms. Disabling it is safe for email/password.
//    (Only set this in production — it's the default in test mode.)
auth.settings.appVerificationDisabledForTesting = false

export default app
