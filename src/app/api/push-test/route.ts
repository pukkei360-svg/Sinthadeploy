import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

export async function GET() {
  const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
  const app = getAdminApp();
  const initialized = !!app;

  return NextResponse.json({
    hasServiceAccountEnv: hasServiceAccount,
    firebaseAdminInitialized: initialized,
    ready: initialized,
    message: initialized
      ? 'Push notifications are READY!'
      : 'Firebase Admin SDK failed to initialize.',
  });
}
