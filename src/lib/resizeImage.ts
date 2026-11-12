import type { IdentifyImage } from '@/types/identify';

/** Long edge sent to the model. Larger photos are downscaled by the API anyway, so this only saves upload time and cost. */
const MAX_EDGE = 1568;
const QUALITY = 0.86;

/** Problems we can detect in the browser before anything is uploaded. */
export type LocalPhotoIssue = 'too_small' | 'too_dark' | 'too_bright' | 'too_blurry';

/** Size of the copy used for quality analysis (fast, and independent of camera resolution). */
const ANALYSIS_EDGE = 320;
const MIN_SHORT_EDGE = 480;
const DARK_MEAN = 50;
const BRIGHT_MEAN = 215;
/**
 * Variance of the Laplacian on the analysis copy. Measured on real car photos: sharp ones score
 * ~1300–2200, a clearly blurred one ~13, a dim and soft one ~180. 60 flags only real blur.
 */
const BLUR_VARIANCE = 60;

/**
 * Cheap image-quality checks: average brightness, and sharpness as the variance
 * of a Laplacian filter (blurry photos have few strong edges, so low variance).
 */
function analyse(bitmap: ImageBitmap): LocalPhotoIssue[] {
  const issues: LocalPhotoIssue[] = [];
  if (Math.min(bitmap.width, bitmap.height) < MIN_SHORT_EDGE) issues.push('too_small');

  const scale = Math.min(1, ANALYSIS_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(3, Math.round(bitmap.width * scale));
  const h = Math.max(3, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return issues;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const lum = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < lum.length; i++) {
    const y = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    lum[i] = y;
    sum += y;
  }
  const mean = sum / lum.length;
  if (mean < DARK_MEAN) issues.push('too_dark');
  else if (mean > BRIGHT_MEAN) issues.push('too_bright');

  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = lum[i - w] + lum[i + w] + lum[i - 1] + lum[i + 1] - 4 * lum[i];
      lapSum += v;
      lapSq += v * v;
      n++;
    }
  }
  const variance = lapSq / n - (lapSum / n) ** 2;
  // A very dark photo also has few edges; report it once, as dark.
  if (variance < BLUR_VARIANCE && !issues.includes('too_dark')) issues.push('too_blurry');
  return issues;
}

/**
 * Decodes a photo in the browser, checks its quality, downscales it and re-encodes it as JPEG.
 * Also strips EXIF metadata (GPS location, device), which canvases never keep.
 * Throws for formats the browser cannot decode (e.g. HEIC outside Safari).
 */
export async function resizeForUpload(file: File): Promise<IdentifyImage & { previewUrl: string; issues: LocalPhotoIssue[] }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const issues = analyse(bitmap);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode photo'))), 'image/jpeg', QUALITY),
  );
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buffer.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, Array.from(buffer.subarray(i, i + 0x8000)));
  }
  return { mediaType: 'image/jpeg', data: btoa(binary), previewUrl: URL.createObjectURL(blob), issues };
}
