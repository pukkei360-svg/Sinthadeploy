import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

// ─────────────────────────────────────────────────────────────
// GET /api/admin/claims
// List all claims, optionally filtered by status.
//
// Query params:
//   status  — open | investigating | resolved | dismissed  (optional)
//   adminId — required, must be an admin
// ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const adminId = searchParams.get('adminId');

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
        { error: 'Only admins can view claims' },
        { status: 403 }
      );
    }

    const where: Record<string, string> = {};
    if (status && ['open', 'investigating', 'resolved', 'dismissed'].includes(status)) {
      where.status = status;
    }

    const [claims, totalCount, openCount] = await Promise.all([
      db.claim.findMany({
        where,
        orderBy: [
          { status: 'asc' }, // open first, then investigating, etc.
          { createdAt: 'desc' },
        ],
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
              role: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
              role: true,
              isBlocked: true,
              isBanned: true,
            },
          },
        },
      }),
      db.claim.count({ where }),
      db.claim.count({ where: { status: 'open' } }),
    ]);

    return NextResponse.json({
      claims,
      totalCount,
      openCount,
    });
  } catch (error) {
    console.error('Fetch admin claims error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claims' },
      { status: 500 }
    );
  }
}
