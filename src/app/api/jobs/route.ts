import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { notifyMany } from '@/lib/notify';

/**
 * GET /api/jobs
 *   ?clientId=xxx           — list jobs posted by a client (for "My Jobs")
 *   ?providerId=xxx         — list open jobs matching the provider's category
 *   ?status=open            — filter by status (optional)
 *
 * POST /api/jobs
 *   Body: { clientId, categoryId, title, description, location?, budget?, preferredDate?, urgency? }
 *   Creates a new job posting.
 */
export async function GET(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const providerId = searchParams.get('providerId');
    const status = searchParams.get('status');

    // ── Provider: list open jobs in their category ──
    if (providerId) {
      const providerProfile = await db.providerProfile.findUnique({
        where: { userId: providerId },
        select: { categoryId: true },
      });
      if (!providerProfile) {
        return NextResponse.json({ jobs: [] });
      }

      const where: Record<string, unknown> = {
        categoryId: providerProfile.categoryId,
        status: 'open',
      };
      // Don't show the provider their own jobs (if they're also a client)
      where.NOT = { clientId: providerId };

      const jobs = await db.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          client: {
            select: { id: true, name: true, photoUrl: true, location: true },
          },
          category: { select: { id: true, name: true, icon: true } },
          _count: { select: { quotes: true } },
        },
      });

      // Also mark which jobs this provider has already quoted on
      const jobsWithQuoteFlag = await Promise.all(
        jobs.map(async (job) => {
          const existingQuote = await db.jobQuote.findFirst({
            where: { jobId: job.id, providerId },
            select: { id: true, status: true },
          });
          return {
            ...job,
            hasQuoted: !!existingQuote,
            myQuoteStatus: existingQuote?.status || null,
          };
        })
      );

      return NextResponse.json({ jobs: jobsWithQuoteFlag });
    }

    // ── Client: list their own posted jobs ──
    if (clientId) {
      const where: Record<string, unknown> = { clientId };
      if (status) where.status = status;

      const jobs = await db.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, icon: true } },
          _count: { select: { quotes: true } },
        },
      });

      return NextResponse.json({ jobs });
    }

    // ── No filter: return all open jobs (for admin / browse) ──
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    else where.status = 'open'; // default to open only

    const jobs = await db.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        client: {
          select: { id: true, name: true, photoUrl: true, location: true },
        },
        category: { select: { id: true, name: true, icon: true } },
        _count: { select: { quotes: true } },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Fetch jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const {
      clientId,
      categoryId,
      title,
      description,
      location,
      budget,
      preferredDate,
      urgency,
      photoUrls,
    } = body as {
      clientId: string;
      categoryId: string;
      title: string;
      description: string;
      location?: string;
      budget?: number;
      preferredDate?: string;
      urgency?: string;
      photoUrls?: string[];
    };

    if (!clientId || !categoryId || !title || !description) {
      return NextResponse.json(
        { error: 'Client ID, category, title, and description are required' },
        { status: 400 }
      );
    }

    if (title.trim().length < 3) {
      return NextResponse.json(
        { error: 'Title must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Validate photoUrls — max 2 photos, must be valid URLs
    let photoUrlsJson: string | null = null;
    if (photoUrls && Array.isArray(photoUrls)) {
      if (photoUrls.length > 2) {
        return NextResponse.json(
          { error: 'Maximum 2 photos allowed per job' },
          { status: 400 }
        );
      }
      // Filter to valid-looking URLs (basic check)
      const validUrls = photoUrls.filter(
        (url) => typeof url === 'string' && url.startsWith('http')
      );
      if (validUrls.length > 0) {
        photoUrlsJson = JSON.stringify(validUrls);
      }
    }

    // Verify client exists
    const client = await db.user.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Verify category exists
    const category = await db.serviceCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Validate urgency
    const validUrgency = ['today', 'this_week', 'flexible'].includes(urgency || '')
      ? urgency
      : 'flexible';

    // Create the job
    const job = await db.job.create({
      data: {
        clientId,
        categoryId,
        title: title.trim(),
        description: description.trim(),
        location: location?.trim() || client.location || null,
        budget: budget && budget > 0 ? Number(budget) : null,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        urgency: validUrgency as string,
        photoUrls: photoUrlsJson,
        status: 'open',
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    // Notify all providers in this category about the new job
    try {
      const providersInCategory = await db.providerProfile.findMany({
        where: { categoryId },
        select: { userId: true },
      });
      if (providersInCategory.length > 0) {
        await notifyMany({
          data: providersInCategory.map((p) => ({
            userId: p.userId,
            title: '🆕 New Job Posted',
            message: `"${title.trim()}" in ${category.name}. Tap to view and send a quote.`,
            type: 'system',
            isRead: false,
            relatedId: job.id,
          })),
        });
      }
    } catch {
      // Notification failure shouldn't block job creation
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error('Create job error:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
