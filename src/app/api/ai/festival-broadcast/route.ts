import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

/**
 * POST /api/ai/festival-broadcast
 *
 * Checks if today (or the next few days) is a festival relevant to Manipur.
 * If yes, AI generates a festive broadcast message and sends it to all users
 * via the existing broadcast endpoint.
 *
 * This can be called:
 *   - Manually by admin (Admin Dashboard → "Send Festival Greeting")
 *   - Automatically by a cron job / scheduled task (when set up)
 *
 * Body: { adminId: string, dryRun?: boolean }
 *   - adminId: required, must be an admin
 *   - dryRun: if true, returns the generated message without sending it
 *
 * The AI knows about Manipur's major festivals:
 *   - Yaoshang (Holi) — March
 *   - Ningol Chakouba — October/November
 *   - Kang (Rath Yatra) — June/July
 *   - Cheiraoba (New Year) — March/April
 *   - Lui-Ngai-Ni — February
 *   - Gaan-Ngai — December/January
 *   - Christmas — December 25
 *   - Diwali — October/November
 *   - Eid — varies
 *   - Republic Day — January 26
 *   - Independence Day — August 15
 */

// Major Manipur/India festivals with approximate dates (month-day)
// The AI also checks dynamically since many festivals follow lunar calendars.
const KNOWN_FESTIVALS: Array<{ name: string; month: number; day: number; greeting: string }> = [
  { name: 'Republic Day', month: 1, day: 26, greeting: 'Happy Republic Day' },
  { name: 'Lui-Ngai-Ni', month: 2, day: 15, greeting: 'Happy Lui-Ngai-Ni' },
  { name: 'Cheiraoba (Manipuri New Year)', month: 4, day: 9, greeting: 'Happy Cheiraoba' },
  { name: 'Independence Day', month: 8, day: 15, greeting: 'Happy Independence Day' },
  { name: 'Christmas', month: 12, day: 25, greeting: 'Merry Christmas' },
  { name: 'New Year', month: 1, day: 1, greeting: 'Happy New Year' },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, dryRun } = body;

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    // Verify admin
    let isAdmin = false;
    try {
      const { db } = await import('@/lib/db');
      const admin = await db.user.findUnique({
        where: { id: adminId },
        select: { id: true, role: true },
      });
      isAdmin = admin?.role === 'admin';
    } catch {}

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can send broadcasts' }, { status: 403 });
    }

    // Check today's date against known festivals
    const now = new Date();
    const todayMonth = now.getMonth() + 1; // 1-12
    const todayDay = now.getDate();

    // Check if today (or within 3 days) matches a known festival
    let matchedFestival = null;
    for (const f of KNOWN_FESTIVALS) {
      if (f.month === todayMonth && Math.abs(f.day - todayDay) <= 3) {
        matchedFestival = f;
        break;
      }
    }

    // Also ask AI if there's a Manipur festival today (lunar calendar festivals)
    const systemPrompt = `You are SINTHA's AI festival assistant. Check if today's date (${now.toDateString()}) is near any major Manipur or Indian festival (including lunar calendar festivals like Yaoshang, Ningol Chakouba, Kang, Diwali, Eid, etc.).

Return ONLY valid JSON (no markdown):
{
  "isFestival": true/false,
  "festivalName": "<name or empty>",
  "greeting": "<festive greeting or empty>",
  "message": "<2-3 sentence festive message for SINTHA users, mentioning the festival and wishing them well. Include a subtle mention of SINTHA's services if relevant.>",
  "offerSuggestion": "<optional: a special offer idea, e.g. 'PRO at 20% off this festive season' or empty>"
}

If no festival is near today, return isFestival: false with empty fields.`;

    const result = await callAI({
      systemPrompt,
      messages: [{ role: 'user', content: `Today is ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Is there a Manipur or Indian festival today or within 3 days?` }],
      maxTokens: 400,
      temperature: 0.5,
    });

    let festivalData: any = { isFestival: false };
    if (result.success) {
      try {
        festivalData = JSON.parse(result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      } catch {}
    }

    // If AI didn't find a festival but our static list did, use the static one
    if (!festivalData.isFestival && matchedFestival) {
      festivalData = {
        isFestival: true,
        festivalName: matchedFestival.name,
        greeting: matchedFestival.greeting,
        message: `${matchedFestival.greeting} from all of us at SINTHA! May this ${matchedFestival.name} bring joy, prosperity, and success to you and your family. Celebrate safely and don't forget — trusted local services are just a tap away on SINTHA.`,
        offerSuggestion: '',
      };
    }

    if (!festivalData.isFestival) {
      return NextResponse.json({
        isFestival: false,
        message: 'No festival detected today. Try again on a festive day, or send a custom broadcast from Admin → Broadcast.',
        poweredBy: 'SINTHA AI',
      });
    }

    // Build the broadcast message
    const broadcastTitle = `🎉 ${festivalData.greeting || 'Festive Greetings'}!`;
    let broadcastMessage = festivalData.message;
    if (festivalData.offerSuggestion) {
      broadcastMessage += `\n\n🎁 Special Offer: ${festivalData.offerSuggestion}`;
    }

    // If dry run, return the message without sending
    if (dryRun) {
      return NextResponse.json({
        isFestival: true,
        festivalName: festivalData.festivalName,
        title: broadcastTitle,
        message: broadcastMessage,
        dryRun: true,
        poweredBy: 'SINTHA AI',
      });
    }

    // Send the broadcast to all users
    let sentCount = 0;
    let pushSent = 0;
    try {
      const { db } = await import('@/lib/db');
      const { notify } = await import('@/lib/notify');

      const users = await db.user.findMany({
        where: { isBlocked: false, isBanned: false },
        select: { id: true, fcmToken: true },
      });

      // Create in-app notifications for all users (bulk)
      const notificationData = users.map((u) => ({
        userId: u.id,
        title: broadcastTitle,
        message: broadcastMessage,
        type: 'system',
        isRead: false,
        relatedId: null,
      }));

      await db.notification.createMany({ data: notificationData });
      sentCount = users.length;

      // Send push notifications to users with FCM tokens
      const { sendPushNotification } = await import('@/lib/push-notification');
      const usersWithTokens = users.filter((u) => u.fcmToken);
      for (const u of usersWithTokens) {
        try {
          await sendPushNotification(u.id, broadcastTitle, broadcastMessage, { type: 'festival' });
          pushSent++;
        } catch {}
      }
    } catch (dbErr) {
      console.error('[festival-broadcast] DB error:', dbErr);
    }

    return NextResponse.json({
      isFestival: true,
      festivalName: festivalData.festivalName,
      title: broadcastTitle,
      message: broadcastMessage,
      sent: sentCount,
      pushSent,
      poweredBy: 'SINTHA AI',
    });
  } catch (error) {
    console.error('[festival-broadcast] error:', error);
    return NextResponse.json({ error: 'Failed to send festival broadcast' }, { status: 500 });
  }
}
