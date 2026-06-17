import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const provider = await db.providerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            phone: true,
            location: true,
            latitude: true,
            longitude: true,
            isVerified: true,
            isPro: true,
            createdAt: true,
          },
        },
        category: true,
        bookings: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Fetch provider error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
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
      categoryId,
      experience,
      skills,
      description,
      hourlyRate,
      availability,
      portfolioUrls,
      isFeatured,
    } = body;

    const existing = await db.providerProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const provider = await db.providerProfile.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId }),
        ...(experience !== undefined && { experience }),
        ...(skills !== undefined && { skills }),
        ...(description !== undefined && { description }),
        ...(hourlyRate !== undefined && { hourlyRate }),
        ...(availability !== undefined && { availability }),
        ...(portfolioUrls !== undefined && { portfolioUrls }),
        ...(isFeatured !== undefined && { isFeatured }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            location: true,
          },
        },
        category: true,
      },
    });

    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Update provider error:', error);
    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.providerProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    await db.providerProfile.delete({ where: { id } });

    // Update user role back to client
    await db.user.update({
      where: { id: existing.userId },
      data: { role: 'client' },
    });

    return NextResponse.json({ message: 'Provider profile deleted successfully' });
  } catch (error) {
    console.error('Delete provider error:', error);
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    );
  }
}
