/**
 * AI helper — tries Gemini first (free, 1500 req/day), then Groq, then OpenRouter.
 *
 * Gemini is the best option: free, generous limits, works from most regions.
 * Groq is fastest but may be region-blocked.
 * OpenRouter is the last resort (50 free req/day, needs credits for more).
 *
 * Env vars (set on Vercel):
 *   GeminiApiKey  — Google AI Studio key (https://aistudio.google.com/app/apikey)
 *   GROQ_API_KEY  — Groq key (https://console.groq.com/keys)
 *   OPENROUTER_API_KEY — OpenRouter key (https://openrouter.ai/keys)
 */

// Gemini (Google) — primary
const GEMINI_API_KEY = process.env.GeminiApiKey || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Groq — secondary
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// OpenRouter — last resort
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_PRIMARY = 'liquid/lfm-2.5-1.2b-instruct:free';
const OR_FALLBACK = 'cohere/north-mini-code:free';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResult {
  text: string;
  success: boolean;
  error?: string;
}

export async function callAI(opts: {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResult> {
  const allMessages: ChatMessage[] = [
    { role: 'system', content: opts.systemPrompt },
    ...opts.messages,
  ];
  const maxTokens = opts.maxTokens || 400;
  const temperature = opts.temperature ?? 0.7;

  // 1. Try Gemini first (free, 1500 req/day, works from most regions)
  if (GEMINI_API_KEY) {
    const result = await tryGemini(opts.systemPrompt, opts.messages, maxTokens, temperature);
    if (result.success) return result
    console.warn('[AI] Gemini failed, trying Groq:', result.error)
  }

  // 2. Try Groq (fast, but may be region-blocked)
  if (GROQ_API_KEY) {
    const result = await tryGroq(allMessages, maxTokens, temperature);
    if (result.success) return result
    console.warn('[AI] Groq failed, trying OpenRouter:', result.error)
  }

  // 3. Try OpenRouter primary (Liquid, ~2s)
  if (OPENROUTER_API_KEY) {
    let result = await tryOpenRouter(OR_PRIMARY, allMessages, maxTokens, temperature)
    if (result.success) return result
    console.warn('[AI] OpenRouter primary failed, trying fallback:', result.error)

    // 4. Try OpenRouter fallback (Cohere, ~3s)
    result = await tryOpenRouter(OR_FALLBACK, allMessages, maxTokens, temperature)
    return result
  }

  return { text: '', success: false, error: 'No AI API key configured' }
}

/**
 * Call Gemini via Google's Generative Language API.
 * Gemini uses a different API format (not OpenAI-compatible).
 */
async function tryGemini(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): Promise<AIResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    // Convert to Gemini's contents format
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I am SINTHA AI, ready to help.' }] },
    ]

    for (const msg of messages) {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] })
      } else if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] })
      }
    }

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown')
      console.error('[AI] Gemini error:', response.status, errText.slice(0, 200))
      return { text: '', success: false, error: `Gemini ${response.status}` }
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!content) {
      return { text: '', success: false, error: 'Empty Gemini response' }
    }

    return { text: content, success: true }
  } catch (err) {
    clearTimeout(timeout)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error('[AI] Gemini failed:', isAbort ? 'timeout' : err)
    return { text: '', success: false, error: isAbort ? 'timeout' : 'Gemini failed' }
  }
}

async function tryGroq(
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): Promise<AIResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown')
      console.error('[AI] Groq error:', response.status, errText.slice(0, 200))
      return { text: '', success: false, error: `Groq ${response.status}` }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    if (!content) {
      return { text: '', success: false, error: 'Empty Groq response' }
    }

    return { text: content, success: true }
  } catch (err) {
    clearTimeout(timeout)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error('[AI] Groq failed:', isAbort ? 'timeout' : err)
    return { text: '', success: false, error: isAbort ? 'timeout' : 'Groq failed' }
  }
}

async function tryOpenRouter(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): Promise<AIResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://sinthadeploy.vercel.app',
        'X-Title': 'SINTHA',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        reasoning: { exclude: true },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown')
      console.error(`[AI] ${model} error:`, response.status, errText.slice(0, 200))
      return { text: '', success: false, error: `${model} ${response.status}` }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    if (!content) {
      return { text: '', success: false, error: 'Empty response' }
    }

    return { text: content, success: true }
  } catch (err) {
    clearTimeout(timeout)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error(`[AI] ${model} ${isAbort ? 'timed out' : 'failed'}`)
    return { text: '', success: false, error: isAbort ? 'timeout' : 'Request failed' }
  }
}

/**
 * Extract JSON from an AI response that may be wrapped in markdown
 * code fences (```json ... ```) or have extra text before/after the JSON.
 * 
 * Used by smart-search, estimate-price, optimize-profile, and improve-job
 * endpoints to parse the AI's JSON response.
 */
export function extractJSON(text: string): any | null {
  if (!text) return null
  
  // Strategy 1: Try parsing the whole text as JSON
  try {
    return JSON.parse(text.trim())
  } catch {}

  // Strategy 2: Remove markdown code fences and try again
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {}

  // Strategy 3: Find the first { and last } and extract between them
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = cleaned.substring(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(jsonStr)
    } catch {}
  }

  // Strategy 4: Find the first [ and last ] (for arrays)
  const firstBracket = cleaned.indexOf('[')
  const lastBracket = cleaned.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const jsonStr = cleaned.substring(firstBracket, lastBracket + 1)
    try {
      return JSON.parse(jsonStr)
    } catch {}
  }

  console.error('[AI] Could not extract JSON from:', text.slice(0, 200))
  return null
}
