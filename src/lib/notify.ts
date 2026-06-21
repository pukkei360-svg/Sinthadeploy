/**
 * Notification helper — wraps db.notification.create / createMany to
 * ALSO send push notifications via FCM.
 *
 * Designed to be a drop-in replacement:
 *   - db.notification.create  → notify   (same signature: { data: { ... } })
 *   - db.notification.createMany → notifyMany (same signature: { data: [...] })
 *
 * So the only change needed in API routes is:
 *   import { notify, notifyMany } from '@/lib/notify';
 *   await notify({ data: { ... } });        // was: db.notification.create({ data: { ... } })
 *   await notifyMany({ data: [...] });       // was: db.notification.createMany({ data: [...] })
 */

import { db } from '@/lib/db';
import { sendPushNotification, sendPushNotificationToMany } from '@/lib/push-notification';

// Prisma-compatible types
interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead?: boolean;
  relatedId?: string | null;
}

interface CreateInput {
  data: NotificationData;
}

interface CreateManyInput {
  data: NotificationData[];
}

/**
 * Create an in-app notification AND send a push notification.
 * Same signature as db.notification.create({ data: { ... } }).
 */
export async function notify(input: CreateInput) {
  // 1. Create in-app notification (bell icon)
  const notification = await db.notification.create({
    data: input.data,
  });

  // 2. Send push notification (silently fails if no FCM token)
  await sendPushNotification(
    input.data.userId,
    input.data.title,
    input.data.message,
    input.data.relatedId
      ? { relatedId: input.data.relatedId, type: input.data.type }
      : { type: input.data.type }
  );

  return notification;
}

/**
 * Create multiple in-app notifications AND send push to all recipients.
 * Same signature as db.notification.createMany({ data: [...] }).
 */
export async function notifyMany(input: CreateManyInput) {
  // 1. Create all in-app notifications in bulk
  const result = await db.notification.createMany({
    data: input.data,
  });

  // 2. Send push notifications to all unique users
  const uniqueUserIds = [...new Set(input.data.map((n) => n.userId))];
  if (uniqueUserIds.length > 0 && input.data.length > 0) {
    const first = input.data[0];
    await sendPushNotificationToMany(
      uniqueUserIds,
      first.title,
      first.message,
      first.relatedId ? { relatedId: first.relatedId, type: first.type } : { type: first.type }
    );
  }

  return result;
}
