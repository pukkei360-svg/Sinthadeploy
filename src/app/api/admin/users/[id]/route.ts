import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/users/[id]
// ─────────────────────────────────────────────────────────────
// Generic field update (kept for backward compat with the existing
// AdminUsersScreen). Use PATCH for the dedicated suspend/ban actions.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isBlocked, role, name, phone, location, isPro, proExpiry } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Safety: never let an admin suspend/ban themselves or another admin.
    if (existing.role === 'admin' && (isBlocked !== undefined || body.isBanned !== undefined)) {
      return NextResponse.json(
        { error: 'Cannot suspend or ban admin accounts' },
        { status: 403 }
      );
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(isBlocked !== undefined && { isBlocked }),
        ...(role !== undefined && { role }),
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(location !== undefined && { location }),
        ...(isPro !== undefined && { isPro }),
        ...(proExpiry !== undefined && { proExpiry: proExpiry ? new Date(proExpiry) : null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        isPro: true,
        isBlocked: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/users/[id]
// Dedicated suspend / ban / unban / reactivate actions.
// Body shape: { action: 'suspend' | 'unsuspend' | 'ban' | 'unban' | 'reject', reason?, adminId? }
// ─────────────────────────────────────────────────────────────
//
// suspend  → isBlocked = true                       (temporary, reversible)
// unsuspend→ isBlocked = false                      (restore access)
// ban      → isBanned = true + isBlocked = true + add email to BannedEmail
//            (permanent — user can never log in again, even with new account)
// unban    → isBanned = false + isBlocked = false + remove from BannedEmail
//            (forgive a previously banned user)
// reject   → same as ban, but also DELETE the user row.
//            The email stays in BannedEmail so they can't re-register.
//            Use this for fake/spam accounts.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure isBanned/banReason/bannedAt columns + BannedEmail table exist
    // before we try to ban/suspend a user.
    await ensureSchemaMigrated();

    const { id } = await params;
    const body = await request.json();
    const { action, reason, adminId } = body as {
      action: 'suspend' | 'unsuspend' | 'ban' | 'unban' | 'reject';
      reason?: string;
      adminId?: string;
    };

    if (!action || !['suspend', 'unsuspend', 'ban', 'unban', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: suspend, unsuspend, ban, unban, reject' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Safety: never let an admin suspend/ban/reject themselves or another admin
    if (existing.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot modify admin accounts' },
        { status: 403 }
      );
    }

    const now = new Date();
    const reasonText = reason || `Action: ${action} (no reason provided)`;

    switch (action) {
      case 'suspend': {
        const user = await db.user.update({
          where: { id },
          data: { isBlocked: true },
          select: USER_SELECT,
        });
        return NextResponse.json({ user, action: 'suspended' });
      }

      case 'unsuspend': {
        const user = await db.user.update({
          where: { id },
          data: { isBlocked: false },
          select: USER_SELECT,
        });
        return NextResponse.json({ user, action: 'unsuspended' });
      }

      case 'ban': {
        // 1. Mark the user as banned
        const user = await db.user.update({
          where: { id },
          data: {
            isBanned: true,
            isBlocked: true, // also block in case isBanned check is bypassed
            banReason: reasonText,
            bannedAt: now,
          },
          select: USER_SELECT,
        });

        // 2. Add their email to the BannedEmail blacklist
        try {
          await db.bannedEmail.upsert({
            where: { email: existing.email.toLowerCase() },
            update: { reason: reasonText, bannedBy: adminId || null, bannedAt: now },
            create: {
              email: existing.email.toLowerCase(),
              reason: reasonText,
              bannedBy: adminId || null,
            },
          });
        } catch {
          // BannedEmail table may not exist yet — log but don't fail
          console.warn('[ban] Could not add to BannedEmail table');
        }

        return NextResponse.json({ user, action: 'banned' });
      }

      case 'unban': {
        const user = await db.user.update({
          where: { id },
          data: {
            isBanned: false,
            isBlocked: false,
            banReason: null,
            bannedAt: null,
          },
          select: USER_SELECT,
        });

        // Remove from BannedEmail blacklist
        try {
          await db.bannedEmail.deleteMany({
            where: { email: existing.email.toLowerCase() },
          });
        } catch {
          // Ignore
        }

        return NextResponse.json({ user, action: 'unbanned' });
      }

      case 'reject': {
        // Permanent ban + delete the user. Their email stays in BannedEmail
        // so they can't re-register. This is the nuclear option for
        // fake/spam/fraud accounts.

        // 1. Add to BannedEmail FIRST (before deleting the user)
        try {
          await db.bannedEmail.upsert({
            where: { email: existing.email.toLowerCase() },
            update: { reason: reasonText, bannedBy: adminId || null, bannedAt: now },
            create: {
              email: existing.email.toLowerCase(),
              reason: reasonText,
              bannedBy: adminId || null,
            },
          });
        } catch {
          console.warn('[reject] Could not add to BannedEmail table');
        }

        // 2. Cascade-delete all related records (same as DELETE endpoint)
        await db.passwordResetToken.deleteMany({ where: { userId: id } });
        await db.subscription.deleteMany({ where: { userId: id } });
        await db.verificationDoc.deleteMany({ where: { userId: id } });
        await db.notification.deleteMany({ where: { userId: id } });
        await db.review.deleteMany({ where: { authorId: id } });
        await db.chatMessage.deleteMany({ where: { senderId: id } });
        await db.chatConversation.deleteMany({
          where: { OR: [{ participantA: id }, { participantB: id }] },
        });
        await db.booking.deleteMany({
          where: { OR: [{ clientId: id }, { providerId: id }] },
        });
        await db.review.deleteMany({ where: { targetId: id } });
        await db.claim.deleteMany({
          where: { OR: [{ reporterId: id }, { subjectId: id }] },
        });
        await db.providerProfile.deleteMany({ where: { userId: id } });

        // 3. Finally — delete the user
        await db.user.delete({ where: { id } });

        return NextResponse.json({
          action: 'rejected',
          message: 'User permanently rejected and email banned',
          bannedEmail: existing.email.toLowerCase(),
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Patch user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user — ' + (error as Error).message },
      { status: 500 }
    );
  }
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  location: true,
  photoUrl: true,
  role: true,
  isVerified: true,
  isPro: true,
  isBlocked: true,
  isBanned: true,
  banReason: true,
  bannedAt: true,
  firebaseUid: true,
  createdAt: true,
} as const;

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/users/[id]
// Hard-delete a user (cascade). Kept for backward compat.
// For "reject with email ban" use PATCH with action='reject'.
// ─────────────────────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting admin accounts
    if (existing.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin accounts' },
        { status: 403 }
      );
    }

    // Cascade-delete all related records (foreign key constraints)
    await db.passwordResetToken.deleteMany({ where: { userId: id } });
    await db.subscription.deleteMany({ where: { userId: id } });
    await db.verificationDoc.deleteMany({ where: { userId: id } });
    await db.notification.deleteMany({ where: { userId: id } });
    await db.review.deleteMany({ where: { authorId: id } });
    await db.chatMessage.deleteMany({ where: { senderId: id } });
    await db.chatConversation.deleteMany({
      where: { OR: [{ participantA: id }, { participantB: id }] },
    });
    await db.booking.deleteMany({
      where: { OR: [{ clientId: id }, { providerId: id }] },
    });
    await db.review.deleteMany({ where: { targetId: id } });
    await db.claim.deleteMany({
      where: { OR: [{ reporterId: id }, { subjectId: id }] },
    });
    await db.providerProfile.deleteMany({ where: { userId: id } });

    // Finally — delete the user
    await db.user.delete({ where: { id } });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user — ' + (error as Error).message },
      { status: 500 }
    );
  }
}
