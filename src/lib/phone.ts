/**
 * Phone utility for SINTHA.
 *
 * Provides a smart dialPhone() function that tries to open the phone dialer
 * via the tel: protocol, and falls back to copying the number to the clipboard
 * if the dialer doesn't open within ~1.5 seconds.
 *
 * Why fallback?
 * - In a regular browser: tel: always works (opens dialer)
 * - In Android WebView APK: depends on the wrapper's settings
 *   - If wrapper intercepts tel: URLs → dialer opens ✅
 *   - If wrapper doesn't → WebView shows ERR_UNKNOWN_URL_SCHEME ❌
 *     (in this case, we copy the number so user can paste it manually)
 */

export interface DialResult {
  method: 'dialer' | 'copied' | 'failed'
  message: string
  number: string
}

/**
 * Normalize a phone number to a tel:-compatible format.
 * Removes spaces, dashes, parentheses. Keeps the leading + if present.
 *
 * Examples:
 *   "+91 98765 43210"  → "+919876543210"
 *   "98765 43210"      → "9876543210"
 *   "(987) 654-3210"   → "9876543210"
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-()]/g, '')
}

/**
 * Get the digits-only version of a phone number (no country code).
 * Useful for wa.me links.
 *
 * Examples:
 *   "+91 98765 43210"  → "9876543210"
 *   "98765 43210"      → "9876543210"
 */
export function getDigitsOnly(phone: string): string {
  const normalized = normalizePhoneNumber(phone)
  return normalized.replace(/^\+?91/, '')
}

/**
 * Try to open the phone dialer with the given number.
 *
 * Strategy:
 *   1. Try window.location.href = 'tel:+...'
 *   2. Wait 1.5 seconds
 *   3. If the user is still on the same page (didn't navigate away to dialer),
 *      copy the number to the clipboard as a fallback
 *   4. Return a result describing what happened
 *
 * @param phone The phone number to dial (any format)
 * @returns Promise<DialResult> describing what happened
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

  // Try to detect if dialer opened by tracking visibility change.
  // When the dialer opens, the page becomes hidden (visibilityState = 'hidden').
  // If the page is still visible after 1.5s, we assume the dialer didn't open.
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

    // Also resolve if the user comes back to the page (dialer was opened)
    const onPageShow = () => {
      if (!resolved) {
        resolved = true
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.removeEventListener('pageshow', onPageShow)
        resolve(true)
      }
    }
    window.addEventListener('pageshow', onPageShow)

    // After 1.5s, if we haven't seen visibility change, assume dialer didn't open
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.removeEventListener('pageshow', onPageShow)
        resolve(false)
      }
    }, 1500)
  })

  // Try to open the dialer
  try {
    // Use window.location.href directly — this bypasses the WebViewInterceptor
    // (which intercepts anchor clicks and can break tel: links).
    // WebView's shouldOverrideUrlLoading will still catch this URL change.
    window.location.href = `tel:${cleaned}`
  } catch (e) {
    // location change threw — try anchor as fallback
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
        if (anchor.parentNode) {
          anchor.parentNode.removeChild(anchor)
        }
      }, 100)
    } catch {
      // Both methods failed — fall through to copy fallback
    }
  }

  // Wait to see if the dialer opened
  const dialerOpened = await dialerOpenedPromise

  if (dialerOpened) {
    return {
      method: 'dialer',
      message: 'Opening dialer...',
      number: cleaned,
    }
  }

  // Dialer didn't open — copy the number to clipboard as fallback
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(cleaned)
    } else {
      // Fallback for older browsers / WebViews without clipboard API
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
      message: `Dialer not available — number copied to clipboard`,
      number: cleaned,
    }
  } catch {
    // Couldn't copy either — just show the number
    return {
      method: 'failed',
      message: `Couldn't open dialer or copy. Number: ${cleaned}`,
      number: cleaned,
    }
  }
}
