import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('targetId');
    const authorId = searchParams.get('authorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};

    if (targetId) where.targetId = targetId;
    if (authorId) where.authorId = authorId;

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
          target: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
          booking: {
            select: {
              id: true,
              service: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.review.count({ where }),
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, authorId, targetId, rating, comment, photoUrls } = body;

    if (!bookingId || !authorId || !targetId || !rating) {
      return NextResponse.json(
        { error: 'Booking ID, author ID, target ID, and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if booking exists and is completed
    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if review already exists for this booking
    const existingReview = await db.review.findUnique({
      where: { bookingId },
    });
    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already exists for this booking' },
        { status: 409 }
      );
    }

    const review = await db.review.create({
      data: {
        bookingId,
        authorId,
        targetId,
        rating,
        comment: comment || null,
        photoUrls: photoUrls || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
        target: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    });

    // Update provider's average rating and total reviews
    const allReviews = await db.review.findMany({
      where: { targetId },
      select: { rating: true },
    });

    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    const providerProfile = await db.providerProfile.findUnique({
      where: { userId: targetId },
    });

    if (providerProfile) {
      await db.providerProfile.update({
        where: { userId: targetId },
        data: {
          rating: Math.round(avgRating * 10) / 10,
          totalReviews: allReviews.length,
        },
      });
    }

    // Create notification for the reviewed person
    await db.notification.create({
      data: {
        userId: targetId,
        title: 'New Review',
        message: `You received a ${rating}-star review`,
        type: 'review',
        relatedId: review.id,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
