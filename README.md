# SINTHA — Service Marketplace for Manipur

A service marketplace web app (with Android APK via WebView) connecting clients with local service providers in Manipur, India. Built with Next.js 16, Prisma (PostgreSQL), Firebase, and Razorpay.

---

## 🚀 Quick Deploy to Vercel (15 minutes)

### Step 1 — Push to GitHub (already done)
This repo is already on GitHub. Vercel will import it directly.

### Step 2 — Import to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project**.
3. Import this `Sinthadeploy` repo.
4. Vercel auto-detects Next.js — leave defaults.

### Step 3 — Create a Vercel Postgres Database
1. In your Vercel project dashboard, click the **Storage** tab.
2. Click **Create Database → Postgres (Neon)** — FREE.
3. Name it `sintha-db` → **Create**.
4. Click **Connect to Project** → Vercel auto-adds `DATABASE_URL` env var.

> Alternative: use any hosted Postgres (Neon, Supabase, Railway). Paste its connection string as `DATABASE_URL`.

### Step 4 — Add Environment Variables
In Vercel dashboard → **Settings → Environment Variables**, add each (tick "All Environments"):

| Name | Value |
|------|-------|
| `RAZORPAY_KEY_ID` | `rzp_test_T2JofJcoa6lHKm` (test) or your `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | `m2qt1WsbwFe7jc53qtXNQFap` (test) or your live secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same value as `RAZORPAY_KEY_ID` |
| `RAZORPAY_WEBHOOK_SECRET` | (Add later when you set up the webhook) |

> Note: `DATABASE_URL` is auto-added by Vercel when you connect Postgres.

### Step 5 — Deploy
Click **Deploy**. Build takes 2–3 min. You'll get a URL like `https://sinthadeploy.vercel.app`. 🎉

### Step 6 — Initialize Database (IMPORTANT ⚠️)
After the first deploy, run this **once** to create DB tables:

```bash
npm i -g vercel
vercel login
vercel link  # connect to your project
vercel env pull .env.local  # downloads env vars
npx prisma db push  # creates tables in Vercel Postgres
```

### Step 7 — Seed Categories (IMPORTANT ⚠️)
After the deploy goes live, run this once:

```bash
curl -X POST https://your-app.vercel.app/api/seed
```

You should see: `{"message":"Categories seeded successfully","data":{"categories":6}}`

### Step 8 — Set Up Razorpay Webhook (for real payments)
1. Razorpay Dashboard → Settings → Webhooks → Add New Webhook.
2. Webhook URL: `https://your-app.vercel.app/api/razorpay/webhook`
3. Copy the **Webhook Secret** Razorpay gives you.
4. Vercel → Settings → Env Vars → add `RAZORPAY_WEBHOOK_SECRET` with the secret.
5. Redeploy.

### Step 9 — Update APK WebView URL
In your Android APK wrapper (Byte2App, AppsGeyser, or custom), point the WebView to:
```
https://your-app.vercel.app
```

---

## 🔑 Admin Login
- **Admin ID:** `Sintha37`
- **Password:** `Laish@226`
- (maps to `sintha37@sintha.app` in Firebase)

---

## 📱 Features

- 🔐 Email/password auth (Firebase)
- 🛠️ Provider & client role system
- 📅 Booking system with auto-acceptance
- 💬 Chat (unlocked only after booking — security enforced server-side)
- 💳 Razorpay payments (UPI, GPay, PhonePe, Paytm, Cards, Net Banking)
- 🏆 PRO subscription (₹199) with auto-verification
- 🛡️ Admin dashboard
- 📱 Mobile-first responsive design (works in WebView APK)

---

## 🛠️ Local Development

```bash
npm install
# Create .env.local with DATABASE_URL pointing to local Postgres
npm run db:generate
npm run db:push
npm run dev
```

Open http://localhost:3000

---

## 🔧 Switching from Test to Live Payments

When your Razorpay KYC is approved:

1. Get your live keys from Razorpay Dashboard (start with `rzp_live_`).
2. Update Vercel env vars:
   - `RAZORPAY_KEY_ID` = `rzp_live_...`
   - `RAZORPAY_KEY_SECRET` = `...`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` = `rzp_live_...`
3. Redeploy. Done — real money will start flowing.

---

## 🆘 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `prisma db push` failed | Run it manually after Postgres is connected (see Step 6). |
| Build fails on `prisma generate` | Check that `prisma/schema.prisma` is committed (it is). |
| `Environment variable "DATABASE_URL" not found` | Connect Vercel Postgres to your project (Storage tab). |
| 404 on `/api/*` routes | These only work after deploy, not on static preview. |
| TypeScript errors during build | `next.config.ts` has `ignoreBuildErrors: true` — won't fail the build. |
| Chat button stays locked after booking | Already fixed — uses `provider.userId` for booking check. |
| My Bookings shows "No bookings found" | Already fixed — defaults to "All" tab. |

---

## 📜 License

MIT License — see [LICENSE](LICENSE).
