/**
 * Phone utility for SINTHA.
 *
 * Uses window.location.href for tel: (direct navigation — works in
 * Android WebView because shouldOverrideUrlLoading catches it).
 * Uses window.open for wa.me links (opens in browser/WhatsApp app).
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
 * Uses window.location.href = 'tel:...' which the Android WebView's
 * shouldOverrideUrlLoading catches and hands to the system dialer.
 * This is the method that worked before — no anchor tags, no
 * WebViewInterceptor involvement.
 */
export async function dialPhone(phone: string): Promise<DialResult> {
  const cleaned = normalizePhoneNumber(phone)

  if (!cleaned) {
    return { method: 'failed', message: 'No phone number provided', number: '' }
  }

  try {
    window.location.href = `tel:${cleaned}`
    return { method: 'dialer', message: 'Opening dialer...', number: cleaned }
  } catch {
    // Fallback: copy to clipboard
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

/**
 * Open WhatsApp with a pre-filled message.
 * Uses window.open for wa.me link.
 */
export function openWhatsApp(phone: string, message?: string): boolean {
  const cleaned = getDigitsOnly(phone)
  const fullNumber = `91${cleaned}`
  const msg = message ? `?text=${encodeURIComponent(message)}` : ''
  const url = `https://wa.me/${fullNumber}${msg}`

  try {
    window.open(url, '_blank')
    return true
  } catch {
    try {
      window.location.href = url
      return true
    } catch {
      return false
    }
  }
}
