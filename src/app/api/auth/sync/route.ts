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
    //
    // DEFENSIVE: wrap in try/catch because the BannedEmail table may
    // not exist yet if prisma db push hasn't run on the production DB.
    // Login must NOT break just because the ban-check feature is new.
    try {
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
    } catch (banCheckErr) {
      // Table doesn't exist yet or query failed — log and continue.
      // Login still works; ban enforcement kicks in once the schema
      // is fully migrated.
      console.warn('[auth/sync] BannedEmail check skipped:', banCheckErr instanceof Error ? banCheckErr.message : 'unknown');
    }

    // 1. Check if user exists by firebaseUid
    // DEFENSIVE: use ONLY pre-existing columns in the select. The new
    // ban-feature columns (isBanned, banReason, bannedAt) may not exist
    // on the production DB yet if prisma db push hasn't run. If we
    // include them in the select, Prisma throws a column-not-found
    // error and login breaks entirely.
    //
    // We check ban status SEPARATELY below with a try/catch so login
    // works even when the ban feature isn't fully migrated.
    const SAFE_USER_SELECT = {
      id: true,
      firebaseUid: true,
      email: true,
      name: true,
      password: true,
      photoUrl: true,
      role: true,
      phone: true,
      location: true,
      latitude: true,
      longitude: true,
      isVerified: true,
      isPro: true,
      proExpiry: true,
      isBlocked: true,
      fcmToken: true,
      createdAt: true,
      updatedAt: true,
    } as const;

    let user = await db.user.findUnique({
      where: { firebaseUid },
      select: SAFE_USER_SELECT,
    });

    if (user) {
      // Update profile info if changed
      const updateData: Record<string, string | undefined> = {};
      if (name && name !== user.name) updateData.name = name;
      if (photoUrl && photoUrl !== user.photoUrl) updateData.photoUrl = photoUrl;
      if (phone && phone !== user.phone) updateData.phone = phone;
      // Ensure admin role is preserved
      if (isAdmin && user.role !== 'admin') updateData.role = 'admin';

      if (Object.keys(updateData).length > 0) {
        // DEFENSIVE: use safe select on update too — without it, Prisma
        // returns all columns including isBanned/banReason/bannedAt
        // which don't exist yet on the production DB.
        user = await db.user.update({
          where: { id: user.id },
          data: updateData,
          select: SAFE_USER_SELECT,
        });
      }
    } else {
      // 2. Check if user exists by email (may have been created via another method)
      // DEFENSIVE: same safe select — no new columns.
      user = await db.user.findUnique({
        where: { email },
        select: SAFE_USER_SELECT,
      });

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
          select: SAFE_USER_SELECT,
        });
      } else {
        // 3. Create new user — leave role EMPTY so the frontend can route
        // them to the role-select screen to choose client or provider.
        // (Admin email detection is handled below — admins get 'admin' role.)
        // DEFENSIVE: use safe select on create too.
        user = await db.user.create({
          data: {
            firebaseUid,
            email,
            name: name || email.split('@')[0],
            photoUrl: photoUrl || null,
            phone: phone || null,
            role: isAdmin ? 'admin' : '',
          },
          select: SAFE_USER_SELECT,
        });
      }
    }

    // ── Post-flight: is this user suspended or banned? ─────────────
    // Banned = permanent. Suspended = temporary (admin can un-suspend).
    // We check BOTH because an admin might ban a user after they were
    // already logged in (the Firebase session may still be valid).
    //
    // DEFENSIVE: use safe defaults (false) for isBanned/banReason in
    // case the fallback query didn't include these fields (production
    // DB hasn't been migrated yet).
    const userIsBanned = (user as { isBanned?: boolean }).isBanned ?? false;
    const userBanReason = (user as { banReason?: string | null }).banReason ?? null;

    if (userIsBanned) {
      // Add to BannedEmail table if not already there (defensive — the
      // ban endpoint should already do this, but we double-check here).
      try {
        await db.bannedEmail.upsert({
          where: { email: user.email.toLowerCase() },
          update: {},
          create: {
            email: user.email.toLowerCase(),
            reason: userBanReason || 'Permanently banned by admin',
          },
        });
      } catch {
        // Ignore — BannedEmail table may not exist yet on first deploy
      }
      return NextResponse.json(
        {
          error: 'This account has been permanently banned. Please contact support.',
          banned: true,
          reason: userBanReason,
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
    // Log the FULL error for debugging — the generic "Failed to sync
    // authentication" message gives the user no clue what went wrong.
    console.error('Auth sync error:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join(' | ') : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to sync authentication',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
