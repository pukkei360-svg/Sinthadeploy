import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { notify } from '@/lib/notify';

/**
 * POST /api/bookings/[id]/reschedule
 *
 * Body: { newDate, newTime?, requestedBy }
 *   - newDate: ISO date string (required)
 *   - newTime: optional time string like "14:30"
 *   - requestedBy: 'client' | 'provider' — who initiated the reschedule
 *
 * Updates the booking's date/time, stores the previous values in
 * rescheduledFrom / rescheduledAt, and notifies the other party.
 *
 * The booking stays in its current status — reschedule doesn't change
 * accepted/in_progress state, just the scheduled time.
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;
    const body = await request.json();
    const { newDate, newTime, requestedBy } = body as {
      newDate: string;
      newTime?: string;
      requestedBy: 'client' | 'provider';
    };

    if (!newDate || !requestedBy) {
      return NextResponse.json(
        { error: 'newDate and requestedBy are required' },
        { status: 400 }
      );
    }

    const existing = await db.booking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Don't allow rescheduling cancelled or completed bookings
    if (existing.status === 'cancelled' || existing.status === 'completed') {
      return NextResponse.json(
        { error: `Cannot reschedule a ${existing.status} booking` },
        { status: 400 }
      );
    }

    // Store the previous date/time as ISO strings for the audit trail
    const previousDate = existing.date.toISOString();
    const previousTime = existing.time || '';

    // Update the booking
    const booking = await db.booking.update({
      where: { id },
      data: {
        date: new Date(newDate),
        time: newTime || existing.time,
        rescheduledFrom: JSON.stringify({ date: previousDate, time: previousTime }),
        rescheduledAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        provider: { select: { id: true, name: true, phone: true } },
      },
    });

    // Notify the other party about the reschedule
    const recipientId = requestedBy === 'client' ? existing.providerId : existing.clientId;
    const requesterName = requestedBy === 'client' ? booking.client?.name : booking.provider?.name;

    const formattedDate = new Date(newDate).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
    const formattedTime = newTime ? ` at ${newTime}` : '';

    await notify({
      data: {
        userId: recipientId,
        title: '📅 Booking Rescheduled',
        message: `${requesterName} rescheduled "${existing.service}" to ${formattedDate}${formattedTime}.`,
        type: 'booking',
        relatedId: existing.id,
      },
    });

    console.log(`[reschedule] Booking ${id} rescheduled by ${requestedBy}: ${previousDate} → ${newDate}`);

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('[reschedule] error:', error);
    return NextResponse.json({ error: 'Failed to reschedule booking' }, { status: 500 });
  }
}
