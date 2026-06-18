import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const providerId = searchParams.get('providerId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {};

    if (clientId) where.clientId = clientId;
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where,
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
          providerProfile: {
            include: {
              category: true,
            },
          },
          review: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      providerId,
      service,
      description,
      date,
      time,
      address,
    } = body;

    if (!clientId || !providerId || !service || !date) {
      return NextResponse.json(
        { error: 'Client ID, provider ID, service, and date are required' },
        { status: 400 }
      );
    }

    const booking = await db.booking.create({
      data: {
        clientId,
        providerId,
        service,
        description: description || null,
        date: new Date(date),
        time: time || null,
        address: address || null,
        status: 'accepted',
      },
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
        providerProfile: {
          include: {
            category: true,
          },
        },
      },
    });

    // Create notification for provider (auto-accepted)
    await db.notification.create({
      data: {
        userId: providerId,
        title: 'New Booking',
        message: `You have a new booking for ${service}`,
        type: 'booking',
        relatedId: booking.id,
      },
    });

    // Create notification for client (auto-accepted)
    await db.notification.create({
      data: {
        userId: clientId,
        title: 'Booking Confirmed',
        message: `Your booking for ${service} has been confirmed. You can contact the provider now.`,
        type: 'booking',
        relatedId: booking.id,
      },
    });

    // Send email notifications (async — don't block the response)
    // We fetch emails and send in parallel with the response going back immediately.
    setImmediate(async () => {
      try {
        const { sendEmail } = await import('@/lib/email')
        const {
          bookingConfirmedForProviderHtml,
          bookingConfirmedForClientHtml,
        } = await import('@/lib/email-templates')

        const bookingEmailData = {
          bookingId: booking.id,
          service,
          date,
          time,
          address,
          // Populated below
          otherPersonName: '',
          otherPersonRole: 'client' as const,
        }

        // Email the PROVIDER that they have a new booking
        if (booking.provider?.email && booking.provider.email !== 'undefined') {
          const providerEmail = booking.provider.email
          const providerHtml = bookingConfirmedForProviderHtml({
            ...bookingEmailData,
            otherPersonName: booking.client?.name || 'A client',
            otherPersonRole: 'client',
          })
          sendEmail({
            to: providerEmail,
            subject: `📦 New booking from ${booking.client?.name || 'a client'} — ${service}`,
            html: providerHtml,
          }).catch((err) => console.error('[Email] Provider booking email failed:', err))
        }

        // Email the CLIENT that their booking is confirmed
        if (booking.client?.email && booking.client.email !== 'undefined') {
          const clientEmail = booking.client.email
          const clientHtml = bookingConfirmedForClientHtml({
            ...bookingEmailData,
            otherPersonName: booking.provider?.name || 'Your provider',
            otherPersonRole: 'provider',
          })
          sendEmail({
            to: clientEmail,
            subject: `✅ Booking confirmed — ${service} with ${booking.provider?.name || 'provider'}`,
            html: clientHtml,
          }).catch((err) => console.error('[Email] Client booking email failed:', err))
        }
      } catch (emailErr) {
        console.error('[Email] Booking notification emails failed:', emailErr)
      }
    })

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
