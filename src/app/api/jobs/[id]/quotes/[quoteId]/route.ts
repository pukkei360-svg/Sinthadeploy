import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { notify, notifyMany } from '@/lib/notify';

/**
 * PATCH /api/jobs/[id]/quotes/[quoteId]
 *   Body: { status }  — 'accepted' | 'rejected'
 *
 * When a quote is 'accepted':
 *   - The quote's status → 'accepted'
 *   - All other quotes on the same job → 'rejected'
 *   - The job's status → 'awarded'
 *   - Notifications sent to the winning provider (congrats) and
 *     losing providers (job taken)
 *
 * When a quote is 'rejected':
 *   - Only that quote's status → 'rejected'
 *   - Job stays 'open' (other quotes can still be accepted)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id: jobId, quoteId } = await params;
    const body = await request.json();
    const { status } = body as { status: string };

    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "accepted" or "rejected"' },
        { status: 400 }
      );
    }

    const quote = await db.jobQuote.findUnique({
      where: { id: quoteId },
    });
    if (!quote || quote.jobId !== jobId) {
      return NextResponse.json(
        { error: 'Quote not found for this job' },
        { status: 404 }
      );
    }

    // Update the quote
    await db.jobQuote.update({
      where: { id: quoteId },
      data: { status },
    });

    if (status === 'accepted') {
      // Reject all other quotes on this job
      await db.jobQuote.updateMany({
        where: { jobId, id: { not: quoteId } },
        data: { status: 'rejected' },
      });

      // Mark the job as awarded
      await db.job.update({
        where: { id: jobId },
        data: { status: 'awarded' },
      });

      // Notify the winning provider
      try {
        const job = await db.job.findUnique({
          where: { id: jobId },
          select: { title: true, clientId: true },
        });
        if (job) {
          await notify({
            data: {
              userId: quote.providerId,
              title: '🎉 Quote Accepted!',
              message: `Your quote for "${job.title}" was accepted! The client will contact you to arrange the service.`,
              type: 'system',
              isRead: false,
              relatedId: jobId,
            },
          });

          // Notify losing providers
          const losingQuotes = await db.jobQuote.findMany({
            where: { jobId, id: { not: quoteId } },
            select: { providerId: true },
          });
          if (losingQuotes.length > 0) {
            await notifyMany({
              data: losingQuotes.map((q) => ({
                userId: q.providerId,
                title: 'Quote Update',
                message: `The job "${job.title}" was awarded to another provider. Keep an eye out for new jobs!`,
                type: 'system',
                isRead: false,
                relatedId: jobId,
              })),
            });
          }
        }
      } catch {}
    }

    return NextResponse.json({ success: true, quoteId, status });
  } catch (error) {
    console.error('Update quote error:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}
