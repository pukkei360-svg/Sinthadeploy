import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isBlocked, role, name, phone, location, isPro, proExpiry } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(isBlocked !== undefined && { isBlocked }),
        ...(role !== undefined && { role }),
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(location !== undefined && { location }),
        ...(isPro !== undefined && { isPro }),
        ...(proExpiry !== undefined && { proExpiry: proExpiry ? new Date(proExpiry) : null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        isPro: true,
        isBlocked: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isBlocked, role, name, phone, location, isPro, proExpiry } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, string | boolean | Date | null | undefined> = {};
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;
    if (role !== undefined) updateData.role = role;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (isPro !== undefined) updateData.isPro = isPro;
    if (proExpiry !== undefined) updateData.proExpiry = proExpiry ? new Date(proExpiry) : null;

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        photoUrl: true,
        role: true,
        isVerified: true,
        isPro: true,
        isBlocked: true,
        firebaseUid: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Patch user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting admin accounts
    if (existing.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin accounts' },
        { status: 403 }
      );
    }

    // Delete all related records first (foreign key constraints)
    // Order matters: delete children before parents

    // 1. Password reset tokens
    await db.passwordResetToken.deleteMany({ where: { userId: id } });

    // 2. Subscriptions
    await db.subscription.deleteMany({ where: { userId: id } });

    // 3. Verification documents
    await db.verificationDoc.deleteMany({ where: { userId: id } });

    // 4. Notifications
    await db.notification.deleteMany({ where: { userId: id } });

    // 5. Reviews (authored by this user)
    await db.review.deleteMany({ where: { authorId: id } });

    // 6. Chat messages sent by this user
    await db.chatMessage.deleteMany({ where: { senderId: id } });

    // 7. Chat conversations where this user is a participant
    //    (must do after messages are deleted)
    await db.chatConversation.deleteMany({
      where: {
        OR: [
          { participantA: id },
          { participantB: id },
        ],
      },
    });

    // 8. Bookings where this user is client or provider
    await db.booking.deleteMany({
      where: {
        OR: [
          { clientId: id },
          { providerId: id },
        ],
      },
    });

    // 9. Reviews received by this user (targetId)
    await db.review.deleteMany({ where: { targetId: id } });

    // 10. Provider profile (if they have one)
    await db.providerProfile.deleteMany({ where: { userId: id } });

    // Finally — delete the user
    await db.user.delete({ where: { id } });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user — ' + (error as Error).message },
      { status: 500 }
    );
  }
}
