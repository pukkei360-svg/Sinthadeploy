import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

/**
 * Check payment link status and activate PRO if paid.
 * Called after the user returns from the payment link page.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, paymentLinkId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the subscription record
    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        razorpayOrderId: paymentLinkId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // If already activated, return user
    if (subscription.status === 'active' && subscription.razorpayPaymentId) {
      const user = await db.user.findUnique({ where: { id: userId } });
      const { password: _pw, ...userWithoutPassword } = user!;
      return NextResponse.json({
        paid: true,
        message: 'Payment already verified',
        user: userWithoutPassword,
      });
    }

    // Check payment link status with Razorpay
    try {
      const paymentLink = await razorpay.paymentLink.fetch(paymentLinkId);

      if (paymentLink.status === 'paid') {
        // Payment is confirmed — activate PRO
        const paymentId = paymentLink.payments?.[0]?.payment_id || null;

        // Update subscription
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            razorpayPaymentId: paymentId,
          },
        });

        // Activate PRO for user
        const proExpiry = new Date();
        proExpiry.setMonth(proExpiry.getMonth() + 1);

        const user = await db.user.update({
          where: { id: userId },
          data: { isPro: true, proExpiry },
        });

        // Create notification
        await db.notification.create({
          data: {
            userId,
            title: 'SINTHA PRO Activated!',
            message: 'Your SINTHA PRO subscription is now active. Enjoy premium features!',
            type: 'pro',
            relatedId: subscription.id,
          },
        });

        const { password: _pw, ...userWithoutPassword } = user;

        return NextResponse.json({
          paid: true,
          message: 'Payment verified and PRO activated!',
          user: userWithoutPassword,
        });
      }

      // Not paid yet
      return NextResponse.json({
        paid: false,
        message: 'Payment not completed yet. Please complete the payment first.',
        status: paymentLink.status,
      });
    } catch (razorpayErr) {
      console.error('Razorpay fetch error:', razorpayErr);
      return NextResponse.json({
        paid: false,
        message: 'Could not verify payment. If you have paid, please contact support.',
      });
    }
  } catch (error) {
    console.error('Check payment error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
