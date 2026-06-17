import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.ProviderProfileWhereInput = {};

    if (category) {
      where.categoryId = category;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { skills: { contains: search } },
        { description: { contains: search } },
        { experience: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }

    const orderBy: Prisma.ProviderProfileOrderByWithRelationInput = {};
    if (sort === 'rating') {
      orderBy.rating = 'desc';
    } else if (sort === 'reviews') {
      orderBy.totalReviews = 'desc';
    } else if (sort === 'bookings') {
      orderBy.totalBookings = 'desc';
    } else if (sort === 'featured') {
      orderBy.isFeatured = 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [providers, total] = await Promise.all([
      db.providerProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
              location: true,
              latitude: true,
              longitude: true,
              isVerified: true,
              isPro: true,
            },
          },
          category: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.providerProfile.count({ where }),
    ]);

    return NextResponse.json({
      providers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, {
      headers: {
        // Cache provider lists for 2 min on browser, 10 min on CDN.
        // Providers don't change often, and stale-while-revalidate
        // serves cached data instantly while fetching fresh in background.
        'Cache-Control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Fetch providers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      categoryId,
      experience,
      skills,
      description,
      hourlyRate,
      portfolioUrls,
    } = body;

    if (!userId || !categoryId) {
      return NextResponse.json(
        { error: 'User ID and category ID are required' },
        { status: 400 }
      );
    }

    // Check if user already has a provider profile
    const existing = await db.providerProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      // Update existing profile
      const profile = await db.providerProfile.update({
        where: { userId },
        data: {
          categoryId,
          experience: experience || null,
          skills: skills || null,
          description: description || null,
          hourlyRate: hourlyRate || null,
          portfolioUrls: portfolioUrls || null,
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

      return NextResponse.json({ provider: profile });
    }

    // Create new provider profile
    // Also update user role to provider
    const profile = await db.providerProfile.create({
      data: {
        userId,
        categoryId,
        experience: experience || null,
        skills: skills || null,
        description: description || null,
        hourlyRate: hourlyRate || null,
        portfolioUrls: portfolioUrls || null,
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

    await db.user.update({
      where: { id: userId },
      data: { role: 'provider' },
    });

    return NextResponse.json({ provider: profile }, { status: 201 });
  } catch (error) {
    console.error('Create provider error:', error);
    return NextResponse.json(
      { error: 'Failed to create provider profile' },
      { status: 500 }
    );
  }
}
