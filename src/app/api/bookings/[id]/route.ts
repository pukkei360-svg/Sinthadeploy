import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notify } from '@/lib/notify';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            phone: true,
            location: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            phone: true,
            location: true,
          },
        },
        providerProfile: {
          include: {
            category: true,
          },
        },
        review: true,
      },
    }).catch(async (err) => {
      // Phase 2 columns might not exist yet — fall back to a query
      // that doesn't reference them. The migration runs in parallel
      // and will have them ready by the next request.
      console.warn('[bookings/get] Fallback query (Phase 2 columns missing?):', err instanceof Error ? err.message : err);
      return db.booking.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true, email: true, photoUrl: true, phone: true, location: true } },
          provider: { select: { id: true, name: true, email: true, photoUrl: true, phone: true, location: true } },
          providerProfile: { include: { category: true } },
          review: true,
        },
      });
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Fetch booking error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      status,
      cancelReason,        // string — required when status='cancelled'
      cancelledBy,         // 'client' | 'provider'
      price,               // number — set when status='completed'
      beforePhotos,        // string (JSON array of URLs) — set when status='in_progress'
      afterPhotos,         // string (JSON array of URLs) — set when status='completed'
    } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['accepted', 'in_progress', 'completed', 'cancelled', 'disputed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build the update data — only include fields relevant to this status.
    // This keeps the booking update atomic and avoids overwriting unrelated
    // fields when the client only wants to change the status.
    const updateData: Record<string, unknown> = { status };
    if (status === 'cancelled') {
      if (cancelReason) updateData.cancelReason = cancelReason;
      if (cancelledBy) updateData.cancelledBy = cancelledBy;
    }
    if (status === 'in_progress' && beforePhotos) {
      updateData.beforePhotos = beforePhotos;
    }
    if (status === 'completed') {
      if (typeof price === 'number' && price >= 0) updateData.price = price;
      if (afterPhotos) updateData.afterPhotos = afterPhotos;
    }

    const existing = await db.booking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = await db.booking.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            phone: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            phone: true,
          },
        },
        providerProfile: true,
      },
    });

    // Create notification for the relevant party
    if (status === 'accepted') {
      await notify({
        data: {
          userId: existing.clientId,
          title: 'Booking Accepted',
          message: `Your booking for ${existing.service} has been accepted`,
          type: 'booking',
          relatedId: existing.id,
        },
      });
    } else if (status === 'completed') {
      await notify({
        data: {
          userId: existing.clientId,
          title: 'Booking Completed',
          message: `Your booking for ${existing.service} has been completed. Please leave a review!`,
          type: 'review',
          relatedId: existing.id,
        },
      });

      // Feature 3: Predictive maintenance reminder — drives repeat bookings.
      // Sent immediately on completion so the client can re-book the same
      // provider with one tap. (We can't schedule notifications in the DB,
      // so an instant nudge is the pragmatic alternative to a 30-day timer.)
      await notify({
        data: {
          userId: existing.clientId,
          title: '✅ Service Complete!',
          message: `Need ${existing.service} again? Book the same provider with one tap on SINTHA!`,
          type: 'system',
          relatedId: existing.id,
        },
      });

      // Update provider's total bookings
      await db.providerProfile.update({
        where: { userId: existing.providerId },
        data: { totalBookings: { increment: 1 } },
      });
    } else if (status === 'cancelled') {
      // Notify the OTHER party (not the one who cancelled).
      // The cancelledBy field tells us who initiated; notify the other.
      const recipientId = cancelledBy === 'client' ? existing.providerId
                        : cancelledBy === 'provider' ? existing.clientId
                        : existing.providerId;  // default: notify provider

      const cancelledByName = cancelledBy === 'client'
        ? booking.client?.name
        : cancelledBy === 'provider'
        ? booking.provider?.name
        : 'The other party';

      const reasonText = cancelReason ? ` Reason: ${cancelReason}` : '';
      await notify({
        data: {
          userId: recipientId,
          title: '❌ Booking Cancelled',
          message: `${cancelledByName} cancelled the booking for ${existing.service}.${reasonText}`,
          type: 'booking',
          relatedId: existing.id,
        },
      });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}
