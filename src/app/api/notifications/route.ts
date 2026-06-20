import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─────────────────────────────────────────────────────────────
// Stale ₹1 PRO-price notification cleanup
// ─────────────────────────────────────────────────────────────
// PRO subscription price was bumped from ₹1 → ₹199. Old notifications
// created when the price was ₹1 are still in the DB and surface in the
// bell-icon dropdown + notifications list. Rather than rewrite them
// (which leaves confusing "₹199" text in a notification that was
// actually about ₹1), we DELETE them entirely on read — both from the
// response and from the DB. After the first fetch, the row is gone
// and this becomes a no-op. Idempotent.
const STALE_PRICE_PATTERN = /₹1(?![0-9])|Rs\.?\s*1\b|Re\.?\s*1\b/;
const STALE_TITLE_PATTERN = /₹1(?![0-9])/;

function isStaleNotification(n: { title?: string; message?: string }): boolean {
  return (
    STALE_PRICE_PATTERN.test(n.message || '') ||
    STALE_TITLE_PATTERN.test(n.title || '')
  );
}

async function deleteStaleNotifications(
  userId: string,
  notifications: Array<{ id: string; title?: string; message?: string }>
) {
  const staleIds = notifications
    .filter((n) => isStaleNotification(n))
    .map((n) => n.id);

  if (staleIds.length === 0) return notifications;

  // Delete the stale rows (fire-and-forget, errors swallowed — UI still
  // hides them below because we filter them out of the response).
  db.notification
    .deleteMany({ where: { id: { in: staleIds } } })
    .catch((err) => {
      console.error('[cleanup] Failed to delete stale ₹1 notifications:', err);
    });

  // Return only the clean ones to the client
  return notifications.filter((n) => !isStaleNotification(n));
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

    // Delete any stale ₹1 notifications (and return only the clean ones)
    const notifications = await deleteStaleNotifications(userId, rawNotifications as any);

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
