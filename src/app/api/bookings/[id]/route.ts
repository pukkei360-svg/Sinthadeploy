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
    const { status } = body;

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

    const existing = await db.booking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = await db.booking.update({
      where: { id },
      data: { status },
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
      await notify({
        data: {
          userId: existing.providerId,
          title: 'Booking Cancelled',
          message: `Booking for ${existing.service} has been cancelled`,
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
