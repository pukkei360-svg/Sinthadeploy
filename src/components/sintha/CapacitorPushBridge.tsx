'use client'

/**
 * CapacitorPushBridge — listens for the Capacitor PushNotifications plugin's
 * `registration` event and POSTs the FCM token to the backend so the server
 * can send push notifications to this device.
 *
 * Why this exists:
 *   The APK uses @capacitor/push-notifications to receive FCM tokens natively.
 *   The plugin fires a `registration` event with the token — but the web app
 *   has to actively listen for that event and POST the token to the backend.
 *   Without this bridge, the token is generated but never stored on the server,
 *   so the backend has no token to push to. Result: `pushSent: 0` in admin
 *   broadcasts even though the APK can receive pushes (proven by the Firebase
 *   Console test).
 *
 * Implementation note:
 *   We use the Capacitor GLOBAL API (window.Capacitor.Plugins.PushNotifications)
 *   instead of importing @capacitor/push-notifications as an npm package.
 *   This avoids adding a Capacitor dependency to the web build (which would
 *   bloat the bundle and could break non-Capacitor builds). The native shell
 *   injects window.Capacitor automatically when the APK loads the web content.
 *
 * Supported Capacitor versions:
 *   - Capacitor 2+: window.Capacitor.Plugins.PushNotifications
 *   - Capacitor 1:  window.Plugins.PushNotifications (legacy fallback)
 *
 * This component renders nothing visible. It just runs the bridge logic on mount.
 */

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'

// Minimal type declarations for the Capacitor global.
// We keep them loose so TypeScript doesn't complain in web builds.
interface CapacitorPlugin {
  register?: () => Promise<void>
  checkPermissions?: () => Promise<{ receive: string }>
  requestPermissions?: () => Promise<{ receive: string }>
  addListener?: (eventName: string, callback: (data: unknown) => void) => Promise<{ remove: () => void }>
  removeAllListeners?: () => Promise<void>
  // LocalNotifications methods (used for foreground display)
  create?: (opts: unknown) => Promise<unknown>
  schedule?: (opts: unknown) => Promise<unknown>
  createChannel?: (opts: unknown) => Promise<unknown>
}

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean
      Plugins?: Record<string, CapacitorPlugin>
    }
    // Capacitor 1.x legacy
    Plugins?: Record<string, CapacitorPlugin>
  }
}

/**
 * Get the PushNotifications plugin from whichever global Capacitor exposes.
 * Returns null if not available (web build, or Capacitor not initialized).
 */
function getPushPlugin(): CapacitorPlugin | null {
  if (typeof window === 'undefined') return null

  // Capacitor 2+: window.Capacitor.Plugins.PushNotifications
  if (window.Capacitor?.Plugins?.PushNotifications) {
    return window.Capacitor.Plugins.PushNotifications
  }

  // Capacitor 1.x legacy: window.Plugins.PushNotifications
  if (window.Plugins?.PushNotifications) {
    return window.Plugins.PushNotifications
  }

  return null
}

/**
 * Get the LocalNotifications plugin (for displaying foreground notifications).
 * Returns null if not available.
 */
function getLocalNotificationsPlugin(): CapacitorPlugin | null {
  if (typeof window === 'undefined') return null
  if (window.Capacitor?.Plugins?.LocalNotifications) {
    return window.Capacitor.Plugins.LocalNotifications
  }
  if (window.Plugins?.LocalNotifications) {
    return window.Plugins.LocalNotifications
  }
  return null
}

/**
 * Display a local notification in the system tray when a push arrives
 * while the app is in the foreground. Without this, foreground pushes are
 * silently delivered to JavaScript and the user sees nothing — leading to
 * "I sent a broadcast but nothing arrived on my phone" even though the
 * backend and FCM are working correctly.
 *
 * Capacitor v3+ uses `create()`, v2 uses `schedule()`. We try both.
 */
async function showForegroundNotification(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  const plugin = getLocalNotificationsPlugin()
  if (!plugin) {
    // LocalNotifications not available — fall back to in-app toast.
    console.warn('[Capacitor-Push] LocalNotifications plugin not found — foreground notification will not be displayed in system tray')
    return
  }

  // Use a unique ID per notification so they stack rather than overwrite.
  const notificationsId = Math.floor(Math.random() * 1000000) + 1

  // Build the notification payload. Capacitor v2/v3 use slightly different
  // field names, so we include both for compatibility.
  const payload = {
    notifications: [{
      id: notificationsId,
      title,
      body,
      // Schedule for "now" (1 second delay ensures it shows in the tray)
      schedule: { at: new Date(Date.now() + 1000) },
      // Pass through any extra data so the tap handler can deep-link
      extra: data || {},
      // Use the same channel as the native FCM notifications
      channelId: 'sintha_notifications',
      smallIcon: 'ic_launcher',
      largeIcon: 'ic_launcher',
    }],
  }

  try {
    // Capacitor v3+: create()
    if (plugin.create) {
      await plugin.create(payload)
      console.log('[Capacitor-Push] Foreground notification displayed (create):', title)
      return
    }
    // Capacitor v2: schedule()
    if (plugin.schedule) {
      await plugin.schedule(payload)
      console.log('[Capacitor-Push] Foreground notification displayed (schedule):', title)
      return
    }
    console.warn('[Capacitor-Push] LocalNotifications plugin has neither create() nor schedule()')
  } catch (err) {
    console.error('[Capacitor-Push] Failed to display foreground notification:', err)
  }
}

