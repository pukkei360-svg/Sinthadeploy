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

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
