import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';

/**
 * GET /api/verification?status=pending&userId=xxx
 *
 * Returns verification documents. Used by:
 *   - Admin Verifications screen (status=pending)
 *   - User's own verification history (userId=xxx)
 */
export async function GET(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const verifications = await db.verificationDoc.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ verifications });
  } catch (error) {
    console.error('Fetch verifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/verification
 *
 * Phase 1 identity verification flow.
 *
 * The client uploads the Aadhaar photo and passport photo directly to
 * Cloudinary (browser → Cloudinary, no server middleman), then calls
 * this endpoint with the resulting URLs + the entered name + the face
 * detection result.
 *
 * Body:
 *   {
 *     userId,
 *     fullNameAsPerAadhaar,  // text the user entered
 *     aadhaarPhotoUrl,       // Cloudinary URL
 *     passportPhotoUrl,      // Cloudinary URL
 *     faceDetected           // boolean — did Cloudinary detect a face?
 *   }
 *
 * The endpoint creates a single VerificationDoc row with docType='identity'
 * and status='pending'. Admin reviews it in the Admin Verifications screen.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

    const body = await request.json();
    const {
      userId,
      fullNameAsPerAadhaar,
      aadhaarPhotoUrl,
      passportPhotoUrl,
      faceDetected,
    } = body as {
      userId: string;
      fullNameAsPerAadhaar: string;
      aadhaarPhotoUrl: string;
      passportPhotoUrl: string;
      faceDetected?: boolean;
    };

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    if (!fullNameAsPerAadhaar || fullNameAsPerAadhaar.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please enter your full name as per Aadhaar' },
        { status: 400 }
      );
    }
    if (!aadhaarPhotoUrl || !passportPhotoUrl) {
      return NextResponse.json(
        { error: 'Both Aadhaar photo and passport photo are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If user is already verified, don't allow re-submission
    if (user.isVerified) {
      return NextResponse.json(
        { error: 'You are already verified' },
        { status: 400 }
      );
    }

    // Check for an existing pending verification — if one exists, replace it
    // (so the user can re-submit if they made a mistake)
    const existingPending = await db.verificationDoc.findFirst({
      where: { userId, status: 'pending', docType: 'identity' },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPending) {
      // Update the existing pending verification with new data
      const verification = await db.verificationDoc.update({
        where: { id: existingPending.id },
        data: {
          docUrl: aadhaarPhotoUrl, // primary URL = Aadhaar photo
          fullNameAsPerAadhaar: fullNameAsPerAadhaar.trim(),
          aadhaarPhotoUrl,
          passportPhotoUrl,
          faceDetected: faceDetected ?? null,
          status: 'pending',
          reviewNote: null,
          reviewedBy: null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      return NextResponse.json({ verification }, { status: 200 });
    }

    // Create new verification record
    const verification = await db.verificationDoc.create({
      data: {
        userId,
        docType: 'identity',
        docUrl: aadhaarPhotoUrl, // primary URL = Aadhaar photo (backward compat)
        fullNameAsPerAadhaar: fullNameAsPerAadhaar.trim(),
        aadhaarPhotoUrl,
        passportPhotoUrl,
        faceDetected: faceDetected ?? null,
        status: 'pending',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ verification }, { status: 201 });
  } catch (error) {
    console.error('Submit verification error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to submit verification — ' + message },
      { status: 500 }
    );
  }
}
