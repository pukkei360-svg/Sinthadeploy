import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * SINTHA AI Chat API — Powered by Anthropic Claude (primary)
 *
 * Model hierarchy (tries in order):
 *   1. Anthropic Claude (claude-3-5-sonnet) — most capable, natural conversation
 *   2. Google Gemini 2.0 Flash — free fallback
 *   3. Z.AI SDK — second fallback
 *   4. Keyword bot — last resort (always works)
 *
 * Requires ANTHROPIC_API_KEY env var (set on Vercel + .env).
 * Get key: https://console.anthropic.com/settings/keys
 *
 * Capabilities:
 *   - Find and recommend providers by category/skill
 *   - Estimate service prices based on provider rates
 *   - Compare providers side-by-side
 *   - Guide users through booking step-by-step
 *   - Explain PRO, verification, payments, referrals
 *   - Answer in English + basic Meitei (Manipuri)
 *   - Suggest posting a job if no provider matches
 *   - Help providers with profile optimization tips
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
- You can use emojis sparingly to be friendly (👋, ✅, 💡, ₹, etc.)
- For Meitei responses, use simple phrases and offer to switch to English if needed

## What You CANNOT Do
- You cannot book a service for the user (they must do it themselves in the app)
- You cannot access user accounts or personal data
- You cannot process payments or refunds
- You cannot modify bookings — direct users to the booking detail screen
- If asked about something you can't do, explain what the user CAN do themselves`;
}

// Fallback keyword bot (always works, even if all AI APIs fail)
function getFallbackResponse(message: string, providers: any[], categories: any[]): string {
  const lower = message.toLowerCase().trim()

  if (lower.match(/hello|hi|hey|namaste|khurumjari/)) {
    return `Hello! 👋 Welcome to SINTHA AI! I can help you find services, compare providers, estimate prices, book appointments, and answer questions. What do you need today?`
  }
  if (lower.match(/book|hire|appointment/)) {
    return `To book a service:\n1. Browse categories on Home screen\n2. Select a provider\n3. Tap "Book Now"\n4. Fill in date, time, address\n5. Submit — auto-confirmed!\n\nYou can also save addresses for faster booking next time.`
  }
  if (lower.match(/pro|premium|subscription/)) {
    return `SINTHA PRO is a monthly subscription for providers. Benefits: Higher search ranking, Featured badge, Homepage visibility, Priority support. Visit the PRO page from your Profile!`
  }
  if (lower.match(/commission|fee|free/)) {
    return `SINTHA charges ZERO commission! Providers keep 100% of earnings. Only PRO subscription is optional (₹199/month).`
  }
  if (lower.match(/refer|referral|earn/)) {
    return `Refer friends to SINTHA and earn 30% lifetime commission when they buy PRO! Share your referral code from Profile → Refer & Earn. Example: 10 active referrals = ₹597/month passive income!`
  }
  if (lower.match(/price|cost|rate|how much/)) {
    const avgRate = providers.length > 0
      ? Math.round(providers.reduce((sum, p) => sum + (p.hourlyRate || 0), 0) / providers.length)
      : 200
    return `Service prices vary by provider. Average rate: ₹${avgRate}/hr. Check each provider's profile for their hourly rate, or ask me to compare providers in a specific category!`
  }
  if (lower.match(/electrician|plumber|carpenter|repair/)) {
    const matches = providers.filter(p => (p.skills || '').toLowerCase().includes(lower) || (p.category?.name || '').toLowerCase().includes(lower))
    if (matches.length > 0) {
      const names = matches.slice(0, 3).map(p => `${p.user?.name} (⭐${p.rating}, ₹${p.hourlyRate}/hr)`).join(', ')
      return `I found these providers: ${names}. Tap on any provider's profile to see their full details and book!`
    }
    return `No ${lower} providers found yet. Try posting a job — providers in that category will send you quotes!`
  }
  return `I can help you find services, compare providers, estimate prices, guide bookings, explain PRO/referrals, and more. Try asking "Find me an electrician" or "Compare top providers" or "How much does a plumber cost?"`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fetch real providers and categories from database
    const [providers, categories] = await Promise.all([
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

    // Fetch current PRO price for the system prompt
    let proPrice = 199;
    try {
      const config = await db.appConfig.findUnique({ where: { key: 'proPrice' } });
      if (config) proPrice = parseFloat(config.value) || 199;
    } catch {}

    const systemPrompt = buildSystemPrompt(providers, categories, { proPrice });

    // ═══════════════════════════════════════════════════════════
    // Method 1: Anthropic Claude — PRIMARY (most capable)
    // ═══════════════════════════════════════════════════════════
    if (ANTHROPIC_API_KEY) {
      try {
        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        // Add conversation history (last 6 messages for context)
        const recentHistory = conversationHistory.slice(-6);
        for (const msg of recentHistory) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
        messages.push({ role: 'user', content: message });

        const apiResponse = await fetch(ANTHROPIC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 800,
            system: systemPrompt,
            messages,
          }),
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          const aiResponse = data.content?.[0]?.text;

          if (aiResponse) {
            return NextResponse.json({
              response: aiResponse,
              timestamp: new Date().toISOString(),
              poweredBy: 'SINHA AI',
            });
          }
        } else {
          const errText = await apiResponse.text().catch(() => 'unknown');
          console.error('[AI Chat] Claude error:', apiResponse.status, errText.slice(0, 200));
        }
      } catch (claudeErr) {
        console.error('[AI Chat] Claude failed:', claudeErr instanceof Error ? claudeErr.message : 'unknown');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Method 2: Google Gemini (free tier) — FALLBACK 1
    // ═══════════════════════════════════════════════════════════
    if (GEMINI_API_KEY) {
      try {
        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'I understand. I am SINTHA AI, ready to help users find service providers, compare options, estimate prices, and answer questions about SINTHA.' }] },
          ...conversationHistory.slice(-5).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          })),
          { role: 'user', parts: [{ text: message }] },
        ];

        const apiResponse = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          }),
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (aiResponse) {
            return NextResponse.json({
              response: aiResponse,
              timestamp: new Date().toISOString(),
              poweredBy: 'SINHA AI',
            });
          }
        } else {
          console.error('[AI Chat] Gemini error:', apiResponse.status);
        }
      } catch (geminiErr) {
        console.error('[AI Chat] Gemini failed:', geminiErr instanceof Error ? geminiErr.message : 'unknown');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Method 3: Z.AI SDK — FALLBACK 2
    // ═══════════════════════════════════════════════════════════
    try {
      const zai = await ZAI.create();

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];

      const recentHistory = conversationHistory.slice(-5);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
      messages.push({ role: 'user', content: message });

      const response = await zai.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 800,
      });

      const aiResponse = response.choices[0]?.message?.content || '';

      if (aiResponse) {
        return NextResponse.json({
          response: aiResponse,
          timestamp: new Date().toISOString(),
          poweredBy: 'SINHA AI',
        });
      }
    } catch (zaiErr) {
      console.error('[AI Chat] Z.AI failed:', zaiErr instanceof Error ? zaiErr.message : 'unknown');
    }

    // ═══════════════════════════════════════════════════════════
    // Method 4: Keyword bot — LAST RESORT (always works)
    // ═══════════════════════════════════════════════════════════
    const fallbackResponse = getFallbackResponse(message, providers, categories);

    return NextResponse.json({
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      poweredBy: 'SINHA AI',
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
