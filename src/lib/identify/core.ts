import { BRANDS, IDENTIFY_BRANDS, VEHICLES, getVehicle } from '@/data/vehicles';
import { PHOTO_PROBLEMS, type Confidence, type IdentifyResult, type PaintFinish, type PhotoProblem } from '@/types/identify';

/*
 * Provider-independent half of car identification: the prompt, the output
 * schema, and the validation that turns a model's answer into a result the
 * configurator can trust.
 */

const SUPPORTED = VEHICLES.filter((v) => IDENTIFY_BRANDS.includes(v.brand));
const brandName = (id: string) => BRANDS.find((b) => b.id === id)?.name ?? id;
const supportedBrandNames = IDENTIFY_BRANDS.map(brandName).join(' and ');

/** The catalog the model must choose from, one vehicle per line. */
const CATALOG_TEXT = SUPPORTED.map((v) =>
  `- ${v.id}: ${brandName(v.brand)} ${v.model} — generations: ${v.generations
    .map((g) => `${g.code} (${g.years[g.years.length - 1]}–${g.years[0]})`).join(', ')}`,
).join('\n');

export const SYSTEM_PROMPT = `You identify cars from customer photos for Modifed, a modification studio for high-end luxury cars. Customers upload several photos of their own car; your answer opens a 3D model of that exact car so they can preview modifications on it. Accuracy matters more than speed: a wrong generation or colour means the customer sees the wrong car.

Our 3D library currently covers ${supportedBrandNames} only:
${CATALOG_TEXT}

How to answer:
- Identify make, model, variant (for example "911 Carrera S", "M4 Competition", "X5 xDrive40i M Sport") and generation from design cues across all photos: headlight and taillight graphics, bumper and grille shapes, mirror and wheel designs, badges, and facelift (LCI) details.
- Set catalog_vehicle_id only when the make and model match a catalog entry exactly; otherwise use "none". A related model is not a match (an M3 is not an M4, a Cayenne Coupé is a Cayenne, a 3 Series Touring is a 3 Series).
- catalog_generation must be one of the generation codes listed for that catalog entry (or "none").
- year_estimate is your best single model year, or 0 if you cannot tell.
- Paint: give the colour the paint would have in neutral daylight, compensating for reflections, sky, shadows and camera white balance. hex is the base body colour, not a highlight or shadow. Use the manufacturer's paint name when you recognise it (for example "Guards Red", "Carrara White Metallic", "Isle of Man Green Metallic"); otherwise describe it. If the car is wrapped, describe the wrap colour and finish.
- existing_mods lists visible aftermarket changes only (wrap, body kit, aftermarket wheels, spoiler, lowered suspension, window tint, carbon parts). Use an empty list if the car looks stock.
- confidence: "high" when the photos clearly show the car from several angles and the design cues agree; "medium" when one detail is uncertain (for example the exact generation or facelift); "low" when the photos are unclear, too few angles, or the car could be several models.
- photo_advice: when confidence is not high, tell the customer which photos would help (for example "a clear photo of the rear lights"); otherwise an empty string.
- A single photo is acceptable: identify as much as it allows and lower confidence when key angles are missing.
- photo_problems: list every photo that hurts identification, by its number, with the main problem: "not_a_car" (no car, or a different subject), "interior_only", "too_blurry", "too_dark", "too_bright" (overexposed or strong glare), "too_far" (car is small in the frame), "cropped" (important parts of the car are cut off), "obstructed" (people, other cars or objects block the car), "other_car" (shows a different car from the rest). Leave out photos that are fine; use an empty list if all are fine.
- If the photos do not show a car, set is_car to false and fill the other fields with empty values.
- Never transcribe licence plates, VINs, people or locations.`;

