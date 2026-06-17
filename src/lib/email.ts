import nodemailer from 'nodemailer'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// SMTP configuration from environment variables
// Set these in your .env file:
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=587
// SMTP_USER=your-email@gmail.com
// SMTP_PASS=your-app-password
// SMTP_FROM="SINTHA <your-email@gmail.com>"

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

// Load .env file manually (needed for standalone mode where Next.js doesn't auto-load .env)
function loadEnvFile(): Record<string, string> {
  const envVars: Record<string, string> = {}

  // Try multiple possible locations for .env
  const possiblePaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),  // standalone server is in .next/standalone/
    resolve(__dirname, '../../.env'),       // from compiled route
    resolve(__dirname, '../../../.env'),
  ]

  for (const envPath of possiblePaths) {
    try {
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          // Skip comments and empty lines
          if (!trimmed || trimmed.startsWith('#')) continue
          const match = trimmed.match(/^([^=]+)=(.*)$/)
          if (match) {
            const key = match[1].trim()
            let value = match[2].trim()
            // Remove surrounding quotes
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1)
            }
            envVars[key] = value
          }
        }
        console.log(`[SMTP] Loaded .env from: ${envPath}`)
        break
      }
    } catch {
      // Try next path
    }
  }

  return envVars
}

// Cache loaded env vars
let loadedEnv: Record<string, string> | null = null

function getEnvVar(key: string): string | undefined {
  // First try process.env (works in dev mode)
  if (process.env[key]) return process.env[key]

  // Then try loaded .env file (works in standalone mode)
  if (!loadedEnv) {
    loadedEnv = loadEnvFile()
  }
  return loadedEnv[key]
}

function getSmtpConfig(): SmtpConfig | null {
  const host = getEnvVar('SMTP_HOST')
  const user = getEnvVar('SMTP_USER')
  const pass = getEnvVar('SMTP_PASS')

  if (!host || !user || !pass) {
    console.warn('[SMTP] Not configured. SMTP_HOST:', !!host, 'SMTP_USER:', !!user, 'SMTP_PASS:', !!pass)
    return null
  }

  console.log('[SMTP] Config found for:', user)
  return {
    host,
    port: parseInt(getEnvVar('SMTP_PORT') || '587'),
    user,
    pass,
    from: getEnvVar('SMTP_FROM') || `SINTHA <${user}>`,
  }
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const config = getSmtpConfig()

  if (!config) {
    console.warn('[SMTP] Cannot send email - SMTP not configured')
    return false
  }

  // Create a fresh transporter for each send and close it after
  // This prevents the SMTP connection pool from keeping the Node.js
  // event loop alive, which was causing the Next.js server to crash
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
    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    })
    console.log(`[SMTP] Email sent successfully to ${to}`)
    return true
  } catch (error) {
    console.error('[SMTP] Email send error:', error)
    return false
  } finally {
    // Always close the transporter to free the SMTP connection
    try {
      transporter.close()
      console.log('[SMTP] Transporter closed')
    } catch {
      // Ignore close errors
    }
  }
}

export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null
}
