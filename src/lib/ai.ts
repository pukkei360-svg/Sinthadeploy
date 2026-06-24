/**
 * SINTHA AI — Powered by OpenAI (GPT-4o-mini)
 *
 * Single provider, clean and simple.
 * Works from Vercel (US/Europe servers).
 *
 * Env var: OPENAI_API_KEY (set on Vercel)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.GeminiApiKey;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

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
  if (!OPENAI_API_KEY) {
    return { text: '', success: false, error: 'OPENAI_API_KEY not configured' };
  }

  const allMessages: ChatMessage[] = [
    { role: 'system', content: opts.systemPrompt },
    ...opts.messages,
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: allMessages,
        max_tokens: opts.maxTokens || 400,
        temperature: opts.temperature ?? 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error('[AI] OpenAI error:', response.status, errText.slice(0, 200));
      return { text: '', success: false, error: `OpenAI ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      return { text: '', success: false, error: 'Empty response' };
    }

    return { text: content, success: true };
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    console.error('[AI] OpenAI failed:', isAbort ? 'timeout' : err);
    return { text: '', success: false, error: isAbort ? 'timeout' : 'Request failed' };
  }
}

export function extractJSON(text: string): any | null {
  if (!text) return null;
  try { return JSON.parse(text.trim()); } catch {}
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)); } catch {}
  }
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try { return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1)); } catch {}
  }
  return null;
}
