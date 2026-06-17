/**
 * Email validation utility for SINTHA.
 *
 * Catches common typos and mistakes BEFORE the form is submitted to Firebase,
 * so users get instant feedback instead of waiting for a network round-trip.
 */

export interface EmailValidationResult {
  valid: boolean
  reason?: string
  suggestion?: string  // corrected email if we can guess what they meant
}

// Common email domain typos → suggest the correct one
const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gail.com': 'gmail.com',
  'gmail.net': 'gmail.com',
  'gmail.org': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.com.com': 'gmail.com',
  'gmaiil.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yahho.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outloo.com': 'outlook.com',
  'otlook.com': 'outlook.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'htomail.com': 'hotmail.com',
  'rediffmaill.com': 'rediffmail.com',
  'rediffmai.com': 'rediffmail.com',
  'rediff.com': 'rediffmail.com',
  'icoud.com': 'icloud.com',
  'iclod.com': 'icloud.com',
  'icloud.co': 'icloud.com',
}

// Strict RFC 5322 compliant regex (simplified)
// - local part: letters, digits, dots, hyphens, underscores, plus signs
// - @ symbol
// - domain: letters, digits, hyphens, dots
// - TLD: at least 2 letters
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

/**
 * Validate an email address with detailed feedback.
 *
 * @param email The email to validate
 * @param options.skipSuggestion Disable typo suggestions (default: false)
 * @returns Validation result with reason and optional corrected suggestion
 */
export function validateEmail(
  email: string,
  options: { skipSuggestion?: boolean } = {}
): EmailValidationResult {
  const trimmed = email.trim()

  // Empty
  if (!trimmed) {
    return { valid: false, reason: 'Email is required' }
  }

  // Contains spaces (in the middle, not just leading/trailing)
  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      reason: 'Email cannot contain spaces',
      suggestion: trimmed.replace(/\s+/g, ''),
    }
  }

  // Missing @
  if (!trimmed.includes('@')) {
    return {
      valid: false,
      reason: 'Email must contain @',
      suggestion: undefined,
    }
  }

  // Multiple @ symbols
  const atCount = (trimmed.match(/@/g) || []).length
  if (atCount > 1) {
    return {
      valid: false,
      reason: 'Email can only have one @',
      suggestion: undefined,
    }
  }

  // Split into local and domain parts
  const [localPart, domain] = trimmed.split('@')

  // Empty local part (before @)
  if (!localPart) {
    return {
      valid: false,
      reason: 'Email is missing the part before @',
      suggestion: undefined,
    }
  }

  // Local part too long (RFC limit is 64 chars)
  if (localPart.length > 64) {
    return {
      valid: false,
      reason: 'The part before @ is too long',
      suggestion: undefined,
    }
  }

  // Empty domain (after @)
  if (!domain) {
    return {
      valid: false,
      reason: 'Email is missing the part after @',
      suggestion: undefined,
    }
  }

  // Domain starts or ends with a dot
  if (domain.startsWith('.') || domain.endsWith('.')) {
    return {
      valid: false,
      reason: 'Domain cannot start or end with a dot',
      suggestion: domain.replace(/^\.+|\.+$/g, ''),
    }
  }

  // Domain has consecutive dots
  if (/\.\./.test(domain)) {
    const fixedDomain = domain.replace(/\.{2,}/g, '.')
    return {
      valid: false,
      reason: 'Domain cannot have consecutive dots',
      suggestion: `${localPart}@${fixedDomain}`,
    }
  }

  // Local part starts or ends with a dot
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return {
      valid: false,
      reason: 'The part before @ cannot start or end with a dot',
      suggestion: `${localPart.replace(/^\.+|\.+$/g, '')}@${domain}`,
    }
  }

  // Missing TLD (no dot in domain, or TLD too short)
  if (!domain.includes('.')) {
    return {
      valid: false,
      reason: `Email must end with a domain like ".com" or ".in"`,
      suggestion: undefined,
    }
  }

  const tld = domain.split('.').pop() || ''
  if (tld.length < 2) {
    return {
      valid: false,
      reason: `The ending ".${tld}" is too short (need at least 2 letters)`,
      suggestion: undefined,
    }
  }

  // Final regex check
  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      valid: false,
      reason: 'Please enter a valid email address',
      suggestion: undefined,
    }
  }

  // Check for common domain typos and suggest a fix
  if (!options.skipSuggestion) {
    const domainLower = domain.toLowerCase()
    const correctedDomain = COMMON_DOMAIN_TYPOS[domainLower]
    if (correctedDomain && correctedDomain !== domainLower) {
      return {
        valid: false,
        reason: `Did you mean "@${correctedDomain}"?`,
        suggestion: `${localPart}@${correctedDomain}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Quick boolean check — useful for disabling submit buttons.
 */
export function isValidEmail(email: string): boolean {
  return validateEmail(email, { skipSuggestion: true }).valid
}
