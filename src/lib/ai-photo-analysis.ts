/**
 * AI-powered photo analysis for job postings.
 *
 * When a user uploads a photo of their problem (e.g., broken fan, leaking
 * pipe), this function sends the photo to Z.AI's VLM (Vision Language Model)
 * and gets back:
 *   - A suggested category (electrician, plumber, etc.)
 *   - A description of what the AI sees
 *   - A suggested title for the job posting
 *
 * This helps users who don't know which category to pick — they just
 * take a photo and the AI figures it out.
 */

import ZAI from 'z-ai-web-dev-sdk'

export interface PhotoAnalysisResult {
  success: boolean
  suggestedCategory?: string
  description?: string
  suggestedTitle?: string
  error?: string
}

// Map AI responses to SINTHA category names
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Home Services': ['wall', 'ceiling', 'door', 'window', 'fan', 'light', 'switch', 'paint', 'leak', 'pipe', 'tap', 'roof', 'floor', 'tile', 'lock'],
  'Education': ['book', 'study', 'exam', 'homework', 'tutorial', 'learn', 'teach', 'student'],
  'Transport': ['car', 'bike', 'vehicle', 'motorcycle', 'scooter', 'tire', 'engine', 'fuel'],
  'Beauty & Wellness': ['hair', 'makeup', 'nail', 'facial', 'beauty', 'spa', 'salon'],
  'Repairs': ['phone', 'mobile', 'computer', 'laptop', 'tv', 'screen', 'battery', 'charger', 'electronic', 'device'],
  'Events': ['stage', 'decoration', 'party', 'wedding', 'camera', 'photo', 'event', 'celebration'],
}

export async function analyzeJobPhoto(photoUrl: string): Promise<PhotoAnalysisResult> {
  try {
    const zai = await ZAI.create()

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a service marketplace assistant. Look at this photo and tell me:
1. What do you see? (one sentence description)
2. What type of service provider would fix this? Choose from: Home Services, Education, Transport, Beauty & Wellness, Repairs, Events
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
    })

    const content = response.choices[0]?.message?.content || ''

    // Try to parse JSON from the response
    try {
      // Extract JSON from the response (it might be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          success: true,
          suggestedCategory: parsed.category || '',
          description: parsed.description || '',
          suggestedTitle: parsed.title || '',
        }
      }
    } catch {
      // JSON parsing failed — return the raw content as description
    }

    // Fallback: return raw content
    return {
      success: true,
      description: content.slice(0, 200),
    }
  } catch (error) {
    console.error('[AI Photo Analysis] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
    }
  }
}

/**
 * Match an AI-suggested category string to a SINTHA category name.
 * Uses keyword matching as a fallback if the AI's category doesn't
 * exactly match a SINTHA category name.
 */
export function matchCategory(aiCategory: string, sinthaCategories: Array<{ id: string; name: string }>): string | null {
  // Direct match
  const directMatch = sinthaCategories.find(
    (c) => c.name.toLowerCase() === aiCategory.toLowerCase()
  )
  if (directMatch) return directMatch.id

  // Keyword match
  const aiLower = aiCategory.toLowerCase()
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => aiLower.includes(kw))) {
      const match = sinthaCategories.find((c) => c.name === catName)
      if (match) return match.id
    }
  }

  return null
}
