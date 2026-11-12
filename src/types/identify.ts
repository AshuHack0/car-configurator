/** Paint finishes the configurator can render for a customer's own paint. */
export type PaintFinish = 'gloss' | 'metallic' | 'satin' | 'matte';

export type Confidence = 'high' | 'medium' | 'low';

/** Problems the model can report for an individual photo. */
export const PHOTO_PROBLEMS = [
  'not_a_car', 'interior_only', 'too_blurry', 'too_dark', 'too_bright', 'too_far', 'cropped', 'obstructed', 'other_car',
] as const;
export type PhotoProblem = (typeof PHOTO_PROBLEMS)[number];

/** One photo sent from the browser: base64 JPEG, already resized client-side. */
export interface IdentifyImage {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: string;
}

export interface IdentifyRequest {
  images: IdentifyImage[];
}

/** What the photos show, after the server has validated it against the catalog. */
export interface IdentifyResult {
  /** False when the photos do not show a car (or are unusable). */
  isCar: boolean;
  /** What the model saw, in plain words, even if it is not in our catalog. */
  detected: {
    make: string;
    model: string;
    variant: string;
    generation: string;
    yearEstimate: number | null;
  };
  /** Catalog match, or null when the car is not one we support yet. */
  match: {
    vehicleId: string;
    generation: string;
    year: number | null;
  } | null;
  /** Why there is no match, shown to the customer. */
  unsupportedReason: string | null;
  confidence: Confidence;
  paint: {
    name: string;
    hex: string;
    finish: PaintFinish;
  };
  wheels: string;
  existingMods: string[];
  /** Advice for better photos when confidence is low; null otherwise. */
  photoAdvice: string | null;
  /** Photos (1-based) that hurt identification, and why. Empty when all photos were fine. */
  photoProblems: { photo: number; problem: PhotoProblem }[];
}

export type IdentifyResponse =
  | { ok: true; result: IdentifyResult }
  | { ok: false; error: string; code: 'bad_request' | 'not_configured' | 'refused' | 'upstream' };