/**
 * Check if we're running inside a Capacitor native app (the APK).
 */
function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window.Capacitor?.isNativePlatform?.())
}

export default function CapacitorPushBridge() {
  const { user } = useAppStore()

  useEffect(() => {
    // Only run if:
    //   1. The user is logged in (we need their userId to register the token)
    //   2. We're inside a Capacitor native app (not a regular browser)
    //   3. The PushNotifications plugin is available
    if (!user?.id) return

    if (!isCapacitorNative()) {
      // Not a Capacitor app — web users use usePushRegistration hook instead.
      return
    }

    const plugin = getPushPlugin()
    if (!plugin) {
      console.warn('[Capacitor-Push] PushNotifications plugin not found — token will not be registered')
      return
    }

    // Check that the plugin has the required methods
    if (!plugin.register || !plugin.addListener) {
      console.warn('[Capacitor-Push] Plugin missing required methods (register/addListener)')
      return
    }

    let listeners: Array<{ remove: () => void }> = []

    ;(async () => {
      try {
        // 1. Request permission (Android < 13 grants automatically; 13+ shows a prompt)
        if (plugin.checkPermissions && plugin.requestPermissions) {
          let permStatus = await plugin.checkPermissions()
          if (permStatus.receive === 'prompt') {
            permStatus = await plugin.requestPermissions()
          }
          if (permStatus.receive !== 'granted') {
            console.warn('[Capacitor-Push] Permission not granted — pushes will not be received')
            return
          }
        }

        // 2. Listen for the registration event (carries the FCM token)
        //    This fires AFTER register() is called, with the token.
        const regListener = await plugin.addListener('registration', async (data: unknown) => {
          const token = (data as { value?: string })?.value
          if (!token) {
            console.warn('[Capacitor-Push] Registration event received but no token in payload:', data)
            return
          }
          console.log('[Capacitor-Push] FCM token received:', token.slice(0, 20) + '...')
          try {
            await apiFetch('/user/fcm-token', {
              method: 'POST',
              body: JSON.stringify({ userId: user.id, token }),
            })
            console.log('[Capacitor-Push] Token registered with backend ✓')
          } catch (err) {
            console.error('[Capacitor-Push] Failed to register token with backend:', err)
          }
        })
        listeners.push(regListener)

        // 3. Listen for registration errors
        const errListener = await plugin.addListener('registrationError', (err: unknown) => {
          console.error('[Capacitor-Push] Registration error:', err)
        })
        listeners.push(errListener)

        // 4. Listen for incoming push notifications (foreground)
        //    When the app is open, FCM delivers the push to JavaScript instead
        //    of the system tray. We display ONE local notification only.
        //    To prevent duplicate notifications (FCM background + Capacitor foreground
        //    + in-app bell), we deduplicate by title+body within a 5-second window.
        const recentNotifications = new Map<string, number>()
        const DEDUP_WINDOW_MS = 5000

        const recvListener = await plugin.addListener('pushNotificationReceived', (notification: unknown) => {
          console.log('[Capacitor-Push] Notification received (foreground):', notification)

          const n = notification as {
            title?: string
            body?: string
            data?: Record<string, unknown>
          }

          const title = n.title || (n.data?.title as string) || 'SINTHA'
          const body = n.body || (n.data?.message as string) || (n.data?.body as string) || ''

          if (!title && !body) return

          // Deduplicate: if we received the same notification within 5 seconds,
          // skip it (FCM may deliver it multiple times — background + foreground)
          const dedupKey = `${title}::${body}`
          const now = Date.now()
          const lastReceived = recentNotifications.get(dedupKey)
          if (lastReceived && now - lastReceived < DEDUP_WINDOW_MS) {
            console.log('[Capacitor-Push] Duplicate notification skipped:', title)
            return
          }
          recentNotifications.set(dedupKey, now)

          // Clean up old entries every 30 seconds
          if (recentNotifications.size > 20) {
            for (const [key, timestamp] of recentNotifications.entries()) {
              if (now - timestamp > DEDUP_WINDOW_MS * 2) {
                recentNotifications.delete(key)
              }
            }
          }

          showForegroundNotification(title, body, n.data)
        })
        listeners.push(recvListener)

        // 5. Listen for notification taps (user tapped a notification)
        const actionListener = await plugin.addListener('pushNotificationActionPerformed', (action: unknown) => {
          console.log('[Capacitor-Push] Notification action:', action)
          // Future: deep-link to the relevant booking/chat based on the notification's data payload
        })
        listeners.push(actionListener)

        // 6. Register with FCM — this triggers the `registration` event above
        await plugin.register()
        console.log('[Capacitor-Push] register() called — waiting for token...')
      } catch (err) {
        console.error('[Capacitor-Push] Bridge setup failed:', err)
      }
    })()

    return () => {
      // Clean up all listeners when the component unmounts
      listeners.forEach((l) => {
        try { l.remove() } catch {}
      })
      listeners = []
    }
  }, [user?.id])

  // Renders nothing — this is a logic-only bridge
  return null
}
