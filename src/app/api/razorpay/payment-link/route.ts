import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_T2JofJcoa6lHKm',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'm2qt1WsbwFe7jc53qtXNQFap',
});

/**
 * Create a Razorpay Payment Link for SINTHA PRO subscription.
 * Payment Links open in the phone's external browser where UPI (Google Pay, PhonePe) works.
 */
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

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.isPro && user.proExpiry && new Date() < user.proExpiry) {
      return NextResponse.json(
        { error: 'You already have an active SINTHA PRO subscription' },
        { status: 400 }
      );
    }

    // Create a Razorpay Payment Link
    const paymentLink = await razorpay.paymentLink.create({
      amount: 19900, // ₹199 in paise
      currency: 'INR',
      description: 'SINTHA PRO - Monthly Subscription',
      reference_id: `sintha_pro_${userId}_${Date.now()}`,
      customer: {
        name: user.name || 'SINTHA User',
        email: user.email,
        contact: user.phone || undefined,
      },
      notify: {
        sms: !!user.phone,
        email: true,
      },
      reminder_enable: true,
      notes: {
        userId,
        plan: 'pro',
      },
    });

    // Save subscription record with payment link ID
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    await db.subscription.create({
      data: {
        userId,
        plan: 'pro',
        razorpayOrderId: paymentLink.id, // Store payment link ID
        amount: 199,
        currency: 'INR',
        status: 'created',
        startDate: new Date(),
        endDate,
      },
    });

    return NextResponse.json({
      paymentLinkId: paymentLink.id,
      paymentLinkUrl: paymentLink.short_url,
      amount: 19900,
      currency: 'INR',
    });
  } catch (error) {
    console.error('Create payment link error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    );
  }
}
