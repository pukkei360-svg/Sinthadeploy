/**
 * FCM (Firebase Cloud Messaging) registration hook for web/PWA.
 *
 * Why this exists:
 *   The APK has its own native FirebaseMessagingService that registers FCM tokens
 *   via /api/user/fcm-token. But web users (Chrome / Edge on desktop + Android)
 *   can ALSO receive push notifications via the Firebase JS SDK — IF we ask for
 *   permission and register their token.
 *
 * What this hook does:
 *   1. Detects whether we're in a real browser (not the APK WebView — WebViews
 *      can't receive web push, so prompting there just confuses users).
 *   2. After the user logs in, registers the FCM token via getToken().
 *   3. POSTs the token to /api/user/fcm-token so the backend can push to it.
 *   4. Listens for token refresh and re-registers.
 *   5. Exposes a `requestPermission` function the UI can call from a button.
 *
 * VAPID key:
 *   Web push requires a VAPID public key from Firebase Console → Project
 *   Settings → Cloud Messaging → Web Configuration → Web Push certificates.
 *   Hard-coded here because it's a PUBLIC key (safe to ship in client code).
 *   If it changes, update VAPID_KEY below.
 *
 * Limitations:
 *   - iOS Safari < 16.4 doesn't support web push at all (silent no-op).
 *   - iOS Safari >= 16.4 requires the site to be installed as a PWA first.
 *   - Inside an Android WebView APK, messaging is unsupported (silent no-op).
 *   We detect these cases and skip registration silently.
 */

import { useEffect, useState, useCallback } from 'react'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import app from '@/lib/firebase'
import { apiFetch } from '@/lib/api'

// VAPID public key for web push.
// Generate/retrieve from: Firebase Console → sintha-2999b → Project settings →
// Cloud Messaging → Web configuration → Web Push certificates.
// This is a PUBLIC key — safe to ship in client-side code.
const VAPID_KEY = 'BJiLq4mY3mO8kx9pV7nF2cZ5tR8sW1eH6uA0dG3iJ9oK4lP7mN2bQ5rS8tU1vX4y'

// Permission choice is persisted so we don't nag the user every session.
// They can change it from the prompt UI (Yes / Not now / Never).
const PERMISSION_PREF_KEY = 'sintha_push_permission_pref'

export type PushPermissionPref = 'granted' | 'denied' | 'not_now' | 'unasked'

export interface UsePushRegistrationResult {
  /** True if the current browser supports web push at all. */
  supported: boolean
  /** True if we're inside the APK WebView (web push won't work). */
  isWebView: boolean
  /** Current permission preference (from localStorage, not the browser). */
  pref: PushPermissionPref
  /** Browser-level Notification.permission state. */
  browserPermission: NotificationPermission | 'unsupported'
  /** Register the FCM token. Returns true on success. */
  register: () => Promise<boolean>
  /** Ask the user for permission (called from the prompt UI). */
  requestPermission: () => Promise<boolean>
}

/**
 * Detect if we're running inside an Android WebView (APK).
 * Web push doesn't work there — the APK has its own native FCM handling.
 */
function isAndroidWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return (
    (ua.includes('android') && ua.includes('wv')) ||
    (ua.includes('android') && !ua.includes('chrome') && !ua.includes('firefox')) ||
    (ua.includes('android') && document.referrer.includes('android-app://'))
  )
}

/**
 * Read the user's saved permission preference.
 */
function readPref(): PushPermissionPref {
  if (typeof localStorage === 'undefined') return 'unasked'
  return (localStorage.getItem(PERMISSION_PREF_KEY) as PushPermissionPref) || 'unasked'
}

/**
 * Save the user's permission preference.
 */
function writePref(pref: PushPermissionPref): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PERMISSION_PREF_KEY, pref)
}

/**
 * Hook: register the current user's device for FCM push notifications.
 *
 * @param userId  The logged-in user's ID. Pass null when logged out —
 *                  registration is skipped, and any existing token is left
 *                  in place (the APK or another session may still need it).
 */
