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

    // ── Pre-flight: is this email banned? ─────────────────────────
    // Even before looking up the user, check the BannedEmail table.
    // This catches the case where an admin banned+deleted a user, but
    // the user tries to re-register with the same email.
    const bannedRecord = await db.bannedEmail.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (bannedRecord) {
      return NextResponse.json(
        {
          error: 'This account has been permanently banned. Please contact support.',
          banned: true,
          reason: bannedRecord.reason,
        },
        { status: 403 }
      );
    }

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

    // ── Post-flight: is this user suspended or banned? ─────────────
    // Banned = permanent. Suspended = temporary (admin can un-suspend).
    // We check BOTH because an admin might ban a user after they were
    // already logged in (the Firebase session may still be valid).
    if (user.isBanned) {
      // Add to BannedEmail table if not already there (defensive — the
      // ban endpoint should already do this, but we double-check here).
      try {
        await db.bannedEmail.upsert({
          where: { email: user.email.toLowerCase() },
          update: {},
          create: {
            email: user.email.toLowerCase(),
            reason: user.banReason || 'Permanently banned by admin',
          },
        });
      } catch {
        // Ignore — BannedEmail table may not exist yet on first deploy
      }
      return NextResponse.json(
        {
          error: 'This account has been permanently banned. Please contact support.',
          banned: true,
          reason: user.banReason,
        },
        { status: 403 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        {
          error: 'Your account has been temporarily suspended. Please contact support.',
          suspended: true,
        },
        { status: 403 }
      );
    }

    const { password: _password, ...userWithoutPassword } = user;

    // ─────────────────────────────────────────────────────────────
    // Monthly PRO reminder for non-PRO providers
    // ─────────────────────────────────────────────────────────────
    // When a provider logs in, check if they've received a PRO
    // reminder notification in the last 30 days. If not, create one.
    // This replaces a cron job (Vercel free tier doesn't support cron).
    // The notification appears as a red number on the Bell icon.
    if (
      user.role === 'provider' &&
      !user.isPro
    ) {
      try {
        // Check if we already sent a PRO reminder in the last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const existingReminder = await db.notification.findFirst({
          where: {
            userId: user.id,
            type: 'pro',
            createdAt: { gt: thirtyDaysAgo },
          },
        });

        if (!existingReminder) {
          // Create a PRO reminder notification
          await db.notification.create({
            data: {
              userId: user.id,
              title: '👑 Upgrade to SINTHA PRO',
              message: 'Get higher search ranking, a PRO badge, and homepage visibility for just ₹199/month. Boost your bookings today!',
              type: 'pro',
              isRead: false,
            },
          });
          console.log(`[PRO Reminder] Created monthly reminder for provider: ${user.email}`);
        }
      } catch (reminderErr) {
        // Don't fail the login if notification creation fails
        console.error('[PRO Reminder] Failed to create reminder:', reminderErr);
      }
    }

    return NextResponse.json({ user: userWithoutPassword, token: firebaseUid });
  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync authentication' },
      { status: 500 }
    );
  }
}
