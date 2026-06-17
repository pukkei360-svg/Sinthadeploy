import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Cache categories for 10 minutes on browser, 1 hour on CDN.
// Categories rarely change, so this saves mobile data on every page load.
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
};

export async function GET() {
  try {
    const categories = await db.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { providers: true },
        },
      },
    });

    return NextResponse.json({ categories }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Fetch categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon, description, order } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const category = await db.serviceCategory.create({
      data: {
        name,
        icon: icon || null,
        description: description || null,
        order: order || 0,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
