import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

/**
 * GET /api/provider/earnings?providerId=xxx
 *
 * Returns the provider's earnings summary:
 *   - totalEarnings: sum of `price` across all completed bookings with a price
 *   - totalBookings: count of completed bookings
 *   - paidBookings: count of completed bookings with a non-null price
 *   - unpaidBookings: count of completed bookings with no price set
 *   - thisMonthEarnings: sum of price for completed bookings this month
 *   - thisMonthBookings: count of completed bookings this month
 *   - avgRating: from providerProfile.rating
 *   - hourlyRate: from providerProfile.hourlyRate
 *
 * Used by the provider dashboard's "Earnings Overview" card.
 */

export async function GET(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json({ error: 'providerId is required' }, { status: 400 });
    }

    // All completed bookings for this provider
    const completedBookings = await db.booking.findMany({
      where: { providerId, status: 'completed' },
      select: {
        id: true,
        price: true,
        createdAt: true,
        updatedAt: true,
        service: true,
      },
    }).catch(() => []);

    const totalEarnings = completedBookings.reduce(
      (sum, b) => sum + (typeof b.price === 'number' ? b.price : 0),
      0
    );

    const paidBookings = completedBookings.filter((b) => typeof b.price === 'number' && b.price > 0).length;
    const unpaidBookings = completedBookings.length - paidBookings;

    // This month's earnings
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthBookings = completedBookings.filter((b) => {
      const date = b.updatedAt || b.createdAt;
      return date >= startOfMonth;
    });
    const thisMonthEarnings = thisMonthBookings.reduce(
      (sum, b) => sum + (typeof b.price === 'number' ? b.price : 0),
      0
    );

    // Get provider profile for rating + hourlyRate
    const profile = await db.providerProfile.findUnique({
      where: { userId: providerId },
      select: { rating: true, hourlyRate: true, totalReviews: true },
    }).catch(() => null);

    // Last 5 completed bookings (for the earnings breakdown list)
    const recentCompleted = completedBookings
      .slice()
      .sort((a, b) => {
        const aDate = a.updatedAt || a.createdAt;
        const bDate = b.updatedAt || b.createdAt;
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, 5)
      .map((b) => ({
        id: b.id,
        service: b.service,
        price: b.price,
        date: (b.updatedAt || b.createdAt).toISOString(),
      }));

    return NextResponse.json({
      totalEarnings,
      totalBookings: completedBookings.length,
      paidBookings,
      unpaidBookings,
      thisMonthEarnings,
      thisMonthBookings: thisMonthBookings.length,
      avgRating: profile?.rating || 0,
      totalReviews: profile?.totalReviews || 0,
      hourlyRate: profile?.hourlyRate || 0,
      recentCompleted,
    });
  } catch (error) {
    console.error('[provider/earnings] error:', error);
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 });
  }
}
