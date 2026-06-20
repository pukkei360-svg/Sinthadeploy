import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

/**
 * GET /api/razorpay/upi-status?userId=xxx&paymentId=yyy
 *
 * Polls the status of a UPI Collect payment.
 * Called by the frontend every 3-5 seconds after the user taps "Request ₹199 via UPI".
 *
 * Returns:
 *   { paid: true, user }            — payment captured, PRO activated
 *   { paid: false, status: '...', message: '...' } — still pending
 *   { failed: true, error: '...' }  — payment failed/expired
 *
 * The webhook (/api/razorpay/webhook) fires `payment.captured` when the user
 * approves the UPI request — that's what actually activates PRO. This endpoint
 * is a polling fallback so the frontend knows when to redirect to "Activated!".
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const paymentId = searchParams.get('paymentId');

    if (!userId || !paymentId) {
      return NextResponse.json(
        { error: 'userId and paymentId are required' },
        { status: 400 }
      );
    }

    // First check the database — the webhook may have already activated PRO.
    // This avoids hitting the Razorpay API on every poll.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isPro: true,
        proExpiry: true,
        photoUrl: true,
        phone: true,
        location: true,
        isVerified: true,
        isBlocked: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If PRO is already active (webhook fired), return success immediately
    if (user.isPro && user.proExpiry && new Date() < user.proExpiry) {
      return NextResponse.json({
        paid: true,
        user,
        message: 'Payment received! PRO activated.',
      });
    }

    // Otherwise, fetch the payment status from Razorpay
    let paymentStatus = 'created';
    let razorpayError: string | null = null;
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      paymentStatus = payment.status;

      // If Razorpay says captured but our DB hasn't updated yet, update it now
      // (in case the webhook was slow or missed)
      if (payment.status === 'captured') {
        const subscription = await db.subscription.findFirst({
          where: {
            userId,
            razorpayPaymentId: paymentId,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (subscription && subscription.status !== 'active') {
          // Activate PRO directly here (webhook may not have fired yet)
          await db.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'active',
              razorpayPaymentId: paymentId,
            },
          });

          const proExpiry = new Date();
          proExpiry.setMonth(proExpiry.getMonth() + 1);

          await db.user.update({
            where: { id: userId },
            data: { isPro: true, proExpiry },
          });

          // Refresh user object
          const updatedUser = await db.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isPro: true,
              proExpiry: true,
              photoUrl: true,
              phone: true,
              location: true,
              isVerified: true,
              isBlocked: true,
            },
          });

          return NextResponse.json({
            paid: true,
            user: updatedUser,
            message: 'Payment received! PRO activated.',
          });
        }
      }

      // If payment failed, return failure
      if (payment.status === 'failed') {
        const errorDescription = (payment as unknown as { error_description?: string }).error_description;
        razorpayError = errorDescription || 'Payment was declined or failed.';
        return NextResponse.json({
          paid: false,
          failed: true,
          status: paymentStatus,
          error: razorpayError,
          message: 'Payment failed. Please try again.',
        });
      }
    } catch (fetchErr) {
      // If we can't reach Razorpay, just return "still pending" — the
      // webhook might still fire. Don't fail the polling.
      console.warn('[UPI Status] Could not fetch from Razorpay:', fetchErr instanceof Error ? fetchErr.message : 'unknown');
    }

    // Still pending — user hasn't approved yet
    const messages: Record<string, string> = {
      created: 'Waiting for you to approve the request in your UPI app...',
      attempted: 'Payment is being processed...',
      pending: 'Waiting for approval in your UPI app...',
    };

    return NextResponse.json({
      paid: false,
      status: paymentStatus,
      message: messages[paymentStatus] || 'Waiting for payment...',
    });
  } catch (error) {
    console.error('[UPI Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
