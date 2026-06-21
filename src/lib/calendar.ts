/**
 * Calendar (.ics) file generation for SINTHA bookings.
 *
 * Generates an iCalendar VEVENT for a booking and triggers a browser
 * download of `sintha-booking.ics`. The downloaded file can be opened
 * by Google Calendar, Apple Calendar, Outlook, etc.
 *
 * The function is safe to call only from the browser — it touches
 * `document`, `URL.createObjectURL`, and the DOM. Guard any server-side
 * callers with `typeof window !== 'undefined'` checks.
 */

export interface ICSBooking {
  /** Event title / summary (e.g. the service name). */
  title: string
  /**
   * Start date/time of the event. Accepts anything `new Date()`
   * understands — an ISO string, a `YYYY-MM-DD` date, or a full
   * timestamp. If the value already contains a time we use it; if it's
   * date-only we default the start time to 09:00 local.
   */
  date: string
  /** Optional venue / address. */
  location?: string
  /** Optional free-form description / notes. */
  description?: string
  /** Optional URL for the booking (e.g. a deep link back into SINTHA). */
  url?: string
}

/** Pad a number to 2 digits — used for iCalendar date formatting. */
const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * Convert a Date to an iCalendar UTC timestamp: `YYYYMMDDTHHMMSSZ`.
 */
function toICSDateTime(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad2(date.getUTCMonth() + 1) +
    pad2(date.getUTCDate()) +
    'T' +
    pad2(date.getUTCHours()) +
    pad2(date.getUTCMinutes()) +
    pad2(date.getUTCSeconds()) +
    'Z'
  )
}

/**
 * Escape reserved characters per RFC 5545 so commas / semicolons /
 * newlines in user input don't break the .ics parse.
 *
 * Backslash first, then the reserved characters.
 */
function escapeICS(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Parse the booking date into a `{ start, end }` pair, with `end`
 * being 1 hour after `start`.
 *
 * - If `date` includes a time component, we honor it.
 * - If `date` is date-only (`YYYY-MM-DD`), we default to 09:00 local
 *   time so the calendar entry has a sensible slot rather than midnight.
 */
function parseBookingWindow(date: string): { start: Date; end: Date } {
  const trimmed = date.trim()
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)

  const start = isDateOnly
    ? new Date(`${trimmed}T09:00:00`)
    : new Date(trimmed)

  // Fallback if the date couldn't be parsed — use "now" so we still
  // produce a valid .ics file instead of crashing.
  const validStart = Number.isNaN(start.getTime()) ? new Date() : start

  const end = new Date(validStart.getTime() + 60 * 60 * 1000) // +1 hour
  return { start: validStart, end }
}

/**
 * Build the full iCalendar document for a booking.
 *
 * Exposed for testing — callers should normally use `generateICSFile`
 * which both builds and downloads the file.
 */
export function buildICS(booking: ICSBooking): string {
  const { start, end } = parseBookingWindow(booking.date)

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SINTHA//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    // Unique identifier for this event (with a domain so it's globally
    // unique and stable across regenerations for the same booking).
    `UID:${start.getTime()}@sintha.app`,
    `DTSTAMP:${toICSDateTime(new Date())}`,
    `DTSTART:${toICSDateTime(start)}`,
    `DTEND:${toICSDateTime(end)}`,
    `SUMMARY:${escapeICS(booking.title)}`,
  ]

  if (booking.location) {
    lines.push(`LOCATION:${escapeICS(booking.location)}`)
  }
  if (booking.description) {
    lines.push(`DESCRIPTION:${escapeICS(booking.description)}`)
  }
  if (booking.url) {
    lines.push(`URL:${escapeICS(booking.url)}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  // iCalendar lines should be CRLF-terminated per RFC 5545.
  return lines.join('\r\n')
}

/**
 * Generate an .ics file for a booking and trigger a browser download.
 *
 * Flow:
 *  1. Build the iCalendar payload.
 *  2. Wrap it in a `Blob` with the correct MIME type.
 *  3. Create an object URL and a hidden `<a download>` element.
 *  4. Click it programmatically to start the download.
 *  5. Revoke the object URL and remove the anchor.
 *
 * No-ops gracefully when called outside a browser (e.g. during SSR).
 */
export function generateICSFile(booking: ICSBooking): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const ics = buildICS(booking)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'sintha-booking.ics'
  anchor.rel = 'noopener'
  // Some browsers require the element to be attached to the DOM to
  // honor the download attribute.
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
