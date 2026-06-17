import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { sendEmail, isSmtpConfigured } from '@/lib/email';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Helper to read env vars from .env file (needed for standalone mode)
function getEnvVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];

  const possiblePaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(__dirname, '../../.env'),
    resolve(__dirname, '../../../.env'),
  ];

  for (const envPath of possiblePaths) {
    try {
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const k = match[1].trim();
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (k === key) return value;
          }
        }
      }
    } catch { /* try next path */ }
  }
  return undefined;
}

/**
 * POST /api/auth/forgot-password
 * Request a password reset email.
 * Body: { email: string }
 *
 * - Finds the user by email
 * - Generates a secure reset token (expires in 1 hour)
 * - Sends a professional branded reset email via SMTP (goes to inbox, not spam)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json({
        message: 'If an account with this email exists, a reset link has been sent.',
      });
    }

    // Check if SMTP is configured
    const smtpReady = isSmtpConfigured();

    if (!smtpReady) {
      console.error('[forgot-password] SMTP is not configured! Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
      return NextResponse.json(
        { error: 'Email service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Invalidate any existing unused tokens for this user
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    // Build the reset URL - use the request origin as primary source,
    // fall back to NEXT_PUBLIC_APP_URL env var, then localhost
    const requestOrigin = request.headers.get('origin') || request.nextUrl.origin;
    const appUrl = requestOrigin || getEnvVar('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';
    console.log(`[forgot-password] App URL: ${appUrl} (origin: ${requestOrigin})`);
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    // Send the branded email
    const emailSent = await sendEmail({
      to: user.email,
      subject: 'SINTHA - Reset Your Password',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb, #10b981); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: 2px;">SINTHA</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Your Trusted Service Marketplace</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 24px;">
            <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 12px;">Hello, ${user.name}!</h2>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              We received a request to reset your SINTHA account password. Click the button below to create a new password:
            </p>

            <!-- Reset Button -->
            <div style="text-align: center; margin: 0 0 24px;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #10b981); color: white; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; letter-spacing: 0.5px;">
                Reset Password
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0 0 16px;">
              Or copy and paste this link in your browser:<br/>
              <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
            </p>

            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
              <p style="color: #92400e; font-size: 13px; margin: 0;">
                <strong>Note:</strong> This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f3f4f6; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} SINTHA — Empowering Service Providers in Manipur<br/>
              This is an automated email. Please do not reply.
            </p>
          </div>
        </div>
      `,
    });

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      );
    }

    console.log(`[forgot-password] Reset email sent to ${user.email}`);
    return NextResponse.json({
      message: 'If an account with this email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request. Please try again later.' },
      { status: 500 }
    );
  }
}
