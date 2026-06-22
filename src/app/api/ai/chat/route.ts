import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * SINTHA AI Chat API — Powered by Z.AI (Real AI)
 *
 * Uses the z-ai-web-dev-sdk LLM for real conversational AI.
 * The AI has real-time context about providers and categories from the database.
 * Falls back to keyword bot if AI fails.
 */

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

// Fallback keyword bot (used if AI fails)
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

    // Try real AI first
    try {
      const zai = await ZAI.create();

      const systemPrompt = buildSystemPrompt(providers, categories);

      // Build conversation messages
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history (last 5 messages for context)
      const recentHistory = conversationHistory.slice(-5);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }

      // Add current message
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
    } catch (aiError) {
      console.error('[AI Chat] Z.AI failed, using fallback:', aiError instanceof Error ? aiError.message : 'unknown');
    }

    // Fallback to keyword bot if AI fails
    const fallbackResponse = getFallbackResponse(message, providers, categories);

    return NextResponse.json({
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      poweredBy: 'fallback',
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get response' },
      { status: 500 }
    );
  }
}
