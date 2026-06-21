import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { notify, notifyMany } from '@/lib/notify';

/**
 * PATCH /api/jobs/:id/quotes/:quoteId
 *
 * Update a quote's status.
 *
 * Body: { status }
 *   status: 'accepted' | 'rejected'
 *
 * If status === 'accepted':
 *   - marks THIS quote as 'accepted'
 *   - rejects ALL other quotes on the job
 *   - updates the job status to 'awarded'
 *   - notifies the winning provider via notify()
 *   - notifies all losing providers via notifyMany()
 *
 * If status === 'rejected':
 *   - just marks this quote as 'rejected' (no other side effects)
 *
 * Returns the updated quote with provider info.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id, quoteId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'accepted' or 'rejected'" },
        { status: 400 }
      );
    }

    // The quote must exist and belong to this job
    const quote = await db.jobQuote.findUnique({
      where: { id: quoteId },
      select: { id: true, jobId: true, providerId: true },
    });
    if (!quote || quote.jobId !== id) {
      return NextResponse.json(
        { error: 'Quote not found for this job' },
        { status: 404 }
      );
    }

    const job = await db.job.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (status === 'accepted') {
      // Mark THIS quote accepted
      await db.jobQuote.update({
        where: { id: quoteId },
        data: { status: 'accepted' },
      });

      // Reject all OTHER quotes on the job
      const otherQuotes = await db.jobQuote.findMany({
        where: { jobId: id, id: { not: quoteId } },
        select: { id: true, providerId: true },
      });

      if (otherQuotes.length > 0) {
        await db.jobQuote.updateMany({
          where: { jobId: id, id: { not: quoteId } },
          data: { status: 'rejected' },
        });
      }

      // Update the job status to 'awarded'
      await db.job.update({
        where: { id },
        data: { status: 'awarded' },
      });

      // Notify the winning provider
      try {
        await notify({
          data: {
            userId: quote.providerId,
            title: 'Quote Accepted! 🎉',
            message: `Your quote for "${job.title}" has been accepted.`,
            type: 'system',
            relatedId: id,
          },
        });
      } catch (e) {
        console.error('[quote PATCH] notify winner failed:', e);
      }

      // Notify all losing providers (dedupe providerIds just in case)
      const loserIds = [...new Set(otherQuotes.map((q) => q.providerId))];
      if (loserIds.length > 0) {
        try {
          await notifyMany({
            data: loserIds.map((uid) => ({
              userId: uid,
              title: 'Quote Update',
              message: `The job "${job.title}" has been awarded to another provider.`,
              type: 'system',
              relatedId: id,
            })),
          });
        } catch (e) {
          console.error('[quote PATCH] notifyMany losers failed:', e);
        }
      }
    } else {
      // status === 'rejected' — just update this quote
      await db.jobQuote.update({
        where: { id: quoteId },
        data: { status: 'rejected' },
      });
    }

    // Return the updated quote with provider info
    const updatedQuote = await db.jobQuote.findUnique({
      where: { id: quoteId },
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

    return NextResponse.json({ quote: updatedQuote });
  } catch (error) {
    console.error('Update quote error:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}
