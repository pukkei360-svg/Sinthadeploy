/**
 * AI helper — tries Groq first (fast, Llama 3.3 70B), falls back to OpenRouter.
 *
 * Groq is extremely fast (< 1 second) but may be region-blocked (same as
 * Anthropic). When deployed on Vercel (US/Europe servers), Groq works perfectly.
 * OpenRouter is the fallback (works from all regions but slightly slower).
 *
 * Models:
 *   Groq:       llama-3.3-70b-versatile (best quality + speed, ~0.5s on Vercel)
 *   OpenRouter: liquid/lfm-2.5-1.2b-instruct:free (fallback, ~2s)
 *               cohere/north-mini-code:free (second fallback, ~3s)
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

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

  // 1. Try Groq first (fastest + best quality, ~0.5s on Vercel)
  if (GROQ_API_KEY) {
    const result = await tryGroq(allMessages, maxTokens, temperature);
    if (result.success) return result
    console.warn('[AI] Groq failed, trying OpenRouter:', result.error)
  }

  // 2. Try OpenRouter primary (Liquid, ~2s)
  if (OPENROUTER_API_KEY) {
    let result = await tryOpenRouter(OR_PRIMARY, allMessages, maxTokens, temperature)
    if (result.success) return result
    console.warn('[AI] OpenRouter primary failed, trying fallback:', result.error)

    // 3. Try OpenRouter fallback (Cohere, ~3s)
    result = await tryOpenRouter(OR_FALLBACK, allMessages, maxTokens, temperature)
    return result
  }

  return { text: '', success: false, error: 'No AI API key configured' }
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
