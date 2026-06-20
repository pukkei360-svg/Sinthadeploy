import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

export async function GET() {
  try {
    await ensureSchemaMigrated();

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
        isBanned: true,
        banReason: true,
        bannedAt: true,
        createdAt: true,
        _count: {
          select: {
            bookingsAsClient: true,
            bookingsAsProvider: true,
            reviewsGiven: true,
            reviewsReceived: true,
            claimsFiled: true,
            claimsAgainst: true,
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
