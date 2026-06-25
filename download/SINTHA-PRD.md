# SINTHA — Product Requirements Document (PRD)
## Trusted Hands. Trusted Services.

**Version:** 1.6.5
**Date:** June 2026
**Founder & Developer:** Irabot Laishram, Khangabok Moirang Palli Bazar, Manipur, India
**Ownership:** SINTHA is owned and managed by Irabot Laishram

---

## 1. Executive Summary

SINTHA is Manipur's first commission-free service marketplace connecting clients with trusted local service providers. Built for the people of Manipur, the platform covers home services, education, transport, events, beauty, and repairs. Providers keep 100% of earnings — SINTHA charges zero commission. The only paid feature is an optional PRO subscription (admin-configurable price) for enhanced visibility.

### Key Differentiators
- **Zero commission** — providers keep 100% of earnings
- **Manipur-first** — available in Meitei Mayek (Manipuri script) + English
- **Verified providers** — Aadhaar + photo verification
- **Job marketplace** — clients post jobs, providers send competitive quotes
- **Referral system** — 30% lifetime commission on referred PRO subscriptions
- **Push notifications** — real-time alerts for bookings, messages, and updates

---

## 2. Target Users

### 2.1 Clients
- People in Manipur who need local services
- Want verified, trusted providers
- Prefer local language (Meitei/English)
- Want transparent pricing with no middleman fees

### 2.2 Providers
- Service professionals in Manipur (electricians, tutors, drivers, cleaners, etc.)
- Want to reach more clients without paying commission
- Want to build reputation through reviews and verification
- Want to manage bookings and earnings in one app

### 2.3 Admin
- Platform owner (Irabot Laishram)
- Manages users, verifications, categories, broadcasts
- Configures PRO pricing
- Handles claims and disputes

---

## 3. User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Client** | Browse providers, book services, post jobs, chat with providers, save providers/addresses, write reviews, refer friends, buy PRO |
| **Provider** | Create profile, receive bookings, accept/reject/reschedule/cancel bookings, mark complete with price, browse open jobs, send quotes, track earnings, get verified, buy PRO |
| **Admin** | All client/provider capabilities + manage users, verify providers, manage categories, send broadcasts, configure PRO price, handle claims, view stats |

---

## 4. Core Features

### 4.1 Authentication & Onboarding
- **Firebase Authentication**: Email/password + phone number (OTP)
- **Role Selection**: New users choose Client or Provider after signup
- **Profile Photo**: Camera selfie or gallery upload during role selection
- **Admin Login**: Special admin ID (sintha37) maps to admin role
- **Session Persistence**: User session saved in localStorage for instant re-login
- **Banned/Suspended**: Users can be banned (permanent) or suspended (temporary)

### 4.2 Home Screen (Client)
- **Search Bar**: Search by service name, provider name, or skills (sticky, with clear button)
- **Hero Banner**: "Find Trusted Services in Manipur" with verified/fast/trusted badges
- **Quick Actions**: Post Job, My Jobs, Bookings, Messages
- **Categories Grid**: Browse providers by category (3-column grid with icons)
- **Nearby Providers**: Sorted by featured (default) or nearby (distance-based)
- **Featured Providers**: PRO + verified providers shown first
- **Search Mode**: When searching, hides hero/categories/stats for clean results view

### 4.3 Booking System
- **Flow**: Browse → Select provider → "Book Now" → Fill date/time/address/description → Auto-confirmed
- **Booking Statuses**: pending → accepted → in_progress → completed (or cancelled)
- **Reschedule**: Both client and provider can reschedule (date + time picker); other party notified via push
- **Cancel with Reason**: 6 preset reasons (Schedule conflict, No longer needed, Provider unavailable, Found another provider, Emergency, Other); reason shown to other party
- **Mark Complete**: Provider sets final ₹ amount; appears in earnings dashboard; unlocks rating flow
- **Sticky Action Bar**: Accept/Start/Mark Complete/Rate buttons always visible at bottom of booking detail
- **Book Again**: One-tap re-booking of same provider after completion
- **Cancel Reason Display**: Shows who cancelled and why on the booking detail

