/**
 * Phone utility for SINTHA.
 *
 * Works with Capacitor 1.4 AND 1.6+.
 * Capacitor 1.6 added new intent filters (BROWSABLE, SEND) that can
 * intercept tel: and wa.me URLs differently than 1.4. To handle both
 * versions reliably, we use an <a> tag click WITHOUT data-skip-interceptor
 * so the WebViewInterceptor catches it and calls window.open().
 *
 * window.open() triggers shouldOverrideUrlLoading in the Capacitor
 * WebView bridge, which correctly hands tel: to the system dialer
 * and wa.me to the browser/WhatsApp app.
 */

export interface DialResult {
  method: 'dialer' | 'copied' | 'failed'
  message: string
  number: string
}

export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-()]/g, '')
}

export function getDigitsOnly(phone: string): string {
  const normalized = normalizePhoneNumber(phone)
  return normalized.replace(/^\+?91/, '')
}

/**
 * Open the phone dialer.
 * Uses an <a href="tel:..."> tag click — the WebViewInterceptor catches
 * the click, calls window.open('tel:...'), which triggers Capacitor's
 * native shouldOverrideUrlLoading → system dialer.
 *
 * No window.location.href (Capacitor 1.6 may intercept this differently).
 * No data-skip-interceptor (we WANT the interceptor to handle it).
 */
export async function dialPhone(phone: string): Promise<DialResult> {
  const cleaned = normalizePhoneNumber(phone)

  if (!cleaned) {
    return { method: 'failed', message: 'No phone number provided', number: '' }
  }

  // Create a real <a> tag and click it — WebViewInterceptor catches this
  try {
    const anchor = document.createElement('a')
    anchor.href = `tel:${cleaned}`
    // Do NOT set data-skip-interceptor — let WebViewInterceptor handle it
    anchor.style.position = 'fixed'
    anchor.style.top = '0'
    anchor.style.left = '0'
    anchor.style.opacity = '0'
    anchor.style.pointerEvents = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    setTimeout(() => {
      if (anchor.parentNode) anchor.parentNode.removeChild(anchor)
    }, 200)

    return { method: 'dialer', message: 'Opening dialer...', number: cleaned }
  } catch {
    // Fallback: try window.open directly
    try {
      window.open(`tel:${cleaned}`, '_blank')
      return { method: 'dialer', message: 'Opening dialer...', number: cleaned }
    } catch {
      // Last resort: copy to clipboard
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(cleaned)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = cleaned
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        return { method: 'copied', message: 'Number copied to clipboard', number: cleaned }
      } catch {
        return { method: 'failed', message: `Number: ${cleaned}`, number: cleaned }
      }
    }
  }
}
