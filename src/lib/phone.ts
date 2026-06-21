/**
 * Phone utility for SINTHA.
 *
 * Uses window.open() for BOTH tel: and wa.me links.
 * This triggers Capacitor's shouldOverrideUrlLoading natively,
 * which correctly hands off to the system dialer and WhatsApp app.
 *
 * No <a> tag tricks, no window.location.href, no WebViewInterceptor.
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

export async function dialPhone(phone: string): Promise<DialResult> {
  const cleaned = normalizePhoneNumber(phone)

  if (!cleaned) {
    return { method: 'failed', message: 'No phone number provided', number: '' }
  }

  try {
    window.open(`tel:${cleaned}`, '_blank')
    return { method: 'dialer', message: 'Opening dialer...', number: cleaned }
  } catch {
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
