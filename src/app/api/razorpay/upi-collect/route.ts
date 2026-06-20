import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

/**
 * POST /api/razorpay/upi-collect
 *
 * UPI Collect flow (Option B):
 *   1. User enters their UPI ID (VPA — e.g. "ram@okhdfcbank")
 *   2. This endpoint creates a Razorpay order + creates a UPI collect payment
 *      against that order. Razorpay sends a collect request to the user's UPI app.
 *   3. User opens GPay/PhonePe/Paytm → sees "SINTHA requested ₹199" → approves.
 *   4. Razorpay fires payment.captured webhook → user's PRO activates.
 *   5. Frontend polls /api/razorpay/upi-status to detect activation.
 *
 * WHY THIS EXISTS:
 *   Razorpay's checkout.js detects WebView (via User-Agent) and hides/disables
 *   GPay in the standard checkout flow. UPI Collect bypasses checkout.js entirely
 *   — the payment happens inside the user's UPI app, not in a WebView popup.
 *   Works in every browser, every WebView, every APK wrapper.
 *
 * Request body:
 *   { userId, vpa }  — vpa = UPI ID like "name@okhdfcbank"
 *
 * Response:
 *   { orderId, paymentId, status: 'created' }  — payment request sent
 *   { error }                                    — on failure
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, vpa } = body as { userId: string; vpa: string };

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!vpa || !vpa.includes('@')) {
      return NextResponse.json(
        { error: 'Valid UPI ID is required (e.g. yourname@okhdfcbank)' },
        { status: 400 }
      );
    }

    // Validate VPA format: letters/numbers/dots before @, letters after
    const vpaRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
    if (!vpaRegex.test(vpa.trim())) {
      return NextResponse.json(
        { error: 'Invalid UPI ID format. Example: yourname@okhdfcbank' },
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
    const cleanVpa = vpa.trim().toLowerCase();

    // Step 1: Create a Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `sintha_pro_upi_${Date.now()}`,
      method: ['upi'], // Restrict to UPI only (no card/netbanking on this order)
      notes: {
        userId,
        plan: 'pro',
        flow: 'upi_collect',
        vpa: cleanVpa,
      },
    });

    // Step 2: Create a UPI collect payment against the order
    // This sends a collect request to the user's UPI app.
    // Razorpay API: POST /v1/payments
    //   { amount, currency, order_id, method: 'upi', upi: { flow: 'collect', vpa } }
    let payment;
    try {
      payment = await razorpay.payments.create({
        amount,
        currency: 'INR',
        order_id: order.id,
        method: 'upi',
        upi: {
          flow: 'collect',
          vpa: cleanVpa,
        },
        notes: {
          userId,
          plan: 'pro',
          flow: 'upi_collect',
        },
      });
    } catch (payErr) {
      const errMsg = payErr instanceof Error ? payErr.message : String(payErr);

      // Common error: UPI Collect not enabled on the Razorpay account.
      // Surface a helpful message so the user knows it's a config issue,
      // not their fault.
      if (errMsg.toLowerCase().includes('not enabled') || errMsg.toLowerCase().includes('not available')) {
        return NextResponse.json(
          {
            error: 'UPI Collect is not enabled on this Razorpay account. Please use the Card/Net Banking option instead, or contact support.',
            code: 'UPI_COLLECT_NOT_ENABLED',
          },
          { status: 400 }
        );
      }

      // Common error: invalid VPA
      if (errMsg.toLowerCase().includes('invalid vpa') || errMsg.toLowerCase().includes('invalid upi')) {
        return NextResponse.json(
          { error: 'This UPI ID is not valid or not registered. Please check and try again.' },
          { status: 400 }
        );
      }

      // Generic payment creation error
      return NextResponse.json(
        {
          error: 'Failed to send UPI request. ' + errMsg,
          code: 'UPI_CREATE_FAILED',
        },
        { status: 400 }
      );
    }

    // Step 3: Save subscription record with the payment ID so we can poll
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await db.subscription.create({
      data: {
        userId,
        plan: 'pro',
        razorpayOrderId: order.id,
        razorpayPaymentId: payment.id, // Save payment ID for polling
        amount: amount / 100,
        currency: 'INR',
        status: 'created', // Will be updated to 'active' when payment.captured fires
        startDate: new Date(),
        endDate,
      },
    });

    console.log(`[UPI Collect] Payment request sent to ${cleanVpa} for user ${userId}, payment ID: ${payment.id}, status: ${payment.status}`);

    return NextResponse.json({
      orderId: order.id,
      paymentId: payment.id,
      subscriptionId: subscription.id,
      status: payment.status || 'created',
      vpa: cleanVpa,
      amount: amount / 100,
      message: 'Payment request sent! Open your UPI app (GPay/PhonePe/Paytm) to approve the ₹199 request.',
    });
  } catch (error) {
    console.error('[UPI Collect] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create UPI collect request — ' + message },
      { status: 500 }
    );
  }
}
