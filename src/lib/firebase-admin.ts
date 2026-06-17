/**
 * Firebase Admin SDK - initialized with Application Default Credentials
 * or service account from environment variable.
 *
 * Used for server-side operations like updating user passwords
 * during the password reset flow.
 */
import * as admin from 'firebase-admin'

let adminApp: admin.app.App | null = null

function getAdminApp(): admin.app.App | null {
  if (adminApp) return adminApp

  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0]!
      return adminApp
    }

    // Try to initialize with service account from env
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT

    if (serviceAccountStr) {
      const serviceAccount = JSON.parse(serviceAccountStr)
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log('[Firebase Admin] Initialized with service account')
      return adminApp
    }

    // Try Application Default Credentials
    adminApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    })
    console.log('[Firebase Admin] Initialized with default credentials')
    return adminApp
  } catch (error) {
    console.warn('[Firebase Admin] Could not initialize:', (error as Error).message)
    console.warn('[Firebase Admin] Password updates in Firebase will not work.')
    console.warn('[Firebase Admin] To enable: set FIREBASE_SERVICE_ACCOUNT env var with service account JSON')
    return null
  }
}

/**
 * Update a Firebase user's password by their UID.
 * Returns true if successful, false if Firebase Admin is not available.
 */
export async function updateFirebasePassword(firebaseUid: string, newPassword: string): Promise<boolean> {
  try {
    const app = getAdminApp()
    if (!app) {
      console.warn('[Firebase Admin] Not available - password only updated in local DB')
      return false
    }

    await app.auth().updateUser(firebaseUid, {
      password: newPassword,
    })
    console.log(`[Firebase Admin] Password updated for UID: ${firebaseUid}`)
    return true
  } catch (error) {
    console.error('[Firebase Admin] Failed to update password:', (error as Error).message)
    return false
  }
}

/**
 * Check if Firebase Admin SDK is available.
 */
export function isFirebaseAdminAvailable(): boolean {
  return getAdminApp() !== null
}
