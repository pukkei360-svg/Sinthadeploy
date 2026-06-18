import nodemailer from 'nodemailer'

/**
 * SINTHA Email Service
 *
 * Sends transactional emails via Gmail SMTP using nodemailer.
 *
 * Required env vars (set on Vercel):
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your-email@gmail.com
 *   SMTP_PASS=your-16-char-app-password
 *   SMTP_FROM="SINTHA <your-email@gmail.com>"
 *
 * On Vercel, env vars are injected automatically at runtime.
 * No need to load .env files manually (which broke Vercel's
 * file tracing and prevented deployment).
 */

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

function getSmtpConfig(): SmtpConfig | null {
  // Read directly from process.env — works on Vercel, local dev,
  // and any environment that injects env vars (which is all of them).
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user,
    pass,
    from: process.env.SMTP_FROM || `SINTHA <${user}>`,
  }
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

/**
 * Send an email via Gmail SMTP.
 *
 * Returns true on success, false on failure.
 * Never throws — all errors are caught and logged.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const config = getSmtpConfig()

  if (!config) {
    console.warn('[SMTP] Not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.')
    return false
  }

  // Validate recipient email
  if (!to || !to.includes('@') || to.endsWith('@phone.sintha.app') || to === 'undefined') {
    console.warn(`[SMTP] Skipping send — invalid recipient: ${to}`)
    return false
  }

  // Create a fresh transporter for each send and close it after.
  // This prevents the SMTP connection pool from keeping the Node.js
  // event loop alive, which was crashing the Next.js server on Vercel.
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    })
    console.log(`[SMTP] Email sent to ${to} ( messageId: ${info.messageId} )`)
    return true
  } catch (error) {
    console.error('[SMTP] Email send error:', error)
    return false
  } finally {
    // Always close the transporter to free the SMTP connection
    try {
      transporter.close()
    } catch {
      // Ignore close errors
    }
  }
}

/**
 * Check if SMTP is configured (env vars are set).
 */
export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null
}
