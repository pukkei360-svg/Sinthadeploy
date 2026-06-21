/**
 * Push Notification Utility
 *
 * Sends push notifications to users' devices via Firebase Cloud Messaging (FCM).
 *
 * The flow:
 *   1. APK registers with FCM → gets a token → sends it to /api/user/fcm-token
 *   2. We store the token on the User record (fcmToken field)
 *   3. When something happens (booking, quote, message, etc.), we call
 *      sendPushNotification(userId, title, body) → it fetches the user's
 *      FCM token → sends a message via Firebase Admin SDK → FCM delivers
 *      it to the APK → APK shows a native notification
 *
 * Requirements:
 *   - FIREBASE_SERVICE_ACCOUNT env var must be set (JSON service account key
 *     from Firebase Console → Project Settings → Service Accounts → Generate
 *     New Private Key)
 *   - The user must have an fcmToken stored (APK must have registered)
 */

import { db } from '@/lib/db';
import { getAdminApp } from '@/lib/firebase-admin';

interface PushNotificationPayload {
  title: string;
  body: string;
  // Optional: data payload (received by the APK even when app is in background)
  data?: Record<string, string>;
  // Optional: URL to open when notification is tapped
  clickAction?: string;
}

/**
 * Send a push notification to a single user.
 *
 * @param userId   The user to send to (must have an fcmToken)
 * @param title    Notification title
 * @param body     Notification body text
 * @param data     Optional data payload (key-value pairs)
 *
 * Returns true if sent (or silently skipped if no token), false on error.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    // Fetch the user's FCM token
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user || !user.fcmToken) {
      // No FCM token — user hasn't registered their device yet.
      // This is NOT an error — the in-app notification (bell icon) still works.
      return false;
    }

    const app = getAdminApp();
    if (!app) {
      console.warn('[Push] Firebase Admin not available — skipping push notification');
      return false;
    }

    const messaging = app.messaging();

    // Build the FCM message
    const message: FirebaseAdminMessage = {
      token: user.fcmToken,
      notification: {
        title,
        body,
      },
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
    };

    // Send via FCM
    const messageId = await messaging.send(message);
    console.log(`[Push] Sent to user ${userId}: "${title}" (messageId: ${messageId})`);
    return true;
  } catch (error) {
    // Don't let push notification failures break the main operation.
    // The in-app notification (bell icon) still works regardless.
    console.warn('[Push] Failed to send:', error instanceof Error ? error.message : 'unknown error');
    return false;
  }
}

/**
 * Send push notifications to multiple users (e.g. notify all admins).
 *
 * @param userIds  Array of user IDs to send to
 * @param title    Notification title
 * @param body     Notification body text
 * @param data     Optional data payload
 */
export async function sendPushNotificationToMany(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  // Send to each user individually (batch send would be more efficient,
  // but individual sends are more reliable and easier to debug)
  await Promise.all(
    userIds.map((userId) => sendPushNotification(userId, title, body, data))
  );
}

// Type for the FCM message (matches firebase-admin's Message interface
// but defined locally to avoid importing the full type)
interface FirebaseAdminMessage {
  token: string;
  notification: { title: string; body: string };
  data: Record<string, string>;
  android: {
    priority: 'high' | 'normal';
    notification: {
      channelId?: string;
      priority: 'high' | 'default' | 'low' | 'min';
      defaultSound?: boolean;
      defaultVibrateTimings?: boolean;
    };
  };
}
