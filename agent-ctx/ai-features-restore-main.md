# Work Record: ai-features-restore

**Agent**: main (super-z)
**Task ID**: ai-features-restore
**Date**: 2026-06-23

## Goal

Restore/add the AI feature UI surfaces across 4 SINTHA screens, all backed by 4 pre-existing AI API endpoints (`/api/ai/smart-search`, `/api/ai/estimate-price`, `/api/ai/optimize-profile`, `/api/ai/improve-job`). The endpoints existed; only the client-side UI had been lost / never wired.

## Files Modified

1. `src/components/sintha/HomeScreen.tsx` — added purple AI Smart Search bar between `PushNotificationPrompt` and the regular search bar.
2. `src/components/sintha/PriceEstimatorScreen.tsx` — **new file**. Job-description textarea, example chips, "Get Price Estimate" button, low/median/high estimate cards, duration, factors, tips.
3. `src/components/sintha/ProviderDashboardScreen.tsx` — added purple "AI Profile Optimizer" card after Quick Actions; surfaces score ring, strengths, prioritized improvements, suggested description, rate suggestion, tips.
4. `src/components/sintha/PostJobScreen.tsx` — added "AI Improve" button next to the Description label (only when ≥ 10 chars typed); also added an "Estimate with AI" link next to the Budget label that navigates to the new Price Estimator; supports `prefilledDescription` viewParam from the Price Estimator's "Post this job →" CTA.
5. `src/lib/store.ts` — added `'price-estimator'` to the `View` type union.
6. `src/app/page.tsx` — imported `PriceEstimatorScreen` and added the `case 'price-estimator'` branch.

## Implementation Notes

- All API calls use the existing `apiFetch` from `@/lib/api` (typed via TypeScript generics so the response shape is known at the call site — no new `unknown` errors introduced).
- All errors are surfaced through the existing `useToast` hook and cleaned with `cleanError` from `@/lib/clean-error`.
- Code style matches the existing screens: same Tailwind class conventions (`rounded-xl`, `shadow-sm`, `text-[10px]` for tiny labels, `sintha-gradient` for the brand color, `sintha-scrollbar` for custom scrollbars, `active:scale-[0.99]` for tap feedback).
- Visual language for all AI surfaces: **purple gradient** (`from-purple-600 to-violet-600`) + **Sparkles icon** + **"SINTHA AI" badge**, so the four AI surfaces feel like one product family.
- Match-score circles are drawn with inline SVG (strokeDasharray on a rotated `<circle>`) so they don't need any extra charting library.
- Loading states use either `Loader2` with `animate-spin` (button) or `animate-pulse` shimmers (cards).
- The AI Improve button on PostJobScreen is intentionally hidden until the description is ≥ 10 chars — keeps the form clean and avoids an AI call on empty input.
- The Price Estimator's "Post this job →" button passes `prefilledDescription` via `viewParams`, and PostJobScreen picks that up in a `useEffect` so the user doesn't have to re-type.

## Lint / Type Check

- `bun run lint` — no new errors introduced. (3 pre-existing errors in `scripts/cleanup_database.js`, `OfflineBootScreen.tsx`, and `use-push-registration.ts` are unrelated to this task and unchanged.)
- `tsc --noEmit` — no new errors in any file I touched. The remaining `data is of type 'unknown'` errors are the pre-existing pattern from `apiFetch` calls without explicit type parameters; my new calls all supply explicit generics (`apiFetch<AiSearchMatch[]>`, `apiFetch<PriceEstimate>`, `apiFetch<AiProfileSuggestion>`, etc.) so they don't contribute to the error count.

## Entry Points to the new screens

- **AI Smart Search** — always visible at the top of `HomeScreen` (between PushNotificationPrompt and the regular search bar).
- **AI Price Estimator** — reachable two ways:
  1. From `PostJobScreen` → "Estimate with AI" link next to the Budget label.
  2. Direct navigation via `navigate('price-estimator')` from anywhere.
- **AI Profile Optimizer** — purple card on `ProviderDashboardScreen`, after the Quick Actions grid.
- **AI Improve** — inline button on `PostJobScreen` next to the Description label (appears once ≥ 10 chars are typed).

## Stage Summary

All 4 AI features are now wired end-to-end on the client side. The 4 backend endpoints were already in place — no backend changes were needed. The new UI surfaces are visually consistent (purple + Sparkles + SINTHA AI badge), use the project's existing `apiFetch` / `useToast` / `cleanError` helpers, and pass lint + type checks with no new errors.
