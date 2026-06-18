import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Google Sign-In sync route.
 * Called after Firebase Google Sign-In to sync user data.
 * Expects: { firebaseUid, name, email, photoUrl }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUid, name, email, photoUrl } = body;

    if (!firebaseUid || !email) {
      return NextResponse.json(
        { error: 'Firebase UID and email are required' },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await db.user.findUnique({ where: { firebaseUid } });

    if (user) {
      // Update existing user with latest Google data
      const updateData: Record<string, string | undefined> = {};
      if (name && name !== user.name) updateData.name = name;
      if (photoUrl && photoUrl !== user.photoUrl) updateData.photoUrl = photoUrl;

      if (Object.keys(updateData).length > 0) {
        user = await db.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    } else {
      // Check by email (may exist without firebaseUid)
      user = await db.user.findUnique({ where: { email } });

      if (user) {
        // Link Firebase UID to existing account
        user = await db.user.update({
          where: { id: user.id },
          data: {
            firebaseUid,
            photoUrl: photoUrl || user.photoUrl,
            name: name || user.name,
          },
        });
      } else {
        // Create new user from Google data — leave role empty so the
        // frontend can route them to the role-select screen to choose
        // whether they're a client or provider.
        user = await db.user.create({
          data: {
            firebaseUid,
            email,
            name: name || email.split('@')[0],
            photoUrl: photoUrl || null,
            role: '',
          },
        });
      }
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'Account is blocked. Please contact support.' },
        { status: 403 }
      );
    }

    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword, token: firebaseUid });
  } catch (error) {
    console.error('Google sign-in sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Google sign-in' },
      { status: 500 }
    );
  }
}
