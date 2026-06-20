'use client'

import { useEffect, useState } from 'react'

/**
 * useOnlineStatus — reactive `navigator.onLine` mirror.
 *
 * Why this exists:
 *   - The app must render cached content even when offline (the main page
 *     should always open). Components use this hook to decide whether to
 *     show an "Offline" banner, retry buttons, or disable actions that
 *     strictly require network (booking, chat send, login).
 *   - `navigator.onLine` is not reactive on its own — we listen to
 *     `online` / `offline` window events so the UI flips the moment
 *     connectivity changes.
 *
 * Notes:
 *   - `navigator.onLine` can lie (false positive) on some Android WebViews
 *     where the device has Wi-Fi but no actual internet. That's fine for
 *     the offline banner; if a real fetch fails we surface a "No internet"
 *     toast from apiFetch separately.
 */
export function useOnlineStatus(): boolean {
  // Default to `true` so first render doesn't flash an offline banner
  // (SSR + initial hydration). The effect below syncs to the real value
  // immediately after mount.
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  return online
}
