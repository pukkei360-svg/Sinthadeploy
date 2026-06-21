/**
 * Phone utility for SINTHA.
 *
 * Provides dialPhone() and openWhatsApp() functions that work reliably
 * in Android WebView by creating real <a> tag clicks that the
 * WebViewInterceptor component catches and handles via shouldOverrideUrlLoading.
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
 * Create a hidden <a> tag, click it, and remove it.
 * This is the most reliable way to trigger tel: and https: URLs in
 * Android WebView — the WebViewInterceptor catches the <a> click event
 * and calls window.open() which triggers shouldOverrideUrlLoading.
 */
function clickAnchor(href: string): boolean {
  try {
    const anchor = document.createElement('a')
    anchor.href = href
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
    return true
  } catch {
    return false
  }
}

/**
 * Open the phone dialer with the given number.
 * Uses an <a> tag click so the WebViewInterceptor can catch it.
 */
export async function dialPhone(phone: string): Promise<DialResult> {
  const cleaned = normalizePhoneNumber(phone)

  if (!cleaned) {
    return {
      method: 'failed',
      message: 'No phone number provided',
      number: '',
    }
  }

  // Method 1: <a> tag click (WebViewInterceptor catches this)
  if (clickAnchor(`tel:${cleaned}`)) {
    return {
      method: 'dialer',
      message: 'Opening dialer...',
      number: cleaned,
    }
  }

  // Method 2: window.open fallback
  try {
    window.open(`tel:${cleaned}`, '_blank')
    return {
      method: 'dialer',
      message: 'Opening dialer...',
      number: cleaned,
    }
  } catch {
    // Method 3: copy to clipboard
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
      return {
        method: 'copied',
        message: 'Number copied to clipboard',
        number: cleaned,
      }
    } catch {
      return {
        method: 'failed',
        message: `Number: ${cleaned}`,
        number: cleaned,
      }
    }
  }
}

/**
 * Open WhatsApp with a pre-filled message.
 * Uses an <a> tag click so the WebViewInterceptor can catch it.
 */
export function openWhatsApp(phone: string, message?: string): boolean {
  const cleaned = getDigitsOnly(phone)
  const fullNumber = `91${cleaned}`
  const msg = message ? `?text=${encodeURIComponent(message)}` : ''
  const url = `https://wa.me/${fullNumber}${msg}`

  // Use <a> tag click — works in both browser and WebView
  return clickAnchor(url)
}
