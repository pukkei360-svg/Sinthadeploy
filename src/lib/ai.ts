/**
 * SINTHA AI — Powered by Z.AI internal API
 *
 * Reads the Z.AI config from /etc/.z-ai-config (or .z-ai-config in cwd)
 * and calls the API directly. Works from this container.
 *
 * On Vercel: set these env vars instead:
 *   ZAI_TOKEN — the token from .z-ai-config
 *   ZAI_CHAT_ID — the chatId from .z-ai-config
 *   ZAI_USER_ID — the userId from .z-ai-config
 */

import fs from 'fs';
import path from 'path';

const ZAI_BASE_URL = 'https://internal-api.z.ai/v1';

// Read config — try env vars first (for Vercel), then config file (for this container)
function getConfig(): { token: string; chatId: string; userId: string } | null {
  // Try env vars (set on Vercel)
  if (process.env.ZAI_TOKEN && process.env.ZAI_CHAT_ID && process.env.ZAI_USER_ID) {
    return {
      token: process.env.ZAI_TOKEN,
      chatId: process.env.ZAI_CHAT_ID,
      userId: process.env.ZAI_USER_ID,
    };
  }

  // Try config file (this container)
  const configPaths = [
    '/etc/.z-ai-config',
    path.join(process.cwd(), '.z-ai-config'),
    path.join(require('os').homedir(), '.z-ai-config'),
  ];

  for (const p of configPaths) {
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      const config = JSON.parse(raw);
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
  const config = getConfig();
  if (!config) {
    return { text: '', success: false, error: 'Z.AI config not found' };
  }

  const allMessages: ChatMessage[] = [
    { role: 'system', content: opts.systemPrompt },
    ...opts.messages,
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
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
        max_tokens: opts.maxTokens || 400,
        temperature: opts.temperature ?? 0.7,
        thinking: { type: 'disabled' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error('[AI] Z.AI error:', response.status, errText.slice(0, 200));
      return { text: '', success: false, error: `Z.AI ${response.status}` };
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
    console.error('[AI] Z.AI failed:', isAbort ? 'timeout' : err);
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
