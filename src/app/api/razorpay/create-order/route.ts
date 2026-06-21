import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Razorpay from 'razorpay';

// Lazy-initialize Razorpay so the module doesn't crash at build time
// when env vars aren't set. The actual Razorpay instance is created on
// first use (runtime), not at module load (build time).
let _razorpay: Razorpay | null = null;
function getRazorpay(): Razorpay {
  if (_razorpay) return _razorpay;
  _razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });
  return _razorpay;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already has active PRO
    if (user.isPro && user.proExpiry && new Date() < user.proExpiry) {
      return NextResponse.json(
        { error: 'You already have an active SINTHA PRO subscription' },
        { status: 400 }
      );
    }

    const amount = 19900; // ₹199 in paise

    // Create Razorpay order
    const order = await getRazorpay().orders.create({
      amount,
      currency: 'INR',
      receipt: `sintha_pro_${Date.now()}`,
      notes: {
        userId,
        plan: 'pro',
      },
    });

    // Create subscription record
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    await db.subscription.create({
      data: {
        userId,
        plan: 'pro',
        razorpayOrderId: order.id,
        amount: amount / 100, // Store in rupees
        currency: 'INR',
        status: 'active',
        startDate: new Date(),
        endDate,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID || '',
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
