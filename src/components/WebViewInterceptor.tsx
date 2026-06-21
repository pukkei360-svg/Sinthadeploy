'use client'

import { useEffect } from 'react'

/**
 * WebViewInterceptor — prevents net::ERR_UNKNOWN_URL_SCHEME errors
 * in Android WebView by intercepting clicks on <a> tags with
 * non-HTTP protocols.
 *
 * IMPORTANT: We do NOT intercept tel: here anymore. dialPhone() uses
 * window.open('tel:...') directly which goes through Capacitor's
 * native shouldOverrideUrlLoading. If we intercept tel: here AND
 * dialPhone also opens it, the dialer might open twice or conflict.
 *
 * We only intercept: whatsapp:, intent:, sms:, mailto:
 * (these are from <a> tags in the app, not from dialPhone)
 */
export default function WebViewInterceptor() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Check if this is a non-HTTP scheme that WebView can't handle
      // NOTE: tel: is NOT included — dialPhone() handles that separately
      const isExternalScheme =
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
