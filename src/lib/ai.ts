/**
 * OpenRouter API helper.
 *
 * OpenRouter provides access to multiple AI models through a single API.
 * We use it because it works from any region (unlike direct Anthropic API
 * which blocks certain regions).
 *
 * Models tried (in order of preference):
 *   1. nvidia/nemotron-nano-9b-v2:free — good quality, works from all regions
 *   2. liquid/lfm-2.5-1.2b-instruct:free — fast fallback
 *
 * Claude models on OpenRouter are blocked in some regions (same issue as
 * direct Anthropic API), so we use the free NVIDIA/Liquid models instead.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Primary model — Liquid LFM (fastest: 1-2s, responds in English with strong prompt)
const PRIMARY_MODEL = 'liquid/lfm-2.5-1.2b-instruct:free';
// Fallback model — Cohere (2-3s, reliable English, good quality)
const FALLBACK_MODEL = 'cohere/north-mini-code:free';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResult {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Call an AI model via OpenRouter.
 * Tries the primary model first, falls back to a secondary model if it fails.
 */
export async function callAI(opts: {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResult> {
  if (!OPENROUTER_API_KEY) {
    return { text: '', success: false, error: 'OPENROUTER_API_KEY not configured' };
  }

  const allMessages: ChatMessage[] = [
    { role: 'system', content: opts.systemPrompt },
    ...opts.messages,
  ];

  // Try primary model first (with 8-second timeout — if it's slow, fall back)
  let result = await tryModel(PRIMARY_MODEL, allMessages, opts.maxTokens || 400, opts.temperature ?? 0.7);
  if (result.success) return result;

  // Fallback to secondary model
  console.warn('[AI] Primary model failed, trying fallback:', result.error);
  result = await tryModel(FALLBACK_MODEL, allMessages, opts.maxTokens || 400, opts.temperature ?? 0.7);
  return result;
}

async function tryModel(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): Promise<AIResult> {
  // 8-second timeout — if the model hasn't responded by then, abort and
  // let the caller try the fallback model. This prevents the "sometimes
  // very slow" issue where a model gets stuck on a queued request.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

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
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error(`[AI] ${model} error:`, response.status, errText.slice(0, 200));
      return { text: '', success: false, error: `${model} error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content || content.trim().length === 0) {
      return { text: '', success: false, error: 'Empty response' };
    }

    return { text: content, success: true };
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    console.error(`[AI] ${model} ${isAbort ? 'timed out (8s)' : 'request failed:'}`, err instanceof Error ? err.message : 'unknown');
    return { text: '', success: false, error: isAbort ? 'timeout' : (err instanceof Error ? err.message : 'Request failed') };
  }
}
