import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

/**
 * GET /api/favorites?clientId=xxx
 *   Returns the client's saved providers (with provider user + profile).
 *
 * POST /api/favorites
 *   Body: { clientId, providerId }
 *   Adds a provider to the client's favorites. Idempotent (unique constraint).
 *
 * DELETE /api/favorites
 *   Body: { clientId, providerId }
 *   Removes a provider from the client's favorites.
 *
 * GET /api/favorites?clientId=xxx&providerId=yyy
 *   Returns { favorited: true|false } — used to render the heart icon state.
 */

export async function GET(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const providerId = searchParams.get('providerId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Single-provider check — used by the heart icon
    if (providerId) {
      const fav = await db.favorite.findUnique({
        where: {
          clientId_providerId: { clientId, providerId },
        },
        select: { id: true },
      }).catch(() => null);
      return NextResponse.json({ favorited: !!fav });
    }

    // List all favorites for the client
    const favorites = await db.favorite.findMany({
      where: { clientId },
      include: {
        provider: {
          select: {
            id: true, name: true, photoUrl: true, phone: true, location: true,
            isVerified: true, isPro: true, proExpiry: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    // Fetch provider profiles in parallel
    const providerIds = favorites.map((f) => f.providerId);
    const profiles = providerIds.length > 0
      ? await db.providerProfile.findMany({
          where: { userId: { in: providerIds } },
          include: { category: true },
        }).catch(() => [])
      : [];

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const result = favorites.map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      provider: f.provider,
      providerProfile: profileMap.get(f.providerId),
    }));

    return NextResponse.json({ favorites: result });
  } catch (error) {
    console.error('[favorites] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const { clientId, providerId } = body as { clientId: string; providerId: string };

    if (!clientId || !providerId) {
      return NextResponse.json({ error: 'clientId and providerId are required' }, { status: 400 });
    }

    // Idempotent — upsert handles the case where it's already favorited
    const favorite = await db.favorite.upsert({
      where: {
        clientId_providerId: { clientId, providerId },
      },
      update: {},
      create: { clientId, providerId },
    }).catch((err) => {
      throw new Error('Favorites table not available: ' + (err instanceof Error ? err.message : String(err)));
    });

    return NextResponse.json({ favorite, favorited: true });
  } catch (error) {
    console.error('[favorites] POST error:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const { clientId, providerId } = body as { clientId: string; providerId: string };

    if (!clientId || !providerId) {
      return NextResponse.json({ error: 'clientId and providerId are required' }, { status: 400 });
    }

    await db.favorite.deleteMany({
      where: { clientId, providerId },
    }).catch(() => {});

    return NextResponse.json({ favorited: false });
  } catch (error) {
    console.error('[favorites] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
