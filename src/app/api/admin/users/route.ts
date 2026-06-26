import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { cascadeDeleteUser } from '@/lib/cascade-delete-user';

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

    // CRITICAL: Send no-store headers so the browser NEVER caches this
    // response. Without this, deleted users reappear in the admin panel
    // because the browser serves a stale cached response on next visit.
    return NextResponse.json(
      { users },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/users
// Bulk-delete ALL non-admin users.
//
// Body: { adminId: string, confirm: "DELETE ALL" }
//   - adminId: must be a user with role='admin'
//   - confirm: must be the exact string "DELETE ALL" (safety check)
//
// This deletes EVERY non-admin user and ALL their related data:
//   - Provider profiles (removes them from the service portal)
//   - Bookings, chat, reviews, jobs, notifications
//   - Favorites, saved addresses, referral earnings
//
// Admin accounts are NEVER deleted.
// Users can sign up again with the same email for a fresh start.
//
// Use this to clear test data before launch.
// ─────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const { adminId, confirm: confirmText } = body as {
      adminId?: string;
      confirm?: string;
    };

    if (!adminId) {
      return NextResponse.json(
        { error: 'adminId is required' },
        { status: 400 }
      );
    }

    // Verify caller is an admin
    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can bulk-delete users' },
        { status: 403 }
      );
    }

    // Safety check: require explicit confirmation string
    if (confirmText !== 'DELETE ALL') {
      return NextResponse.json(
        { error: 'Confirmation required. Send confirm: "DELETE ALL" in the request body.' },
        { status: 400 }
      );
    }

    // Find all non-admin users
    const usersToDelete = await db.user.findMany({
      where: { role: { not: 'admin' } },
      select: { id: true, name: true, email: true, role: true },
    });

    let deletedCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    // Delete each user with full cascade
    for (const user of usersToDelete) {
      try {
        await cascadeDeleteUser(user.id);
        deletedCount++;
      } catch (err) {
        errors.push({
          userId: user.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    console.log(`[bulk-delete] Admin ${adminId} deleted ${deletedCount} of ${usersToDelete.length} users`);

    return NextResponse.json({
      message: `Deleted ${deletedCount} of ${usersToDelete.length} non-admin users`,
      deletedCount,
      totalFound: usersToDelete.length,
      errors: errors.length > 0 ? errors : undefined,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Bulk delete users error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk-delete users — ' + (error as Error).message },
      { status: 500 }
    );
  }
}
