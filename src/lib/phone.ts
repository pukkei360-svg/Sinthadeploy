/**
 * Phone utility for SINTHA.
 *
 * Provides dialPhone() which opens the phone dialer via tel: protocol.
 * Also provides WhatsApp link generation.
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
 * Open the phone dialer with the given number.
 *
 * Uses window.open('tel:...') which the WebViewInterceptor catches
 * and hands to the system dialer via shouldOverrideUrlLoading.
 *
 * No visibility detection / no timeout — just open it and return.
 * The fallback (clipboard copy) only happens if window.open throws.
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

  // Try to open the dialer via window.open
  // The WebViewInterceptor catches <a> clicks with tel: href and calls
  // window.open() which triggers shouldOverrideUrlLoading in Android WebView.
  try {
    window.open(`tel:${cleaned}`, '_blank')
    return {
      method: 'dialer',
      message: 'Opening dialer...',
      number: cleaned,
    }
  } catch {
    // window.open failed — try anchor tag click
    try {
      const anchor = document.createElement('a')
      anchor.href = `tel:${cleaned}`
      anchor.style.position = 'fixed'
      anchor.style.top = '0'
      anchor.style.left = '0'
      anchor.style.opacity = '0'
      document.body.appendChild(anchor)
      anchor.click()
      setTimeout(() => {
        if (anchor.parentNode) anchor.parentNode.removeChild(anchor)
      }, 100)
      return {
        method: 'dialer',
        message: 'Opening dialer...',
        number: cleaned,
      }
    } catch {
      // Both failed — copy to clipboard
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(cleaned)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = cleaned
          textarea.style.position = 'fixed'
          textarea.style.top = '0'
          textarea.style.left = '0'
          textarea.style.opacity = '0'
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
}
