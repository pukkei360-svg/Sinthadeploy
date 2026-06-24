import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

/**
 * GET /api/referrals?userId=xxx
 *
 * Returns the user's referral code + earnings summary + list of referred users.
 *
 * Response:
 *   {
 *     referralCode: "SIN7K4XQ",
 *     totalEarnings: 59.70,
 *     pendingEarnings: 59.70,
 *     paidEarnings: 0,
 *     referralCount: 3,
 *     proReferralCount: 1,   // how many referred users have bought PRO
 *     referrals: [
 *       { name, email, joinedAt, hasPro, earnedAmount }
 *     ]
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Single query — get user with name + referralCode + referredBy
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        referralCode: true,
        referredBy: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Auto-generate a referral code if the user doesn't have one yet.
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = generateReferralCode(user.name || 'USER');
      try {
        await db.user.update({
          where: { id: userId },
          data: { referralCode },
        });
      } catch {
        referralCode = generateReferralCode(user.name || 'USER', 4);
        try {
          await db.user.update({
            where: { id: userId },
            data: { referralCode },
          });
        } catch {}
      }
    }

    // Run referred users + earnings queries IN PARALLEL (was sequential)
    const [referredUsers, earnings] = await Promise.all([
      db.user.findMany({
        where: { referredBy: referralCode },
        select: { id: true, name: true, isPro: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      db.referralEarning.findMany({
        where: { referrerId: userId },
        select: { id: true, amount: true, status: true, createdAt: true, referredUserId: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ]);

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
    const pendingEarnings = earnings
      .filter((e) => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);
    const paidEarnings = earnings
      .filter((e) => e.status === 'paid')
      .reduce((sum, e) => sum + e.amount, 0);

    // Build the referrals list with earned amounts
    const earningsByReferred = new Map<string, number>();
    for (const e of earnings) {
      const current = earningsByReferred.get(e.referredUserId) || 0;
      earningsByReferred.set(e.referredUserId, current + e.amount);
    }

    const referrals = referredUsers.map((u) => ({
      name: u.name,
      joinedAt: u.createdAt.toISOString(),
      hasPro: u.isPro,
      earnedAmount: earningsByReferred.get(u.id) || 0,
    }));

    const proReferralCount = referredUsers.filter((u) => u.isPro).length;

    return NextResponse.json({
      referralCode,
      referredBy: user.referredBy,
      totalEarnings,
      pendingEarnings,
      paidEarnings,
      referralCount: referredUsers.length,
      proReferralCount,
      referrals,
    });
  } catch (error) {
    console.error('[referrals] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
  }
}

/**
 * Generate a referral code based on the user's name.
 *
 * Format: first part of the user's name (uppercase, alphanumeric only) +
 * a few random chars for uniqueness.
 *
 * Examples:
 *   "Irabot Laishram" → "IRABOT7K"
 *   "Sunita"          → "SUNITA3X"
 *   "R.K. Sharma"     → "RKSHARM2A"
 *
 * @param name         The user's display name
 * @param randomChars  Number of random chars to append (default 2, more for collision retry)
 */
function generateReferralCode(name: string, randomChars: number = 2): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars (0/O, 1/I)

  // Clean the name: uppercase, remove non-alphanumeric, collapse spaces
  const cleaned = (name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  // Ensure at least 3 chars from the name; pad with random if too short
  let namePart = cleaned;
  while (namePart.length < 3) {
    namePart += chars[Math.floor(Math.random() * chars.length)];
  }

  // Append random chars for uniqueness
  let suffix = '';
  for (let i = 0; i < randomChars; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }

  return namePart + suffix;
}
