import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

/**
 * POST /api/ai/improve-job
 * Improves a job description for better provider matching.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category } = body;

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const systemPrompt = `You are SINTHA's AI job posting helper for a Manipur service marketplace. Return ONLY valid JSON (no markdown):
{"improvedTitle":"<max 60 chars, specific and searchable>","improvedDescription":"<3-5 sentences with what/where/when/urgency>","suggestedBudget":<number in INR or null>,"tips":["<1-3 tips>"],"qualityScore":<0-100>}
Rules:
- Keep the user's original intent — don't add services they didn't ask for
- Title should be specific (e.g. "Leaking Kitchen Tap Repair" not "Plumber needed")
- Description should include: what needs fixing, urgency, any relevant details
- If user mentioned a budget, keep it; if not, suggest a reasonable one based on the job type
- Write in clear, simple English
- Prices in INR (₹), realistic for Manipur, India`;

    const result = await callAI({
      systemPrompt,
      messages: [{ role: 'user', content: `Improve:\nTitle: "${title || 'No title'}"\nDescription: "${description}"\nCategory: ${category || 'N/A'}` }],
      maxTokens: 600, temperature: 0.5,
    });

    if (!result.success) {
      return NextResponse.json({
        improvedTitle: title || '', improvedDescription: description, tips: [],
        qualityScore: 0, error: 'SINTHA AI is having trouble right now.',
        poweredBy: 'SINTHA AI',
      });
    }

    let parsed: any = {};
    try { parsed = JSON.parse(result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()); }
    catch { parsed = { improvedTitle: title || description.slice(0, 50), improvedDescription: description, tips: [], qualityScore: 50 }; }

    return NextResponse.json({ ...parsed, poweredBy: 'SINTHA AI' });
  } catch (error) {
    console.error('[AI improve-job] error:', error);
    return NextResponse.json({ error: 'Failed to improve' }, { status: 500 });
  }
}
