import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { notifyMany } from '@/lib/notify';

/**
 * GET /api/jobs
 *
 * Query params (mutually exclusive — first match wins):
 *   ?clientId=xxx     → list ALL jobs posted by this client (any status)
 *   ?providerId=xxx   → list OPEN jobs in this provider's category, each
 *                       annotated with `hasQuoted` (true if the provider
 *                       has already submitted a quote on that job)
 *   (none)            → list ALL open jobs
 *
 * Each job includes: client info, category info, _count.quotes
 */
export async function GET(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const providerId = searchParams.get('providerId');

    const baseInclude = {
      client: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
          location: true,
          phone: true,
        },
      },
      category: true,
      _count: { select: { quotes: true } },
    };

    let jobs;

    if (clientId) {
      // List this client's jobs (all statuses)
      jobs = await db.job.findMany({
        where: { clientId },
        include: baseInclude,
        orderBy: { createdAt: 'desc' },
      });
    } else if (providerId) {
      // Find the provider's category via their ProviderProfile
      const providerProfile = await db.providerProfile.findUnique({
        where: { userId: providerId },
        select: { categoryId: true },
      });

      if (!providerProfile) {
        // No provider profile → no matching jobs
        return NextResponse.json({ jobs: [] });
      }

      const openJobs = await db.job.findMany({
        where: {
          categoryId: providerProfile.categoryId,
          status: 'open',
        },
        include: baseInclude,
        orderBy: { createdAt: 'desc' },
      });

      // Check which of these jobs the provider has already quoted on
      const jobIds = openJobs.map((j) => j.id);
      const alreadyQuoted = await db.jobQuote.findMany({
        where: { jobId: { in: jobIds }, providerId },
        select: { jobId: true },
      });
      const quotedSet = new Set(alreadyQuoted.map((q) => q.jobId));

      jobs = openJobs.map((j) => ({
        ...j,
        hasQuoted: quotedSet.has(j.id),
      }));
    } else {
      // No params → all open jobs
      jobs = await db.job.findMany({
        where: { status: 'open' },
        include: baseInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Fetch jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs
 *
 * Create a new job posting.
 *
 * Body:
 *   {
 *     clientId,      // required
 *     categoryId,    // required
 *     title,         // required, min 3 chars
 *     description,   // required, min 10 chars
 *     location?,     // string
 *     budget?,       // number
 *     preferredDate?,// ISO date string
 *     urgency?,      // 'flexible' | 'soon' | 'urgent' (default 'flexible')
 *     photoUrls?     // string[] — max 2, must be http(s) URLs
 *   }
 *
 * On success, notifies ALL providers in the category via notifyMany.
 * Returns the created job with client + category info.
 */
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
    } = body;

    // Required fields
    if (!clientId || !categoryId || !title || !description) {
      return NextResponse.json(
        { error: 'clientId, categoryId, title, and description are required' },
        { status: 400 }
      );
    }

    // Title length
    if (typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json(
        { error: 'Title must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Description length
    if (typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Validate photoUrls (max 2, must be http(s) URLs)
    let photoUrlsJson: string | null = null;
    if (photoUrls !== undefined && photoUrls !== null) {
      if (!Array.isArray(photoUrls)) {
        return NextResponse.json(
          { error: 'photoUrls must be an array' },
          { status: 400 }
        );
      }
      if (photoUrls.length > 2) {
        return NextResponse.json(
          { error: 'A maximum of 2 photos is allowed' },
          { status: 400 }
        );
      }
      const isHttpUrl = (u: unknown) =>
        typeof u === 'string' && /^https?:\/\//i.test(u);
      if (!photoUrls.every(isHttpUrl)) {
        return NextResponse.json(
          { error: 'All photoUrls must be valid http(s) URLs' },
          { status: 400 }
        );
      }
      photoUrlsJson = JSON.stringify(photoUrls);
    }

    const job = await db.job.create({
      data: {
        clientId,
        categoryId,
        title: title.trim(),
        description: description.trim(),
        location: location || null,
        budget: budget != null && budget !== '' ? Number(budget) : null,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        urgency: urgency || 'flexible',
        photoUrls: photoUrlsJson,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            location: true,
            phone: true,
          },
        },
        category: true,
      },
    });

    // Notify every provider in this category about the new job
    try {
      const providers = await db.providerProfile.findMany({
        where: { categoryId },
        select: { userId: true },
      });

      if (providers.length > 0) {
        await notifyMany({
          data: providers.map((p) => ({
            userId: p.userId,
            title: 'New Job in Your Category',
            message: `A new job "${job.title}" has been posted in your category.`,
            type: 'system',
            relatedId: job.id,
          })),
        });
      }
    } catch (notifyErr) {
      console.error('[jobs POST] notifyMany failed:', notifyErr);
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