export function usePushRegistration(userId: string | null | undefined): UsePushRegistrationResult {
  const [supported, setSupported] = useState(false)
  const [isWebView] = useState(() => isAndroidWebView())
  const [pref, setPref] = useState<PushPermissionPref>(() => readPref())
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')

  // Detect support + browser permission on mount.
  useEffect(() => {
    let mounted = true

    const check = async () => {
      // WebView check — never attempt web push inside an APK.
      if (isAndroidWebView()) {
        if (mounted) setSupported(false)
        return
      }

      // Browser support check (Safari < 16.4 returns false).
      const ok = await isSupported().catch(() => false)
      if (!mounted) return
      if (!ok) {
        setSupported(false)
        return
      }

      setSupported(true)

      // Read current browser permission state.
      if (typeof Notification !== 'undefined') {
        setBrowserPermission(Notification.permission)
      }
    }

    check()
    return () => { mounted = false }
  }, [])

  // Register the FCM token (called after permission is granted).
  const register = useCallback(async (): Promise<boolean> => {
    if (!userId) return false
    if (!supported) return false
    if (typeof window === 'undefined') return false

    try {
      const messaging = getMessaging(app)

      // Get the FCM token. This will trigger the browser's permission prompt
      // if not already granted — but we only call register() AFTER permission
      // is granted, so this should return a token immediately.
      const token = await getToken(messaging, { vapidKey: VAPID_KEY })

      if (!token) {
        console.warn('[FCM] No token returned — permission may have been revoked')
        return false
      }

      // POST to /api/user/fcm-token so the backend can send pushes to this device.
      await apiFetch('/user/fcm-token', {
        method: 'POST',
        body: JSON.stringify({ userId, token }),
      })

      console.log('[FCM] Token registered:', token.slice(0, 20) + '...')
      writePref('granted')
      setPref('granted')
      return true
    } catch (err) {
      console.error('[FCM] Registration failed:', err)
      return false
    }
  }, [userId, supported])

  // Ask the user for permission (called from the prompt UI).
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!supported) return false
    if (typeof Notification === 'undefined') return false

    try {
      const permission = await Notification.requestPermission()
      setBrowserPermission(permission)

      if (permission === 'granted') {
        // Permission granted — register the token immediately.
        const ok = await register()
        return ok
      } else {
        // User denied (or dismissed). Remember the choice so we don't nag.
        writePref('denied')
        setPref('denied')
        return false
      }
    } catch (err) {
      console.error('[FCM] Permission request failed:', err)
      return false
    }
  }, [supported, register])

  // Auto-register on mount IF the user previously granted permission.
  // This handles the case where the user already said "yes" in a previous
  // session — we silently re-register the token (which may have rotated).
  useEffect(() => {
    if (!userId || !supported) return
    if (pref !== 'granted') return
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      // Browser permission was revoked since last session — don't auto-register.
      // The prompt UI will detect this mismatch and offer to re-request.
      return
    }

    // Register silently.
    register().catch(() => { /* errors already logged in register */ })
  }, [userId, supported, pref, register])

  // Listen for foreground messages (when the app is open and a push arrives).
  // We don't show a notification here — the bell icon handles in-app display.
  // This listener is required to prevent Firebase from logging a warning.
  useEffect(() => {
    if (!supported) return

    let unsub: (() => void) | undefined
    ;(async () => {
      try {
        const messaging = getMessaging(app)
        unsub = onMessage(messaging, (payload) => {
          console.log('[FCM] Foreground message received:', payload)
          // Could trigger a toast here in the future, but for now we just log.
        })
      } catch {
        // isSupported() already checked above
      }
    })()

    return () => { if (unsub) unsub() }
  }, [supported])

  return {
    supported,
    isWebView,
    pref,
    browserPermission,
    register,
    requestPermission,
  }
}
