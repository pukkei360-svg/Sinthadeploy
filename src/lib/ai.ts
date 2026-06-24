/**
 * SINTHA AI — Powered by Gemini (Vercel) + Z.AI internal (this container)
 *
 * Two providers, tried in order:
 * 1. Gemini (Google) — works from Vercel (all regions), free 1500 req/day
 * 2. Z.AI internal API — works from this container only (for local testing)
 *
 * Vercel env vars: GeminiApiKey (the Google AI key)
 * Container: reads /etc/.z-ai-config automatically
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// Gemini config
const GEMINI_KEY = process.env.GeminiApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';

// Z.AI internal config
const ZAI_BASE_URL = 'https://internal-api.z.ai/v1';

function getZaiConfig(): { token: string; chatId: string; userId: string } | null {
  if (process.env.ZAI_TOKEN && process.env.ZAI_CHAT_ID && process.env.ZAI_USER_ID) {
    return { token: process.env.ZAI_TOKEN, chatId: process.env.ZAI_CHAT_ID, userId: process.env.ZAI_USER_ID };
  }
  for (const p of ['/etc/.z-ai-config', path.join(process.cwd(), '.z-ai-config'), path.join(os.homedir(), '.z-ai-config')]) {
    try {
      const config = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (config.token && config.chatId && config.userId) {
        return { token: config.token, chatId: config.chatId, userId: config.userId };
      }
    } catch {}
  }
  return null;
}

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
  // 1. Try Gemini first (works on Vercel, all regions)
  if (GEMINI_KEY) {
    const result = await tryGemini(opts.systemPrompt, opts.messages, opts.maxTokens || 400, opts.temperature ?? 0.7);
    if (result.success) return result;
    console.warn('[AI] Gemini failed:', result.error);
  }

  // 2. Try Z.AI internal API (works from this container)
  const zaiConfig = getZaiConfig();
  if (zaiConfig) {
    const result = await tryZai(zaiConfig, opts.systemPrompt, opts.messages, opts.maxTokens || 400, opts.temperature ?? 0.7);
    if (result.success) return result;
    console.warn('[AI] Z.AI failed:', result.error);
  }

  return { text: '', success: false, error: 'All AI providers failed' };
}

async function tryGemini(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): Promise<AIResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

  try {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I am SINTHA AI, ready to help.' }] },
    ];
    for (const msg of messages) {
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature, maxOutputTokens: maxTokens } }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error('[AI] Gemini error:', response.status, errText.slice(0, 150));
      return { text: '', success: false, error: `Gemini ${response.status}` };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!content) return { text: '', success: false, error: 'Empty Gemini response' };
    return { text: content, success: true };
  } catch (err) {
    clearTimeout(timeout);
    return { text: '', success: false, error: err instanceof Error ? err.message : 'Gemini failed' };
  }
}

async function tryZai(
  config: { token: string; chatId: string; userId: string },
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): Promise<AIResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const allMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer Z.ai',
        'X-Z-AI-From': 'Z',
        'X-Chat-Id': config.chatId,
        'X-User-Id': config.userId,
        'X-Token': config.token,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: allMessages,
        max_tokens: maxTokens,
        temperature,
        thinking: { type: 'disabled' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error('[AI] Z.AI error:', response.status, errText.slice(0, 150));
      return { text: '', success: false, error: `Z.AI ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) return { text: '', success: false, error: 'Empty Z.AI response' };
    return { text: content, success: true };
  } catch (err) {
    clearTimeout(timeout);
    return { text: '', success: false, error: err instanceof Error ? err.message : 'Z.AI failed' };
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
