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
