import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

/**
 * GET /api/addresses?clientId=xxx
 *   Returns the client's saved addresses.
 *
 * POST /api/addresses
 *   Body: { clientId, label, address, latitude?, longitude? }
 *   Creates a new saved address.
 *
 * PUT /api/addresses
 *   Body: { id, label?, address?, latitude?, longitude? }
 *   Updates an existing saved address.
 *
 * DELETE /api/addresses
 *   Body: { id }
 *   Deletes a saved address.
 */

export async function GET(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const addresses = await db.savedAddress.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('[addresses] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const { clientId, label, address, latitude, longitude } = body as {
      clientId: string;
      label: string;
      address: string;
      latitude?: number;
      longitude?: number;
    };

    if (!clientId || !label || !address) {
      return NextResponse.json({ error: 'clientId, label, and address are required' }, { status: 400 });
    }

    const savedAddress = await db.savedAddress.create({
      data: { clientId, label: label.trim(), address: address.trim(), latitude, longitude },
    }).catch((err) => {
      throw new Error('SavedAddress table not available: ' + (err instanceof Error ? err.message : String(err)));
    });

    return NextResponse.json({ address: savedAddress });
  } catch (error) {
    console.error('[addresses] POST error:', error);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const { id, label, address, latitude, longitude } = body as {
      id: string;
      label?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    };

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (label) updateData.label = label.trim();
    if (address) updateData.address = address.trim();
    if (typeof latitude === 'number') updateData.latitude = latitude;
    if (typeof longitude === 'number') updateData.longitude = longitude;

    const updated = await db.savedAddress.update({
      where: { id },
      data: updateData,
    }).catch(() => null);

    if (!updated) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    return NextResponse.json({ address: updated });
  } catch (error) {
    console.error('[addresses] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const { id } = body as { id: string };

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.savedAddress.delete({ where: { id } }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[addresses] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
