import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import { notifyMany } from '@/lib/notify';

// ─────────────────────────────────────────────────────────────
// POST /api/claims
// File a new claim/complaint against a provider (or any user).
// Called from the "Report Provider" button on the provider profile
// screen or the booking detail screen.
// ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Ensure the Claim table exists before we try to insert into it.
    await ensureSchemaMigrated();

    const body = await request.json();
    const { reporterId, subjectId, bookingId, type, severity, title, description } = body;

    if (!reporterId || !subjectId || !type || !title || !description) {
      return NextResponse.json(
        {
          error:
            'reporterId, subjectId, type, title, and description are required',
        },
        { status: 400 }
      );
    }

    // Validate types
    const validTypes = ['fraud', 'misconduct', 'no_show', 'quality', 'payment', 'abuse', 'other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const finalSeverity = validSeverities.includes(severity) ? severity : 'medium';

    // Verify both users exist
    const [reporter, subject] = await Promise.all([
      db.user.findUnique({ where: { id: reporterId }, select: { id: true, name: true } }),
      db.user.findUnique({ where: { id: subjectId }, select: { id: true, name: true, role: true } }),
    ]);

    if (!reporter) {
      return NextResponse.json({ error: 'Reporter not found' }, { status: 404 });
    }
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    if (reporterId === subjectId) {
      return NextResponse.json(
        { error: 'Cannot file a claim against yourself' },
        { status: 400 }
      );
    }

    // Create the claim
    const claim = await db.claim.create({
      data: {
        reporterId,
        subjectId,
        bookingId: bookingId || null,
        type,
        severity: finalSeverity,
        title: title.trim(),
        description: description.trim(),
        status: 'open',
      },
      include: {
        reporter: { select: { id: true, name: true, email: true, photoUrl: true } },
        subject: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
      },
    });

    // Notify all admins (so they see the red badge in the admin panel)
    const admins = await db.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    if (admins.length > 0) {
      await notifyMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: `🚩 New Claim: ${claim.title}`,
          message: `${reporter.name} reported ${subject.name} (${subject.role}). Type: ${type}, Severity: ${finalSeverity}.`,
          type: 'system',
          isRead: false,
          relatedId: claim.id,
        })),
      });
    }

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    console.error('Create claim error:', error);
    return NextResponse.json(
      { error: 'Failed to file claim — ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/claims?userId=xxx — list claims filed BY a user
// (used on the user's profile to show "My Reports" history)
export async function GET(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const claims = await db.claim.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ claims });
  } catch (error) {
    console.error('Fetch claims error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claims' },
      { status: 500 }
    );
  }
}
