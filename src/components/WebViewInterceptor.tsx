'use client'

import { useEffect } from 'react'

/**
 * WebViewInterceptor — prevents net::ERR_UNKNOWN_URL_SCHEME errors
 * in Android WebView by intercepting:
 *
 * 1. <a> tag clicks with non-HTTP protocols (tel:, whatsapp:, intent:, sms:, mailto:)
 * 2. <a> tag clicks with wa.me links (which redirect to whatsapp://)
 * 3. window.location.href changes to tel: (via beforeunload detection)
 *
 * For all of these, it calls window.open() which triggers the Android
 * WebView's shouldOverrideUrlLoading callback, allowing the native
 * wrapper to hand off to the system dialer or WhatsApp app.
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

      // Check if this is a non-HTTP scheme that WebView can't handle
      const isExternalScheme =
        href.startsWith('tel:') ||
        href.startsWith('whatsapp:') ||
        href.startsWith('intent:') ||
        href.startsWith('sms:') ||
        href.startsWith('mailto:')

      // Also catch wa.me links — these redirect to whatsapp:// which fails
      const isWaMeLink = href.includes('wa.me/') || href.includes('api.whatsapp.com/')

      if (isExternalScheme || isWaMeLink) {
        e.preventDefault()
        e.stopPropagation()

        // For wa.me links, convert to whatsapp:// intent directly
        // This avoids the redirect that causes ERR_UNKNOWN_URL_SCHEME
        if (isWaMeLink) {
          try {
            const url = new URL(href)
            const phone = url.pathname.replace('/', '')
            const text = url.searchParams.get('text') || ''
            const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`
            window.open(whatsappUrl, '_blank')
            return
          } catch {
            // URL parsing failed — fall through to window.open the original
          }
        }

        // For tel: and other schemes, use window.open
        const w = window.open(href, '_blank')

        // Fallback: if popup blocked, try location change
        if (!w) {
          try {
            window.location.href = href
          } catch {
            // Failed
          }
        }
      }
    }

    // Capture phase to intercept before any other handlers
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  return null
}
