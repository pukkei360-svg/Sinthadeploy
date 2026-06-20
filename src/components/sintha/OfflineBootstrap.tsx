'use client'

import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { setOfflineToastShower } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Wifi, WifiOff, X } from 'lucide-react'

/**
 * OfflineBootstrap — does three things:
 *
 *   1. Wires `apiFetch`'s "No internet" toast shower to the global shadcn
 *      toast. This way apiFetch (a plain TS module with no React context)
 *      can surface network errors as a visible toast.
 *   2. Renders a small dismissible "Offline" banner at the top of the
 *      viewport when `navigator.onLine === false`. The banner is sticky
 *      so it stays visible across screen navigation, but the user can
 *      close it; it'll reappear next time connectivity drops.
 *   3. Re-shows the banner automatically if the device goes offline again
 *      after being online (so the user gets a fresh heads-up).
 *
 * Render this once near the top of the tree (e.g. inside the RootLayout
 * or the top-level page). It renders nothing visible when online.
 */
export default function OfflineBootstrap() {
  const online = useOnlineStatus()

  // Wire the toast shower once on mount.
  useEffect(() => {
    setOfflineToastShower((title, description) => {
      toast({
        title,
        description,
        variant: 'destructive',
      })
    })
  }, [])

  if (online) return null

  // `online` going false → true → false mounts a fresh <Banner/> each
  // offline episode, so its local "dismissed" state auto-resets.
  // No ref bookkeeping needed.
  return <OfflineBanner key="offline-banner" />
}

function OfflineBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white px-3 py-2 flex items-center justify-between gap-2 shadow-md"
    >
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="text-xs font-semibold truncate">
          You&apos;re offline — some content may be unavailable
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline banner"
        className="shrink-0 p-1 rounded hover:bg-white/20"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/**
 * Small inline indicator that screens can drop into their headers
 * to show "cached / offline" context. Not used everywhere — opt-in.
 */
export function OfflineDot({ className = '' }: { className?: string }) {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium ${className}`}
      title="Showing cached data — you are offline"
    >
      <WifiOff className="h-3 w-3" /> Offline
    </span>
  )
}

// Re-export for convenience
export { Wifi, WifiOff }
