/**
 * Shrinks a GLB exported from Blender for the web: drops duplicates and unused data,
 * converts textures to WebP and Draco-compresses the geometry. Node and material names are kept.
 *
 *   node scripts/optimize-glb.mjs <in.glb> <out.glb> [maxTextureSize=1024]
 */
import { statSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco, prune, textureCompress, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const [input, output, max = '1024'] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
const doc = await io.read(input);
await doc.transform(
  dedup(),
  prune({ keepLeaves: true }),
  weld(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 82, resize: [Number(max), Number(max)] }),
  draco({ quantizePosition: 14, quantizeNormal: 10 }),
);
await io.write(output, doc);
const root = doc.getRoot();
console.log(`${(statSync(output).size / 1048576).toFixed(1)} MB · ${root.listMeshes().length} meshes · ${root.listMaterials().length} materials · ${root.listTextures().length} textures`);
console.log('materials:', root.listMaterials().map((m) => m.getName()).join(' | '));
