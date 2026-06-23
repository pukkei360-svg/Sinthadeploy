import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

/**
 * GET /api/config
 *
 * Returns public app configuration (e.g. proPrice).
 * No auth required — this is used by the SinthaProScreen to display
 * the current PRO subscription price.
 *
 * The admin can change proPrice at any time via PUT /api/admin/config.
 */
export async function GET() {
  try {
    await ensureSchemaMigrated();

    // Fetch all config entries (they're all public — no secrets here)
    const configs = await db.appConfig.findMany().catch(() => []);

    const result: Record<string, string> = {};
    for (const c of configs) {
      result[c.key] = c.value;
    }

    // Default proPrice to 199 if the table is empty / not migrated yet
    if (!result.proPrice) {
      result.proPrice = '199';
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[config] GET error:', error);
    // Always return a default so the frontend never breaks
    return NextResponse.json({ proPrice: '199' });
  }
}
