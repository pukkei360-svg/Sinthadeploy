import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { updateFirebasePassword } from '@/lib/firebase-admin';

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token.
 * Body: { token: string, password: string }
 *
 * Updates the password in both:
 * 1. Our local database (for backend login)
 * 2. Firebase Auth (for Firebase login) - if Firebase Admin is configured
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Find the reset token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if token is already used
    if (resetToken.used) {
      return NextResponse.json(
        { error: 'This reset link has already been used. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Get the user to check if they have a Firebase UID
    const user = await db.user.findUnique({
      where: { id: resetToken.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please contact support.' },
        { status: 400 }
      );
    }

    // Hash the new password for our database
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Update the user's password in our database
    await db.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Also update Firebase password if the user has a Firebase UID
    if (user.firebaseUid) {
      try {
        const firebaseUpdated = await updateFirebasePassword(user.firebaseUid, password);
        if (firebaseUpdated) {
          console.log(`[reset-password] Firebase password also updated for ${user.email}`);
        } else {
          console.log(`[reset-password] Firebase Admin not available - only local DB password updated for ${user.email}`);
        }
      } catch (err) {
        console.error('[reset-password] Firebase password update failed:', err);
        // Don't fail the whole reset - our DB password is already updated
      }
    }

    // Mark token as used
    await db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Clean up all expired/used tokens for this user
    await db.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        OR: [{ used: true }, { expiresAt: { lt: new Date() } }],
      },
    });

    return NextResponse.json({
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/reset-password?token=xxx
 * Validate a reset token (check if it's valid and not expired).
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ valid: false, error: 'Invalid reset link' });
    }

    if (resetToken.used) {
      return NextResponse.json({ valid: false, error: 'This reset link has already been used' });
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: 'This reset link has expired' });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}
