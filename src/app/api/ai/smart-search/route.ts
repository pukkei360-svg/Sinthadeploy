import { NextRequest, NextResponse } from 'next/server';
import { callAI, extractJSON } from '@/lib/ai';

/**
 * POST /api/ai/smart-search
 * Natural language provider search powered by SINTHA AI.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    let providers: any[] = [];
    try {
      const { db } = await import('@/lib/db');
      providers = await db.providerProfile.findMany({
        where: { availability: 'available' },
        take: 50,
        include: {
          user: { select: { id: true, name: true, photoUrl: true, isVerified: true, isPro: true, location: true, phone: true } },
          category: true,
        },
        orderBy: { rating: 'desc' },
      });
    } catch {}

    if (providers.length === 0) {
      return NextResponse.json({
        matches: [],
        summary: "No providers are available right now. Try posting a job — providers will come to you with quotes!",
        suggestions: "Post a job from the Home screen → Post Job.",
        poweredBy: 'SINTHA AI',
      });
    }

    const providerList = providers.map((p, i) => ({
      index: i, id: p.userId, name: p.user?.name || 'Unknown',
      category: p.category?.name || 'N/A', skills: p.skills || 'N/A',
      description: p.description || 'N/A', rating: p.rating || 0,
      reviews: p.totalReviews || 0, hourlyRate: p.hourlyRate || 0,
      experience: p.experience || 'N/A', verified: p.user?.isVerified || false,
      pro: p.user?.isPro || false, location: p.user?.location || 'N/A',
    }));

    const systemPrompt = `You are SINTHA's AI matching engine. Match the user's natural language query to the best providers. Return ONLY valid JSON (no markdown):
{"matches":[{"index":<number>,"reason":"<1-2 sentences>","matchScore":<0-100>}],"summary":"<2-3 sentences>","suggestions":"<1 sentence tip>"}
Rules: Max 5 matches sorted by matchScore desc. Only include score >= 40. If no match, empty array + suggest posting a job.`;

    const result = await callAI({
      systemPrompt,
      messages: [{ role: 'user', content: `Query: "${query}"\n\nProviders:\n${JSON.stringify(providerList, null, 2)}` }],
      maxTokens: 1000,
      temperature: 0.3,
    });

    if (!result.success) {
      return NextResponse.json({
        matches: [],
        summary: "SINTHA AI is having trouble right now. Please try browsing categories below.",
        suggestions: '',
        poweredBy: 'SINTHA AI',
      });
    }

    let parsed: any = {};
    try {
      parsed = extractJSON(result.text);
    } catch {
      return NextResponse.json({ matches: [], summary: result.text, suggestions: '', poweredBy: 'SINTHA AI' });
    }

    const matches = (parsed.matches || [])
      .filter((m: any) => typeof m.index === 'number' && providers[m.index])
      .map((m: any) => {
        const p = providers[m.index];
        return {
          providerId: p.id,          // ProviderProfile ID — used by /api/providers/[id] and navigate('provider-profile')
          userId: p.userId,          // User ID — used for favorites
          name: p.user?.name, photoUrl: p.user?.photoUrl,
          category: p.category?.name, rating: p.rating, hourlyRate: p.hourlyRate,
          verified: p.user?.isVerified, pro: p.user?.isPro,
          reason: m.reason, matchScore: m.matchScore,
        };
      });

    return NextResponse.json({
      matches, summary: parsed.summary || '', suggestions: parsed.suggestions || '',
      poweredBy: 'SINTHA AI',
    });
  } catch (error) {
    console.error('[AI smart-search] error:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
