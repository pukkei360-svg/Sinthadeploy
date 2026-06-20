import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─────────────────────────────────────────────────────────────
// POST /api/admin/cleanup-pro-data
// ─────────────────────────────────────────────────────────────
// One-time cleanup endpoint that wipes ALL traces of the old ₹1 PRO
// subscription pricing so we can start fresh at ₹199.
//
// What it does (idempotent — safe to run multiple times):
//   1. Finds every Subscription record where amount <= 1 (₹1 test payments).
//   2. For every user who currently has isPro=true AND whose most recent
//      subscription was a ₹1 test payment, REVOKES their PRO status
//      (sets isPro=false, proExpiry=null). They'll need to re-subscribe
//      at ₹199.
//   3. Deletes ALL Subscription records where amount <= 1.
//   4. Deletes ALL Notification records whose message or title mentions
//      ₹1 / Rs 1 / Re 1 (covers the "Upgrade to PRO for ₹1/month" reminder
//      that the auth/sync route created for every provider on login).
//   5. Returns a summary so the admin can verify what was cleaned.
//
// Auth: caller must supply `adminId` in the body, and the corresponding
// user must have role='admin'. This is a destructive operation — we
// don't want it callable by anyone who knows the URL.

const STALE_PRICE_REGEX = /₹1(?![0-9])|Rs\.?\s*1\b|Re\.?\s*1\b/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId } = body;

    if (!adminId) {
      return NextResponse.json(
        { error: 'adminId is required' },
        { status: 400 }
      );
    }

    // Verify caller is an admin
    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can perform cleanup' },
        { status: 403 }
      );
    }

    // ── Step 1: Find ₹1 subscriptions ────────────────────────────
    // amount is stored in rupees (see create-order/route.ts: `amount / 100`).
    // ₹1 = 1.0 in the DB. We treat anything <= 1 as a stale test payment.
    const staleSubs = await db.subscription.findMany({
      where: { amount: { lte: 1 } },
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        endDate: true,
      },
    });

    // ── Step 2: Revoke PRO for users whose PRO came from a ₹1 sub ──
    // A user "currently has PRO from a ₹1 test" if:
    //   • isPro = true
    //   • proExpiry is in the future
    //   • they have at least one ₹1 subscription
    const staleUserIds = Array.from(new Set(staleSubs.map((s) => s.userId)));
    const usersToRevoke = await db.user.findMany({
      where: {
        id: { in: staleUserIds },
        isPro: true,
        proExpiry: { gt: new Date() },
      },
      select: { id: true, name: true, email: true },
    });

    if (usersToRevoke.length > 0) {
      await db.user.updateMany({
        where: { id: { in: usersToRevoke.map((u) => u.id) } },
        data: {
          isPro: false,
          proExpiry: null,
        },
      });
    }

    // ── Step 3: Delete all ₹1 subscription records ───────────────
    const deletedSubs = await db.subscription.deleteMany({
      where: { amount: { lte: 1 } },
    });

    // ── Step 4: Delete all notifications mentioning ₹1 ───────────
    // Prisma's `contains` is case-sensitive by default; the ₹ symbol is
    // the same case-wise so that's fine. We fetch+filter in JS because
    // Prisma doesn't support regex matching in `where`.
    const allProNotifs = await db.notification.findMany({
      where: {
        OR: [
          { type: 'pro' },
          { title: { contains: 'PRO' } },
          { title: { contains: 'pro' } },
          { message: { contains: 'PRO' } },
          { message: { contains: '₹' } },
        ],
      },
      select: { id: true, title: true, message: true },
    });
    const staleNotifIds = allProNotifs
      .filter(
        (n) =>
          STALE_PRICE_REGEX.test(n.title || '') ||
          STALE_PRICE_REGEX.test(n.message || '')
      )
      .map((n) => n.id);

    let deletedNotifsCount = 0;
    if (staleNotifIds.length > 0) {
      const result = await db.notification.deleteMany({
        where: { id: { in: staleNotifIds } },
      });
      deletedNotifsCount = result.count;
    }

    // ── Step 5: Return summary ───────────────────────────────────
    return NextResponse.json({
      success: true,
      summary: {
        staleSubscriptionsFound: staleSubs.length,
        subscriptionsDeleted: deletedSubs.count,
        usersProRevoked: usersToRevoke.length,
        revokedUsers: usersToRevoke.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        })),
        staleNotificationsDeleted: deletedNotifsCount,
      },
    });
  } catch (error) {
    console.error('[admin/cleanup-pro-data] Error:', error);
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET — return a dry-run preview of what would be cleaned.
// Useful for the admin to verify before pressing the destructive button.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json(
        { error: 'adminId query param is required' },
        { status: 400 }
      );
    }

    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can preview cleanup' },
        { status: 403 }
      );
    }

    const staleSubs = await db.subscription.findMany({
      where: { amount: { lte: 1 } },
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        endDate: true,
      },
      take: 50,
    });

    const staleUserIds = Array.from(new Set(staleSubs.map((s) => s.userId)));
    const usersToRevoke = await db.user.findMany({
      where: {
        id: { in: staleUserIds },
        isPro: true,
        proExpiry: { gt: new Date() },
      },
      select: { id: true, name: true, email: true },
    });

    const allProNotifs = await db.notification.findMany({
      where: {
        OR: [
          { type: 'pro' },
          { title: { contains: 'PRO' } },
          { title: { contains: 'pro' } },
          { message: { contains: 'PRO' } },
          { message: { contains: '₹' } },
        ],
      },
      select: { id: true, title: true, message: true },
    });
    const staleNotifCount = allProNotifs.filter(
      (n) =>
        STALE_PRICE_REGEX.test(n.title || '') ||
        STALE_PRICE_REGEX.test(n.message || '')
    ).length;

    const totalSubs = await db.subscription.count();

    return NextResponse.json({
      preview: true,
      wouldDelete: {
        staleSubscriptions: staleSubs.length,
        revokeProForUsers: usersToRevoke.length,
        usersWhoWouldLosePro: usersToRevoke,
        staleNotifications: staleNotifCount,
      },
      totals: {
        totalSubscriptions: totalSubs,
      },
    });
  } catch (error) {
    console.error('[admin/cleanup-pro-data] Preview error:', error);
    return NextResponse.json(
      { error: 'Preview failed' },
      { status: 500 }
    );
  }
}
