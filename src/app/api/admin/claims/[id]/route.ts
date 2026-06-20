import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/claims/[id]
// Update a claim's status / resolution. Body:
//   { adminId, status, resolution?, action? }
//
// status:      open | investigating | resolved | dismissed
// resolution:  free-text notes from the admin (optional)
// action:      optional — quick action to take against the subject:
//              'suspend' | 'ban' | 'none' (default 'none')
//              If 'suspend' or 'ban' is provided, the subject user
//              is also suspended/banned in the same call so the admin
//              doesn't have to leave the claims screen.
// ─────────────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchemaMigrated();

    const { id } = await params;
    const body = await request.json();
    const { adminId, status, resolution, action } = body as {
      adminId: string;
      status?: 'open' | 'investigating' | 'resolved' | 'dismissed';
      resolution?: string;
      action?: 'suspend' | 'ban' | 'none';
    };

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update claims' },
        { status: 403 }
      );
    }

    const existing = await db.claim.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Update the claim
    const updateData: Record<string, string | null> = {};
    if (status && ['open', 'investigating', 'resolved', 'dismissed'].includes(status)) {
      updateData.status = status;
    }
    if (resolution !== undefined) {
      updateData.resolution = resolution || null;
    }
    if (Object.keys(updateData).length > 0) {
      updateData.handledBy = adminId;
    }

    const updatedClaim = Object.keys(updateData).length > 0
      ? await db.claim.update({
          where: { id },
          data: updateData,
          include: {
            reporter: { select: { id: true, name: true, email: true } },
            subject: { select: { id: true, name: true, email: true, isBlocked: true, isBanned: true } },
          },
        })
      : await db.claim.findUnique({
          where: { id },
          include: {
            reporter: { select: { id: true, name: true, email: true } },
            subject: { select: { id: true, name: true, email: true, isBlocked: true, isBanned: true } },
          },
        });

    // Optional: take action against the subject in the same call
    let actionTaken = 'none';
    if (action === 'suspend' && existing.subjectId) {
      const subject = await db.user.findUnique({
        where: { id: existing.subjectId },
        select: { id: true, role: true },
      });
      if (subject && subject.role !== 'admin') {
        await db.user.update({
          where: { id: subject.id },
          data: { isBlocked: true },
        });
        actionTaken = 'suspended';
      }
    } else if (action === 'ban' && existing.subjectId) {
      const subject = await db.user.findUnique({
        where: { id: existing.subjectId },
        select: { id: true, email: true, role: true },
      });
      if (subject && subject.role !== 'admin') {
        await db.user.update({
          where: { id: subject.id },
          data: {
            isBanned: true,
            isBlocked: true,
            banReason: `Banned via claim ${id}: ${existing.title}`,
            bannedAt: new Date(),
          },
        });
        try {
          await db.bannedEmail.upsert({
            where: { email: subject.email.toLowerCase() },
            update: {
              reason: `Banned via claim ${id}`,
              bannedBy: adminId,
              bannedAt: new Date(),
            },
            create: {
              email: subject.email.toLowerCase(),
              reason: `Banned via claim ${id}`,
              bannedBy: adminId,
            },
          });
        } catch {
          // Ignore — BannedEmail table may not exist yet
        }
        actionTaken = 'banned';
      }
    }

    // Notify the reporter that their claim was handled
    if (status === 'resolved' || status === 'dismissed') {
      try {
        await db.notification.create({
          data: {
            userId: existing.reporterId,
            title: `📋 Claim ${status}`,
            message: `Your claim "${existing.title}" has been ${status}. ${
              resolution ? `Admin notes: ${resolution}` : ''
            }`,
            type: 'system',
            isRead: false,
            relatedId: id,
          },
        });
      } catch {
        // Ignore notification failure
      }
    }

    return NextResponse.json({
      claim: updatedClaim,
      actionTaken,
    });
  } catch (error) {
    console.error('Update claim error:', error);
    return NextResponse.json(
      { error: 'Failed to update claim — ' + (error as Error).message },
      { status: 500 }
    );
  }
}
