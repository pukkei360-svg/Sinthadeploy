import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // DEFENSIVE: Only select columns that existed BEFORE the ban-feature
    // schema change. The new columns (isBanned, banReason, bannedAt) and
    // new relations (claimsFiled, claimsAgainst) may not exist on the
    // production DB if prisma db push hasn't run. Including them in the
    // select would throw a Prisma error and break the entire admin
    // users list.
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        role: true,
        phone: true,
        location: true,
        isVerified: true,
        isPro: true,
        proExpiry: true,
        isBlocked: true,
        createdAt: true,
        _count: {
          select: {
            bookingsAsClient: true,
            bookingsAsProvider: true,
            reviewsGiven: true,
            reviewsReceived: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
