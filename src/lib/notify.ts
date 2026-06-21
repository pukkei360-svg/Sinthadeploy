import { db } from '@/lib/db';
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
} from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * notify — creates an in-app notification (bell-icon dropdown) AND sends
 * a Firebase Cloud Messaging push to the user's device (if they have an
 * fcmToken).
 *
 * Signature mirrors Prisma's `db.notification.create({ data: { ... } })`
 * so callers can pass the exact same data shape.
 *
 * Never throws — DB or push failures are logged and swallowed so the
 * calling API route always succeeds even if FCM is unavailable or the
 * user has no device token.
 *
 * Usage:
 *   await notify({ data: { userId, title, message, type, relatedId } })
 */
export async function notify({ data }: {
  data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedId?: string | null;
  };
}) {
  try {
    const notification = await db.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        relatedId: data.relatedId ?? null,
      },
    });

    // Best-effort push — don't let FCM failures break the API route
    await sendPush(data.userId, data.title, data.message, {
      type: data.type,
      relatedId: data.relatedId ?? null,
      notificationId: notification.id,
    }).catch((err) => {
      console.error('[notify] push failed for user', data.userId, err);
    });

    return notification;
  } catch (err) {
    // Notification failures must not break the calling route
    console.error('[notify] failed to create notification:', err);
  }
}

/**
 * notifyMany — bulk version of notify. Creates in-app notifications for
 * many users at once via `createMany`, then sends a push to each user
 * who has an fcmToken.
 *
 * Signature mirrors Prisma's `db.notification.createMany({ data: [...] })`.
 *
 * Usage:
 *   await notifyMany({ data: [{ userId, title, message, type, relatedId }] })
 */
export async function notifyMany({ data }: {
  data: Array<{
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedId?: string | null;
  }>;
}) {
  if (!data || data.length === 0) return { count: 0 };

  try {
    const result = await db.notification.createMany({
      data: data.map((d) => ({
        userId: d.userId,
        title: d.title,
        message: d.message,
        type: d.type,
        relatedId: d.relatedId ?? null,
      })),
    });

    // Best-effort pushes in parallel (each is independently catch-guarded)
    await Promise.all(
      data.map((d) =>
        sendPush(d.userId, d.title, d.message, {
          type: d.type,
          relatedId: d.relatedId ?? null,
        }).catch((err) => {
          console.error('[notifyMany] push failed for user', d.userId, err);
        })
      )
    );

    return result;
  } catch (err) {
    console.error('[notifyMany] failed:', err);
    return { count: 0 };
  }
}

/**
 * Send a single FCM push. Looks up the user's fcmToken from the DB.
 * No-op if the user has no token or Firebase Admin isn't initialized.
 * Never throws — all errors are caught and logged.
 */
async function sendPush(
  userId: string,
  title: string,
  message: string,
  extra: Record<string, string | null>
): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    if (!user?.fcmToken) return;

    const app = getAdminApp();
    if (!app) return;

    // FCM data payload values must be strings
    const payloadData: Record<string, string> = {};
    for (const [k, v] of Object.entries(extra)) {
      payloadData[k] = v == null ? '' : String(v);
    }

    await getMessaging(app).send({
      token: user.fcmToken,
      notification: { title, body: message },
      data: payloadData,
      android: { priority: 'high' },
    });
  } catch (err) {
    console.error('[notify] sendPush error:', err);
  }
}

/**
 * Get the Firebase Admin app, initializing it if needed. Reuses any
 * existing app (e.g. one created by src/lib/firebase-admin.ts) so we
 * never double-initialize. Returns null if Firebase Admin can't be
 * initialized (e.g. missing service account) — in which case pushes
 * are silently skipped but in-app notifications still work.
 */
function getAdminApp(): App | null {
  try {
    if (getApps().length > 0) return getApps()[0]!;

    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountStr) {
      const serviceAccount = JSON.parse(serviceAccountStr);
      return initializeApp({
        credential: cert(serviceAccount),
      });
    }

    return initializeApp({
      credential: applicationDefault(),
    });
  } catch (error) {
    console.warn('[notify] Firebase Admin not available:', (error as Error).message);
    return null;
  }
}
