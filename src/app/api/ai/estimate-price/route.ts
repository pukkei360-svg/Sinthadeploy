import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callClaude } from '@/lib/claude';

/**
 * POST /api/ai/estimate-price
 *
 * Estimates the cost of a service based on the user's description.
 * Uses real provider rates from the database + Claude's understanding
 * of typical job durations and complexity.
 *
 * Body: { description: string, categoryId?: string }
 * Example: { description: "Fix a leaking kitchen tap" }
 *
 * Returns:
 *   {
 *     lowEstimate: 150,
 *     highEstimate: 400,
 *     medianEstimate: 250,
 *     estimatedDuration: "1-2 hours",
 *     factors: ["Complexity of the leak", "Whether parts need replacing"],
 *     tips: "Get quotes from 2-3 providers for the best price...",
 *     currency: "INR"
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, categoryId } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // Fetch provider rates to base estimates on real data
    const where = categoryId ? { categoryId, availability: 'available' } : { availability: 'available' };
    const providers = await db.providerProfile.findMany({
      where,
      take: 30,
      select: {
        hourlyRate: true,
        experience: true,
        rating: true,
        category: { select: { name: true } },
      },
      orderBy: { rating: 'desc' },
    });

    const rates = providers
      .map(p => p.hourlyRate)
      .filter((r): r is number => typeof r === 'number' && r > 0)
      .sort((a, b) => a - b);

    const avgRate = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 200;
    const minRate = rates.length > 0 ? rates[0] : 150;
    const maxRate = rates.length > 0 ? rates[rates.length - 1] : 400;

    const categoryName = providers[0]?.category?.name || 'general service';

    const systemPrompt = `You are SINTHA's AI price estimator for services in Manipur, India. Estimate the total cost of a job based on the user's description and real provider rates.

Return ONLY valid JSON (no markdown, no code fences). Format:
{
  "lowEstimate": <number, minimum reasonable cost in ₹>,
  "highEstimate": <number, maximum reasonable cost in ₹>,
  "medianEstimate": <number, most likely cost in ₹>,
  "estimatedDuration": "<e.g. '1-2 hours', 'Half day', '1 day'>",
  "factors": ["<factors affecting the price>", ...],
  "tips": "<1-2 sentence tip on getting the best price>",
  "breakdown": "<optional: brief breakdown if the job has multiple parts>"
}

Guidelines:
- All prices in INR (₹), realistic for Manipur, India
- Base estimates on the provider rates provided + typical job complexity
- For simple jobs (1 hour): lowEstimate ≈ minRate × 1, highEstimate ≈ maxRate × 2
- For complex jobs (full day): multiply accordingly
- Always include a range (low to high) — never give a single price
- Factors should help the user understand WHY the price varies
- Tips should mention getting multiple quotes or using SINTHA's job posting feature`;

    const userMessage = `Job description: "${description}"
Service category: ${categoryName}

Real provider rates (₹/hour):
- Minimum: ₹${minRate}
- Average: ₹${Math.round(avgRate)}
- Maximum: ₹${maxRate}
- Total providers with rates: ${rates.length}

Estimate the total cost for this job.`;

    const result = await callClaude({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 600,
      temperature: 0.3,
    });

    if (!result.success) {
      // Fallback: simple calculation based on average rate
      const low = Math.round(minRate * 1);
      const high = Math.round(maxRate * 3);
      const median = Math.round(avgRate * 1.5);
      return NextResponse.json({
        lowEstimate: low,
        highEstimate: high,
        medianEstimate: median,
        estimatedDuration: '1-3 hours (estimated)',
        factors: ['Provider experience', 'Job complexity', 'Materials needed'],
        tips: 'Get quotes from 2-3 providers for the best price. Post a job on SINTHA to receive competitive quotes!',
        currency: 'INR',
        poweredBy: 'Rate-based Fallback',
      });
    }

    let parsed;
    try {
      const cleanText = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanText);
    } catch {
      parsed = {
        lowEstimate: Math.round(minRate),
        highEstimate: Math.round(maxRate * 3),
        medianEstimate: Math.round(avgRate * 1.5),
        estimatedDuration: '1-3 hours',
        factors: ['Job complexity'],
        tips: 'Post a job to get quotes from multiple providers.',
      };
    }

    return NextResponse.json({ ...parsed, currency: 'INR', poweredBy: 'Claude' });
  } catch (error) {
    console.error('[AI estimate-price] error:', error);
    return NextResponse.json({ error: 'Failed to estimate price' }, { status: 500 });
  }
}
