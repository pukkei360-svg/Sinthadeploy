import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

/**
 * POST /api/ai/estimate-price
 * Estimates service cost from job description + real provider rates.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, categoryId } = body;

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    let rates: number[] = [];
    let categoryName = 'general service';
    try {
      const { db } = await import('@/lib/db');
      const where = categoryId ? { categoryId, availability: 'available' } : { availability: 'available' };
      const providers = await db.providerProfile.findMany({
        where, take: 30, select: { hourlyRate: true, category: { select: { name: true } } }, orderBy: { rating: 'desc' },
      });
      rates = providers.map(p => p.hourlyRate).filter((r): r is number => typeof r === 'number' && r > 0).sort((a, b) => a - b);
      categoryName = providers[0]?.category?.name || categoryName;
    } catch {}

    const avgRate = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 200;
    const minRate = rates.length > 0 ? rates[0] : 150;
    const maxRate = rates.length > 0 ? rates[rates.length - 1] : 400;

    const systemPrompt = `You are SINTHA's AI price estimator for services in Manipur, India. Return ONLY valid JSON (no markdown):
{"lowEstimate":<number>,"highEstimate":<number>,"medianEstimate":<number>,"estimatedDuration":"<string>","factors":["<string>"],"tips":"<string>"}
All prices in INR. Base on provider rates + job complexity. Always give a range.`;

    const result = await callAI({
      systemPrompt,
      messages: [{ role: 'user', content: `Job: "${description}"\nCategory: ${categoryName}\nRates: min ₹${minRate}, avg ₹${Math.round(avgRate)}, max ₹${maxRate} per hour.\nEstimate total cost.` }],
      maxTokens: 600, temperature: 0.3,
    });

    if (!result.success) {
      return NextResponse.json({
        lowEstimate: 0, highEstimate: 0, medianEstimate: 0, estimatedDuration: '',
        factors: [], tips: 'SINTHA AI is having trouble right now. Please try again later.',
        error: 'SINTHA AI unavailable', currency: 'INR', poweredBy: 'SINTHA AI',
      });
    }

    let parsed: any = {};
    try { parsed = JSON.parse(result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()); }
    catch { parsed = { lowEstimate: Math.round(minRate), highEstimate: Math.round(maxRate * 3), medianEstimate: Math.round(avgRate * 1.5), estimatedDuration: '1-3 hours', factors: ['Job complexity'], tips: 'Post a job to get quotes.' }; }

    return NextResponse.json({ ...parsed, currency: 'INR', poweredBy: 'SINTHA AI' });
  } catch (error) {
    console.error('[AI estimate-price] error:', error);
    return NextResponse.json({ error: 'Failed to estimate' }, { status: 500 });
  }
}
