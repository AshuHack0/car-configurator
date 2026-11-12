import Anthropic from '@anthropic-ai/sdk';
import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { IdentifyImage, IdentifyResponse } from '@/types/identify';
import { OUTPUT_SCHEMA, SYSTEM_PROMPT } from './core';

type ErrorCode = Extract<IdentifyResponse, { ok: false }>['code'];

/** A provider returns the model's raw JSON text, or a customer-safe error. */
export type ProviderOutcome =
  | { ok: true; text: string }
  | { ok: false; status: number; code: ErrorCode; error: string };

export type ProviderName = 'anthropic' | 'gemini';

const userText = (n: number) => `Identify this car from the ${n} photo(s) above.`;
const err = (status: number, code: ErrorCode, error: string): ProviderOutcome => ({ ok: false, status, code, error });

/**
 * `AI_PROVIDER` picks the provider explicitly. Without it, Gemini is used when
 * only (or also) a Gemini key is configured, otherwise Claude.
 */
export function chooseProvider(): ProviderName {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === 'gemini' || explicit === 'anthropic') return explicit;
  return process.env.GEMINI_API_KEY ? 'gemini' : 'anthropic';
}

// ---- Claude ---------------------------------------------------------------

const CLAUDE_MODEL = 'claude-opus-5-5';

export async function identifyWithClaude(images: IdentifyImage[]): Promise<ProviderOutcome> {
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await new Anthropic().beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      // Opus 5.5 defaults to medium effort; identification is detail-sensitive, so ask for high.
      output_config: { effort: 'high', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      // If a safety classifier declines, retry server-side on Anthropic's recommended fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          ...images.flatMap((img, i) => [
            { type: 'text' as const, text: `Photo ${i + 1}:` },
            { type: 'image' as const, source: { type: 'base64' as const, media_type: img.mediaType, data: img.data } },
          ]),
          { type: 'text', text: userText(images.length) },
        ],
      }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      console.error('[identify:claude] credentials rejected:', error.message);
      return err(503, 'not_configured', 'Car identification is not configured correctly on this server.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      return err(429, 'upstream', 'We are busy right now. Please try again in a minute.');
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error('[identify:claude] bad request:', error.message);
      return err(400, 'bad_request', 'These photos could not be read. Try JPEG photos under 5 MB each.');
    }
    if (error instanceof Anthropic.APIError) {
      // Includes APIConnectionError (network) and 5xx responses.
      console.error(`[identify:claude] API error ${error.status ?? 'connection'}:`, error.message);
      return err(502, 'upstream', 'The identification service is unavailable. Please try again.');
    }
    // Anything else is thrown by the client before a request is sent, e.g. no credentials configured.
    console.error('[identify:claude] client not configured:', error);
    return err(503, 'not_configured', 'Car identification is not configured on this server (set ANTHROPIC_API_KEY in .env.local).');
  }

  if (response.stop_reason === 'refusal') {
    return err(422, 'refused', 'These photos could not be analysed. Please try different photos of the car.');
  }
  if (response.stop_reason === 'max_tokens') {
    return err(502, 'upstream', 'The analysis was cut short. Please try again.');
  }
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text');
  return text ? { ok: true, text: text.text } : err(502, 'upstream', 'No answer came back. Please try again.');
}

// ---- Gemini ---------------------------------------------------------------

/**
 * Flash models to try in order. `GEMINI_MODEL` may override with a comma-separated list. The
 * `-latest` aliases are not served on the SDK's v1 endpoint, and older models (e.g.
 * gemini-2.5-flash) are closed to new API keys. Free-tier models are often briefly overloaded
 * (503), so a busy or unavailable model falls through to the next one.
 */
const geminiModels = () =>
  (process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash,gemini-3.5-flash-lite')
    .split(',').map((m) => m.trim()).filter(Boolean);

/**
 * Per-model time limit, and the budget for the whole request (the route allows 90 s). Busy
 * free-tier models have taken 45–65 s to answer, so the first model gets most of the budget.
 */
const GEMINI_ATTEMPT_MS = 55_000;
const GEMINI_BUDGET_MS = 85_000;
/** Statuses where another model may succeed: overloaded, rate-limited, model unavailable, server error. */
const GEMINI_FALLTHROUGH = new Set([404, 429, 500, 503, 504]);

export async function identifyWithGemini(images: IdentifyImage[]): Promise<ProviderOutcome> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return err(503, 'not_configured', 'Car identification is not configured on this server (set GEMINI_API_KEY in .env.local).');
  }
  const client = new GoogleGenAI({ apiKey });
  const contents = [{
    role: 'user',
    parts: [
      ...images.flatMap((img, i) => [
        { text: `Photo ${i + 1}:` },
        { inlineData: { mimeType: img.mediaType, data: img.data } },
      ]),
      { text: userText(images.length) },
    ],
  }];

  const deadline = Date.now() + GEMINI_BUDGET_MS;
  let last: ProviderOutcome = err(502, 'upstream', 'The identification service is unavailable. Please try again.');

  for (const model of geminiModels()) {
    const remaining = deadline - Date.now();
    // Gemini rejects deadlines under 10 s (as a 400), and a model needs real time to answer.
    if (remaining < 15_000) break;
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: OUTPUT_SCHEMA,
          temperature: 0.2,
          // Recognising a car is perception, not long reasoning; low thinking keeps answers fast.
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          // One quick retry per model instead of the SDK's default five with up to 60 s waits.
          httpOptions: {
            timeout: Math.min(GEMINI_ATTEMPT_MS, remaining),
            // 429 (quota) is not retried: the free tier's limit is per day, so waiting seconds won't help.
            retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 2, httpStatusCodes: [500, 502, 503] },
          },
        },
      });

      if (response.promptFeedback?.blockReason) {
        console.error(`[identify:gemini] ${model} prompt blocked:`, response.promptFeedback.blockReason);
        return err(422, 'refused', 'These photos could not be analysed. Please try different photos of the car.');
      }
      const finish = response.candidates?.[0]?.finishReason;
      if (finish === 'MAX_TOKENS') return err(502, 'upstream', 'The analysis was cut short. Please try again.');
      const text = response.text;
      if (!text) {
        console.error(`[identify:gemini] ${model} empty answer, finishReason:`, finish);
        last = err(502, 'upstream', 'No answer came back. Please try again.');
        continue;
      }
      return { ok: true, text };
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`[identify:gemini] ${model} API error ${error.status}:`, error.message.slice(0, 200));
        if (error.status === 401 || error.status === 403) {
          return err(503, 'not_configured', 'Car identification is not configured correctly on this server.');
        }
        if (error.status === 400) return err(400, 'bad_request', 'These photos could not be read. Try JPEG photos under 5 MB each.');
        if (!GEMINI_FALLTHROUGH.has(error.status)) {
          return err(502, 'upstream', 'The identification service is unavailable. Please try again.');
        }
        last = error.status === 429
          ? err(429, 'upstream', 'The AI usage limit has been reached for now. Please try again later.')
          : err(503, 'upstream', 'The AI service is busy right now. Please try again in a minute.');
        continue;
      }
      // Timeouts and network failures: try the next model while there is time.
      console.error(`[identify:gemini] ${model} request failed:`, error instanceof Error ? error.message : error);
      last = err(504, 'upstream', 'The AI service took too long. Please try again.');
    }
  }
  return last;
}
