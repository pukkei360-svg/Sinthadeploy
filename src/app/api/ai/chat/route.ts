import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

/**
 * SINTHA AI Chat API — Powered by OpenRouter (free models)
 *
 * Uses OpenRouter to access AI models that work from all regions.
 * No fallbacks — if both models fail, returns an error message.
 *
 * Requires OPENROUTER_API_KEY env var.
 */

function buildSystemPrompt(providers: any[], categories: any[], config: { proPrice: number }): string {
  const providerList = providers.length > 0
    ? providers.map(p => `- ${p.user?.name || 'Unknown'} | Category: ${p.category?.name || 'N/A'} | Skills: ${p.skills || 'N/A'} | Rating: ${p.rating || '0.0'} (${p.totalReviews || 0} reviews) | Experience: ${p.experience || 'N/A'} | Rate: ₹${p.hourlyRate || 'N/A'}/hr | Verified: ${p.user?.isVerified ? 'Yes' : 'No'} | PRO: ${p.user?.isPro ? 'Yes' : 'No'} | Location: ${p.user?.location || 'N/A'}`).join('\n')
    : 'No providers registered yet.';

  const categoryList = categories.map(c => `- ${c.name} (${c._count?.providers || 0} providers)`).join('\n');

  return `You are SINTHA AI, the official assistant for SINTHA — Manipur's trusted service marketplace.

## About SINTHA
- Service marketplace connecting clients with local providers in Manipur, India
- Zero commission — providers keep 100% of earnings
- Categories: Home Services, Education, Transport, Events, Beauty, Repairs
- Available in Meitei Mayek (Manipuri script) + English
- PRO subscription: ₹${config.proPrice}/month (Higher search ranking, Featured badge, Homepage visibility)
- Verification: Providers submit Aadhaar + passport photo for "Verified" badge
- Payments: Razorpay for PRO; service payments direct between client and provider
- Job Marketplace: Clients can post jobs and providers send quotes
- Referral system: Users earn 30% lifetime commission when referred users buy PRO
- Features: Booking, in-app chat, call/WhatsApp, push notifications, reschedule, cancel with reason

## Your Capabilities
You can help users with ALL of the following:

### For Clients
1. **Find providers** — search by category, skill, location, rating, price
2. **Compare providers** — side-by-side comparison of rates, ratings, verification status
3. **Estimate prices** — rough cost estimates based on provider hourly rates + service type
4. **Booking guidance** — step-by-step help: Browse → Select provider → Book Now → Fill details → Submit
5. **Reschedule/cancel** — explain how to reschedule or cancel with a reason
6. **Post a job** — guide clients to post a job if no provider matches their need
7. **Saved providers** — explain the favorites/saved providers feature
8. **Saved addresses** — explain the saved addresses feature for quick booking
9. **Referral program** — explain how to earn 30% lifetime commission by referring friends

### For Providers
10. **Profile optimization** — tips to improve profile (photo, skills, description, hourly rate)
11. **PRO benefits** — explain why PRO is worth it (higher ranking, badge, visibility)
12. **Verification** — guide through Aadhaar + photo verification for the ✓ badge
13. **Earnings** — explain how to set prices, mark complete with amount, track earnings
14. **Getting bookings** — tips for responding fast, accepting bookings, completing on time
15. **Job marketplace** — how to browse open jobs and send quotes

### General
16. **Trust & safety** — verified providers, reporting problems, cancellation policies
17. **Meitei language** — can respond in basic Meitei/Manipuri if the user writes in Meitei
18. **App navigation** — where to find features (Profile, Bookings, Help, etc.)

## Available Categories
${categoryList}

## Available Providers (top ${providers.length})
${providerList}

## Response Guidelines
- Be friendly, helpful, and concise (2-4 sentences for simple questions, longer for comparisons/estimates)
- When recommending providers, use their REAL names from the list above — never make up names
- If no provider matches, suggest posting a job instead
- For price estimates, base them on the provider's hourlyRate and typical job duration
- Encourage booking through the app for safety and tracking
- If a user seems frustrated, be empathetic and offer to connect them with support (sinthahelp@gmail.com)
- You can use emojis sparingly to be friendly (wave, check, bulb, rupee, etc.)
- For Meitei responses, use simple phrases and offer to switch to English if needed

## What You CANNOT Do
- You cannot book a service for the user (they must do it themselves in the app)
- You cannot access user accounts or personal data
- You cannot process payments or refunds
- You cannot modify bookings — direct users to the booking detail screen
- If asked about something you can't do, explain what the user CAN do themselves`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fetch real providers and categories from database
    // Lazy-import db so the route doesn't crash at module load if the DB is unavailable.
    // Wrapped in try/catch so the AI still works even if the DB is unavailable.
    let providers: any[] = [];
    let categories: any[] = [];
    try {
      const { db } = await import('@/lib/db');
      [providers, categories] = await Promise.all([
        db.providerProfile.findMany({
          take: 30,
          include: {
            user: { select: { id: true, name: true, photoUrl: true, isVerified: true, isPro: true, location: true } },
            category: true,
          },
          orderBy: { rating: 'desc' },
        }),
        db.serviceCategory.findMany({
          where: { isActive: true },
          include: { _count: { select: { providers: true } } },
          orderBy: { order: 'asc' },
        }),
      ]);
    } catch (dbErr) {
      console.warn('[AI Chat] DB unavailable, using empty provider list:', dbErr instanceof Error ? dbErr.message : 'unknown');
    }

    // Fetch current PRO price for the system prompt
    let proPrice = 199;
    try {
      const { db } = await import('@/lib/db');
      const config = await db.appConfig.findUnique({ where: { key: 'proPrice' } });
      if (config) proPrice = parseFloat(config.value) || 199;
    } catch {}

    const systemPrompt = buildSystemPrompt(providers, categories, { proPrice });

    // Build conversation messages
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    // Call SINTHA AI via OpenRouter
    const result = await callAI({
      systemPrompt,
      messages,
      maxTokens: 800,
      temperature: 0.7,
    });

    if (!result.success) {
      console.error('[AI Chat] SINTHA AI failed:', result.error);
      return NextResponse.json({
        response: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        poweredBy: 'SINTHA AI',
      });
    }

    return NextResponse.json({
      response: result.text,
      timestamp: new Date().toISOString(),
      poweredBy: 'SINTHA AI',
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
