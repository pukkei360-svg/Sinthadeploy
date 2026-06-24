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
  // Keep the prompt SHORT for fast responses. The Liquid model is small (1.2B params)
  // and slow with long prompts. Only include essential info.
  const providerList = providers.length > 0
    ? providers.slice(0, 10).map(p => `- ${p.user?.name || 'Unknown'} (${p.category?.name || 'N/A'}, ⭐${p.rating || 0}, ₹${p.hourlyRate || 'N/A'}/hr, ${p.user?.isVerified ? 'Verified' : 'Unverified'})`).join('\n')
    : 'No providers registered yet.';

  const categoryList = categories.map(c => c.name).join(', ');

  return `You are SINTHA AI, assistant for SINTHA — Manipur's service marketplace. Respond in English. Be helpful and concise (2-4 sentences).

SINTHA: Zero commission, providers keep 100%. PRO: ₹${config.proPrice}/month. Referral: 30% lifetime commission. Booking: Browse → Select provider → Book Now → Fill details. Categories: ${categoryList}.

Providers: ${providerList}

When recommending providers, use their REAL names from the list. If no match, suggest posting a job. Support email: sinthahelp@gmail.com.`;
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
      maxTokens: 400,  // reduced from 800 — faster responses, still enough for 3-4 sentences
      temperature: 0.7,
    });

    if (!result.success) {
      console.error('[AI Chat] SINTHA AI failed:', result.error);
      return NextResponse.json({
        response: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        poweredBy: 'SINTHA AI',
        providerMatches: [],
      });
    }

    // Extract provider recommendations from the response.
    // The AI mentions provider names in its text response. We match those
    // names against the real provider list and return structured data so
    // the frontend can render clickable provider cards.
    const providerMatches: Array<{
      providerId: string
      name: string
      photoUrl?: string
      category?: string
      rating: number
      hourlyRate?: number
      verified?: boolean
      pro?: boolean
    }> = [];

    const responseText = result.text;
    for (const p of providers) {
      const providerName = p.user?.name || '';
      if (providerName && responseText.includes(providerName)) {
        providerMatches.push({
          providerId: p.id,  // ProviderProfile ID — correct for /api/providers/[id]
          name: providerName,
          photoUrl: p.user?.photoUrl,
          category: p.category?.name,
          rating: p.rating || 0,
          hourlyRate: p.hourlyRate || undefined,
          verified: p.user?.isVerified || false,
          pro: p.user?.isPro || false,
        });
      }
    }

    return NextResponse.json({
      response: result.text,
      timestamp: new Date().toISOString(),
      poweredBy: 'SINTHA AI',
      providerMatches: providerMatches.slice(0, 5),  // max 5 recommendations
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
