import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

/**
 * GET /api/razorpay/upi-debug
 *
 * Debug endpoint to diagnose UPI Collect failures.
 * Returns whether Razorpay keys are configured and whether the
 * validateVpa + createUpi methods work. No DB access — purely
 * a diagnostic tool.
 *
 * Usage: visit /api/razorpay/upi-debug in your browser to see
 * what's going wrong with UPI Collect.
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    steps: [],
  };

  // Step 1: Check env vars
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  (diagnostics.steps as Array<Record<string, unknown>>).push({
    step: 'env-check',
    keyIdPresent: !!keyId,
    keySecretPresent: !!keySecret,
    keyIdPrefix: keyId ? keyId.slice(0, 8) + '...' : null,
  });

  if (!keyId || !keySecret) {
    diagnostics.error = 'Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel env vars.';
    return NextResponse.json(diagnostics, { status: 500 });
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  // Step 2: Try validateVpa with Razorpay's official test VPA
  try {
    const vpaResult = await razorpay.payments.validateVpa({
      vpa: 'success@razorpay',
    });
    (diagnostics.steps as Array<Record<string, unknown>>).push({
      step: 'validate-vpa',
      success: true,
      result: vpaResult,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errObj = err as { error?: { code?: string; description?: string } };
    (diagnostics.steps as Array<Record<string, unknown>>).push({
      step: 'validate-vpa',
      success: false,
      error: errMsg,
      errorCode: errObj.error?.code,
      errorDescription: errObj.error?.description,
    });
  }

  // Step 3: Try creating an order
  try {
    const order = await razorpay.orders.create({
      amount: 19900,
      currency: 'INR',
      receipt: `debug_${Date.now()}`,
      notes: { debug: 'true' },
    });
    (diagnostics.steps as Array<Record<string, unknown>>).push({
      step: 'create-order',
      success: true,
      orderId: order.id,
    });

    // Step 4: Try createUpi with the test VPA against this order
    try {
      const upiPayment = await razorpay.payments.createUpi({
        amount: 19900,
        currency: 'INR',
        order_id: order.id,
        method: 'upi',
        email: 'test@sintha.app',
        contact: '9999999999',
        ip: '127.0.0.1',
        referer: 'https://sinthadeploy.vercel.app',
        user_agent: 'SINTHA/1.0',
        notes: { debug: 'true' },
        upi: {
          flow: 'collect',
          vpa: 'success@razorpay',
          expiry_time: 5,
        },
      });
      (diagnostics.steps as Array<Record<string, unknown>>).push({
        step: 'create-upi',
        success: true,
        paymentId: upiPayment.razorpay_payment_id,
        link: upiPayment.link,
      });
    } catch (upiErr) {
      const errMsg = upiErr instanceof Error ? upiErr.message : String(upiErr);
      const errObj = upiErr as { error?: { code?: string; description?: string; field?: string } };
      (diagnostics.steps as Array<Record<string, unknown>>).push({
        step: 'create-upi',
        success: false,
        error: errMsg,
        errorCode: errObj.error?.code,
        errorDescription: errObj.error?.description,
        errorField: errObj.error?.field,
      });
      diagnostics.createUpiFailed = true;
    }
  } catch (orderErr) {
    const errMsg = orderErr instanceof Error ? orderErr.message : String(orderErr);
    const errObj = orderErr as { error?: { code?: string; description?: string } };
    (diagnostics.steps as Array<Record<string, unknown>>).push({
      step: 'create-order',
      success: false,
      error: errMsg,
      errorCode: errObj.error?.code,
      errorDescription: errObj.error?.description,
    });
  }

  // Summary
  const failedSteps = (diagnostics.steps as Array<{ step: string; success: boolean }>).filter(
    (s) => !s.success
  );
  diagnostics.allPassed = failedSteps.length === 0;
  diagnostics.failedSteps = failedSteps.map((s) => s.step);

  return NextResponse.json(diagnostics, { status: diagnostics.allPassed ? 200 : 500 });
}
