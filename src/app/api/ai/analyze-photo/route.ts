import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * POST /api/ai/analyze-photo
 * Body: { photoUrl: string, categories: [{id, name}] }
 * 
 * Analyzes a job photo using Z.AI VLM and returns:
 * - description of what's in the photo
 * - suggested category
 * - suggested title for the job posting
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoUrl, categories } = body as { photoUrl: string; categories: Array<{ id: string; name: string }> };

    if (!photoUrl) {
      return NextResponse.json({ error: 'photoUrl is required' }, { status: 400 });
    }

    const zai = await ZAI.create();

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a service marketplace assistant. Look at this photo and tell me:
1. What do you see? (one sentence description)
2. What type of service provider would fix this? Choose from: ${categories.map(c => c.name).join(', ')}
3. Suggest a short title for a job posting (max 60 chars)

Format your response as JSON: {"description":"...","category":"...","title":"..."}`,
            },
            {
              type: 'image_url',
              image_url: { url: photoUrl },
            },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const content = response.choices[0]?.message?.content || '';

    // Try to parse JSON from the response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Match category to SINTHA category ID
        let matchedCategoryId = null;
        if (parsed.category) {
          const directMatch = categories.find(
            (c) => c.name.toLowerCase() === parsed.category.toLowerCase()
          );
          if (directMatch) matchedCategoryId = directMatch.id;
        }
        return NextResponse.json({
          success: true,
          description: parsed.description || '',
          suggestedCategory: parsed.category || '',
          suggestedTitle: parsed.title || '',
          matchedCategoryId,
        });
      }
    } catch {
      // JSON parsing failed
    }

    return NextResponse.json({
      success: true,
      description: content.slice(0, 200),
    });
  } catch (error) {
    console.error('[AI Photo Analysis] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
