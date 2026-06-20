import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;
    const body = await request.json();
    const { status, reviewedBy, reviewNote } = body;

    if (!status || !reviewedBy) {
      return NextResponse.json(
        { error: 'Status and reviewer ID are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['verified', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const existing = await db.verificationDoc.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Verification document not found' },
        { status: 404 }
      );
    }

    const verification = await db.verificationDoc.update({
      where: { id },
      data: {
        status,
        reviewedBy,
        reviewNote: reviewNote || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If verified, update user's verification status
    if (status === 'verified') {
      await db.user.update({
        where: { id: existing.userId },
        data: { isVerified: true },
      });

      // Also update provider profile if exists
      const providerProfile = await db.providerProfile.findUnique({
        where: { userId: existing.userId },
      });
      if (providerProfile) {
        await db.providerProfile.update({
          where: { userId: existing.userId },
          data: { isVerified: true },
        });
      }
    }

    // Create notification for the user
    await db.notification.create({
      data: {
        userId: existing.userId,
        title: status === 'verified' ? 'Verification Approved' : 'Verification Rejected',
        message:
          status === 'verified'
            ? 'Your identity verification has been approved!'
            : `Your verification was rejected. ${reviewNote || ''}`,
        type: 'system',
        relatedId: id,
      },
    });

    return NextResponse.json({ verification });
  } catch (error) {
    console.error('Update verification error:', error);
    return NextResponse.json(
      { error: 'Failed to update verification' },
      { status: 500 }
    );
  }
}
