import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { sendPushNotification } from '@/lib/push-notification';

/**
 * POST /api/admin/broadcast
 *
 * Sends an in-app notification (bell icon) AND a push notification to
 * a group of users. Used by the admin to make announcements.
 *
 * Body:
 *   { adminId, title, message, targetRole }
 *
 * targetRole: 'all' | 'client' | 'provider' | 'admin'
 *   - 'all'      → every user in the system
 *   - 'client'   → only users with role='client'
 *   - 'provider' → only users with role='provider'
 *   - 'admin'    → only admins
 *
 * Note: For large user bases (>10,000), this should be moved to a
 * background job queue (e.g. BullMQ / Inngest) to avoid request timeouts.
 * For SINTHA's current scale, inline execution is fine.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const { adminId, title, message, targetRole } = body as {
      adminId: string;
      title: string;
      message: string;
      targetRole: string;
    };

    // Validate
    if (!adminId || !title || !message || !targetRole) {
      return NextResponse.json(
        { error: 'adminId, title, message, and targetRole are required' },
        { status: 400 }
      );
    }

    if (title.trim().length < 3) {
      return NextResponse.json(
        { error: 'Title must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (message.trim().length < 5) {
      return NextResponse.json(
        { error: 'Message must be at least 5 characters' },
        { status: 400 }
      );
    }

    // Verify caller is an admin
    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true, name: true },
    });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can send broadcasts' },
        { status: 403 }
      );
    }

    // Build the where clause based on targetRole
    const validRoles = ['all', 'client', 'provider', 'admin'];
    if (!validRoles.includes(targetRole)) {
      return NextResponse.json(
        { error: `Invalid targetRole. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const where = targetRole === 'all' ? {} : { role: targetRole };

    // Fetch the target users (just IDs + FCM tokens)
    // Deduplicate by FCM token — if the same token appears multiple times
    // (from multiple sessions/devices), only send once to prevent duplicates.
    const allUsers = await db.user.findMany({
      where,
      select: { id: true, fcmToken: true },
    });

    // Deduplicate FCM tokens (same device registered under multiple accounts)
    const seenTokens = new Set<string>();
    const users = allUsers.filter(u => {
      if (!u.fcmToken) return true; // keep users without tokens (for in-app notif)
      if (seenTokens.has(u.fcmToken)) return false; // duplicate token — skip
      seenTokens.add(u.fcmToken);
      return true;
    });

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No users matched the target audience.',
      });
    }

    // 1. Create in-app notifications for ALL target users (bulk)
    const broadcastTitle = title.trim();
    const broadcastMsg = message.trim();
    const notificationData = users.map((u) => ({
      userId: u.id,
      title: broadcastTitle,
      message: broadcastMsg,
      type: 'system',
      isRead: false,
      relatedId: null,
    }));

    await db.notification.createMany({ data: notificationData });

    // 2. Send push notifications to all users who have an FCM token
    // We filter out users without a token — they still get the in-app bell
    // notification, just no push to their device.
    let pushSent = 0;
    let pushFailed = 0;

    // Send pushes in parallel (batched to avoid overwhelming FCM)
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((u) =>
          u.fcmToken
            ? sendPushNotification(u.id, broadcastTitle, broadcastMsg, {
                type: 'broadcast',
                fromAdmin: adminId,
              })
            : Promise.resolve(false)
        )
      );
      pushSent += results.filter((r) => r).length;
      pushFailed += results.filter((r) => !r).length;
    }

    console.log(
      `[Broadcast] Admin ${admin.name} sent "${broadcastTitle}" to ${users.length} users (${pushSent} pushed, ${pushFailed} no token)`
    );

    return NextResponse.json({
      success: true,
      sent: users.length,
      pushSent,
      pushSkipped: pushFailed,
      message: `Broadcast sent to ${users.length} user(s). ${pushSent} push notification(s) delivered.`,
    });
  } catch (error) {
    console.error('[Broadcast] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send broadcast' },
      { status: 500 }
    );
  }
}
