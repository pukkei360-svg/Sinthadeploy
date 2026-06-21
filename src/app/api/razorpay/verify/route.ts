import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { notify } from '@/lib/notify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
      return NextResponse.json(
        { error: 'All payment details and user ID are required' },
        { status: 400 }
      );
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Find and update subscription
    const subscription = await db.subscription.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
        userId,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Update subscription with payment ID
    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        status: 'active',
      },
    });

    // Activate PRO for user
    const proExpiry = new Date();
    proExpiry.setMonth(proExpiry.getMonth() + 1);

    const user = await db.user.update({
      where: { id: userId },
      data: {
        isPro: true,
        proExpiry,
      },
    });

    // Create notification
    await notify({
      data: {
        userId,
        title: 'SINTHA PRO Activated! 🎉',
        message: 'Your SINTHA PRO subscription is now active. Enjoy premium features!',
        type: 'pro',
        relatedId: subscription.id,
      },
    });

    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: 'Payment verified and PRO activated',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
