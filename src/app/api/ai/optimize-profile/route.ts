import { NextRequest, NextResponse } from 'next/server';
import { callAI, extractJSON } from '@/lib/ai';

/**
 * POST /api/ai/optimize-profile
 * Analyzes a provider's profile and returns AI suggestions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId } = body;

    if (!providerId) {
      return NextResponse.json({ error: 'providerId is required' }, { status: 400 });
    }

    let provider: any = null;
    try {
      const { db } = await import('@/lib/db');
      provider = await db.providerProfile.findFirst({
        where: { userId: providerId },
        include: { user: { select: { name: true, photoUrl: true, isVerified: true, isPro: true, location: true } }, category: true },
      });
    } catch {}

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const systemPrompt = `You are SINTHA's AI profile optimizer. Return ONLY valid JSON (no markdown):
{"score":<0-100>,"strengths":["<string>"],"improvements":[{"area":"<string>","suggestion":"<string>","priority":"<high|medium|low>"}],"suggestedDescription":"<string or empty>","suggestedRate":{"current":<number|null>,"suggested":<number|null>,"reason":"<string>"},"tips":["<string>"]}
Score guide: 90+ excellent, 70-89 good, 50-69 average, <50 needs work.`;

    const profileData = {
      name: provider.user?.name, category: provider.category?.name,
      skills: provider.skills, description: provider.description,
      experience: provider.experience, hourlyRate: provider.hourlyRate,
      rating: provider.rating, totalReviews: provider.totalReviews,
      isVerified: provider.user?.isVerified, isPro: provider.user?.isPro,
      hasPhoto: !!provider.user?.photoUrl, location: provider.user?.location,
    };

    const result = await callAI({
      systemPrompt,
      messages: [{ role: 'user', content: `Analyze:\n${JSON.stringify(profileData, null, 2)}` }],
      maxTokens: 1200, temperature: 0.4,
    });

    if (!result.success) {
      return NextResponse.json({
        score: 0, strengths: [], improvements: [], suggestedDescription: '',
        suggestedRate: {}, tips: [], error: 'SINTHA AI is having trouble right now.',
        poweredBy: 'SINTHA AI',
      });
    }

    let parsed: any = {};
    try { parsed = extractJSON(result.text); }
    catch { parsed = { score: 50, strengths: [], improvements: [], suggestedDescription: '', suggestedRate: {}, tips: [] }; }

    return NextResponse.json({ ...parsed, poweredBy: 'SINTHA AI' });
  } catch (error) {
    console.error('[AI optimize-profile] error:', error);
    return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 });
  }
}
