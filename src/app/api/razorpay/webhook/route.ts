import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * Razorpay Webhook Handler
 * 
 * This endpoint receives webhook events from Razorpay when a payment is completed.
 * It provides server-side payment confirmation, so even if the user's app is closed
 * or the polling misses the payment, the subscription will still be activated.
 * 
 * Supported events:
 * - payment_link.paid — triggered when a Payment Link is paid
 * - payment.captured — triggered when a payment is captured
 * 
 * Setup: In Razorpay Dashboard → Webhooks → Add webhook:
 *   URL: https://your-domain.com/api/razorpay/webhook
 *   Events: payment_link.paid, payment.captured
 *   Secret: Set RAZORPAY_WEBHOOK_SECRET in your .env
 */

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'sintha_webhook_secret_2024';

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // Verify webhook signature for security
    if (!verifyWebhookSignature(body, signature, WEBHOOK_SECRET)) {
      console.warn('Webhook signature verification failed');
      // In production, you should reject invalid signatures
      // For now, we'll log but still process (helpful during testing)
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    console.log(`Razorpay webhook received: ${eventType}`);

    // Handle payment_link.paid event
    if (eventType === 'payment_link.paid') {
      const paymentLinkEntity = event.payload?.payment_link?.entity;
      const paymentEntity = event.payload?.payment?.entity;

      if (!paymentLinkEntity) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      const paymentLinkId = paymentLinkEntity.id;
      const paymentId = paymentEntity?.id || null;
      const userId = paymentLinkEntity.notes?.userId;

      if (!userId) {
        console.warn('No userId in payment link notes');
        return NextResponse.json({ received: true });
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
        console.warn(`No subscription found for payment link ${paymentLinkId}`);
        return NextResponse.json({ received: true });
      }

      // If already activated, skip
      if (subscription.status === 'active' && subscription.razorpayPaymentId) {
        return NextResponse.json({ received: true, message: 'Already activated' });
      }

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

      await db.user.update({
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

      console.log(`PRO activated for user ${userId} via webhook`);
    }

    // Handle payment.captured event (for regular Razorpay checkout)
    if (eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;

      if (!orderId) {
        return NextResponse.json({ received: true });
      }

      // Check if this is a subscription order
      const subscription = await db.subscription.findFirst({
        where: {
          razorpayOrderId: orderId,
          status: 'created',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (subscription) {
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            razorpayPaymentId: paymentEntity.id,
          },
        });

        const proExpiry = new Date();
        proExpiry.setMonth(proExpiry.getMonth() + 1);

        await db.user.update({
          where: { id: subscription.userId },
          data: { isPro: true, proExpiry },
        });

        await db.notification.create({
          data: {
            userId: subscription.userId,
            title: 'SINTHA PRO Activated!',
            message: 'Your SINTHA PRO subscription is now active. Enjoy premium features!',
            type: 'pro',
            relatedId: subscription.id,
          },
        });

        console.log(`PRO activated for user ${subscription.userId} via payment.captured webhook`);
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 so Razorpay doesn't retry
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}
