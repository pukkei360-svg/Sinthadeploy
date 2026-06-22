import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * SINTHA AI Chat API — Powered by Google Gemini (free tier)
 *
 * Uses Gemini 2.0 Flash (free: 15 req/min, 1500 req/day).
 * Falls back to Z.AI SDK if Gemini fails.
 * Falls back to keyword bot if both fail.
 *
 * Requires GEMINI_API_KEY env var on Vercel.
 * Get free key: https://aistudio.google.com/app/apikey
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function buildSystemPrompt(providers: any[], categories: any[]): string {
  const providerList = providers.length > 0
    ? providers.map(p => `- ${p.user?.name || 'Unknown'} | Category: ${p.category?.name || 'N/A'} | Skills: ${p.skills || 'N/A'} | Rating: ${p.rating || '0.0'} | Experience: ${p.experience || 'N/A'} | Rate: ₹${p.hourlyRate || 'N/A'}/hr | Verified: ${p.user?.isVerified ? 'Yes' : 'No'}`).join('\n')
    : 'No providers registered yet.';

  const categoryList = categories.map(c => `- ${c.name} (${c._count?.providers || 0} providers)`).join('\n');

  return `You are SINTHA AI, the official assistant for SINTHA — Manipur's trusted service marketplace.

About SINTHA:
- Service marketplace connecting clients with local providers in Manipur, India
- Zero commission — providers keep 100% of earnings
- Categories: Home Services, Education, Transport, Events, Beauty, Repairs
- Available in Meitei Mayek (Manipuri script)
- Features: Booking, chat (unlocked after booking), call/WhatsApp, email notifications
- PRO subscription (₹199/month): Higher search ranking, Featured badge, Homepage visibility
- Verification: Providers submit Aadhaar + passport photo for "Verified" badge
- Payments: Razorpay for PRO; service payments direct between client and provider
- Job Marketplace: Clients can post jobs and providers send quotes
- SOS Emergency: One-tap emergency alerts with location sharing
- Admin Broadcast: Admins can send announcements to all users

Your role:
- Help users find the right service provider
- Guide them through booking (Browse → Select provider → Tap "Book Now" → Fill details → Submit)
- Answer questions about SINTHA, PRO, verification, payments, jobs
- Be friendly, helpful, and concise (2-4 sentences for mobile chat)
- Recommend relevant providers from the list when appropriate
- Don't make up provider names not in the list
- Encourage booking through the app for safety
- If user asks about a service not available, suggest posting a job instead

Available Categories:
${categoryList}

Available Providers:
${providerList}`;
}

// Fallback keyword bot
function getFallbackResponse(message: string, providers: any[], categories: any[]): string {
  const lower = message.toLowerCase().trim()

  if (lower.match(/hello|hi|hey|namaste/)) {
    return `Hello! 👋 Welcome to SINTHA AI! I can help you find services, book providers, or answer questions. What do you need?`
  }
  if (lower.match(/book|hire/)) {
    return `To book a service:\n1. Browse categories on Home screen\n2. Select a provider\n3. Tap "Book Now"\n4. Fill in details\n5. Submit — auto-confirmed!`
  }
  if (lower.match(/pro|premium|subscription/)) {
    return `SINTHA PRO is ₹199/month. Benefits: Higher search ranking, Featured badge, Homepage visibility, Priority support. Visit PRO page from your Profile!`
  }
  if (lower.match(/commission|fee|free/)) {
    return `SINTHA charges ZERO commission! Providers keep 100% of earnings. Only PRO subscription is ₹199/month (optional).`
  }
  return `I can help you find services, book providers, or answer questions about SINTHA. Try asking "Find me an electrician" or "How do I book?"`
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
        take: 20,
        include: {
          user: { select: { id: true, name: true, photoUrl: true, isVerified: true, isPro: true } },
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

    const systemPrompt = buildSystemPrompt(providers, categories);

    // ═══════════════════════════════════════════════════════════
    // Method 1: Google Gemini (free tier) — PRIMARY
    // ═══════════════════════════════════════════════════════════
    if (GEMINI_API_KEY) {
      try {
        // Build conversation contents for Gemini API
        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'I understand. I am SINTHA AI, ready to help users find service providers and answer questions about SINTHA.' }] },
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
              maxOutputTokens: 500,
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
              poweredBy: 'Gemini',
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
    // Method 2: Z.AI SDK — FALLBACK 1
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
        max_tokens: 500,
      });

      const aiResponse = response.choices[0]?.message?.content || '';

      if (aiResponse) {
        return NextResponse.json({
          response: aiResponse,
          timestamp: new Date().toISOString(),
          poweredBy: 'Z.AI',
        });
      }
    } catch (zaiErr) {
      console.error('[AI Chat] Z.AI failed:', zaiErr instanceof Error ? zaiErr.message : 'unknown');
    }

    // ═══════════════════════════════════════════════════════════
    // Method 3: Keyword bot — FALLBACK 2 (always works)
    // ═══════════════════════════════════════════════════════════
    const fallbackResponse = getFallbackResponse(message, providers, categories);

    return NextResponse.json({
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      poweredBy: 'fallback',
    });
  } catch (error) {
    console.error('[AI Chat] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
// AI chat: Gemini primary + Z.AI fallback + keyword bot
