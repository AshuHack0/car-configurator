import { NextResponse } from 'next/server';
import { toResult, type ModelOutput } from '@/lib/identify/core';
import { chooseProvider, identifyWithClaude, identifyWithGemini } from '@/lib/identify/providers';
import type { IdentifyImage, IdentifyRequest, IdentifyResponse } from '@/types/identify';

export const runtime = 'nodejs';
// Vision + reasoning over several photos can take a while; give the platform room.
export const maxDuration = 90;

const MAX_IMAGES = 8;
/** ~5 MB of base64 per photo; the browser resizes to ~1600px so real uploads are far smaller. */
const MAX_IMAGE_CHARS = 7_000_000;
const MEDIA_TYPES = new Set<IdentifyImage['mediaType']>(['image/jpeg', 'image/png', 'image/webp']);

const fail = (status: number, code: Extract<IdentifyResponse, { ok: false }>['code'], error: string) =>
  NextResponse.json<IdentifyResponse>({ ok: false, code, error }, { status });

function parseRequest(body: unknown): IdentifyImage[] | string {
  const images = (body as IdentifyRequest | null)?.images;
  if (!Array.isArray(images) || images.length === 0) return 'Upload at least one photo of your car.';
  if (images.length > MAX_IMAGES) return `Upload at most ${MAX_IMAGES} photos.`;
  for (const img of images) {
    if (!img || typeof img.data !== 'string' || !MEDIA_TYPES.has(img.mediaType)) return 'Photos must be JPEG, PNG or WebP.';
    if (img.data.length > MAX_IMAGE_CHARS) return 'One of the photos is too large.';
  }
  return images;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'bad_request', 'Invalid request.');
  }
  const images = parseRequest(body);
  if (typeof images === 'string') return fail(400, 'bad_request', images);

  const provider = chooseProvider();
  const outcome = provider === 'gemini' ? await identifyWithGemini(images) : await identifyWithClaude(images);
  if (!outcome.ok) return fail(outcome.status, outcome.code, outcome.error);

  let output: ModelOutput;
  try {
    output = JSON.parse(outcome.text) as ModelOutput;
  } catch {
    console.error(`[identify:${provider}] unparseable model output`);
    return fail(502, 'upstream', 'The answer could not be read. Please try again.');
  }
  return NextResponse.json<IdentifyResponse>({ ok: true, result: toResult(output) });
}
