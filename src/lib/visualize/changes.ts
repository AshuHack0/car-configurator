import { CUSTOM_PAINT_FINISHES, PAINTS, SLOT_LABELS, getProduct, productFinish } from '@/data/products';
import type { Configuration, SlotId } from '@/types/product';

/** Session-storage key the configurator uses to hand a build to the "See it for real" page. */
export const VISUALIZE_HANDOFF_KEY = 'modifed:visualize';

export interface Change {
  /** Short label for the page, e.g. "Wheels". */
  label: string;
  /** What the customer chose, e.g. "Bronze Racing Cross-Spoke (Satin Bronze)". */
  name: string;
  /** Instruction for the image model. */
  instruction: string;
}

const finishWord = (metalness: number, roughness: number) =>
  roughness >= 0.55 ? 'matte, non-reflective' : roughness >= 0.42 ? 'satin' : metalness >= 0.5 ? 'metallic gloss' : 'solid gloss';

/**
 * Turns a configuration into the list of visible changes. Runs in the browser (to show the list)
 * and on the server (to write the prompt), so the model only ever receives catalogue text.
 */
export function describeChanges(config: Pick<Configuration, 'paint' | 'selections'>): Change[] {
  const changes: Change[] = [];

  const { paint } = config;
  if (paint.id === 'custom' && paint.color && /^#[0-9a-f]{6}$/i.test(paint.color)) {
    const f = CUSTOM_PAINT_FINISHES.find((x) => x.id === paint.finish) ?? CUSTOM_PAINT_FINISHES[0];
    changes.push({
      label: 'Paint', name: `Custom ${f.name} ${paint.color.toLowerCase()}`,
      instruction: `Repaint all painted body panels in the colour ${paint.color.toLowerCase()} with a ${finishWord(f.metalness, f.roughness)} finish.`,
    });
  } else if (paint.id !== 'factory' && paint.id !== 'custom') {
    const p = PAINTS.find((x) => x.id === paint.id);
    if (p) {
      changes.push({
        label: 'Paint', name: p.name,
        instruction: `Repaint all painted body panels in "${p.name}" (colour ${p.color}, ${finishWord(p.metalness, p.roughness)} finish).`,
      });
    }
  }

  for (const [slot, selection] of Object.entries(config.selections ?? {})) {
    const product = selection && getProduct(selection.productId);
    if (!product || product.slot !== slot) continue;
    const finish = productFinish(product, selection.finishId);
    const label = SLOT_LABELS[slot as SlotId];
    changes.push({
      label, name: finish ? `${product.name} (${finish.name})` : product.name,
      instruction: `${label}: fit "${product.name}" — ${product.description}${finish ? ` Finish: ${finish.name} (colour ${finish.color}).` : ''}`,
    });
  }
  return changes;
}

export function buildPrompt(carName: string, changes: Change[]): string {
  return [
    'You are retouching a photograph for a car customisation studio.',
    `Edit the attached photograph of a ${carName}. Apply ONLY the changes listed below and nothing else.`,
    '',
    'Changes:',
    ...changes.map((c) => `- ${c.instruction}`),
    '',
    'Rules:',
    '- This is an edit of the attached photo, not a new picture: keep every pixel outside the changed parts as it is.',
    '- Keep the same car, body shape, camera angle, framing, background, lighting, shadows and reflections. Do not mirror, flip, rotate, crop or re-frame the photo; the car must face the same direction and sit in the same place.',
    '- Keep badges, number plate, glass, interior and every part that is not listed exactly as they are.',
    '- The result must look like an unedited real photograph: correct perspective for wheels and parts, realistic materials, and reflections that match the scene.',
    '- If a listed part cannot be seen from this camera angle, leave that area unchanged.',
    '- Do not add text, logos, watermarks, people or other vehicles.',
    'Return only the edited image.',
  ].join('\n');
}
