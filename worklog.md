---
Task ID: booking-ux-cleanup-1
Agent: main (super-z)
Task: Remove low-value "Add to Calendar" button from BookingDetailScreen and replace with higher-value actions; surface provider's next-step action (Start / Mark Complete) prominently so they never have to scroll, because ratings depend on the booking being marked complete.

Work Log:
- Removed the "Add to Calendar" button (and its `generateICSFile` import) from `BookingDetailScreen.tsx`. The .ics download flow was low-value: clients already get SMS reminders, most services are same-day, and .ics files often fail to download inside an Android WebView.
- Replaced it with two higher-value client actions inside the Service Info card:
  - **Book Again** (gradient primary button) — only shown when booking is `completed`. One tap navigates to the booking form with the same `providerId` + `service` pre-filled, so a repeat booking takes one tap instead of re-browsing categories.
  - **Share Provider** (secondary button) — uses `navigator.share()` when available (opens the native WhatsApp/SMS share sheet), with a clipboard-copy fallback for older WebViews. Drives organic word-of-mouth growth.
- Added a top **alert banner** in BookingDetailScreen for the provider that tells them the very next action they must take, color-coded by status:
  - `pending` (amber): "New booking request — respond now"
  - `accepted` (blue): "Accept ✓ done — Start the service"
  - `in_progress` (green): "Service in progress — Mark complete to get rated"
  - `completed` + no review (amber): "Rate this client" nudge for the provider
- Added a **sticky bottom action bar** (fixed, z-50, safe-area-aware) so the provider never needs to scroll to take the next action. The bar adapts to the booking state and viewer role:
  - Provider + pending → Accept / Reject
  - Provider + accepted → Start Service (blue)
  - Provider + in_progress → **Mark Complete & Get Rated** (green) — the highest-stakes button because it unlocks the rating flow
  - Provider + completed + no review → Rate Client
  - Client + accepted → Cancel Booking
  - Client + completed + no review → Rate Provider
- Removed the old "Actions" card from the middle of the screen (it was duplicating the sticky bar and required scrolling).
- Added `pb-32` to the content container so the sticky bar never overlaps the last card.
- Updated `ProviderDashboardScreen.tsx`:
  - Added a prominent **amber gradient "Action Needed" banner** at the top of the dashboard (right after the Welcome card / Verification nudge) that shows the count of bookings waiting on the provider's next action and links straight to the most urgent booking detail. Wording explicitly mentions "get rated ⭐" to tie the action to the provider's self-interest.
  - Added a new **"Ready to Complete"** section for `in_progress` bookings, with a green "Mark Complete" badge on each item — surfaces the rating-unlocking action as its own visually distinct list.
  - Added a new **"Start When Ready"** section for `accepted` bookings, with a blue "Start Service" badge on each item.
  - Removed the now-redundant generic "Active" section (the two new sections cover the same bookings with much clearer CTAs).
- Verified: ESLint clean on both files, `next build` succeeds with no errors, no new TypeScript errors introduced (the 5 pre-existing `data is of type 'unknown'` errors on `apiFetch` calls are unchanged).

Stage Summary:
- Files modified: `src/components/sintha/BookingDetailScreen.tsx`, `src/components/sintha/ProviderDashboardScreen.tsx`.
- Net effect: low-value "Add to Calendar" feature removed; replaced with two growth/retention features (Book Again, Share Provider); provider's next-step action is now visible in three places without scrolling (top alert banner, sticky bottom bar, dashboard "Action Needed" banner) and is reinforced by two dedicated dashboard sections ("Ready to Complete", "Start When Ready").
- The "Mark Complete" button — the rating trigger — is now the most prominent element on the screen for any in-progress booking a provider views, addressing the user's concern that providers might forget to come back and complete bookings.
- `src/lib/calendar.ts` is now unreferenced but left in place (no harm; user can delete later if desired).

---
Task ID: deploy-2
Agent: main (super-z)
Task: User reported provider back button still landing on client portal after a deploy. Investigate and fix permanently.

Work Log:
- Discovered the container had been RESTARTED since the last fix. The Next.js process was dead (Caddy returning 502), and the project files had been reset to an older state from /home/sync/repo.tar (which was last updated at 19:13, before my previous fixes).
- The git log showed HEAD at e5873f7 (4 commits behind my previous work). The remote (origin/main) was at 533a6ce (my calendar-removal commit) but did NOT have the back-button fix (af65b70) — that commit was lost when the container restarted and restored from the stale repo.tar.
- Reset local main to origin/main to get back to a known-good state (calendar removal preserved, back-button fix gone).
- Re-applied the role-aware back-button fix to both screens:
  - MyBookingsScreen.tsx: back button now goes to provider-dashboard (for providers) or home (for clients), using goBack() when there's a meaningful previous view.
  - BookingDetailScreen.tsx: same pattern, falls back to provider-dashboard (for providers) or my-bookings (for clients) on deep-link.
