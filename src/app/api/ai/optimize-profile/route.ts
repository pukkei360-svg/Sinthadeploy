import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callClaude } from '@/lib/claude';

/**
 * POST /api/ai/optimize-profile
 *
 * Analyzes a provider's profile and returns AI suggestions for improvement.
 * Helps providers get more bookings by optimizing their description, skills,
 * hourly rate, and overall profile completeness.
 *
 * Body: { providerId: string }
 *
 * Returns:
 *   {
 *     score: 75,  // 0-100 profile completeness score
 *     strengths: ["Great rating", "Verified badge"],
 *     improvements: [
 *       { area: "Description", suggestion: "Add more detail about..." , priority: "high" },
 *       ...
 *     ],
 *     suggestedDescription: "Here's an improved version of your description...",
 *     suggestedRate: { current: 200, suggested: 250, reason: "Based on your experience..." }
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId } = body;

    if (!providerId) {
      return NextResponse.json({ error: 'providerId is required' }, { status: 400 });
    }

    const provider = await db.providerProfile.findFirst({
      where: { userId: providerId },
      include: {
        user: { select: { name: true, photoUrl: true, isVerified: true, isPro: true, location: true } },
        category: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const systemPrompt = `You are SINTHA's AI profile optimizer for service providers. Analyze the provider's profile and give actionable suggestions to help them get more bookings.

Return ONLY valid JSON (no markdown, no code fences). Format:
{
  "score": <0-100, profile completeness + quality score>,
  "strengths": ["<what they're doing well>", ...],
  "improvements": [
    {
      "area": "<Description|Skills|Hourly Rate|Photo|Experience|Verification>",
      "suggestion": "<specific actionable advice>",
      "priority": "<high|medium|low>"
    }
  ],
  "suggestedDescription": "<if their current description is weak, write a better 2-3 sentence version; if good, return empty string>",
  "suggestedRate": {
    "current": <number or null>,
    "suggested": <number or null>,
    "reason": "<why this rate makes sense based on their experience/rating/category>"
  },
  "tips": ["<1-3 quick tips for getting more bookings>"]
}

Scoring guide:
- 90-100: Excellent profile, likely to get many bookings
- 70-89: Good profile, minor improvements needed
- 50-69: Average profile, several areas to improve
- Below 50: Needs significant work

Be encouraging but honest. Prioritize high-impact improvements (photo, description, verification) over minor ones.`;

    const profileData = {
      name: provider.user?.name,
      category: provider.category?.name,
      skills: provider.skills,
      description: provider.description,
      experience: provider.experience,
      hourlyRate: provider.hourlyRate,
      rating: provider.rating,
      totalReviews: provider.totalReviews,
      totalBookings: provider.totalBookings,
      isVerified: provider.user?.isVerified,
      isPro: provider.user?.isPro,
      hasPhoto: !!provider.user?.photoUrl,
      location: provider.user?.location,
      portfolioUrls: provider.portfolioUrls,
    };

    const result = await callClaude({
      systemPrompt,
      messages: [{ role: 'user', content: `Analyze this provider profile:\n${JSON.stringify(profileData, null, 2)}` }],
      maxTokens: 1200,
      temperature: 0.4,
    });

    if (!result.success) {
      // No fallback — SINTHA AI (Claude) only
      console.error('[AI optimize-profile] SINTHA AI failed:', result.error);
      return NextResponse.json({
        score: 0,
        strengths: [],
        improvements: [],
        suggestedDescription: '',
        suggestedRate: {},
        tips: [],
        error: 'SINTHA AI is having trouble right now. Please try again later.',
        poweredBy: 'SINTHA AI',
      });
    }

    let parsed;
    try {
      const cleanText = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanText);
    } catch {
      parsed = { score: 50, strengths: [], improvements: [], suggestedDescription: '', suggestedRate: {}, tips: [] };
    }

    return NextResponse.json({ ...parsed, poweredBy: 'SINTHA AI' });
  } catch (error) {
    console.error('[AI optimize-profile] error:', error);
    return NextResponse.json({ error: 'Failed to analyze profile' }, { status: 500 });
  }
}

