/**
 * SINTHA AI — Powered by Z.AI SDK
 *
 * Uses the z-ai-web-dev-sdk which works from ALL regions (no blocking).
 * No API key needed — the SDK uses the built-in session token.
 * Fast, reliable, and free.
 */

import ZAI from 'z-ai-web-dev-sdk';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResult {
  text: string;
  success: boolean;
  error?: string;
}

let zaiInstance: any = null;
let zaiCreatedAt = 0;
const ZAI_TTL = 5 * 60 * 1000; // re-create every 5 minutes to avoid token expiry

async function getZAI() {
  const now = Date.now();
  if (!zaiInstance || now - zaiCreatedAt > ZAI_TTL) {
    zaiInstance = await ZAI.create();
    zaiCreatedAt = now;
  }
  return zaiInstance;
}

export async function callAI(opts: {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResult> {
  try {
    const zai = await getZAI();

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: opts.systemPrompt },
      ...opts.messages,
    ];

    const response = await zai.chat.completions.create({
      messages,
      max_tokens: opts.maxTokens || 400,
      temperature: opts.temperature ?? 0.7,
    });

    const content = response.choices?.[0]?.message?.content || '';

    if (!content) {
      return { text: '', success: false, error: 'Empty response' };
    }

    return { text: content, success: true };
  } catch (err) {
    console.error('[AI] Z.AI SDK failed:', err instanceof Error ? err.message : err);
    return { text: '', success: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

/**
 * Extract JSON from an AI response that may be wrapped in markdown.
 */
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
