import { NextResponse } from 'next/server';
import { ApiError, GoogleGenAI } from '@google/genai';
import { getVehicle, vehicleTitle } from '@/data/vehicles';
import { buildPrompt, describeChanges } from '@/lib/visualize/changes';
import type { IdentifyImage } from '@/types/identify';
import type { Configuration } from '@/types/product';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** ~5 MB of base64. */
const MAX_IMAGE_CHARS = 7_000_000;
const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Image models to try in order; `GEMINI_IMAGE_MODEL` may override with a comma-separated list. */
const imageModels = () =>
  (process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-3.1-flash-image,gemini-2.5-flash-image')
    .split(',').map((m) => m.trim()).filter(Boolean);

/**
 * Every generated image is billed, so cap how many this server will make per hour
 * (`VISUALIZE_HOURLY_LIMIT`, default 20). In-memory: resets when the server restarts.
 */
const recent: number[] = [];
function overLimit(): boolean {
  const limit = Number(process.env.VISUALIZE_HOURLY_LIMIT) || 20;
  const cutoff = Date.now() - 3_600_000;
  while (recent.length && recent[0] < cutoff) recent.shift();
  return recent.length >= limit;
}

type Result = { ok: true; image: IdentifyImage; model: string } | { ok: false; error: string };
const fail = (status: number, error: string) => NextResponse.json<Result>({ ok: false, error }, { status });

export async function POST(req: Request) {
  let body: { image?: IdentifyImage; vehicleId?: string; config?: Pick<Configuration, 'paint' | 'selections'> } | null;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Invalid request.');
  }

  const image = body?.image;
  if (!image || typeof image.data !== 'string' || !MEDIA_TYPES.has(image.mediaType)) return fail(400, 'Add a JPEG, PNG or WebP photo of the car.');
  if (image.data.length > MAX_IMAGE_CHARS) return fail(400, 'The photo is too large.');

  const vehicle = getVehicle(body?.vehicleId ?? '');
  if (!vehicle) return fail(400, 'Unknown vehicle.');
  if (!body?.config?.paint || typeof body.config.paint.id !== 'string') return fail(400, 'Nothing to change yet.');

  // The prompt is written here from catalogue data; no free text from the browser reaches the model.
  const changes = describeChanges({ paint: body.config.paint, selections: body.config.selections ?? {} });
  if (!changes.length) return fail(400, 'Choose a colour or a part in the configurator first.');

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fail(503, 'Photo generation is not configured on this server (set GEMINI_API_KEY in .env.local).');
  if (overLimit()) return fail(429, 'The hourly limit for generated photos has been reached. Please try again later.');

  const client = new GoogleGenAI({ apiKey });
  const contents = [{
    role: 'user',
    parts: [{ inlineData: { mimeType: image.mediaType, data: image.data } }, { text: buildPrompt(vehicleTitle(vehicle), changes) }],
  }];

  let lastError = 'The photo service is unavailable. Please try again.';
  for (const model of imageModels()) {
    try {
      recent.push(Date.now());
      const response = await client.models.generateContent({
        model, contents,
        config: { responseModalities: ['IMAGE'], httpOptions: { timeout: 100_000, retryOptions: { attempts: 1 } } },
      });
      if (response.promptFeedback?.blockReason) {
        console.error(`[visualize] ${model} prompt blocked:`, response.promptFeedback.blockReason);
        return fail(422, 'This photo could not be edited. Please try a different photo of the car.');
      }
      const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (part?.inlineData?.data) {
        const mediaType = (part.inlineData.mimeType ?? 'image/png') as IdentifyImage['mediaType'];
        return NextResponse.json<Result>({ ok: true, image: { mediaType, data: part.inlineData.data }, model });
      }
      console.error(`[visualize] ${model} returned no image, finishReason:`, response.candidates?.[0]?.finishReason);
      lastError = 'No photo came back. Please try again.';
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`[visualize] ${model} API error ${error.status}:`, error.message.slice(0, 300));
        if (error.status === 401 || error.status === 403) return fail(503, 'Photo generation is not configured correctly on this server.');
        if (error.status === 429) lastError = 'The photo quota for this key is used up. Check billing for the Gemini image model.';
        continue;
      }
      console.error(`[visualize] ${model} failed:`, error);
    }
  }
  return fail(502, lastError);
}