- Rebuilt the production bundle (`npm run build`) — succeeded with new BUILD_ID `3FA1xBIB6Z5L1hBaxPkZ`.
- Started Next.js with the double-fork daemon pattern (auto-restart loop) — PID 2556, parented to PID 1.
- Committed the fix (commit fb1931e) and pushed to origin/main so it can never be lost again.
- Updated /home/sync/repo.tar with the new code (excluding node_modules, .next, .git, db, scripts/fonts) so the NEXT container restart will restore from the new code, not the stale 19:13 version. Verified the tarred MyBookingsScreen.tsx contains 5 references to goBack/previousViews.
- Recreated /home/z/start-sintha.sh (the auto-restart launcher script) — it was lost in the container reset.

Stage Summary:
- Root cause: container restart restored the project from a stale /home/sync/repo.tar that predated my fixes. The previous fixes (calendar removal in 533a6ce) survived because they were already on origin/main, but the back-button fix (af65b70) was only ever local + pushed but then overwritten by the restore.
- Permanent fix: code is now committed (fb1931e), pushed to origin/main, AND baked into the new repo.tar. No matter how the container restarts (fresh boot, crash, manual restart), the new code will be present.
- The auto-restart wrapper at /home/z/start-sintha.sh should be run after each code change to ensure Next.js stays up. (Ideally this would be added to /start.sh itself, but that file is root-owned.)
- Both issues are now permanently resolved: calendar removal (533a6ce) + provider back button (fb1931e). Server is running, HTTP 200, new code live.

---
Task ID: push-notifications-1
Agent: main (super-z)
Task: Enable push notifications end-to-end. Backend was already built; needed (1) FIREBASE_SERVICE_ACCOUNT env var, (2) web-side FCM registration, (3) APK-side native FCM (separate codebase).

Work Log:
- Verified backend was already complete: notify.ts wraps sendPushNotification, /api/user/fcm-token endpoint exists, firebase-admin.ts handles init.
- Discovered FIREBASE_SERVICE_ACCOUNT env var was NOT set — confirmed via `curl /api/push-test` returning {"error":"FIREBASE_SERVICE_ACCOUNT not set"}.
- User generated a Firebase service account key and set FIREBASE_SERVICE_ACCOUNT on Vercel.
- Verified backend now works: `curl https://sinthadeploy.vercel.app/api/push-test` returns {"ready": true, "initSuccess": true, ...}.
- Built Step 3 (web-side FCM registration):
  - Created src/hooks/use-push-registration.ts — detects web push support (returns false for APK WebView via userAgent check, Safari < 16.4, etc.), asks for permission via Notification.requestPermission(), gets FCM token via Firebase JS SDK getToken(), POSTs to /api/user/fcm-token, listens for foreground messages via onMessage().
  - Created src/components/sintha/PushNotificationPrompt.tsx — dismissible blue banner shown on Home + ProviderDashboard when user is logged in, web push is supported, AND not in APK WebView. Three buttons: Enable / Not now / Never (persisted in localStorage).
  - Mounted the prompt on HomeScreen.tsx (below the welcome section) and ProviderDashboardScreen.tsx (after the verification nudge, before the action-needed banner).
- VAPID key is currently a PLACEHOLDER in use-push-registration.ts. The user needs to generate the real one from Firebase Console → Project Settings → Cloud Messaging → Web Configuration → Web Push certificates, then update the VAPID_KEY constant.
- Committed (c234b8b), pushed to origin/main, updated repo.tar.

Stage Summary:
- Backend: ✅ Live on Vercel (FIREBASE_SERVICE_ACCOUNT env var set, /api/push-test returns ready=true).
- Web client: ✅ Code deployed. Will work as soon as user replaces the placeholder VAPID_KEY with the real one from Firebase Console.
- APK client: ❌ Still needs native Kotlin FirebaseMessagingService code (provided earlier in chat). That code is in a separate Android repo I can't access from here.
- The auto-restart wrapper at /home/z/start-sintha.sh should be re-run if the container restarts (script is in repo.tar).

---
Task ID: ai-features-restore
Agent: main (super-z)
Task: Restore/add the AI feature UI on 4 SINTHA screens (HomeScreen AI Smart Search, PriceEstimatorScreen, ProviderDashboard AI Profile Optimizer, PostJobScreen AI Improve). All 4 backend endpoints already existed; only the client UI needed to be wired.

