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

    // Fetch providers, then sort in JavaScript so we can check PRO expiry
    // (Prisma can't easily sort by "isPro AND proExpiry > now" in a single
    // orderBy clause — so we fetch all matching, then sort in code).
    // For large datasets this would need optimization, but for SINTHA's
    // scale (< 10K providers) it's fine.
    const allProviders = await db.providerProfile.findMany({
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
            proExpiry: true,
          },
        },
        category: true,
      },
    });

    const now = new Date();
    // Helper: is PRO subscription currently active?
    const isActivePro = (p: typeof allProviders[0]) =>
      p.user?.isPro && (!p.user?.proExpiry || new Date(p.user.proExpiry) > now);

    // Sort: active PRO first, then by requested criteria
    const sortedProviders = [...allProviders].sort((a, b) => {
      const aPro = isActivePro(a) ? 1 : 0;
      const bPro = isActivePro(b) ? 1 : 0;
      if (aPro !== bPro) return bPro - aPro; // PRO providers first

      // Then by the requested sort option
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'reviews') return b.totalReviews - a.totalReviews;
      if (sort === 'bookings') return b.totalBookings - a.totalBookings;
      if (sort === 'featured') {
        const aF = (a.isFeatured ? 1 : 0);
        const bF = (b.isFeatured ? 1 : 0);
        if (aF !== bF) return bF - aF;
      }
      // Default: newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Apply pagination after sorting
    const providers = sortedProviders.slice(skip, skip + limit);
    const total = allProviders.length;

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
