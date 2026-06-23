import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callClaude } from '@/lib/claude';

/**
 * POST /api/ai/smart-search
 *
 * Natural language provider search. The user describes what they need in
 * plain English (or Meitei), and Claude matches them to the best providers
 * from the database.
 *
 * Body: { query: string }
 * Example query: "I need someone to fix my leaking kitchen tap tomorrow morning"
 *
 * Returns:
 *   {
 *     matches: [
 *       { providerId, name, reason, matchScore },
 *       ...
 *     ],
 *     summary: "I found 3 providers who can help with your leaking tap...",
 *     suggestions: "If none of these work, you could also post a job..."
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Fetch all active providers with full details
    const providers = await db.providerProfile.findMany({
      where: { availability: 'available' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, photoUrl: true, isVerified: true, isPro: true, location: true, phone: true } },
        category: true,
      },
      orderBy: { rating: 'desc' },
    });

    if (providers.length === 0) {
      return NextResponse.json({
        matches: [],
        summary: "No providers are available right now. Try posting a job — providers will come to you with quotes!",
        suggestions: "Post a job from the Home screen → Post Job.",
      });
    }

    // Build a compact provider list for Claude to search through
    const providerList = providers.map((p, i) => ({
      index: i,
      id: p.userId,
      name: p.user?.name || 'Unknown',
      category: p.category?.name || 'N/A',
      skills: p.skills || 'N/A',
      description: p.description || 'N/A',
      rating: p.rating || 0,
      reviews: p.totalReviews || 0,
      hourlyRate: p.hourlyRate || 0,
      experience: p.experience || 'N/A',
      verified: p.user?.isVerified || false,
      pro: p.user?.isPro || false,
      location: p.user?.location || 'N/A',
    }));

    const systemPrompt = `You are SINTHA's AI matching engine. The user describes what they need in natural language. Your job is to find the BEST matching providers from the list and explain WHY each is a good match.

Return ONLY valid JSON (no markdown, no code fences). Format:
{
  "matches": [
    {
      "index": <number from the provider list>,
      "reason": "<1-2 sentences explaining why this provider matches>",
      "matchScore": <0-100>
    }
  ],
  "summary": "<2-3 sentence summary of what you found>",
  "suggestions": "<1 sentence tip, e.g. post a job if no perfect match, or book early for popular providers>"
}

Rules:
- Match based on skills, category, and description relevance to the user's query
- Prefer verified + PRO + higher-rated providers when scores are close
- Return at most 5 matches, sorted by matchScore descending
- Only include providers with matchScore >= 40
- If no providers match, return empty matches array + suggest posting a job
- Write the summary and suggestions in friendly, concise English
- matchScore is how well the provider's skills match the user's need (not their overall rating)`;

    const userMessage = `User query: "${query}"

Available providers:
${JSON.stringify(providerList, null, 2)}`;

    const result = await callClaude({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 1000,
      temperature: 0.3,  // low temperature for consistent matching
    });

    if (!result.success) {
      // Fallback: simple keyword matching
      const lowerQuery = query.toLowerCase();
      const keywordMatches = providers
        .filter(p => {
          const text = `${p.skills} ${p.category?.name} ${p.description}`.toLowerCase();
          return lowerQuery.split(' ').some(word => word.length > 3 && text.includes(word));
        })
        .slice(0, 5)
        .map(p => ({
          providerId: p.userId,
          name: p.user?.name,
          photoUrl: p.user?.photoUrl,
          category: p.category?.name,
          rating: p.rating,
          hourlyRate: p.hourlyRate,
          verified: p.user?.isVerified,
          reason: `Matches your search for "${query}"`,
          matchScore: 70,
        }));

      return NextResponse.json({
        matches: keywordMatches,
        summary: keywordMatches.length > 0
          ? `I found ${keywordMatches.length} provider(s) that might help. Tap any to view their profile and book.`
          : "I couldn't find an exact match. Try posting a job — providers will come to you with quotes!",
        suggestions: "Tip: Post a job if you don't find the right provider.",
        poweredBy: 'Keyword Fallback',
      });
    }

    // Parse Claude's JSON response
    let parsed: { matches?: Array<{ index: number; reason: string; matchScore: number }>; summary?: string; suggestions?: string };
    try {
      // Strip any markdown code fences if present
      const cleanText = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanText);
    } catch {
      return NextResponse.json({
        matches: [],
        summary: result.text,
        suggestions: '',
        poweredBy: 'Claude',
      });
    }

    // Map Claude's matches back to full provider objects
    const matches = (parsed.matches || [])
      .filter(m => typeof m.index === 'number' && providers[m.index])
      .map(m => {
        const p = providers[m.index];
        return {
          providerId: p.userId,
          name: p.user?.name,
          photoUrl: p.user?.photoUrl,
          category: p.category?.name,
          rating: p.rating,
          hourlyRate: p.hourlyRate,
          verified: p.user?.isVerified,
          pro: p.user?.isPro,
          reason: m.reason,
          matchScore: m.matchScore,
        };
      });

    return NextResponse.json({
      matches,
      summary: parsed.summary || '',
      suggestions: parsed.suggestions || '',
      poweredBy: 'Claude',
    });
  } catch (error) {
    console.error('[AI smart-search] error:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
