import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { notify } from '@/lib/notify';

/**
 * GET /api/jobs/[id]/quotes
 *   Returns all quotes for a job, with provider info.
 *   Used by the client to review quotes on their job.
 *
 * POST /api/jobs/[id]/quotes
 *   Body: { providerId, price, message, estimatedTime? }
 *   A provider sends a quote (offer) on a job.
 *   - Validates: job is still 'open'
 *   - Validates: provider hasn't already quoted (no duplicates)
 *   - Validates: max 20 quotes per job (anti-spam)
 *   - Notifies the client that a new quote arrived
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;

    const quotes = await db.jobQuote.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Fetch quotes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id: jobId } = await params;
    const body = await request.json();
    const { providerId, price, message, estimatedTime } = body as {
      providerId: string;
      price: number;
      message: string;
      estimatedTime?: string;
    };

    if (!providerId || !price || !message) {
      return NextResponse.json(
        { error: 'Provider ID, price, and message are required' },
        { status: 400 }
      );
    }

    if (price <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than 0' },
        { status: 400 }
      );
    }

    if (message.trim().length < 5) {
      return NextResponse.json(
        { error: 'Message must be at least 5 characters' },
        { status: 400 }
      );
    }

    // Verify job exists and is still open
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.status !== 'open') {
      return NextResponse.json(
        { error: 'This job is no longer accepting quotes' },
        { status: 400 }
      );
    }

    // Prevent providers from quoting on their own jobs
    if (job.clientId === providerId) {
      return NextResponse.json(
        { error: 'You cannot quote on your own job' },
        { status: 400 }
      );
    }

    // Check if provider already quoted (no duplicates)
    const existingQuote = await db.jobQuote.findFirst({
      where: { jobId, providerId },
    });
    if (existingQuote) {
      return NextResponse.json(
        { error: 'You have already quoted on this job' },
        { status: 400 }
      );
    }

    // Anti-spam: max 20 quotes per job
    const quoteCount = await db.jobQuote.count({ where: { jobId } });
    if (quoteCount >= 20) {
      return NextResponse.json(
        { error: 'This job has reached the maximum number of quotes (20)' },
        { status: 400 }
      );
    }

    // Verify provider exists and has a provider profile
    const provider = await db.user.findUnique({
      where: { id: providerId },
      select: { id: true, name: true, role: true },
    });
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Create the quote
    const quote = await db.jobQuote.create({
      data: {
        jobId,
        providerId,
        price: Number(price),
        message: message.trim(),
        estimatedTime: estimatedTime?.trim() || null,
        status: 'pending',
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            location: true,
            isVerified: true,
          },
        },
      },
    });

    // Notify the client that they got a new quote
    try {
      await notify({
        data: {
          userId: job.clientId,
          title: '💬 New Quote Received',
          message: `${provider.name} quoted ₹${price} for "${job.title}". Tap to view.`,
          type: 'system',
          isRead: false,
          relatedId: jobId,
        },
      });
    } catch {}

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    console.error('Create quote error:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}
