import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';

/**
 * POST /api/ai/improve-job
 *
 * Improves a job description to attract better quotes from providers.
 * Makes it clearer, more detailed, and more professional — while keeping
 * the user's original intent.
 *
 * Body: { title: string, description: string, category?: string }
 *
 * Returns:
 *   {
 *     improvedTitle: "Leaking Kitchen Tap Repair — Urgent",
 *     improvedDescription: "I have a leaking tap in my kitchen...",
 *     tips: ["Add your location for faster responses", "Mention your budget..."],
 *     qualityScore: 75  // 0-100, how good the original was
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const systemPrompt = `You are SINTHA's AI job description helper. Improve the user's job posting so it attracts better, more accurate quotes from providers.

Return ONLY valid JSON (no markdown, no code fences). Format:
{
  "improvedTitle": "<clear, specific title — max 60 chars>",
  "improvedDescription": "<2-4 sentence improved description with relevant details>",
  "tips": ["<1-3 tips for getting better quotes>"],
  "qualityScore": <0-100, how good the original was>
}

Guidelines:
- Keep the user's original intent — don't add services they didn't ask for
- Make the title specific and searchable (e.g. "Leaking Kitchen Tap Repair" not "Plumber needed")
- The description should include: what needs fixing, urgency, any relevant details
- If the user mentioned a budget or timeline, keep it
- Write in clear, simple English
- Tips should help them get more/better quotes (add location, budget, photos)`;

    const userMessage = `Improve this job posting:

Title: "${title || 'No title'}"
Description: "${description}"
Category: ${category || 'Not specified'}`;

    const result = await callClaude({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 600,
      temperature: 0.5,
    });

    if (!result.success) {
      // No fallback — SINTHA AI (Claude) only
      console.error('[AI improve-job] SINTHA AI failed:', result.error);
      return NextResponse.json({
        improvedTitle: title || '',
        improvedDescription: description,
        tips: [],
        qualityScore: 0,
        error: 'SINTHA AI is having trouble right now. Please try again later.',
        poweredBy: 'SINTHA AI',
      });
    }

    let parsed;
    try {
      const cleanText = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanText);
    } catch {
      parsed = {
        improvedTitle: title || description.slice(0, 50),
        improvedDescription: description,
        tips: [],
        qualityScore: 50,
      };
    }

    return NextResponse.json({ ...parsed, poweredBy: 'SINTHA AI' });
  } catch (error) {
    console.error('[AI improve-job] error:', error);
    return NextResponse.json({ error: 'Failed to improve job' }, { status: 500 });
  }
}
