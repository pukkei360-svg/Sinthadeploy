import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * Login route - supports both Firebase UID login and traditional email/password login.
 * For Firebase users, pass firebaseUid in the body.
 * For traditional users, pass email and password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firebaseUid } = body;

    // Firebase UID-based login (used internally for session restoration)
    if (firebaseUid) {
      const user = await db.user.findUnique({ where: { firebaseUid } });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found. Please sign up first.' },
          { status: 404 }
        );
      }
      if (user.isBlocked) {
        return NextResponse.json(
          { error: 'Account is blocked. Please contact support.' },
          { status: 403 }
        );
      }
      const { password: _password, ...userWithoutPassword } = user;
      return NextResponse.json({ user: userWithoutPassword, token: firebaseUid });
    }

    // Traditional email/password login
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const user = await db.user.findUnique({ where: { email } });
    if (!user || user.password !== hashedPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'Account is blocked. Please contact support.' },
        { status: 403 }
      );
    }

    const token = user.firebaseUid || crypto.randomUUID();

    const { password: _pw, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
