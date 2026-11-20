/**
 * Writes the Volvo S90's alternative interior colour sets as web textures:
 *   <source textures>/Interior/**  →  public/models/vehicles/volvo-s90-interior/<set>-<part>.webp
 * The black set is already inside the GLB.
 *
 *   node scripts/export-interior-sets.mjs "<path to the model's textures folder>"
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const src = join(process.argv[2], 'Interior');
const out = 'public/models/vehicles/volvo-s90-interior';
mkdirSync(out, { recursive: true });

// part → [folder, file prefix, { set: colour name used in the file }]. A part with no file for a set keeps its black texture.
const PARTS = {
  'front-seat': ['Seats/Front', 'Front_Seat', { tan: 'Tan', brown: 'Brown', blue: 'Blue' }],
  'rear-seats': ['Seats/Rear', 'Rear Seats', { tan: 'Tan', brown: 'Brown', blue: 'Blue' }],
  'door-front': ['DoorPanels/Front', 'DoorPanelFront', { tan: 'Tan', brown: 'Brown', blue: 'Blue' }],
  'door-rear': ['DoorPanels/Rear', 'DoorPanelRear', { tan: 'Tan', brown: 'Brown', blue: 'Blue' }],
  console: ['CenterConsole', 'CenterConsole', { tan: 'Tan', brown: 'Brown', blue: 'Blue' }],
  dashboard: ['Dashboard', 'Dashboard', { tan: 'Tan', brown: 'Brown' }],
  shell: ['Shell', 'Shell', { tan: 'Tan', brown: 'BlueBrown', blue: 'BlueBrown' }],
  steering: ['SteeringWheel', 'Steeringwheel', { tan: 'Tan' }],
};
for (const [part, [dir, prefix, sets]] of Object.entries(PARTS)) {
  for (const [set, colour] of Object.entries(sets)) {
    await sharp(join(src, dir, `${prefix}_Base_Color ${colour}.png`), { limitInputPixels: false })
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(join(out, `${set}-${part}.webp`));
  }
}
console.log('interior sets written to', out);
