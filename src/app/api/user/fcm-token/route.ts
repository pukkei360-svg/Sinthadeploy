import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/user/fcm-token
 *
 * Called by the APK's FirebaseMessagingService when it gets/refreshes
 * the FCM registration token. Stores the token on the User record so
 * the backend can send push notifications to that device.
 *
 * Body: { userId, token }
 *
 * The APK calls this on:
 *   - App launch (first token)
 *   - Token refresh (FCM rotates tokens periodically)
 *   - App update (token may change)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, token } = body as { userId: string; token: string };

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'userId and token are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Store the FCM token
    await db.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });

    console.log(`[FCM] Token stored for user ${userId}: ${token.slice(0, 20)}...`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FCM] Token storage error:', error);
    return NextResponse.json(
      { error: 'Failed to store FCM token' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/fcm-token
 *
 * Called by the APK when the user logs out — clears the token so we
 * don't send push notifications to a device where the user has signed out.
 *
 * Body: { userId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });

    console.log(`[FCM] Token cleared for user ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FCM] Token deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to clear FCM token' },
      { status: 500 }
    );
  }
}
