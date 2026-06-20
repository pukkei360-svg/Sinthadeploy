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
 *   2. We validate the VPA via Razorpay's validateVpa API
 *   3. We create a Razorpay order
 *   4. We create a UPI collect payment via razorpay.payments.createUpi()
 *      — this sends a collect request to the user's UPI app
 *   5. User opens GPay/PhonePe/Paytm → sees "SINTHA requested ₹199" → approves
 *   6. Razorpay fires payment.captured webhook → user's PRO activates
 *   7. Frontend polls /api/razorpay/upi-status to detect activation
 *
 * WHY THIS EXISTS:
 *   Razorpay's checkout.js detects WebView (via User-Agent) and hides/disables
 *   GPay in the standard checkout flow. UPI Collect bypasses checkout.js entirely
 *   — the payment happens inside the user's UPI app, not in a WebView popup.
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

    // Step 1: Validate the VPA using Razorpay's validateVpa API
    // This checks if the UPI ID is registered before we send a collect request
    try {
      const vpaValidation = await razorpay.payments.validateVpa({ vpa: cleanVpa });
      console.log(`[UPI Collect] VPA validation for ${cleanVpa}:`, vpaValidation);
      if (!vpaValidation.success) {
        return NextResponse.json(
          { error: `UPI ID "${cleanVpa}" is not valid or not registered. Please check and try again.` },
          { status: 400 }
        );
      }
    } catch (validateErr) {
      // validateVpa may fail if the feature isn't enabled, or VPA is invalid
      const errMsg = validateErr instanceof Error ? validateErr.message : String(validateErr);
      console.warn('[UPI Collect] VPA validation failed (continuing anyway):', errMsg);
      // Don't fail here — some Razorpay accounts don't have validateVpa enabled.
      // The createUpi call below will fail with a clearer error if the VPA is bad.
    }

    // Step 2: Create a Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `sintha_pro_upi_${Date.now()}`,
      method: ['upi'],
      notes: {
        userId,
        plan: 'pro',
        flow: 'upi_collect',
        vpa: cleanVpa,
      },
    });

    // Step 3: Create a UPI collect payment using razorpay.payments.createUpi()
    // This is the correct SDK method for UPI Collect (not payments.create)
    // Required fields: amount, currency, order_id, method, email, contact, ip, referer, user_agent, upi.flow, upi.vpa
    let paymentId: string;
    try {
      const payment = await razorpay.payments.createUpi({
        amount,
        currency: 'INR',
        order_id: order.id,
        method: 'upi',
        email: user.email || 'customer@sintha.app',
        contact: user.phone || '9999999999',
        ip: '127.0.0.1', // Server IP — Razorpay requires this field
        referer: 'https://sinthadeploy.vercel.app',
        user_agent: 'SINTHA/1.0',
        notes: {
          userId,
          plan: 'pro',
          flow: 'upi_collect',
        },
        upi: {
          flow: 'collect',
          vpa: cleanVpa,
          expiry_time: 5, // 5 minutes (Razorpay default)
        },
      });
      paymentId = payment.razorpay_payment_id;
      console.log(`[UPI Collect] Payment created: ${paymentId} for VPA ${cleanVpa}`);
    } catch (payErr) {
      const errMsg = payErr instanceof Error ? payErr.message : String(payErr);
      console.error('[UPI Collect] createUpi failed:', errMsg);

      // Common error: UPI Collect not enabled on the Razorpay account
      if (errMsg.toLowerCase().includes('not enabled') || errMsg.toLowerCase().includes('not available')) {
        return NextResponse.json(
          {
            error: 'UPI Collect is not enabled on this Razorpay account. Please use the Card/Net Banking option instead, or contact Razorpay support to enable UPI Collect.',
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

    // Step 4: Save subscription record with the payment ID so we can poll
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await db.subscription.create({
      data: {
        userId,
        plan: 'pro',
        razorpayOrderId: order.id,
        razorpayPaymentId: paymentId,
        amount: amount / 100,
        currency: 'INR',
        status: 'created',
        startDate: new Date(),
        endDate,
      },
    });

    console.log(`[UPI Collect] Payment request sent to ${cleanVpa} for user ${userId}, payment ID: ${paymentId}`);

    return NextResponse.json({
      orderId: order.id,
      paymentId,
      subscriptionId: subscription.id,
      status: 'created',
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
