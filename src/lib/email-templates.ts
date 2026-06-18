/**
 * Email templates for SINTHA notifications.
 *
 * Each function returns an HTML email body. Used by src/lib/email.ts
 * to send transactional emails to users.
 *
 * All emails include:
 * - SINTHA branding (gradient header)
 * - Mobile-responsive layout
 * - Clear call-to-action button
 * - Unsubscribe-like footer (link to app)
 */

const SINTHA_URL = 'https://sinthadeploy.vercel.app'
const SINTHA_SUPPORT_EMAIL = 'aicrafts56@gmail.com'

// Base template wrapper — provides the SINTHA-branded email shell
function emailShell(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <title>SINTHA</title>
  <style>
    body { margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #16a34a 100%); padding: 24px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .header p { color: #ffffff; opacity: 0.9; margin: 4px 0 0 0; font-size: 13px; }
    .body { padding: 32px 24px; color: #1f2937; }
    .body h2 { color: #111827; font-size: 20px; margin: 0 0 16px 0; }
    .body p { color: #4b5563; line-height: 1.6; margin: 0 0 12px 0; font-size: 15px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #16a34a 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .info-box strong { color: #0c4a6e; }
    .footer { background: #f9fafb; padding: 20px 24px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
    .footer a { color: #6b7280; text-decoration: none; }
    @media (max-width: 480px) {
      .body { padding: 24px 16px; }
      .cta-button { display: block; text-align: center; }
    }
  </style>
</head>
<body>
  <div style="display:none; max-height:0; overflow:hidden">${previewText}</div>
  <div class="container">
    <div class="header">
      <h1>SINTHA</h1>
      <p>Trusted Hands. Trusted Services.</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>You received this email because you have a SINTHA account.</p>
      <p><a href="${SINTHA_URL}">Visit SINTHA</a> • <a href="mailto:${SINTHA_SUPPORT_EMAIL}">Contact Support</a></p>
      <p style="margin-top: 8px; color: #9ca3af;">© 2026 SINTHA • Manipur, India</p>
    </div>
  </div>
</body>
</html>`
}

export interface BookingEmailData {
  bookingId: string
  service: string
  date: string
  time?: string | null
  address?: string | null
  otherPersonName: string
  otherPersonRole: 'client' | 'provider'
}

export interface ChatMessageEmailData {
  senderName: string
  messagePreview: string  // first ~100 chars of the message
  conversationId: string
}

/**
 * Email sent to PROVIDER when a client books them.
 */
export function bookingConfirmedForProviderHtml(data: BookingEmailData): string {
  const dateStr = new Date(data.date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  return emailShell(`
    <h2>📦 You have a new booking!</h2>
    <p>Great news! <strong>${data.otherPersonName}</strong> just booked your service on SINTHA.</p>
    <div class="info-box">
      <p><strong>Service:</strong> ${data.service}</p>
      <p><strong>Date:</strong> ${dateStr}</p>
      ${data.time ? `<p><strong>Time:</strong> ${data.time}</p>` : ''}
      ${data.address ? `<p><strong>Address:</strong> ${data.address}</p>` : ''}
    </div>
    <p>Open the SINTHA app to view full details and contact the client.</p>
    <a href="${SINTHA_URL}" class="cta-button">Open SINTHA</a>
    <p style="margin-top: 16px; font-size: 13px; color: #6b7280;">💡 Tip: Respond quickly to clients — providers who reply fast get better reviews.</p>
  `, `New booking from ${data.otherPersonName}`)
}

/**
 * Email sent to CLIENT when their booking is confirmed (auto-accepted).
 */
export function bookingConfirmedForClientHtml(data: BookingEmailData): string {
  const dateStr = new Date(data.date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  return emailShell(`
    <h2>✅ Booking Confirmed!</h2>
    <p>Your booking with <strong>${data.otherPersonName}</strong> has been confirmed.</p>
    <div class="info-box">
      <p><strong>Service:</strong> ${data.service}</p>
      <p><strong>Date:</strong> ${dateStr}</p>
      ${data.time ? `<p><strong>Time:</strong> ${data.time}</p>` : ''}
      ${data.address ? `<p><strong>Address:</strong> ${data.address}</p>` : ''}
    </div>
    <p>You can now chat with your provider and coordinate the service.</p>
    <a href="${SINTHA_URL}" class="cta-button">Open SINTHA</a>
    <p style="margin-top: 16px; font-size: 13px; color: #6b7280;">💡 Need to reschedule? Message your provider directly in the app.</p>
  `, `Your booking for ${data.service} is confirmed`)
}

/**
 * Email sent when a user receives a new chat message.
 */
export function newChatMessageHtml(data: ChatMessageEmailData): string {
  return emailShell(`
    <h2>💬 New message from ${data.senderName}</h2>
    <p>You have a new message on SINTHA:</p>
    <div class="info-box">
      <p style="font-style: italic; color: #374151;">"${data.messagePreview}${data.messagePreview.length >= 100 ? '...' : ''}"</p>
    </div>
    <p>Open the app to read and reply.</p>
    <a href="${SINTHA_URL}" class="cta-button">Open SINTHA</a>
    <p style="margin-top: 16px; font-size: 13px; color: #6b7280;">💡 Quick replies build trust with ${data.senderName}.</p>
  `, `${data.senderName} sent you a message`)
}

/**
 * Email sent when a user requests a password reset.
 */
export function passwordResetHtml(resetLink: string, userName: string): string {
  return emailShell(`
    <h2>🔑 Reset your SINTHA password</h2>
    <p>Hi ${userName},</p>
    <p>We received a request to reset your SINTHA password. Click the button below to choose a new password:</p>
    <a href="${resetLink}" class="cta-button">Reset Password</a>
    <p style="font-size: 13px; color: #6b7280;">Or copy this link: ${resetLink}</p>
    <div class="info-box">
      <p><strong>⚠ This link expires in 1 hour.</strong></p>
      <p>If you didn't request a password reset, you can safely ignore this email — your password won't be changed.</p>
    </div>
  `, `Reset your SINTHA password`)
}

/**
 * Email sent when a user activates SINTHA PRO subscription.
 */
export function proActivatedHtml(userName: string, expiryDate: Date): string {
  const dateStr = expiryDate.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  return emailShell(`
    <h2>👑 SINTHA PRO Activated!</h2>
    <p>Welcome to SINTHA PRO, ${userName}! 🎉</p>
    <p>You now have access to premium features:</p>
    <div class="info-box">
      <p>✅ <strong>Featured placement</strong> — appear at the top of search results</p>
      <p>✅ <strong>Verified badge</strong> — build trust with clients</p>
      <p>✅ <strong>Priority support</strong> — faster response from our team</p>
      <p>✅ <strong>Unlimited bookings</strong> — no monthly limits</p>
    </div>
    <p>Your PRO subscription is active until <strong>${dateStr}</strong>.</p>
    <a href="${SINTHA_URL}" class="cta-button">Start Using PRO</a>
  `, `SINTHA PRO is now active!`)
}

/**
 * Email sent 3 days before PRO subscription expires.
 */
export function proExpiringSoonHtml(userName: string, expiryDate: Date): string {
  const dateStr = expiryDate.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  return emailShell(`
    <h2>⏰ Your SINTHA PRO expires soon</h2>
    <p>Hi ${userName},</p>
    <p>Your SINTHA PRO subscription expires in <strong>3 days</strong> (${dateStr}).</p>
    <p>Don't lose your premium features:</p>
    <div class="info-box">
      <p>❌ Featured placement will be disabled</p>
      <p>❌ Verified badge will be removed</p>
      <p>❌ Priority support will end</p>
    </div>
    <p>Renew now to keep all PRO benefits.</p>
    <a href="${SINTHA_URL}" class="cta-button">Renew PRO</a>
  `, `Your SINTHA PRO expires in 3 days`)
}
