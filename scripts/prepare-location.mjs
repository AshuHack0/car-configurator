/**
 * Prepares a Poly Haven location for the viewer: writes 8k and 4k backdrop JPGs next to the
 * HDR in public/env and reports where the sun is in the panorama.
 *
 *   node scripts/prepare-location.mjs assets-src/env/<name>.jpg
 */
import { basename } from 'node:path';
import sharp from 'sharp';

const src = process.argv[2];
const name = basename(src, '.jpg');
const image = () => sharp(src, { limitInputPixels: false });
const meta = await image().metadata();
await image().resize(8192, 4096).jpeg({ quality: 88 }).toFile(`public/env/${name}_8k.jpg`);
await image().resize(4096, 2048).jpeg({ quality: 86 }).toFile(`public/env/${name}_4k.jpg`);

// Sun: centre of the brightest pixels in the upper half.
const W = 720, H = 360;
const { data } = await image().resize(W, H).greyscale().blur(3).raw().toBuffer({ resolveWithObject: true });
let best = 0, bx = 0, by = 0;
for (let y = 0; y < H / 2; y++) for (let x = 0; x < W; x++) if (data[y * W + x] > best) { best = data[y * W + x]; bx = x; by = y; }
const u = bx / W, v = by / H;
console.log(`${name}: source ${meta.width}x${meta.height}; sun at u=${u.toFixed(3)} v=${v.toFixed(3)} (elevation ${(90 - v * 180).toFixed(0)}°)`);