### 4.4 Provider Dashboard
- **Welcome Card**: Availability toggle (available/busy/offline)
- **Action-Needed Banner**: Count of bookings needing next step (Start/Complete) with one-tap navigation
- **Ready to Complete Section**: In-progress bookings → Mark Complete
- **Start When Ready Section**: Accepted bookings → Start Service
- **Stats Grid**: Total Bookings, Completed, Pending, Rating
- **Earnings Overview**: Total ₹ Earned, This Month ₹, Completed count, With-Amount count, Avg Rating
- **Profile Strength**: 8-point checklist with progress bar
- **Quick Actions**: Open Jobs, Edit Profile, Go PRO, Help & FAQ
- **Pending Bookings**: Accept/Reject with inline buttons
- **Recent Bookings**: Last 5 bookings with status badges

### 4.5 PRO Subscription
- **Price**: Admin-configurable (default ₹199/month, changeable anytime via Admin Dashboard)
- **Benefits**: Higher search ranking, Featured badge, Homepage visibility, Priority support
- **Payment**: Razorpay (UPI, cards, netbanking, wallets)
- **Auto-activation**: PRO activates immediately after successful payment
- **PRO Badge**: Shows on provider profile, home screen, and search results

### 4.6 Referral System
- **Referral Code**: Auto-generated based on user's name (e.g., "IRABOT7K")
- **Share**: WhatsApp button + system share + copy link
- **Link Format**: sinthadeploy.vercel.app/r/CODE (redirects to app with code pre-filled)
- **Commission**: 30% of PRO price, every renewal, for life
- **Payout**: Request via email when balance reaches ₹500+; paid via UPI within 3 days
- **Referral Dashboard**: Total earnings, pending earnings, referral count, referred users list

### 4.7 Job Marketplace
- **Post Job**: Title, description, category, budget, preferred date, urgency, photos (max 2)
- **Open Jobs**: Providers browse jobs in their category
- **Send Quote**: Provider sends price + message + estimated time
- **Accept Quote**: Client accepts → booking created automatically
- **My Jobs**: Clients see their posted jobs; providers see jobs they quoted on

### 4.8 Chat System
- **In-App Chat**: Between client and provider (unlocked after booking)
- **Chat List**: All conversations with unread badges
- **Real-Time**: Messages appear instantly
- **Push Notifications**: New message alerts via FCM

### 4.9 Saved Providers (Clients)
- **Heart Icon**: On provider profiles → save to favorites
- **Saved Providers Screen**: List with photo, rating, category, hourly rate
- **Quick Re-Booking**: Tap saved provider → view profile → book

### 4.10 Saved Addresses (Clients)
- **Save Addresses**: Home, Office, etc. with custom labels
- **Quick-Pick Chips**: Appear in booking form for one-tap address fill
- **Save Prompt**: "Save this address for next time" when typing a new address
- **Label Icons**: Home, Office, MapPin icons based on label

### 4.11 Verification System
- **Submit**: Full name (as per Aadhaar), Aadhaar card (front + back), passport photo
- **Review**: Admin reviews in Admin → Verifications screen
- **Approved**: Green ✓ badge on provider profile
- **Rejected**: Reason provided to provider

### 4.12 Reviews & Ratings
- **Post-Booking**: Both client and provider can rate each other (1-5 stars + comment)
- **Display**: Ratings shown on provider profiles
- **Impact**: Higher-rated providers appear first in search results

### 4.13 Notifications
- **Push Notifications (FCM)**: New bookings, status changes, chat messages, PRO activation, referral earnings, admin broadcasts
- **In-App Bell Icon**: Unread count badge
- **Notification Types**: booking, chat, pro, referral, system, review, broadcast
- **Deduplication**: 5-second window prevents duplicate push notifications
- **Broadcast**: Admin sends to all/clients/providers (in-app + push)

