/**
 * Turns downloaded vehicle GLBs (Sketchfab etc.) into web-ready configurator assets.
 *
 *   assets-src/vehicles/<source>.glb  →  public/models/vehicles/<id>.glb
 *
 * For every car it:
 *   1. removes extras the configurator replaces (ground planes, lights, separate clear-coat shells),
 *   2. gives the wheels/brakes predictable names (wheel_fl, wheel_fr, wheel_rl, wheel_rr, brake_*),
 *      splitting meshes that hold a left+right wheel pair into one node per wheel,
 *   3. scales the car to its real length, centres it, and puts the tyres on y = 0,
 *   4. welds, simplifies heavy meshes, converts textures to WebP and Draco-compresses geometry.
 *
 * Model space after processing: metres, +Y up, nose towards `forward`, centred on x/z.
 * Left side of the car is +X when the nose points +Z.
 *
 * Run: npm run prepare:vehicles            (all cars)
 *      npm run prepare:vehicles bmw-m4-g82 (one car)
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, draco, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets-src', 'vehicles');
const OUT = join(ROOT, 'public', 'models', 'vehicles');

/**
 * One entry per vehicle. `wheels` maps source node names to standard names; `wheelPairs` handles
 * sources where one mesh holds both wheels of an axle (split by the sign of X).
 */
const CARS = [
  {
    id: 'bmw-m4-g82',
    source: 'bmw_m4_competition_2021.glb',
    // BMW M4 Competition (G82): 4,794 mm long.
    length: 4.794,
    forward: '+z',
    rename: {
      w1: 'wheel_fl', w2: 'wheel_fr', w3: 'wheel_rl', w4: 'wheel_rr',
      b1: 'brake_fl', b2: 'brake_fr', b3: 'brake_rl', b4: 'brake_rr',
      'car body': 'body',
    },
    simplify: { ratio: 0.35, error: 0.0004 },
  },
  {
    id: 'porsche-911-991',
    source: 'free_porsche_911_carrera_4s.glb',
    // Porsche 911 Carrera 4S (991): 4,491 mm long.
    length: 4.491,
    forward: '+z',
    removeNodes: ['Plane', 'Hemi', 'Hemi.001'],
    // A transparent duplicate of the body used as a fake clear coat; our paint has a real one.
    removeMaterials: ['coat'],
    wheelPairs: [
      { node: 'Cylinder.001', left: 'wheel_fl', right: 'wheel_fr', brakeLeft: 'brake_fl', brakeRight: 'brake_fr' },
      { node: 'Cylinder.000', left: 'wheel_rl', right: 'wheel_rr', brakeLeft: 'brake_rl', brakeRight: 'brake_rr' },
    ],
    // Brake calipers live inside the wheel meshes; move them to brake nodes so they stay when wheels are swapped.
    brakeMaterials: ['Material.001'],
    simplify: { ratio: 0.6, error: 0.0004 },
  },
];

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Splits a primitive's triangles by which side of x = 0 their centroid falls on. */
function splitPrimitiveByX(doc, prim) {
  const pos = prim.getAttribute('POSITION');
  const idx = prim.getIndices();
  const triCount = idx.getCount() / 3;
  const left = [];
  const right = [];
  const a = [0, 0, 0];
  for (let t = 0; t < triCount; t++) {
    let x = 0;
    for (let k = 0; k < 3; k++) x += pos.getElement(idx.getScalar(t * 3 + k), a)[0];
    (x >= 0 ? left : right).push(idx.getScalar(t * 3), idx.getScalar(t * 3 + 1), idx.getScalar(t * 3 + 2));
  }
  const make = (list) => {
    if (!list.length) return null;
    const copy = prim.clone();
    const indices = doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(list)).setBuffer(idx.getBuffer());
    copy.setIndices(indices);
    compactPrimitive(copy);
    return copy;
  };
  return { left: make(left), right: make(right) };
}

