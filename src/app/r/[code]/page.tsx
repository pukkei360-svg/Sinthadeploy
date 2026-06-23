import { redirect } from 'next/navigation';

/**
 * /r/[code] — referral link handler.
 *
 * When someone clicks a shared referral link like:
 *   https://sintha.app/r/IRABOT7K
 *
 * This route redirects them to the main app with the referral code
 * stored in localStorage. The RoleSelectScreen reads it from localStorage
 * and pre-fills the referral code input.
 *
 * This keeps the shared URL clean and branded (sintha.app/r/CODE)
 * instead of exposing the real Vercel deployment URL.
 *
 * Note: this only works once sintha.app DNS points to the app.
 * Until then, users manually enter the code on the signup screen.
 */

export default async function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // Redirect to the main app, passing the referral code via query param.
  // The app's page.tsx will read this and store it in localStorage so
  // the RoleSelectScreen can pre-fill the referral input.
  const upperCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Redirect to the root with the referral code as a query param.
  // The page.tsx onAuthStateChanged flow will pick it up from there.
  redirect(`/?ref=${upperCode}`);
}