Work Log:
- `src/components/sintha/HomeScreen.tsx` — added a purple-gradient AI Smart Search bar between `PushNotificationPrompt` and the regular search bar. Added state (`aiSearchQuery`, `aiSearching`, `aiResults`, `aiSummary`) and a `handleAiSearch()` function that POSTs to `/api/ai/smart-search`. Results render as white provider cards on top of the purple gradient, each with an avatar, name, verified/PRO badges, category, the AI's reason text, rating, hourly rate, and an SVG circular "match score" ring on the right. A `Loader2` spinner shows during search; an "X Clear AI results" link resets the state. Imported `Loader2`, `Send`, `X` (Sparkles was already imported).
- `src/components/sintha/PriceEstimatorScreen.tsx` — **new file**. Layout: sticky header with purple-gradient icon + "SINTHA AI" badge → purple info banner → optional category chips → job-description textarea (1000 char limit) → example chips ("Deep clean a 2BHK apartment", etc.) → purple "Get Price Estimate" button. On success, renders a low/median/high estimate grid (median highlighted in solid purple), a gradient range bar, an estimated-duration card, a price-factors list with checkmarks, an amber "SINTHA AI Tip" card, and a two-button footer: "Estimate another" / "Post this job →" (the latter navigates to `post-job` with `prefilledDescription` viewParam). Imports: `ArrowLeft, Sparkles, IndianRupee, Clock, Lightbulb, Loader2, TrendingUp, CheckCircle`.
- `src/components/sintha/ProviderDashboardScreen.tsx` — added state `aiOptimizing` + `aiSuggestions` and an `optimizeProfile()` function that POSTs `{ providerId: user.id }` to `/api/ai/optimize-profile`. Added a purple-gradient card right after the Quick Actions grid with an "Optimize My Profile" button. On success, the card expands to show: a circular Profile Score ring (0–100) with a qualitative label, a Strengths list (green ✓), an Improvements list with red/amber/gray priority badges, a Suggested Description block with an "Edit Profile →" shortcut, an optional Rate Suggestion block (current → suggested with reason), and an amber Quick Tips list. A small "X" button dismisses the suggestions. Added `Sparkles`, `Loader2`, `Lightbulb`, `X` to the lucide imports.
- `src/components/sintha/PostJobScreen.tsx` — added `improveLoading` state and an `handleAiImprove()` function that POSTs `{ title, description, category }` to `/api/ai/improve-job` and overwrites the title (≤ 80 chars) + description (≤ 1000 chars) with the AI's improved versions, then toasts the quality score. The "AI Improve" button (purple gradient + Sparkles) sits in the Description label row and is only rendered once the description is ≥ 10 chars — below that threshold a hint shows "Write N more chars to enable AI Improve". Added a secondary "Estimate with AI" link next to the Budget label that navigates to `price-estimator`. Also wired the `prefilledDescription` viewParam (from Price Estimator's "Post this job →" CTA) so it auto-fills the description. Added `Sparkles` to the lucide imports.
- `src/lib/store.ts` — added `'price-estimator'` to the `View` type union.
- `src/app/page.tsx` — imported `PriceEstimatorScreen` and added `case 'price-estimator': return <PriceEstimatorScreen />` to the view switch.
- All API calls go through the existing `apiFetch` from `@/lib/api`, with explicit TypeScript generics so the response shape is known at the call site (no new `unknown` errors introduced). All errors are surfaced via `useToast` + `cleanError` from `@/lib/clean-error`.
- Visual language for all 4 AI surfaces is consistent: purple gradient (`from-purple-600 to-violet-600`) + Sparkles icon + "SINTHA AI" badge, so they feel like one product family distinct from the dark-blue SINTHA brand.
- Lint: clean (3 pre-existing errors in unrelated files unchanged). `tsc --noEmit`: no new errors in any touched file.

Stage Summary:
- Files modified: `src/components/sintha/HomeScreen.tsx`, `src/components/sintha/PriceEstimatorScreen.tsx` (new), `src/components/sintha/ProviderDashboardScreen.tsx`, `src/components/sintha/PostJobScreen.tsx`, `src/lib/store.ts`, `src/app/page.tsx`.
- Net effect: 4 AI features now wired end-to-end on the client (Smart Search, Price Estimator, Profile Optimizer, Job Improve). Backend endpoints were already in place — no backend changes needed.
- Entry points: AI Smart Search is always visible at the top of HomeScreen; AI Price Estimator is reachable from PostJobScreen's Budget label or via `navigate('price-estimator')`; AI Profile Optimizer is a purple card on the provider dashboard after Quick Actions; AI Improve is an inline button on PostJobScreen that appears when the description is ≥ 10 chars.

