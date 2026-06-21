import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { notify } from '@/lib/notify';

/**
 * GET /api/jobs/:id/quotes
 *
 * Returns all quotes for a job, each with provider info
 * (id, name, photoUrl, location, isVerified, isPro, proExpiry).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;

    const quotes = await db.jobQuote.findMany({
      where: { jobId: id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            location: true,
            isVerified: true,
            isPro: true,
            proExpiry: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Fetch quotes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/:id/quotes
 *
 * Submit a quote on a job.
 *
 * Body: { providerId, price, message, estimatedTime? }
 *
 * Validations:
 *   - job must exist and be 'open'
 *   - provider cannot quote their own job
 *   - provider cannot quote twice (no duplicates)
 *   - max 20 quotes per job
 *
 * Notifies the job's client via notify().
 * Returns the created quote with provider info.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;
    const body = await request.json();
    const { providerId, price, message, estimatedTime } = body;

    // Required fields
    if (!providerId || price == null || !message) {
      return NextResponse.json(
        { error: 'providerId, price, and message are required' },
        { status: 400 }
      );
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    if (typeof price !== 'number' || isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: 'price must be a positive number' },
        { status: 400 }
      );
    }

    // Job must exist and be open
    const job = await db.job.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    if (job.status !== 'open') {
      return NextResponse.json(
        { error: 'This job is no longer accepting quotes' },
        { status: 400 }
      );
    }

    // Provider can't quote their own job
    if (job.clientId === providerId) {
      return NextResponse.json(
        { error: 'You cannot quote on your own job' },
        { status: 400 }
      );
    }

    // No duplicate quotes from the same provider
    const existingQuote = await db.jobQuote.findFirst({
      where: { jobId: id, providerId },
      select: { id: true },
    });
    if (existingQuote) {
      return NextResponse.json(
        { error: 'You have already quoted on this job' },
        { status: 409 }
      );
    }

    // Max 20 quotes per job
    const quoteCount = await db.jobQuote.count({ where: { jobId: id } });
    if (quoteCount >= 20) {
      return NextResponse.json(
        { error: 'This job has reached the maximum number of quotes (20)' },
        { status: 400 }
      );
    }

    const quote = await db.jobQuote.create({
      data: {
        jobId: id,
        providerId,
        price,
        message: message.trim(),
        estimatedTime: estimatedTime || null,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            location: true,
            isVerified: true,
            isPro: true,
            proExpiry: true,
          },
        },
      },
    });

    // Notify the client that a new quote was received
    try {
      await notify({
        data: {
          userId: job.clientId,
          title: 'New Quote on Your Job',
          message: `You received a new quote of ₹${price} on "${job.title}".`,
          type: 'system',
          relatedId: job.id,
        },
      });
    } catch (e) {
      console.error('[quotes POST] notify client failed:', e);
    }

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    console.error('Create quote error:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}
