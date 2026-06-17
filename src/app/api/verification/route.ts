import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, docType, docUrl } = body;

    if (!userId || !docType || !docUrl) {
      return NextResponse.json(
        { error: 'User ID, document type, and document URL are required' },
        { status: 400 }
      );
    }

    const validDocTypes = ['aadhaar', 'selfie', 'address_proof'];
    if (!validDocTypes.includes(docType)) {
      return NextResponse.json(
        { error: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const verification = await db.verificationDoc.create({
      data: {
        userId,
        docType,
        docUrl,
        status: 'pending',
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

    return NextResponse.json({ verification }, { status: 201 });
  } catch (error) {
    console.error('Submit verification error:', error);
    return NextResponse.json(
      { error: 'Failed to submit verification' },
      { status: 500 }
    );
  }
}
