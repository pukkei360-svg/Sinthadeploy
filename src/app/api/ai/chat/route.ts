import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * SINTHA AI Chat API — Powered by Google Gemini
 * 
 * Uses the Gemini Flash model (free tier: 15 req/min, 1500/day).
 * The AI has real-time context about providers and categories from the database.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function buildSystemPrompt(providers: any[], categories: any[]): string {
  const providerList = providers.length > 0
    ? providers.map(p => `- ${p.user?.name || 'Unknown'} | Category: ${p.category?.name || 'N/A'} | Skills: ${p.skills || 'N/A'} | Rating: ${p.rating || '0.0'} | Experience: ${p.experience || 'N/A'} | Rate: ₹${p.hourlyRate || 'N/A'}/hr`).join('\n')
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
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
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

    // Build conversation contents for Gemini API
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I am SINTHA AI, ready to help users find service providers and answer questions about SINTHA.' }] },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    let aiResponse: string;
    try {
      const apiResponse = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          },
        }),
      });

      if (!apiResponse.ok) {
        const errText = await apiResponse.text();
        console.error('[AI Chat] Gemini API error:', apiResponse.status, errText);
        throw new Error(`Gemini API returned ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I couldn't generate a response. Please try again.";
    } catch (aiErr) {
      console.error('[AI Chat] Error:', aiErr);
      aiResponse = "I'm having trouble connecting right now. Please try again, or browse providers from the Home screen!";
    }

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AI Chat] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
