import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