/** JSON schema for structured output; every field is required and no extras are allowed. */
export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'is_car', 'make', 'model', 'variant', 'generation', 'year_estimate', 'catalog_vehicle_id',
    'catalog_generation', 'confidence', 'paint_name', 'paint_hex', 'paint_finish', 'wheels',
    'existing_mods', 'photo_advice', 'photo_problems',
  ],
  properties: {
    is_car: { type: 'boolean' },
    make: { type: 'string', description: 'Manufacturer, e.g. Porsche' },
    model: { type: 'string', description: 'Model line, e.g. 911' },
    variant: { type: 'string', description: 'Trim or variant without repeating the model name, e.g. "Carrera 4S" or "Competition"; empty for the base model or if unknown' },
    generation: { type: 'string', description: 'Generation code as the manufacturer names it, e.g. 992 or G82' },
    year_estimate: { type: 'integer', description: 'Best single model year, 0 if unknown' },
    catalog_vehicle_id: { type: 'string', enum: [...SUPPORTED.map((v) => v.id), 'none'] },
    catalog_generation: { type: 'string', description: 'A generation code listed for the catalog entry, or "none"' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    paint_name: { type: 'string' },
    paint_hex: { type: 'string', description: 'Base body colour as #rrggbb' },
    paint_finish: { type: 'string', enum: ['solid', 'metallic', 'pearl', 'satin', 'matte'] },
    wheels: { type: 'string', description: 'Short description of the wheels currently fitted' },
    existing_mods: { type: 'array', items: { type: 'string' } },
    photo_advice: { type: 'string' },
    photo_problems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['photo_number', 'problem'],
        properties: {
          photo_number: { type: 'integer', description: '1-based photo number as labelled in the request' },
          problem: { type: 'string', enum: [...PHOTO_PROBLEMS] },
        },
      },
    },
  },
} as const;

export interface ModelOutput {
  is_car: boolean;
  make: string;
  model: string;
  variant: string;
  generation: string;
  year_estimate: number;
  catalog_vehicle_id: string;
  catalog_generation: string;
  confidence: Confidence;
  paint_name: string;
  paint_hex: string;
  paint_finish: 'solid' | 'metallic' | 'pearl' | 'satin' | 'matte';
  wheels: string;
  existing_mods: string[];
  photo_advice: string;
  photo_problems: { photo_number: number; problem: PhotoProblem }[];
}

const FINISH_MAP: Record<ModelOutput['paint_finish'], PaintFinish> = {
  solid: 'gloss', metallic: 'metallic', pearl: 'metallic', satin: 'satin', matte: 'matte',
};

/** Turns the model's answer into a result the configurator can trust: only real catalog entries survive. */
export function toResult(o: ModelOutput): IdentifyResult {
  const vehicle = o.catalog_vehicle_id !== 'none' ? getVehicle(o.catalog_vehicle_id) : undefined;
  const supported = vehicle && IDENTIFY_BRANDS.includes(vehicle.brand) ? vehicle : undefined;
  const gen = supported?.generations.find((g) => g.code.toLowerCase() === o.catalog_generation.toLowerCase());
  const yearGen = supported?.generations.find((g) => g.years.includes(o.year_estimate));
  const generation = gen ?? yearGen ?? supported?.generations.find((g) => g.code === supported.generation);
  const year = generation?.years.includes(o.year_estimate) ? o.year_estimate : null;

  const makeSupported = IDENTIFY_BRANDS.some((b) => brandName(b).toLowerCase() === o.make.trim().toLowerCase());
  let unsupportedReason: string | null = null;
  if (o.is_car && !supported) {
    unsupportedReason = makeSupported
      ? `The ${o.make} ${o.model} isn't in our 3D library yet. Pick the closest model below, or contact us for a bespoke model.`
      : `This pilot covers ${supportedBrandNames} only. ${o.make || 'Other'} models are coming soon.`;
  }

  return {
    isCar: o.is_car,
    detected: {
      make: o.make, model: o.model, variant: o.variant, generation: o.generation,
      yearEstimate: o.year_estimate > 1900 ? o.year_estimate : null,
    },
    match: supported && generation ? { vehicleId: supported.id, generation: generation.code, year } : null,
    unsupportedReason,
    confidence: o.confidence,
    paint: {
      name: o.paint_name || 'Your paint',
      hex: /^#[0-9a-f]{6}$/i.test(o.paint_hex) ? o.paint_hex.toLowerCase() : '#808080',
      finish: FINISH_MAP[o.paint_finish] ?? 'gloss',
    },
    wheels: o.wheels,
    existingMods: o.existing_mods.slice(0, 12),
    photoAdvice: o.photo_advice.trim() || null,
    photoProblems: (o.photo_problems ?? [])
      .filter((p) => Number.isInteger(p.photo_number) && p.photo_number >= 1 && PHOTO_PROBLEMS.includes(p.problem))
      .map((p) => ({ photo: p.photo_number, problem: p.problem })),
  };
}
