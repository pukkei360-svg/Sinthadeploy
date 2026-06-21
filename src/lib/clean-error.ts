/**
 * cleanError — turn any thrown value into a human-readable string for toasts.
 *
 * Why this exists:
 *   - `apiFetch` throws `Error` (server message), `NetworkError` (offline),
 *     or bare `TypeError` (fetch failed) depending on the failure mode.
 *   - Random third-party code can throw strings, objects, or anything else.
 *   - Toasts need a single string, never `undefined` or `[object Object]`.
 *
 * The rules below are ordered from most-specific to most-generic so the
 * user always sees the most helpful message we can produce.
 */

import { NetworkError } from './api'

export function cleanError(err: unknown): string {
  // 1. Offline / unreachable network — give the clearest possible hint
  if (err instanceof NetworkError) {
    return err.message
  }

  // 2. Standard Error — use the server-provided message when available
  if (err instanceof Error) {
    const msg = err.message || err.name
    // Filter out useless generic strings that don't help the user
    if (msg && msg !== 'Error') {
      return msg
    }
  }

  // 3. Plain string thrown
  if (typeof err === 'string') {
    return err
  }

  // 4. Object with an `error` / `message` field (defensive — shouldn't happen
  //    since apiFetch already extracts these, but third-party code might throw)
  if (err && typeof err === 'object') {
    const maybeErr = err as { error?: unknown; message?: unknown }
    if (typeof maybeErr.error === 'string') return maybeErr.error
    if (typeof maybeErr.message === 'string') return maybeErr.message
  }

  // 5. Total fallback
  return 'Something went wrong. Please try again.'
}
