import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { notify, notifyMany } from '@/lib/notify';

/**
 * GET /api/jobs/:id
 *
 * Returns a single job with:
 *   - client info (id, name, photoUrl, location, phone)
 *   - category info
 *   - all quotes, each with provider info (id, name, photoUrl, location,
 *     isVerified, isPro, proExpiry)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;

    const job = await db.job.findUnique({
      where: { id },
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
        quotes: {
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
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Fetch job error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/jobs/:id
 *
 * Body: { status, acceptedQuoteId? }
 *
 * Valid statuses: 'open' | 'awarded' | 'closed' | 'cancelled'
 *
 * If status === 'awarded' AND acceptedQuoteId is provided:
 *   - marks that quote as 'accepted'
 *   - rejects all other quotes on the job
 *   - updates job status to 'awarded'
 *   - notifies the winning provider via notify()
 *   - notifies all losing providers via notifyMany()
 *
 * Otherwise just updates the job status.
 *
 * Returns the updated job with full info (client, category, quotes +
 * provider info).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;
    const body = await request.json();
    const { status, acceptedQuoteId } = body;

    const validStatuses = ['open', 'awarded', 'closed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const existing = await db.job.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Awarding flow — accept one quote, reject the rest, notify everyone
    if (status === 'awarded' && acceptedQuoteId) {
      const acceptedQuote = await db.jobQuote.findUnique({
        where: { id: acceptedQuoteId },
        select: { id: true, jobId: true, providerId: true },
      });

      if (!acceptedQuote || acceptedQuote.jobId !== id) {
        return NextResponse.json(
          { error: 'Accepted quote not found for this job' },
          { status: 404 }
        );
      }

      // Mark the winning quote as accepted
      await db.jobQuote.update({
        where: { id: acceptedQuoteId },
        data: { status: 'accepted' },
      });

      // Reject all other quotes on this job
      const otherQuotes = await db.jobQuote.findMany({
        where: { jobId: id, id: { not: acceptedQuoteId } },
        select: { id: true, providerId: true },
      });

      if (otherQuotes.length > 0) {
        await db.jobQuote.updateMany({
          where: { jobId: id, id: { not: acceptedQuoteId } },
          data: { status: 'rejected' },
        });
      }

      // Update the job status
      await db.job.update({
        where: { id },
        data: { status: 'awarded' },
      });

      // Notify the winning provider
      try {
        await notify({
          data: {
            userId: acceptedQuote.providerId,
            title: 'Quote Accepted! 🎉',
            message: `Your quote for "${existing.title}" has been accepted.`,
            type: 'system',
            relatedId: id,
          },
        });
      } catch (e) {
        console.error('[job PATCH] notify winner failed:', e);
      }

      // Notify all losing providers (dedupe providerIds just in case)
      const loserIds = [...new Set(otherQuotes.map((q) => q.providerId))];
      if (loserIds.length > 0) {
        try {
          await notifyMany({
            data: loserIds.map((uid) => ({
              userId: uid,
              title: 'Quote Update',
              message: `The job "${existing.title}" has been awarded to another provider.`,
              type: 'system',
              relatedId: id,
            })),
          });
        } catch (e) {
          console.error('[job PATCH] notifyMany losers failed:', e);
        }
      }
    } else {
      // Simple status change (no quote awarding)
      await db.job.update({
        where: { id },
        data: { status },
      });
    }

    // Return the updated job with full details
    const job = await db.job.findUnique({
      where: { id },
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
        quotes: {
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
        },
      },
    });

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Update job error:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs/:id
 *
 * Deletes all quotes for the job, then deletes the job itself.
 * (The schema has ON DELETE CASCADE on JobQuote.jobId, but we delete
 * quotes explicitly first for safety / clarity.)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;

    const existing = await db.job.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Delete all quotes first
    await db.jobQuote.deleteMany({ where: { jobId: id } });

    // Then delete the job
    await db.job.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