### 4.14 Admin Features
- **Dashboard**: User/provider/booking/PRO counts + revenue
- **PRO Price Config**: Change ₹ price anytime (takes effect immediately)
- **User Management**: View, ban, suspend users
- **Booking Management**: View all bookings
- **Category Management**: Add/edit/reorder categories
- **Verification Review**: Approve/reject provider verifications
- **Claims/Reports**: Handle user-filed reports
- **Broadcast**: Send announcements to all/clients/providers

### 4.15 Offline Support
- **OfflineBootScreen**: Branded "You're offline" screen when no network at launch
- **Cached Data**: API responses cached in localStorage; app renders with cached data when offline
- **OfflineBootstrap Banner**: Dismissible amber banner when mid-session connectivity drops
- **offline.html**: Branded fallback page for WebView ERR_INTERNET_DISCONNECTED (APK)

### 4.16 Help & FAQ
- **Quick Answers**: 8 common questions with expandable accordions
- **Email Support**: sinthahelp@gmail.com
- **About the Creator**: Irabot Laishram bio + ownership info

---

## 5. Technical Architecture

### 5.1 Tech Stack
- **Frontend**: Next.js 16 (React) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Firebase Auth (email/password + phone OTP)
- **Payments**: Razorpay (PRO subscription)
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Photo Storage**: Cloudinary
- **Hosting**: Vercel (production) + Caddy reverse proxy (development)
- **APK**: Capacitor (wraps the web app as a native Android app)

### 5.2 Performance Optimizations
- **Instant Login**: Returning users navigate from localStorage immediately; API sync runs in background
- **Boot Check Skip**: Returning users skip connectivity check; OfflineBootstrap handles mid-session offline
- **Parallel API Calls**: Provider dashboard fetches profile + bookings simultaneously
- **Non-Blocking Earnings**: Earnings data loads in background on provider dashboard
- **Cached Data**: Categories cached 5 min, providers cached 2 min (stale-while-revalidate)
- **Bundle Optimization**: Removed unused Firebase Firestore/Storage modules (~400KB saved)
- **SWC Minification**: Compiler-based minification for smaller output
- **Tree-Shaking**: lucide-react icons optimized (only used icons bundled)

### 5.3 Push Notification Architecture
- **CapacitorPushBridge**: Listens for Capacitor PushNotifications plugin events; POSTs FCM token to backend
- **Foreground Display**: LocalNotifications shows push in system tray when app is open
- **Deduplication**: 5-second window prevents duplicate notifications
- **Notification Tag**: Android collapses notifications with same tag
- **Token Deduplication**: Same FCM token under multiple accounts sends only once

---

## 6. User Flows

### 6.1 New User Signup
1. Open app → Landing screen
2. Tap "Get Started" → Login/Register screen
3. Enter email + password → Firebase creates account
4. /auth/sync creates user in database
5. Role selection screen → Choose Client or Provider + upload photo
6. Client → Home screen | Provider → Onboarding screen

### 6.2 Returning User Login
1. Open app → Firebase auth fires → reads localStorage
2. Navigate IMMEDIATELY to portal (client home or provider dashboard)
3. /auth/sync runs in background → updates user data
4. Screen renders with cached data instantly

### 6.3 Booking a Service
1. Home → Browse categories or search
2. Select provider → View profile (rating, reviews, skills, rate)
3. Tap "Book Now" → Fill date, time, address, description
4. Submit → Booking auto-confirmed → Push notification to provider
5. Provider accepts → Push to client
6. Provider starts → Push to client
7. Provider marks complete (with ₹ amount) → Push to client
8. Client rates provider (1-5 stars + comment)

### 6.4 Reschedule Flow
1. Open booking detail → Tap "Reschedule"
2. Pick new date + time → Confirm
3. Other party receives push notification with new schedule
4. Reschedule history badge shows previous date

