'use client'

/**
 * OfflineBootScreen — shown when the device has no network at app launch.
 *
 * Why this exists:
 *   When the APK launches offline, the WebView's initial HTML load to
 *   sinthadeploy.vercel.app FAILS before the React app even mounts. The user
 *   sees the WebView's ugly default error page ("This site can't be reached"
 *   / "ERR_INTERNET_DISCONNECTED") instead of the SINTHA UI.
 *
 *   If the HTML shell DOES load (e.g. from a previous session's cache) but
 *   the device is offline, Firebase auth + apiFetch calls fail silently and
 *   the app hangs on a blank screen with no clear message.
 *
 * What this component does:
 *   1. On mount, pings a lightweight endpoint (/api/push-test) to check if
 *      the backend is actually reachable (navigator.onLine can lie — it only
 *      checks if the device has a network interface, not if there's internet).
 *   2. If the ping fails, shows a full-screen branded "You're offline" screen
 *      with a "Retry" button and auto-retry every 5 seconds.
 *   3. Once the ping succeeds, calls onOnline() so the parent can proceed
 *      with the normal auth flow.
 *
 * Used as a gate before page.tsx renders the main app — see page.tsx.
 */

import { useEffect, useState, useRef } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

interface OfflineBootScreenProps {
  onOnline: () => void
}

export default function OfflineBootScreen({ onOnline }: OfflineBootScreenProps) {
  const [checking, setChecking] = useState(true)
  const [lastCheckFailed, setLastCheckFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const onOnlineRef = useRef(onOnline)
  onOnlineRef.current = onOnline

  // Check connectivity by hitting a lightweight endpoint.
  // We use /api/push-test because it's already deployed, returns JSON,
  // and doesn't require auth. A HEAD request would be even lighter but
  // some hosts (Vercel) don't support HEAD on all routes, so we use GET.
  const checkConnectivity = async (): Promise<boolean> => {
    try {
      // Add a cache-busting query param so the browser doesn't return
      // a cached response (which would make us think we're online when
      // we're not).
      const url = `/api/push-test?_=${Date.now()}`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })

      clearTimeout(timeout)

      if (!res.ok) return false
      // Verify it's actually JSON (not a captive portal HTML page)
      const text = await res.text()
      try {
        JSON.parse(text)
        return true
      } catch {
        return false
      }
    } catch {
      return false
    }
  }

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const run = async () => {
      setChecking(true)
      const ok = await checkConnectivity()
      if (cancelled) return

      if (ok) {
        setLastCheckFailed(false)
        setChecking(false)
        onOnlineRef.current()
      } else {
        setLastCheckFailed(true)
        setChecking(false)
        setRetryCount((c) => c + 1)
        // Auto-retry every 5 seconds
        retryTimer = setTimeout(run, 5000)
      }
    }

    run()

    // Also listen for the browser's online event as a fast-path — if the
    // device just came back online, retry immediately instead of waiting
    // for the next 5-second tick.
    const onBrowserOnline = () => {
      if (retryTimer) clearTimeout(retryTimer)
      run()
    }
    window.addEventListener('online', onBrowserOnline)

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener('online', onBrowserOnline)
    }
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F4C81] to-[#1e3a8a] px-4">
      <div className="text-center max-w-sm">
        {/* Logo */}
        <div className="mb-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-white">SINTHA</h1>
          <p className="text-lg opacity-80 mt-1 text-white" style={{ fontFamily: 'serif' }}>ꯁꯤꯟꯊꯥ</p>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
          <WifiOff className="h-10 w-10 text-white" />
        </div>

        {/* Message */}
        <h2 className="text-xl font-bold text-white mb-2">
          You&apos;re offline
        </h2>
        <p className="text-sm text-white/80 mb-6 leading-relaxed">
          SINTHA needs an internet connection to load your bookings, messages,
          and provider details. Please check your Wi-Fi or mobile data and
          we&apos;ll automatically reconnect.
        </p>

        {/* Auto-retry indicator */}
        {checking ? (
          <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking connection...</span>
          </div>
        ) : lastCheckFailed ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-white/60 text-xs">
              <span>Auto-retrying in 5 seconds...</span>
            </div>
            <button
              onClick={async () => {
                setChecking(true)
                const ok = await checkConnectivity()
                setChecking(false)
                if (ok) {
                  setLastCheckFailed(false)
                  onOnlineRef.current()
                } else {
                  setLastCheckFailed(true)
                  setRetryCount((c) => c + 1)
                }
              }}
              className="inline-flex items-center gap-2 bg-white text-[#0F4C81] font-semibold px-6 py-3 rounded-2xl shadow-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry now
            </button>
            {retryCount > 1 && (
              <p className="text-xs text-white/50 mt-2">
                Tried {retryCount} times — still waiting for connection
              </p>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <p className="text-xs text-white/40 mt-8">
          Trusted Hands. Trusted Services.
        </p>
      </div>
    </main>
  )
}
