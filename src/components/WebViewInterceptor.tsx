'use client'

import { useEffect } from 'react'

/**
 * WebViewInterceptor — prevents net::ERR_UNKNOWN_URL_SCHEME errors
 * in Android WebView by intercepting clicks on <a> tags with
 * non-HTTP protocols (tel:, whatsapp:, intent:, sms:, mailto:).
 *
 * This component:
 * 1. Adds a global click listener on document (capture phase)
 * 2. When an <a> tag with a non-HTTP href is clicked, prevents default
 * 3. Uses window.open() which WebView's shouldOverrideUrlLoading can intercept
 * 4. Falls back to window.location.href if window.open returns null
 */
export default function WebViewInterceptor() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      // Skip anchors marked with data-skip-interceptor
      if (target.hasAttribute('data-skip-interceptor')) return

      const href = target.getAttribute('href')
      if (!href) return

      // Only intercept non-HTTP schemes
      const isExternalScheme =
        href.startsWith('tel:') ||
        href.startsWith('whatsapp:') ||
        href.startsWith('intent:') ||
        href.startsWith('sms:') ||
        href.startsWith('mailto:')

      if (isExternalScheme) {
        e.preventDefault()
        e.stopPropagation()

        const w = window.open(href, '_blank')
        if (!w) {
          try {
            window.location.href = href
          } catch {
            // Failed
          }
        }
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  return null
}