### 6.5 Cancel Flow
1. Open booking detail → Tap "Cancel"
2. Choose reason from 6 options (or "Other" with free text)
3. Confirm → Other party notified with reason
4. Cancel reason card shown on booking detail

### 6.6 Referral Flow
1. Profile → Refer & Earn → See referral code + link
2. Tap WhatsApp → Opens WhatsApp with pre-filled message + link
3. Friend clicks link → App opens with referral code pre-filled
4. Friend signs up → Code saved to profile
5. Friend buys PRO → Referrer earns 30% → Push notification to referrer

---

## 7. Design Guidelines

### 7.1 Colors
- **Primary**: #0F4C81 (SINTHA Blue)
- **Gradient**: sintha-gradient (blue gradient for headers, buttons)
- **Success**: Green (#10B981)
- **Warning**: Amber (#F59E0B)
- **Danger**: Red (#EF4444)
- **Background**: Gray-50 (#F8FAFC)
- **Cards**: White with shadow-sm

### 7.2 Typography
- **Font**: Inter (sans-serif) + Noto Sans Meetei Mayek (Manipuri script)
- **Body**: text-sm (14px)
- **Headings**: text-lg font-bold
- **Captions**: text-xs (12px) / text-[10px]

### 7.3 Layout
- **Mobile-first**: Max width lg (1024px), centered
- **Cards**: rounded-xl, shadow-sm, white background
- **Buttons**: rounded-xl, sintha-gradient for primary
- **Bottom Nav**: Fixed, 5 items (Home/Dashboard, Bookings, Chat, Help, Profile)
- **Sticky Headers**: top-0 z-40

---

## 8. Database Schema (Key Models)

- **User**: id, firebaseUid, email, name, role, phone, location, lat/lng, isVerified, isPro, proExpiry, isBanned, fcmToken, referralCode, referredBy
- **ProviderProfile**: userId, categoryId, experience, skills, description, hourlyRate, availability, rating, totalReviews, totalBookings, packages, offers
- **Booking**: clientId, providerId, service, date, time, status, address, cancelReason, cancelledBy, rescheduledFrom, rescheduledAt, price, beforePhotos, afterPhotos
- **ServiceCategory**: name, icon, description, order, isActive
- **Review**: bookingId, authorId, targetId, rating, comment
- **Job**: clientId, categoryId, title, description, budget, preferredDate, urgency, status, photoUrls
- **JobQuote**: jobId, providerId, price, message, estimatedTime, status
- **Subscription**: userId, plan, razorpayOrderId, razorpayPaymentId, amount, status, startDate, endDate
- **Notification**: userId, title, message, type, isRead, relatedId
- **Favorite**: clientId, providerId
- **SavedAddress**: clientId, label, address, latitude, longitude
- **AppConfig**: key, value (for admin-configurable settings like proPrice)
- **ReferralEarning**: referrerId, referredUserId, subscriptionId, amount, status
- **Claim**: reporterId, subjectId, bookingId, type, severity, title, description, status
- **BannedEmail**: email, reason (survives user deletion)

---

## 9. Future Roadmap

### Planned Features
1. In-app service payments (escrow or pay-on-completion)
2. Meitei language toggle (full content translation)
3. Before/after service photos
4. Nearby providers map view (Google Maps)
5. Full AI assistant (chat, smart search, price estimation, profile optimization)
6. Provider packages & offers
7. Multi-role accounts (one account, switch client/provider)
8. SOS emergency alerts with location sharing
9. Custom domain (sintha.app)
10. Play Store + iOS launch

---

## 10. Contact

- **Founder**: Irabot Laishram
- **Location**: Khangabok Moirang Palli Bazar, Manipur, India
- **Support Email**: sinthahelp@gmail.com
- **Ownership**: SINTHA is owned and managed by Irabot Laishram

---

*This document reflects the current state of SINTHA v1.6.5 (June 2026).*
