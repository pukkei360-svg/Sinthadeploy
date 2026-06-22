'use client'

/**
 * PushNotificationPrompt — asks the user if they want to enable push
 * notifications. Shown only on the web (Chrome/Edge), never inside the
 * APK WebView (the APK has its own native FCM handling).
 *
 * Behavior:
 *   - Shows a dismissible banner/card when:
 *       a) The user is logged in
 *       b) The browser supports web push
 *       c) We're NOT inside an APK WebView
 *       d) The user hasn't already answered (granted / denied / not_now)
 *   - Three buttons: "Enable" (asks permission), "Not now" (snooze), "Never" (deny)
 *   - If permission was previously granted but the browser revoked it,
 *     re-shows the prompt so the user can re-grant.
 *   - Persists the choice in localStorage so we don't nag across sessions.
 */

import { useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { usePushRegistration } from '@/hooks/use-push-registration'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'

export default function PushNotificationPrompt() {
  const { user } = useAppStore()
  const { toast } = useToast()
  const {
    supported,
    isWebView,
    pref,
    browserPermission,
    requestPermission,
  } = usePushRegistration(user?.id)

  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Don't show if:
  // - not logged in
  // - browser doesn't support web push (Safari < 16.4, etc.)
  // - we're inside the APK WebView (native FCM handles it)
  // - user previously granted permission AND browser still has it
  // - user previously said "denied" (they explicitly don't want pushes)
  // - user dismissed this session's prompt
  if (!user) return null
  if (!supported) return null
  if (isWebView) return null
  if (dismissed) return null

  // Already granted and browser still has permission → no prompt needed.
  if (pref === 'granted' && browserPermission === 'granted') return null

  // User explicitly said "Never" → respect it, never show again.
  if (pref === 'denied') return null

  // User said "Not now" — we'll show again next session (pref is per-session
  // state here; 'not_now' just means "don't show again until next mount").
  // To make 'not_now' persistent across sessions, swap this check for the
  // version below. Default: nag once per session.
  // if (pref === 'not_now') return null

  const handleEnable = async () => {
    setLoading(true)
    try {
      const ok = await requestPermission()
      if (ok) {
        toast({
          title: 'Notifications enabled',
          description: 'You\'ll get push alerts for new bookings, messages, and updates.',
        })
      } else {
        toast({
          title: 'Couldn\'t enable notifications',
          description: 'You can change this later in your browser settings.',
        })
      }
    } finally {
      setLoading(false)
      setDismissed(true)
    }
  }

  const handleNotNow = () => {
    setDismissed(true)
  }

  const handleNever = () => {
    // Persist the "denied" choice so we never show again (user can re-enable
    // from the profile screen later — TODO: add a "Manage notifications" toggle
    // in ProfileScreen).
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sintha_push_permission_pref', 'denied')
    }
    setDismissed(true)
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 shadow-sm">
      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <Bell className="h-5 w-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-900">
          Get booking alerts
        </p>
        <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
          Enable push notifications so you never miss a new booking, message,
          or important update.
        </p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Enabling...' : 'Enable'}
          </button>
          <button
            onClick={handleNotNow}
            disabled={loading}
            className="text-blue-700 hover:bg-blue-100 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleNever}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 text-xs font-medium px-2 py-1.5 transition-colors"
            title="Don't show this again"
          >
            <BellOff className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <button
        onClick={handleNotNow}
        className="text-blue-400 hover:text-blue-600 p-0.5 shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
