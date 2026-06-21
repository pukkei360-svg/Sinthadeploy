/**
 * Phone utility for SINTHA.
 *
 * Uses window.open() directly for tel: — this is the ONLY method that
 * reliably triggers Capacitor's native shouldOverrideUrlLoading on
 * Capacitor 1.6+ (which has BROWSABLE + SEND intent filters that
 * break window.location.href and <a> tag clicks).
 *
 * The visibility detection + clipboard fallback is kept as a safety net.
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

  // Visibility detection — check if dialer opens
  const dialerOpenedPromise = new Promise<boolean>((resolve) => {
    let resolved = false

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !resolved) {
        resolved = true
        document.removeEventListener('visibilitychange', onVisibilityChange)
        resolve(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const onPageShow = () => {
      if (!resolved) {
        resolved = true
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.removeEventListener('pageshow', onPageShow)
        resolve(true)
      }
    }
    window.addEventListener('pageshow', onPageShow)

    setTimeout(() => {
      if (!resolved) {
        resolved = true
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.removeEventListener('pageshow', onPageShow)
        resolve(false)
      }
    }, 2000)
  })

  // Open dialer using window.open — NOT location.href, NOT <a> tag.
  // Capacitor 1.6's BROWSABLE intent filter breaks location.href for tel:.
  // window.open() goes through a different code path that still works.
  try {
    window.open(`tel:${cleaned}`, '_blank')
  } catch {
    // window.open threw — try location.href as fallback
    try {
      window.location.href = `tel:${cleaned}`
    } catch {
      // Both failed — fall through to copy
    }
  }

  // Wait to see if the dialer opened
  const dialerOpened = await dialerOpenedPromise

  if (dialerOpened) {
    return { method: 'dialer', message: 'Opening dialer...', number: cleaned }
  }

  // Dialer didn't open — copy to clipboard
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
