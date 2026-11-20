/**
 * Writes down-sized copies of a model's textures (all sub-folders, flattened by file name)
 * for scripts/export-volvo-s90.py to use.
 *
 *   node scripts/resize-textures.mjs "<textures folder>" <out folder> [max=2048]
 */
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';

const [src, out, max = '2048'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk(src)) {
  if (!/\.(png|jpe?g)$/i.test(f)) continue;
  await sharp(f, { limitInputPixels: false }).resize(Number(max), Number(max), { fit: 'inside', withoutEnlargement: true }).toFile(join(out, basename(f)));
}
console.log('resized', readdirSync(out).length, 'textures');
