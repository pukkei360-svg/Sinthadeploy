import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function GET() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!raw) {
    return NextResponse.json({ error: 'FIREBASE_SERVICE_ACCOUNT not set' });
  }

  const diag: Record<string, unknown> = {};

  // Decode (base64 or direct JSON)
  let jsonStr: string;
  if (raw.trim().startsWith('{')) {
    jsonStr = raw;
    diag.encoding = 'json';
  } else {
    jsonStr = Buffer.from(raw, 'base64').toString('utf8');
    diag.encoding = 'base64';
  }

  // Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
    diag.parsed = true;
  } catch (e) {
    diag.parsed = false;
    diag.error = e instanceof Error ? e.message : String(e);
    return NextResponse.json(diag);
  }

  // AGGRESSIVE newline fix for private_key
  // The key should look like: -----BEGIN PRIVATE KEY-----\nMIIE...\n...\n-----END PRIVATE KEY-----
  // When it comes from JSON.parse, \n might be literal backslash-n or actual newlines
  let pk = parsed.private_key;
  if (pk) {
    // First, check what we have
    diag.pkHasLiteralBackslashN = pk.includes('\\n');
    diag.pkHasActualNewlines = pk.includes('\n');
    diag.pkLength = pk.length;
    
    // Replace ALL literal \n (backslash followed by n) with actual newlines
    pk = pk.replace(/\\n/g, '\n');
    
    diag.pkHasLiteralBackslashNAfterFix = pk.includes('\\n');
    diag.pkHasActualNewlinesAfterFix = pk.includes('\n');
    diag.pkLengthAfterFix = pk.length;
  }

  // Try init with explicit params
  try {
    if (admin.apps.length > 0) {
      await admin.app().delete();
    }
    admin.initializeApp({
      credential: admin.credential.cert({
        type: 'service_account',
        project_id: parsed.project_id,
        private_key_id: parsed.private_key_id,
        private_key: pk,
        client_email: parsed.client_email,
        client_id: parsed.client_id,
        auth_uri: parsed.auth_uri,
        token_uri: parsed.token_uri,
        auth_provider_x509_cert_url: parsed.auth_provider_x509_cert_url,
        client_x509_cert_url: parsed.client_x509_cert_url,
      }),
    });
    diag.initSuccess = true;
    diag.ready = true;
  } catch (e) {
    diag.initSuccess = false;
    diag.initError = e instanceof Error ? e.message : String(e);
    diag.ready = false;
  }

  return NextResponse.json(diag);
}
