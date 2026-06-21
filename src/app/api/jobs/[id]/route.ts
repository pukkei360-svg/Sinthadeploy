import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { notify, notifyMany } from '@/lib/notify';

/**
 * GET /api/jobs/[id]
 *   Returns a single job with its quotes (for the job detail screen).
 *   Quotes include the provider's name + photo so the client can see
 *   who's offering.
 *
 * PATCH /api/jobs/[id]
 *   Body: { status }  — 'open' | 'awarded' | 'closed' | 'cancelled'
 *   Updates the job status. Used when:
 *     - Client cancels the job (status='cancelled')
 *     - Client accepts a quote → status='awarded' (also updates the quote)
 *     - Job auto-closes after completion → status='closed'
 *
 * DELETE /api/jobs/[id]
 *   Hard-deletes a job (admin or client who posted it).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;

    const job = await db.job.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, photoUrl: true, location: true, phone: true },
        },
        category: { select: { id: true, name: true, icon: true } },
        quotes: {
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
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;
    const body = await request.json();
    const { status, acceptedQuoteId } = body as {
      status?: string;
      acceptedQuoteId?: string;
    };

    const validStatuses = ['open', 'awarded', 'closed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const existing = await db.job.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // If accepting a quote (status='awarded'), mark that quote as accepted
    // and all other quotes as rejected. Also notify the winning provider.
    if (status === 'awarded' && acceptedQuoteId) {
      const acceptedQuote = await db.jobQuote.findUnique({
        where: { id: acceptedQuoteId },
      });
      if (!acceptedQuote || acceptedQuote.jobId !== id) {
        return NextResponse.json(
          { error: 'Quote not found for this job' },
          { status: 404 }
        );
      }

      // Mark the accepted quote
      await db.jobQuote.update({
        where: { id: acceptedQuoteId },
        data: { status: 'accepted' },
      });

      // Reject all other quotes on this job
      await db.jobQuote.updateMany({
        where: { jobId: id, id: { not: acceptedQuoteId } },
        data: { status: 'rejected' },
      });

      // Notify the winning provider
      try {
        await notify({
          data: {
            userId: acceptedQuote.providerId,
            title: '🎉 Quote Accepted!',
            message: `Your quote for "${existing.title}" was accepted! Contact the client to arrange the service.`,
            type: 'system',
            isRead: false,
            relatedId: id,
          },
        });
      } catch {}

      // Notify all other providers who quoted (they lost)
      try {
        const otherQuotes = await db.jobQuote.findMany({
          where: { jobId: id, id: { not: acceptedQuoteId } },
          select: { providerId: true },
        });
        if (otherQuotes.length > 0) {
          await notifyMany({
            data: otherQuotes.map((q) => ({
              userId: q.providerId,
              title: 'Quote Update',
              message: `The job "${existing.title}" was awarded to another provider. Keep an eye out for new jobs!`,
              type: 'system',
              isRead: false,
              relatedId: id,
            })),
          });
        }
      } catch {}
    }

    const job = await db.job.update({
      where: { id },
      data: status ? { status } : {},
      include: {
        category: { select: { id: true, name: true } },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;

    const existing = await db.job.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Cascade delete quotes first, then the job
    await db.jobQuote.deleteMany({ where: { jobId: id } });
    await db.job.delete({ where: { id } });

    return NextResponse.json({ message: 'Job deleted' });
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
