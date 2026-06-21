/**
 * Phone utility for SINTHA.
 *
 * Tries 3 methods in order to open the phone dialer:
 * 1. window.location.href = 'tel:...' (works in Capacitor 1.4)
 * 2. window.open('tel:...', '_blank') (works in some Capacitor 1.6 configs)
 * 3. <a> tag click (last resort)
 * 4. Copy to clipboard (if all else fails)
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

  // Method 1: window.location.href (worked in Capacitor 1.4)
  try {
    window.location.href = `tel:${cleaned}`
    // Give it 500ms — if the page is still here, try next method
    await new Promise(r => setTimeout(r, 500))
    // If we're still here, the dialer didn't open — try method 2
  } catch {
    // location.href threw — try method 2
  }

  // Method 2: window.open (works in some Capacitor 1.6 configs)
  try {
    const w = window.open(`tel:${cleaned}`, '_blank')
    if (w) {
      return { method: 'dialer', message: 'Opening dialer...', number: cleaned }
    }
    // w is null — popup blocked, try method 3
  } catch {
    // window.open threw — try method 3
  }

  // Method 3: <a> tag click with data-skip-interceptor
  try {
    const anchor = document.createElement('a')
    anchor.href = `tel:${cleaned}`
    anchor.setAttribute('data-skip-interceptor', 'true')
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
    // All methods failed — copy to clipboard
  }

  // Method 4: Copy to clipboard
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
