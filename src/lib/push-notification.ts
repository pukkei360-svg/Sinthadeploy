/**
 * Push Notification Utility
 *
 * Sends push notifications to users' devices via Firebase Cloud Messaging (FCM).
 * Uses getAdminApp() from firebase-admin.ts which handles initialization
 * with the FIREBASE_SERVICE_ACCOUNT env var.
 */

import { db } from '@/lib/db';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * Send a push notification to a single user.
 * Returns true if sent, false if no token or error.
 * Never throws — push failures are silently logged.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user || !user.fcmToken) return false;

    const app = getAdminApp();
    if (!app) return false;

    await app.messaging().send({
      token: user.fcmToken,
      notification: { title, body },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'sintha_notifications',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
    });

    return true;
  } catch (error) {
    console.warn('[Push] Failed:', error instanceof Error ? error.message : 'unknown');
    return false;
  }
}

/**
 * Send push notifications to multiple users in parallel.
 */
export async function sendPushNotificationToMany(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  await Promise.all(
    userIds.map((userId) => sendPushNotification(userId, title, body, data))
  );
}
