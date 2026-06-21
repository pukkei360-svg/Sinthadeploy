import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Razorpay from 'razorpay';
import { notify } from '@/lib/notify';

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

/**
 * Check payment status and activate PRO if paid.
 * Works with BOTH:
 * - Standard Checkout (orders) — checks order payments
 * - Payment Links — checks payment link status
 *
 * Called by:
 * - Frontend polling (every 5 seconds after checkout modal opens)
 * - Manual "Verify Payment" button
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, paymentLinkId, orderId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the most recent subscription for this user
    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        ...(paymentLinkId || orderId
          ? { razorpayOrderId: paymentLinkId || orderId }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    // If no subscription found with the filter, try finding any recent one
    const subToCheck = subscription || await db.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subToCheck) {
      return NextResponse.json({
        paid: false,
        message: 'No subscription found. Please initiate payment first.',
      });
    }

    // If already activated, return user immediately
    if (subToCheck.status === 'active' && subToCheck.razorpayPaymentId) {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (user) {
        const { password: _pw, ...userWithoutPassword } = user;
        return NextResponse.json({
          paid: true,
          message: 'Payment already verified',
          user: userWithoutPassword,
        });
      }
    }

    // Check if user is already PRO (might have been activated by webhook)
    const currentUser = await db.user.findUnique({ where: { id: userId } });
    if (currentUser?.isPro && currentUser.proExpiry && new Date() < currentUser.proExpiry) {
      const { password: _pw, ...userWithoutPassword } = currentUser;
      return NextResponse.json({
        paid: true,
        message: 'PRO is already active',
        user: userWithoutPassword,
      });
    }

    // Try to verify via Razorpay Order API (for Standard Checkout)
    const razorpayOrderId = subToCheck.razorpayOrderId;
    if (razorpayOrderId && razorpayOrderId.startsWith('order_')) {
      try {
        // Fetch payments for this order
        const payments = await getRazorpay().orders.fetchPayments(razorpayOrderId);

        // Check if any payment is captured
        const capturedPayment = payments.items?.find(
          (p: any) => p.status === 'captured'
        );

        if (capturedPayment) {
          // Payment confirmed — activate PRO!
          const paymentId = capturedPayment.id;

          // Update subscription
          await db.subscription.update({
            where: { id: subToCheck.id },
            data: {
              status: 'active',
              razorpayPaymentId: paymentId,
            },
          });

          // Activate PRO for user
          const proExpiry = new Date();
          proExpiry.setMonth(proExpiry.getMonth() + 1);

          const updatedUser = await db.user.update({
            where: { id: userId },
            data: { isPro: true, proExpiry },
          });

          // Create notification
          await notify({
            data: {
              userId,
              title: 'SINTHA PRO Activated!',
              message: 'Your SINTHA PRO subscription is now active. Enjoy premium features!',
              type: 'pro',
              relatedId: subToCheck.id,
            },
          });

          const { password: _pw, ...userWithoutPassword } = updatedUser;

          return NextResponse.json({
            paid: true,
            message: 'Payment verified and PRO activated!',
            user: userWithoutPassword,
          });
        }
      } catch (orderErr) {
        console.error('Order payment check failed:', orderErr);
        // Continue to payment link check below
      }
    }

    // Try payment link fetch (for Payment Link flow)
    if (paymentLinkId && paymentLinkId.startsWith('plink_')) {
      try {
        const paymentLink = await getRazorpay().paymentLink.fetch(paymentLinkId);

        if (paymentLink.status === 'paid') {
          const paymentId = paymentLink.payments?.[0]?.payment_id || null;

          await db.subscription.update({
            where: { id: subToCheck.id },
            data: {
              status: 'active',
              razorpayPaymentId: paymentId,
            },
          });

          const proExpiry = new Date();
          proExpiry.setMonth(proExpiry.getMonth() + 1);

          const updatedUser = await db.user.update({
            where: { id: userId },
            data: { isPro: true, proExpiry },
          });

          await notify({
            data: {
              userId,
              title: 'SINTHA PRO Activated!',
              message: 'Your SINTHA PRO subscription is now active. Enjoy premium features!',
              type: 'pro',
              relatedId: subToCheck.id,
            },
          });

          const { password: _pw, ...userWithoutPassword } = updatedUser;

          return NextResponse.json({
            paid: true,
            message: 'Payment verified and PRO activated!',
            user: userWithoutPassword,
          });
        }
      } catch (linkErr) {
        console.error('Payment link check failed:', linkErr);
      }
    }

    // Not paid yet
    return NextResponse.json({
      paid: false,
      message: 'Payment not completed yet. Please complete the payment first.',
    });
  } catch (error) {
    console.error('Check payment error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
