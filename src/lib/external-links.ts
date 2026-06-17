/**
 * Helper functions for phone/WhatsApp that work in both
 * regular browsers AND Android WebView apps.
 *
 * Android WebView cannot open tel: or whatsapp: URL schemes
 * unless the native side configures shouldOverrideUrlLoading.
 * Since we can't control the native wrapper, we use a two-step approach:
 *
 * 1. Try the native link (tel: / whatsapp intent)
 * 2. If it fails, copy number to clipboard and show a user-friendly message
 */

/**
 * Copy text to clipboard and return whether it succeeded.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // Fallback for older WebViews
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const result = document.execCommand('copy')
    document.body.removeChild(textarea)
    return result
  } catch {
    return false
  }
}

/**
 * Check if the app is running inside an Android WebView.
 */
export function isAndroidWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return (
    (ua.includes('android') && ua.includes('wv')) ||
    (ua.includes('android') && !ua.includes('chrome') && !ua.includes('firefox')) ||
    (ua.includes('android') && document.referrer.includes('android-app://'))
  )
}

/**
 * Call a phone number. In browsers this opens the dialer.
 * In Android WebView, it copies the number and shows a prompt.
 * Returns a message string for the caller to display.
 */
export async function callPhone(phone: string): Promise<{ success: boolean; message: string }> {
  const cleaned = phone.replace(/\s+/g, '')

  // In browser (not WebView), try tel: link directly
  if (!isAndroidWebView()) {
    window.location.href = `tel:${cleaned}`
    return { success: true, message: 'Opening dialer...' }
  }

  // In Android WebView — copy to clipboard
  const copied = await copyToClipboard(cleaned)
  if (copied) {
    return {
      success: true,
      message: `Number ${cleaned} copied! Paste it in your phone dialer to call.`,
    }
  }
  return {
    success: false,
    message: `Call this number: ${cleaned}`,
  }
}

/**
 * Open WhatsApp with a phone number. In browsers this opens wa.me.
 * In Android WebView, it copies the number and shows instructions.
 * Returns a message string for the caller to display.
 */
export async function openWhatsApp(phone: string, message: string = ''): Promise<{ success: boolean; message: string }> {
  const cleaned = phone.replace(/\s+/g, '').replace(/^\+?91/, '') // strip country code
  const fullNumber = `91${cleaned}`

  // In browser (not WebView), open wa.me link
  if (!isAndroidWebView()) {
    const encodedMsg = encodeURIComponent(message)
    window.open(`https://wa.me/${fullNumber}?text=${encodedMsg}`, '_blank')
    return { success: true, message: 'Opening WhatsApp...' }
  }

  // In Android WebView — copy number and show instructions
  const copied = await copyToClipboard(fullNumber)
  if (copied) {
    return {
      success: true,
      message: `WhatsApp number ${fullNumber} copied! Open WhatsApp, start a new chat, and paste the number.`,
    }
  }
  return {
    success: false,
    message: `WhatsApp: ${fullNumber}`,
  }
}
