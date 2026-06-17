import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * Register route - supports both Firebase-based and traditional registration.
 * For Firebase users, pass firebaseUid, email, name.
 * For traditional users, pass name, email, password.
 * Also supports role update: pass userId + role to update an existing user's role.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, firebaseUid, userId } = body;

    // Role update for existing user
    if (userId && role) {
      const user = await db.user.update({
        where: { id: userId },
        data: { role },
      });
      const { password: _pw, ...userWithoutPassword } = user;
      return NextResponse.json({ user: userWithoutPassword });
    }

    // Firebase-based registration (if user signed up via Firebase but not yet in our DB)
    if (firebaseUid) {
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        );
      }

      // Check if already exists
      let user = await db.user.findUnique({ where: { firebaseUid } });
      if (user) {
        const { password: _pw, ...userWithoutPassword } = user;
        return NextResponse.json({ user: userWithoutPassword, token: firebaseUid });
      }

      // Check by email
      user = await db.user.findUnique({ where: { email } });
      if (user) {
        // Link firebaseUid
        user = await db.user.update({
          where: { id: user.id },
          data: { firebaseUid, name: name || user.name },
        });
        const { password: _pw, ...userWithoutPassword } = user;
        return NextResponse.json({ user: userWithoutPassword, token: firebaseUid });
      }

      // Create new
      user = await db.user.create({
        data: {
          firebaseUid,
          email,
          name: name || email.split('@')[0],
          role: role || 'client',
        },
      });
      const { password: _pw, ...userWithoutPassword } = user;
      return NextResponse.json({ user: userWithoutPassword, token: firebaseUid }, { status: 201 });
    }

    // Traditional registration
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const token = crypto.randomUUID();

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'client',
      },
    });

    const { password: _pw, ...userWithoutPassword } = user;

    return NextResponse.json(
      { user: userWithoutPassword, token },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
