/**
 * Builds the Volvo S90 v3 GLB from v2 with the textures optimised for GPU memory.
 *
 * Why: textures in a GLB are stored as WebP, but the GPU cannot use WebP, so the browser unpacks
 * every one to raw RGBA (a 2048² texture = ~21 MB with mipmaps). v2 needed ~540 MB of texture
 * memory, v1 ~920 MB. KTX2 / Basis Universal textures stay compressed on the GPU (~1 byte per
 * pixel instead of 4) and are transcoded in the browser by public/basis (KTX2Loader in
 * src/three/loaders.ts).
 *
 *  1. Resize: 2048 only where it is seen up close (tyre, factory rims, front seat, dashboard);
 *     everything else 1024. Sizes are kept to multiples of 4, which block compression needs.
 *  2. Encode to KTX2: normal maps as UASTC (normal-map mode, keeps them smooth); colour and
 *     emissive maps as ETC1S (perceptual, sRGB flag); metal/roughness/occlusion data as ETC1S with
 *     the linear flag (an sRGB flag on data maps made the cabin look glossy).
 *  3. Draco geometry, as before. Node names, materials and the opening-panel rig are unchanged.
 *
 *   node scripts/optimize-volvo-v3.mjs [in=public/models/vehicles/volvo-s90-v2.glb] [out=public/models/vehicles/volvo-s90-v3.glb]
 */
import { statSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRTextureBasisu } from '@gltf-transform/extensions';
import { dedup, draco, prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';

const [input = 'public/models/vehicles/volvo-s90-v2.glb', output = 'public/models/vehicles/volvo-s90-v3.glb'] = process.argv.slice(2);

/** Textures kept at full size: the ones a customer looks at closely. */
const KEEP_2K = /^(Tire_Base_Color|Tire_Normal|Rims_Base_Color|Rims_Normal|Front_Seat_Base_Color|Dashboard_Base_Color)/;
const MAX = 1024;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
const doc = await io.read(input);
const root = doc.getRoot();

/** Which material slots use each texture. */
function slotsOf(texture) {
  const slots = new Set();
  for (const m of root.listMaterials()) {
    if (m.getBaseColorTexture() === texture) slots.add('color');
    if (m.getEmissiveTexture() === texture) slots.add('color');
    if (m.getNormalTexture() === texture) slots.add('normal');
    if (m.getMetallicRoughnessTexture() === texture) slots.add('data');
    if (m.getOcclusionTexture() === texture) slots.add('data');
  }
  // Extension slots (clearcoat, sheen, specular, ...) hold data unless proven otherwise.
  if (!slots.size) slots.add('data');
  return slots;
}

const raw = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};

const mult4 = (n) => Math.max(4, Math.round(n / 4) * 4);
let before = 0, after = 0, gpuBefore = 0, gpuAfter = 0;

for (const texture of root.listTextures()) {
  const name = texture.getName() || texture.getURI();
  const image = texture.getImage();
  if (!image) continue;
  const meta = await sharp(Buffer.from(image)).metadata();
  const limit = KEEP_2K.test(name) ? 2048 : MAX;
  const scale = Math.min(1, limit / Math.max(meta.width, meta.height));
  const w = mult4(meta.width * scale), h = mult4(meta.height * scale);
  const png = await sharp(Buffer.from(image)).resize(w, h, { fit: 'fill' }).png().toBuffer();

  const slots = slotsOf(texture);
  const isNormal = slots.has('normal');
  const isColor = slots.has('color') && !isNormal;
  const options = isNormal
    ? { isUASTC: true, isNormalMap: true, isPerceptual: false, uastcLDRQualityLevel: 2, enableRDO: true, rdoQualityLevel: 3, needSupercompression: true }
    : isColor
      ? { isUASTC: false, isPerceptual: true, qualityLevel: 230, compressionLevel: 2 }
      : { isUASTC: false, isPerceptual: false, qualityLevel: 200, compressionLevel: 2 };

  // The KTX2 transfer flag tells the browser how to read the texture. The encoder defaults to sRGB,
  // which made roughness/metal maps decode darker (lower roughness = a glossy cabin). Only colour
  // maps are sRGB; normals and data are linear.
  const ktx = await encodeToKTX2(new Uint8Array(png), {
    ...options, isSetKTX2SRGBTransferFunc: isColor, generateMipmap: true, isYFlip: false, imageDecoder: raw,
  });
  before += image.byteLength;
  after += ktx.byteLength;
  gpuBefore += meta.width * meta.height * 4 * 1.33;
  gpuAfter += w * h * 1 * 1.33;
  texture.setImage(ktx);
  texture.setMimeType('image/ktx2');
  if (texture.getURI()) texture.setURI(texture.getURI().replace(/\.(png|jpe?g|webp)$/i, '.ktx2'));
  console.log(`${name.slice(0, 34).padEnd(35)} ${meta.width}→${w}  ${isNormal ? 'UASTC normal' : isColor ? 'ETC1S colour' : 'ETC1S data'}`);
}

doc.createExtension(KHRTextureBasisu).setRequired(true);
// WebP is no longer used by any texture.
root.listExtensionsUsed().find((e) => e.extensionName === 'EXT_texture_webp')?.dispose();

await doc.transform(
  dedup(),
  prune({ keepLeaves: true, keepAttributes: true }),
  draco({ method: 'edgebreaker', quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
);
await io.write(output, doc);

const mb = (n) => (n / 1048576).toFixed(1);
console.log(`\ntexture files: ${mb(before)} MB → ${mb(after)} MB`);
console.log(`GPU texture memory (approx.): ${mb(gpuBefore)} MB → ${mb(gpuAfter)} MB`);
console.log(`${output}: ${mb(statSync(output).size)} MB`);
