import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule().catch(() => null), 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const scene = doc.getRoot().listScenes()[0];
const f = (v) => v.map((x) => x.toFixed(3)).join(', ');
const all = getBounds(scene); console.log('ALL min', f(all.min), 'max', f(all.max));
const want = new RegExp(process.argv[3] ?? '.', 'i');
scene.traverse((n) => {
  const mesh = n.getMesh(); if (!mesh) return;
  const mat = mesh.listPrimitives()[0]?.getMaterial()?.getName() ?? '';
  if (!want.test(n.getName()) && !want.test(mat)) return;
  const b = getBounds(n);
  console.log(n.getName().padEnd(28), mat.padEnd(10), 'min', f(b.min), 'max', f(b.max));
});
