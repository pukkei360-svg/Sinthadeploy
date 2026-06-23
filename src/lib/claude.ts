/**
 * Anthropic Claude API helper.
 *
 * Shared by all AI-powered features (smart search, profile optimizer,
 * price estimator, job description helper, and the chat assistant).
 *
 * Falls back gracefully if the API key is missing or the request fails.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResult {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Call Claude with a system prompt + messages.
 * Returns the text response, or an error result if it fails.
 *
 * Usage:
 *   const result = await callClaude({
 *     systemPrompt: 'You are a helpful assistant.',
 *     messages: [{ role: 'user', content: 'Hello' }],
 *     maxTokens: 500,
 *   });
 *   if (result.success) { console.log(result.text); }
 */
export async function callClaude(opts: {
  systemPrompt: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<ClaudeResult> {
  if (!ANTHROPIC_API_KEY) {
    return { text: '', success: false, error: 'ANTHROPIC_API_KEY not configured' };
  }

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: opts.maxTokens || 800,
        system: opts.systemPrompt,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error('[Claude] API error:', response.status, errText.slice(0, 200));
      return { text: '', success: false, error: `Claude API error: ${response.status}` };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (!text) {
      return { text: '', success: false, error: 'Empty response from Claude' };
    }

    return { text, success: true };
  } catch (err) {
    console.error('[Claude] Request failed:', err instanceof Error ? err.message : 'unknown');
    return { text: '', success: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}