async function prepare(car, io) {
  const src = join(SRC, car.source);
  if (!existsSync(src)) {
    console.warn(`! ${car.id}: source not found (${src}) — skipped`);
    return;
  }
  const doc = await io.read(src);
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const nodes = () => root.listNodes();
  const byName = (name) => nodes().filter((n) => n.getName() === name);

  // 1. Remove extras.
  for (const name of car.removeNodes ?? []) byName(name).forEach((n) => n.dispose());
  for (const matName of car.removeMaterials ?? []) {
    for (const mesh of root.listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        if (prim.getMaterial()?.getName() === matName) prim.dispose();
      }
      if (!mesh.listPrimitives().length) mesh.dispose();
    }
  }
  // Lights from the source scene would fight our studio lighting.
  nodes().forEach((n) => n.getExtension('KHR_lights_punctual') && n.setExtension('KHR_lights_punctual', null));

  // 2a. Rename wheel/brake/body nodes.
  for (const [from, to] of Object.entries(car.rename ?? {})) byName(from).forEach((n) => n.setName(to));

  // 2b. Split meshes that hold both wheels of an axle; move calipers to brake nodes.
  for (const pair of car.wheelPairs ?? []) {
    const node = byName(pair.node)[0];
    if (!node) throw new Error(`${car.id}: wheel node ${pair.node} not found`);
    const parent = node.getParentNode();
    const groups = { [pair.left]: [], [pair.right]: [], [pair.brakeLeft]: [], [pair.brakeRight]: [] };
    // The wheel mesh may sit on the node itself or on its direct children (one child per material).
    const holders = [node, ...node.listChildren()].filter((n) => n.getMesh());
    for (const holder of holders) {
      if (holder !== node && holder.getTranslation().some((v) => Math.abs(v) > 1e-6)) {
        throw new Error(`${car.id}: ${holder.getName()} has its own offset; splitting it is not supported`);
      }
      for (const prim of holder.getMesh().listPrimitives()) {
        const isBrake = (car.brakeMaterials ?? []).includes(prim.getMaterial()?.getName());
        const { left, right } = splitPrimitiveByX(doc, prim);
        if (left) groups[isBrake ? pair.brakeLeft : pair.left].push(left);
        if (right) groups[isBrake ? pair.brakeRight : pair.right].push(right);
      }
    }
    for (const [name, prims] of Object.entries(groups)) {
      if (!prims.length) continue;
      const mesh = doc.createMesh(name);
      prims.forEach((p) => mesh.addPrimitive(p));
      const child = doc.createNode(name)
        .setTranslation(node.getTranslation()).setRotation(node.getRotation()).setScale(node.getScale())
        .setMesh(mesh);
      (parent ?? scene).addChild(child);
    }
    holders.forEach((h) => h.getMesh().dispose());
    node.listChildren().forEach((c) => c.dispose());
    node.dispose();
  }

  await doc.transform(prune());

  // 3. Real-world scale, centred, tyres on the ground. Wrap everything in one transform node.
  const before = getBounds(scene);
  const lengthAxis = 2;
  const scale = car.length / (before.max[lengthAxis] - before.min[lengthAxis]);
  const wrapper = doc.createNode('vehicle').setScale([scale, scale, scale]).setTranslation([
    -scale * (before.min[0] + before.max[0]) / 2,
    -scale * before.min[1],
    -scale * (before.min[2] + before.max[2]) / 2,
  ]);
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    wrapper.addChild(child);
  }
  scene.addChild(wrapper);

  // 4. Optimise.
  const trisBefore = countTriangles(root);
  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ...car.simplify }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 88 }),
    prune(),
    draco({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }),
  );

  const out = join(OUT, `${car.id}.glb`);
  mkdirSync(OUT, { recursive: true });
  await io.write(out, doc);

  const after = getBounds(doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]);
  const size = after.max.map((v, i) => (v - after.min[i]).toFixed(3));
  const wheels = doc.getRoot().listNodes().filter((n) => /^(wheel|brake)_/.test(n.getName())).map((n) => n.getName());
  console.log(`✓ ${car.id}: ${mb(statSync(src).size)} → ${mb(statSync(out).size)}, `
    + `${trisBefore.toLocaleString()} → ${countTriangles(doc.getRoot()).toLocaleString()} triangles, `
    + `size ${size.join(' × ')} m, scale ×${scale.toFixed(3)}\n    nodes: ${wheels.sort().join(', ')}`);
}

function countTriangles(root) {
  let n = 0;
  for (const mesh of root.listMeshes()) {
    for (const p of mesh.listPrimitives()) n += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
  }
  return Math.round(n);
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.decoder': MeshoptSimplifier,
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });
await MeshoptSimplifier.ready;

const only = process.argv[2];
for (const car of CARS.filter((c) => !only || c.id === only)) await prepare(car, io);
