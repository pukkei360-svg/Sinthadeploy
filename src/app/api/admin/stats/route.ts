import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [
      totalUsers,
      totalProviders,
      totalBookings,
      totalCategories,
      totalReviews,
      pendingVerifications,
      proUsers,
      recentBookings,
    ] = await Promise.all([
      db.user.count(),
      db.providerProfile.count(),
      db.booking.count(),
      db.serviceCategory.count({ where: { isActive: true } }),
      db.review.count(),
      db.verificationDoc.count({ where: { status: 'pending' } }),
      db.user.count({ where: { isPro: true } }),
      db.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { name: true } },
          provider: { select: { name: true } },
        },
      }),
    ]);

    // Bookings by status
    const bookingsByStatus = await db.booking.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const statusCounts: Record<string, number> = {};
    bookingsByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.status;
    });

    // Total revenue from subscriptions
    const subscriptionRevenue = await db.subscription.aggregate({
      _sum: { amount: true },
      where: { status: 'active' },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalProviders,
        totalBookings,
        totalCategories,
        totalReviews,
        pendingVerifications,
        proUsers,
        revenue: subscriptionRevenue._sum.amount || 0,
        bookingsByStatus: statusCounts,
      },
      recentBookings,
    });
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
