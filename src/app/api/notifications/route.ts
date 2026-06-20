import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─────────────────────────────────────────────────────────────
// One-time price migration
// ─────────────────────────────────────────────────────────────
// PRO subscription price was bumped from ₹1 → ₹199. Old
// notifications sitting in the DB still mention ₹1, and they
// surface in the bell-icon dropdown and the notifications list.
// Rather than run a manual DB migration, we transparently rewrite
// any stale ₹1 reference to ₹199 on read, AND persist the fix back
// to the DB so subsequent reads skip the rewrite. Idempotent —
// after the first read, the row is clean and this becomes a no-op.
const STALE_PRICE_PATTERN = /₹1(?![0-9])|Rs\.?\s*1\b|Re\.?\s*1\b/;
const STALE_TITLE_PATTERN = /₹1(?![0-9])/;

function rewritePrice(text: string): string {
  return text
    .replace(/₹1(?![0-9])/g, '₹199')
    .replace(/Rs\.?\s*1\b/g, '₹199')
    .replace(/Re\.?\s*1\b/g, '₹199');
}

async function migrateStalePrices(notifications: Array<{
  id: string;
  title: string;
  message: string;
  [k: string]: unknown;
}>) {
  const stale = notifications.filter(
    (n) =>
      STALE_PRICE_PATTERN.test(n.message || '') ||
      STALE_TITLE_PATTERN.test(n.title || '')
  );
  if (stale.length === 0) return notifications;

  // Rewrite in DB (fire-and-forget, errors swallowed — display still works)
  await Promise.all(
    stale.map((n) =>
      db.notification
        .update({
          where: { id: n.id },
          data: {
            message: rewritePrice(n.message || ''),
            title: rewritePrice(n.title || ''),
          },
        })
        .catch(() => {
          // Ignore — read still returns the rewritten version below.
        })
    )
  );

  // Return the rewritten versions to the client immediately
  return notifications.map((n) =>
    STALE_PRICE_PATTERN.test(n.message || '') || STALE_TITLE_PATTERN.test(n.title || '')
      ? { ...n, message: rewritePrice(n.message || ''), title: rewritePrice(n.title || '') }
      : n
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const where: Record<string, string | boolean> = { userId };
    if (unreadOnly) where.isRead = false;

    const [rawNotifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.notification.count({ where }),
    ]);

    // Rewrite any stale ₹1 → ₹199 (and persist the fix in the background)
    const notifications = await migrateStalePrices(rawNotifications as any);

    const unreadCount = await db.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, type, relatedId } = body;

    if (!userId || !title || !message || !type) {
      return NextResponse.json(
        { error: 'User ID, title, message, and type are required' },
        { status: 400 }
      );
    }

    const validTypes = ['booking', 'chat', 'review', 'system', 'pro'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const notification = await db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        relatedId: relatedId || null,
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PATCH — mark a notification as read (or all as read)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, userId, markAllAsRead } = body;

    if (markAllAsRead && userId) {
      // Mark all notifications for a user as read
      const result = await db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({
        message: `${result.count} notifications marked as read`,
        count: result.count,
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required (or set markAllAsRead=true with userId)' },
        { status: 400 }
      );
    }

    const notification = await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
