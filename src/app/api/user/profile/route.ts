import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Update the current user's profile (phone, location, name, photoUrl).
 * Body: { userId, phone?, location?, name?, photoUrl? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, phone, location, name, photoUrl } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, string | null | undefined> = {};
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (name !== undefined) updateData.name = name;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password: _pw, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
