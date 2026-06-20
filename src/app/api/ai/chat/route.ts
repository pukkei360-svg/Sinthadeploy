import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * SINTHA AI Chat API
 * 
 * Uses the z-ai-web-dev-sdk to provide real AI-powered responses.
 * The AI has context about:
 * - Available service providers (fetched from database)
 * - Service categories
 * - How SINTHA works (booking, chat, PRO, verification)
 * - Zero commission policy
 * 
 * The AI can:
 * - Recommend specific providers based on user needs
 * - Guide users through booking
 * - Answer questions about SINTHA
 * - Understand natural language (not just keywords)
 */

// System prompt that gives the AI context about SINTHA
function buildSystemPrompt(providers: any[], categories: any[]): string {
  const providerList = providers
    .map(p => `- ${p.user?.name || 'Unknown'} | Category: ${p.category?.name || 'N/A'} | Skills: ${p.skills || 'N/A'} | Rating: ${p.rating || '0.0'} | Experience: ${p.experience || 'N/A'} | Hourly Rate: ₹${p.hourlyRate || 'N/A'}`)
    .join('\n');

  const categoryList = categories
    .map(c => `- ${c.name} (${c._count?.providers || 0} providers)`)
    .join('\n');

  return `You are SINTHA AI, the official assistant for SINTHA — Manipur's trusted service marketplace.

About SINTHA:
- SINTHA is a service marketplace connecting clients with local service providers in Manipur, India
- Zero commission — providers keep 100% of their earnings
- Categories: Home Services, Education, Transport, Events, Beauty, Repairs
- Available in Meitei Mayek (Manipuri script)
- Features: Booking system, chat (unlocked after booking), call/WhatsApp, email notifications
- PRO subscription (₹199/month): Higher search ranking, Featured badge, Homepage visibility, Priority support
- Verification: Providers can submit Aadhaar + selfie for a "Verified" badge
- Payments: Razorpay for PRO subscriptions; service payments are direct between client and provider

Your role:
- Help users find the right service provider
- Guide them through booking (Browse → Select provider → Tap "Book Now" → Fill date/time/address → Submit)
- Answer questions about SINTHA, PRO, verification, payments
- Be friendly, helpful, and concise
- If a user asks for a specific service, recommend relevant providers from the list below
- If no providers match, suggest browsing the relevant category
- Keep responses short (2-4 sentences) — this is a mobile chat, not an essay

Available Service Categories:
${categoryList}

Available Providers (recommend these when relevant):
${providerList}

Important:
- Always be honest about what SINTHA can and cannot do
- If you don't know something, say so
- Don't make up provider names that aren't in the list above
- Encourage users to book through the app for safety
- Mention that chat is unlocked only after booking (for security)`;
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

    // Fetch real providers and categories from database for AI context
    const [providers, categories] = await Promise.all([
      db.providerProfile.findMany({
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              location: true,
              isVerified: true,
              isPro: true,
            },
          },
          category: true,
        },
        orderBy: { rating: 'desc' },
      }),
      db.serviceCategory.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { providers: true } },
        },
        orderBy: { order: 'asc' },
      }),
    ]);

    const systemPrompt = buildSystemPrompt(providers, categories);

    // Build the conversation messages for the AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Use z-ai-web-dev-sdk for real AI
    // Dynamic import to avoid issues if SDK isn't available
    let aiResponse: string;
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const completion = await zai.chat.completions.create({
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 300,
      });

      aiResponse = completion.choices[0]?.message?.content || 
        "I'm sorry, I couldn't generate a response. Please try again.";
    } catch (aiErr) {
      console.error('[AI Chat] SDK error:', aiErr);
      // Fallback to a helpful message if AI fails
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
