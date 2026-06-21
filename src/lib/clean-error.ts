/**
 * Clean up raw error messages into short, user-friendly text.
 *
 * WHY THIS EXISTS:
 *   Error messages from the backend / Prisma / Razorpay / Cloudinary are often
 *   long, technical, and ugly to show in a toast:
 *     "Failed to sync authentication (Invalid `prisma.user.findUnique()`
 *      invocation: The column `User.isBanned` does not exist in the current
 *      database.)"
 *   That's 3 lines of technical jargon. Users don't care about Prisma or
 *   column names — they just want to know something went wrong.
 *
 * WHAT THIS DOES:
 *   - Strips everything in parentheses (technical details)
 *   - Strips backtick-wrapped code references
 *   - Strips "Invalid `prisma.X` invocation:" prefixes
 *   - Caps the message at 80 characters
 *   - Falls back to "Something went wrong. Please try again." if the result
 *     is empty or too long
 *
 * Usage:
 *   import { cleanError } from '@/lib/clean-error'
 *   toast({ title: 'Error', description: cleanError(err) })
 *   // → "Failed to sync authentication. Please try again."
 */
export function cleanError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback

  let msg = ''
  if (err instanceof Error) {
    msg = err.message
  } else if (typeof err === 'string') {
    msg = err
  } else if (typeof err === 'object' && err !== null && 'message' in err) {
    msg = String((err as { message: unknown }).message)
  } else {
    msg = String(err)
  }

  // If there's no message, use the fallback
  if (!msg || msg.trim().length === 0) return fallback

  // Remove everything in parentheses — these are usually technical details
  // e.g. "Failed to sync (Invalid prisma... column does not exist)" → "Failed to sync"
  msg = msg.replace(/\([^)]*\)/g, '').trim()

  // Remove backtick-wrapped code references
  // e.g. "Invalid `prisma.user.findUnique()` invocation:" → "Invalid invocation:"
  msg = msg.replace(/`[^`]+`/g, '').trim()

  // Remove common ugly prefixes
  msg = msg
    .replace(/^Invalid\s+invocation:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/^Failed to\s+/i, 'Failed to ')
    .trim()

  // Remove trailing punctuation that looks weird after our cleanup
  msg = msg.replace(/[.!:;\s]+$/, '').trim()

  // If the message is now empty, use fallback
  if (!msg) return fallback

  // If it's still too long, truncate with ellipsis
  if (msg.length > 80) {
    msg = msg.slice(0, 77).trim() + '...'
  }

  // Capitalize first letter
  msg = msg.charAt(0).toUpperCase() + msg.slice(1)

  return msg
}
