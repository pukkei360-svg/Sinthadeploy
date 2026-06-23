import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

/**
 * Update the current user's profile (phone, location, name, photoUrl, referredBy).
 * Body: { userId, phone?, location?, name?, photoUrl?, referredBy? }
 *
 * The referredBy field is set ONCE at signup (from the RoleSelectScreen
 * referral code input). Once set, it cannot be changed — this prevents
 * users from gaming the referral system by switching referrers.
 */
export async function PATCH(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const { userId, phone, location, name, photoUrl, referredBy } = body;

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

    // Only allow setting referredBy if the user doesn't already have one.
    // This prevents gaming the system by switching referrers.
    if (referredBy !== undefined && !existing.referredBy) {
      // Validate that the referral code belongs to a real user
      if (referredBy) {
        const referrer = await db.user.findUnique({
          where: { referralCode: referredBy },
          select: { id: true },
        }).catch(() => null);
        if (referrer) {
          updateData.referredBy = referredBy;
        }
        // If the code doesn't match any user, silently ignore it
        // (don't fail the whole profile update — just skip the referral)
      }
    }

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
