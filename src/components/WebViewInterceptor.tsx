'use client'

import { useEffect } from 'react'

/**
 * WebViewInterceptor — prevents net::ERR_UNKNOWN_URL_SCHEME errors
 * in Android WebView by intercepting clicks on <a> tags with
 * non-HTTP protocols (tel:, whatsapp:, intent:, sms:, mailto:).
 *
 * In a regular browser these work natively, but Android WebView
 * tries to load them as web pages and fails.
 *
 * This component:
 * 1. Adds a global click listener on document
 * 2. When an <a> tag with a non-HTTP href is clicked, prevents default
 * 3. Uses window.open() which WebView's shouldOverrideUrlLoading can intercept
 * 4. Falls back to window.location.href for WebViews without that config
 */
export default function WebViewInterceptor() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find the closest <a> ancestor of the click target
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Check if this is a non-HTTP scheme that WebView can't handle
      const isExternalScheme =
        href.startsWith('tel:') ||
        href.startsWith('whatsapp:') ||
        href.startsWith('intent:') ||
        href.startsWith('sms:') ||
        href.startsWith('mailto:')

      if (isExternalScheme) {
        e.preventDefault()
        e.stopPropagation()

        // Use window.open — this triggers shouldOverrideUrlLoading in WebView
        // which can then hand off to the system dialer/WhatsApp app
        const w = window.open(href, '_blank')

        // Fallback: if popup blocked, try location change
        if (!w) {
          try {
            window.location.href = href
          } catch {
            // Last resort: try intent URL for WhatsApp
            if (href.startsWith('tel:')) {
              const phone = href.replace('tel:', '').replace(/\s+/g, '')
              window.location.href = `tel:${phone}`
            }
          }
        }
      }
    }

    // Capture phase to intercept before any other handlers
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  return null // This component renders nothing
}
