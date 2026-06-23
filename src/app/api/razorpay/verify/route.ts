import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchemaMigrated } from '@/lib/migrate-schema';
import crypto from 'crypto';
import { notify } from '@/lib/notify';

// 30% commission rate for referrals — referrer earns this much of the
// PRO subscription price, every time the referred user buys/renews PRO.
const REFERRAL_COMMISSION_RATE = 0.30;

export async function POST(request: NextRequest) {
  try {
    await ensureSchemaMigrated();

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

    // ── Referral commission: if this user was referred by someone,
    //     the referrer earns 30% of the PRO price. This happens EVERY
    //     time the referred user buys/renews PRO (lifetime commission). ──
    try {
      const buyer = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, referredBy: true, name: true },
      });

      if (buyer?.referredBy) {
        // Find the referrer by their referral code
        const referrer = await db.user.findUnique({
          where: { referralCode: buyer.referredBy },
          select: { id: true, name: true },
        });

        if (referrer) {
          // Calculate 30% of the subscription amount
          const commissionAmount = subscription.amount * REFERRAL_COMMISSION_RATE;

          await db.referralEarning.create({
            data: {
              referrerId: referrer.id,
              referredUserId: userId,
              subscriptionId: subscription.id,
              amount: commissionAmount,
              status: 'pending',
            },
          });

          // Notify the referrer about their commission
          await notify({
            data: {
              userId: referrer.id,
              title: '🎁 Referral Earning!',
              message: `${buyer.name} just activated SINTHA PRO. You earned ₹${commissionAmount.toFixed(2)} (30% lifetime commission).`,
              type: 'referral',
              relatedId: subscription.id,
            },
          });

          console.log(`[referral] ${referrer.name} earned ₹${commissionAmount} from ${buyer.name}'s PRO purchase`);
        }
      }
    } catch (referralErr) {
      // Referral earning failed — don't fail the whole payment verification
      console.error('[referral] Failed to create earning:', referralErr);
    }

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
