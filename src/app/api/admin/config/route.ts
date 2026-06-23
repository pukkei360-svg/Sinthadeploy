import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

/**
 * PUT /api/admin/config
 *
 * Updates an app configuration value. Currently used for proPrice.
 *
 * Body: { adminId, key, value }
 *   - adminId: must be a user with role='admin'
 *   - key: the config key (e.g. 'proPrice')
 *   - value: the new value as a string (e.g. '299')
 *
 * Returns the updated config.
 */
export async function PUT(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const { adminId, key, value } = body as {
      adminId: string;
      key: string;
      value: string;
    };

    if (!adminId || !key || !value) {
      return NextResponse.json(
        { error: 'adminId, key, and value are required' },
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
        { error: 'Only admins can update config' },
        { status: 403 }
      );
    }

    // Validate proPrice specifically (must be a positive number)
    if (key === 'proPrice') {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 1 || numValue > 100000) {
        return NextResponse.json(
          { error: 'proPrice must be a number between ₹1 and ₹100,000' },
          { status: 400 }
        );
      }
    }

    // Upsert the config value
    const config = await db.appConfig.upsert({
      where: { key },
      update: {
        value: value.toString(),
        updatedBy: adminId,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: value.toString(),
        updatedBy: adminId,
      },
    });

    console.log(`[admin/config] Admin ${adminId} updated ${key} = ${value}`);

    return NextResponse.json({ config });
  } catch (error) {
    console.error('[admin/config] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/config?adminId=xxx
 *
 * Returns all config entries (for the admin dashboard view).
 * Requires admin role.
 */
export async function GET(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can view config' },
        { status: 403 }
      );
    }

    const configs = await db.appConfig.findMany().catch(() => []);

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('[admin/config] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}
