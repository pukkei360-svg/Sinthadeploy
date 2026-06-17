import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Admin email — anyone who signs in with this email gets admin role
const ADMIN_EMAIL = 'sintha37@sintha.app';

/**
 * Sync a Firebase-authenticated user to our database.
 * Called after successful Firebase authentication (email/password).
 * - If user exists by firebaseUid → return existing user
 * - If user exists by email → link firebaseUid to existing account
 * - If user doesn't exist → create new user
 * - Auto-assigns admin role for the admin email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUid, email, name, photoUrl, phone } = body;

    if (!firebaseUid || !email) {
      return NextResponse.json(
        { error: 'Firebase UID and email are required' },
        { status: 400 }
      );
    }

    // Determine if this is an admin login
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL;

    // 1. Check if user exists by firebaseUid
    let user = await db.user.findUnique({ where: { firebaseUid } });

    if (user) {
      // Update profile info if changed
      const updateData: Record<string, string | undefined> = {};
      if (name && name !== user.name) updateData.name = name;
      if (photoUrl && photoUrl !== user.photoUrl) updateData.photoUrl = photoUrl;
      if (phone && phone !== user.phone) updateData.phone = phone;
      // Ensure admin role is preserved
      if (isAdmin && user.role !== 'admin') updateData.role = 'admin';

      if (Object.keys(updateData).length > 0) {
        user = await db.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    } else {
      // 2. Check if user exists by email (may have been created via another method)
      user = await db.user.findUnique({ where: { email } });

      if (user) {
        // Link Firebase UID to existing account
        const updateData: Record<string, string | null | undefined> = {
          firebaseUid,
          photoUrl: photoUrl || user.photoUrl,
          name: name || user.name,
        };
        // Save phone number if provided and not already set
        if (phone && !user.phone) updateData.phone = phone;
        // Ensure admin role
        if (isAdmin && user.role !== 'admin') updateData.role = 'admin';

        user = await db.user.update({
          where: { id: user.id },
          data: updateData,
        });
      } else {
        // 3. Create new user — leave role EMPTY so the frontend can route
        // them to the role-select screen to choose client or provider.
        // (Admin email detection is handled below — admins get 'admin' role.)
        user = await db.user.create({
          data: {
            firebaseUid,
            email,
            name: name || email.split('@')[0],
            photoUrl: photoUrl || null,
            phone: phone || null,
            role: isAdmin ? 'admin' : '',
          },
        });
      }
    }

    // Check if blocked
    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'Account is blocked. Please contact support.' },
        { status: 403 }
      );
    }

    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword, token: firebaseUid });
  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync authentication' },
      { status: 500 }
    );
  }
}
