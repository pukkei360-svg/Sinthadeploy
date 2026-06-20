import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * SINTHA AI Chat API
 * 
 * Calls the Z.ai API directly via fetch (bypassing the SDK which
 * requires a local .z-ai-config file that doesn't exist on Vercel).
 * 
 * The AI has real-time context about:
 * - Available service providers (fetched from database)
 * - Service categories
 * - How SINTHA works (booking, chat, PRO, verification)
 */

// Z.ai API configuration
const ZAI_BASE_URL = 'https://internal-api.z.ai/v1';
const ZAI_API_KEY = 'Z.ai';

function buildSystemPrompt(providers: any[], categories: any[]): string {
  const providerList = providers
    .map(p => `- ${p.user?.name || 'Unknown'} | Category: ${p.category?.name || 'N/A'} | Skills: ${p.skills || 'N/A'} | Rating: ${p.rating || '0.0'} | Experience: ${p.experience || 'N/A'} | Rate: ₹${p.hourlyRate || 'N/A'}/hr`)
    .join('\n');

  const categoryList = categories
    .map(c => `- ${c.name} (${c._count?.providers || 0} providers)`)
    .join('\n');

  return `You are SINTHA AI, the official assistant for SINTHA — Manipur's trusted service marketplace.

About SINTHA:
- Service marketplace connecting clients with local providers in Manipur, India
- Zero commission — providers keep 100% of earnings
- Categories: Home Services, Education, Transport, Events, Beauty, Repairs
- Available in Meitei Mayek (Manipuri script)
- Features: Booking, chat (unlocked after booking), call/WhatsApp, email notifications
- PRO subscription (₹199/month): Higher search ranking, Featured badge, Homepage visibility
- Verification: Providers submit Aadhaar + selfie for "Verified" badge
- Payments: Razorpay for PRO; service payments direct between client and provider

Your role:
- Help users find the right service provider
- Guide them through booking (Browse → Select provider → Tap "Book Now" → Fill details → Submit)
- Answer questions about SINTHA, PRO, verification, payments
- Be friendly, helpful, and concise (2-4 sentences for mobile chat)
- Recommend relevant providers from the list when appropriate
- Don't make up provider names not in the list
- Encourage booking through the app for safety

Available Categories:
${categoryList}

Available Providers:
${providerList}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Fetch real providers and categories from database
    const [providers, categories] = await Promise.all([
      db.providerProfile.findMany({
        take: 20,
        include: {
          user: { select: { id: true, name: true, photoUrl: true, location: true, isVerified: true, isPro: true } },
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

    // Build messages for the AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Call Z.ai API directly via fetch
    let aiResponse: string;
    try {
      const apiResponse = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZAI_API_KEY}`,
          'X-Z-AI-From': 'Z',
        },
        body: JSON.stringify({
          messages,
          temperature: 0.7,
          max_tokens: 300,
          thinking: { type: 'disabled' },
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`API returned ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      aiResponse = data.choices?.[0]?.message?.content ||
        "I'm sorry, I couldn't generate a response. Please try again.";
    } catch (aiErr) {
      console.error('[AI Chat] API error:', aiErr);
      aiResponse = "I'm having trouble connecting to my AI brain right now. Please try again in a moment, or browse providers directly from the Home screen!";
    }

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
