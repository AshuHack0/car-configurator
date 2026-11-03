/**
 * Generates the demo component library as real GLB files in public/models/.
 *
 * Every part is authored in a canonical frame so the runtime attachment
 * system can place it on any vehicle:
 *   - Wheels:   centred on origin, axle along X, outer face towards +X, outer radius 0.36 m.
 *   - Spoilers: origin on the mounting surface, width along X, trailing edge towards +Z (rear).
 *   - Front:    origin at the nose centre-line, part extends rearwards (+Z).
 *   - Rear:     origin at the tail centre-line, part extends forwards (-Z).
 *   - Skirts:   origin at the skirt centre, 1 m long along Z (stretched at runtime), protrudes +X.
 *   - Roof:     origin on the roof surface.
 *   - Exhaust:  a single tip pointing +Z (rear); mirrored at runtime.
 *
 * Materials are named slots (Paint, Carbon, Rim_Finish, ...) that the configurator
 * rebinds at runtime to the selected paint / finish / carbon weave.
 *
 * Run: npm run generate:parts
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// GLTFExporter uses FileReader, which Node does not provide.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buf).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models');

// ---------------------------------------------------------------------------
// Materials (placeholders; rebound by name at runtime)
// ---------------------------------------------------------------------------
const mat = (name, color, metalness = 0.5, roughness = 0.4) => {
  const m = new THREE.MeshStandardMaterial({ color, metalness, roughness, side: THREE.DoubleSide });
  m.name = name;
  return m;
};
const M = {
  rim: mat('Rim_Finish', 0x1a1a1a, 0.8, 0.3),
  lip: mat('Rim_Lip', 0xd8d8d8, 1, 0.15),
  tire: mat('Tire', 0x111111, 0, 0.85),
  cap: mat('Hub_Cap', 0x222222, 0.6, 0.3),
  lug: mat('Lug', 0x9a9a9a, 1, 0.2),
  paint: mat('Paint', 0x888888, 0.5, 0.3),
  carbon: mat('Carbon', 0x202020, 0.3, 0.35),
  black: mat('Gloss_Black', 0x050505, 0.2, 0.15),
  alu: mat('Aluminium_Black', 0x161616, 0.8, 0.45),
  chrome: mat('Chrome', 0xffffff, 1, 0.05),
  titanium: mat('Titanium', 0x8a7a9a, 1, 0.2),
  mesh: mat('Mesh_Grille', 0x080808, 0.4, 0.6),
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
/** Collects geometries per material, then merges them into one mesh per material. */
class PartBuilder {
  constructor(name) {
    this.name = name;
    this.buckets = new Map();
  }
  add(material, geometry) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const key of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
    }
    if (!this.buckets.has(material)) this.buckets.set(material, []);
    this.buckets.get(material).push(g);
    return this;
  }
  build() {
    const group = new THREE.Group();
    group.name = this.name;
    for (const [material, geos] of this.buckets) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), material);
      mesh.name = `${this.name}_${material.name}`;
      group.add(mesh);
    }
    return group;
  }
}

/** A box spanning two points in the wheel face (YZ plane), at axial offset x. */
function faceBar(r1, a1, r2, a2, width, thickness, x, tilt = 0) {
  const p1 = new THREE.Vector2(r1 * Math.cos(a1), r1 * Math.sin(a1));
  const p2 = new THREE.Vector2(r2 * Math.cos(a2), r2 * Math.sin(a2));
  const d = p2.clone().sub(p1);
  const len = d.length();
  const g = new THREE.BoxGeometry(thickness, len, width);
  // Dish: inner end sits proud of the outer end.
  g.rotateZ(tilt);
  g.rotateX(Math.atan2(d.y, d.x));
  const mid = p1.clone().add(p2).multiplyScalar(0.5);
  g.translate(x, mid.x, mid.y);
  return g;
}

const axleX = (g) => g.rotateZ(-Math.PI / 2); // lathe/cylinder Y axis -> X axis

// ---------------------------------------------------------------------------
// Wheels
// ---------------------------------------------------------------------------
function wheelBase(b, { faceX = 0.07, lugs = 5 } = {}) {
  // Tyre: lathe profile (radius, axial)
  const pts = [
    [0.272, -0.118], [0.3, -0.122], [0.335, -0.12], [0.352, -0.112], [0.36, -0.095],
    [0.362, 0], [0.36, 0.095], [0.352, 0.112], [0.335, 0.12], [0.3, 0.122], [0.272, 0.118],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  b.add(M.tire, axleX(new THREE.LatheGeometry(pts, 72)));
  // Barrel + polished outer lip
  b.add(M.rim, axleX(new THREE.CylinderGeometry(0.268, 0.268, 0.23, 64, 1, true)));
  b.add(M.lip, new THREE.TorusGeometry(0.266, 0.011, 10, 72).rotateY(Math.PI / 2).translate(faceX + 0.035, 0, 0));
  // Hub, centre cap, lug nuts
  b.add(M.rim, axleX(new THREE.CylinderGeometry(0.078, 0.082, 0.05, 32)).translate(faceX - 0.005, 0, 0));
  b.add(M.cap, axleX(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 32)).translate(faceX + 0.024, 0, 0));
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2;
    b.add(M.lug, axleX(new THREE.CylinderGeometry(0.009, 0.009, 0.018, 6))
      .translate(faceX + 0.024, 0.055 * Math.cos(a), 0.055 * Math.sin(a)));
  }
}

const RIM_IN = 0.07;
const RIM_OUT = 0.262;
const wheels = {
  'multi-spoke': () => {
    const b = new PartBuilder('wheel');
    wheelBase(b);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      for (const s of [-1, 1]) {
        b.add(M.rim, faceBar(RIM_IN, a + s * 0.05, RIM_OUT, a + s * 0.075, 0.013, 0.022, 0.065, -0.08));
      }
    }
    return b.build();
  },
  'amg-twin': () => {
    const b = new PartBuilder('wheel');
    wheelBase(b);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      for (const s of [-1, 1]) {
        b.add(M.rim, faceBar(RIM_IN, a + s * 0.12, RIM_OUT, a + s * 0.17, 0.032, 0.034, 0.064, -0.1));
      }
    }
    return b.build();
  },
  'racing-mesh': () => {
    const b = new PartBuilder('wheel');
    wheelBase(b, { lugs: 1 }); // centre-lock look
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      b.add(M.rim, faceBar(RIM_IN, a, RIM_OUT, a + 0.32, 0.013, 0.02, 0.062, -0.06));
      b.add(M.rim, faceBar(RIM_IN, a, RIM_OUT, a - 0.32, 0.013, 0.02, 0.058, -0.06));
    }
    b.add(M.rim, new THREE.TorusGeometry(0.17, 0.008, 8, 64).rotateY(Math.PI / 2).translate(0.055, 0, 0));
    return b.build();
  },
  'sport-y': () => {
    const b = new PartBuilder('wheel');
    wheelBase(b);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.add(M.rim, faceBar(RIM_IN, a, 0.16, a, 0.036, 0.034, 0.066, -0.08));
      for (const s of [-1, 1]) b.add(M.rim, faceBar(0.15, a, RIM_OUT, a + s * 0.2, 0.022, 0.03, 0.058, -0.08));
    }
    return b.build();
  },
  'forged-turbine': () => {
    const b = new PartBuilder('wheel');
    wheelBase(b);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      b.add(M.rim, faceBar(RIM_IN, a, 0.17, a + 0.12, 0.05, 0.036, 0.066, -0.06));
      b.add(M.rim, faceBar(0.165, a + 0.12, RIM_OUT, a + 0.3, 0.04, 0.032, 0.06, -0.06));
    }
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Profile helpers for extruded aero parts
// ---------------------------------------------------------------------------
/** Extrudes a (z, y) cross-section across the car's width (X), centred on x=0. */
function crossSection(points, width, bevel = 0.004) {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: width, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12,
  });
  // shape X -> world Z, shape Y -> world Y, extrude Z -> world X
  g.rotateY(Math.PI / 2);
  g.translate(-width / 2, 0, 0);
  return g;
}

/** Extrudes a plan-view (x, z) outline downwards by `thickness`. */
function planPlate(points, thickness) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 24 });
  g.rotateX(Math.PI / 2); // shape Y -> world Z; extrude -> world -Y
  return g;
}

function airfoil(chord, thick) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push([t * chord, thick * 4 * t * (1 - t) * 0.9 + t * thick * 0.6]);
  }
  for (let i = 16; i >= 0; i--) {
    const t = i / 16;
    pts.push([t * chord, -thick * 0.25 * 4 * t * (1 - t) + t * thick * 0.6]);
  }
  return pts;
}

/**
 * Plan outline used by front splitters. Sports-car noses are flat across the
 * middle and sweep back sharply at the corners, so the edge follows
 * z = sweep * |x / w| ^ power (sweep = how far the corners sit behind the tip).
 */
function noseOutline(w, depth, sweep, power = 4.5, lip = 0.02, steps = 40) {
  const front = [];
  for (let i = 0; i <= steps; i++) {
    const x = -w + (2 * w * i) / steps;
    front.push([x, sweep * Math.pow(Math.abs(x / w), power) - lip]);
  }
  const back = front.slice().reverse().map(([x, z]) => [x * 0.94, z + depth]);
  return [...front, ...back];
}

// ---------------------------------------------------------------------------
// Spoilers
// ---------------------------------------------------------------------------
const spoilers = {
  'standard-lip': () => new PartBuilder('spoiler')
    .add(M.paint, crossSection([[-0.08, 0], [0.06, 0], [0.085, 0.04], [0.06, 0.045], [-0.08, 0.008]], 1.2))
    .build(),
  'sport-blade': () => {
    const b = new PartBuilder('spoiler');
    b.add(M.paint, crossSection(airfoil(0.2, 0.03).map(([z, y]) => [z - 0.08, y + 0.11]), 1.3));
    for (const x of [-0.4, 0.4]) b.add(M.black, new THREE.BoxGeometry(0.03, 0.12, 0.09).translate(x, 0.06, 0));
    return b.build();
  },
  'carbon-ducktail': () => new PartBuilder('spoiler')
    .add(M.carbon, crossSection([[-0.12, 0], [0.08, 0], [0.13, 0.075], [0.1, 0.082], [-0.12, 0.01]], 1.26))
    .build(),
  'gt-wing': () => {
    const b = new PartBuilder('spoiler');
    const H = 0.32;
    b.add(M.carbon, crossSection(airfoil(0.34, 0.045).map(([z, y]) => [z - 0.14, y + H]), 1.78));
    b.add(M.carbon, crossSection(airfoil(0.12, 0.02).map(([z, y]) => [z + 0.17, y + H + 0.07]), 1.78, 0.002));
    for (const s of [-1, 1]) {
      // End plates
      b.add(M.carbon, new THREE.BoxGeometry(0.008, 0.2, 0.42).translate(s * 0.895, H + 0.03, 0.04));
      // Swan-neck uprights
      const neck = crossSection([[-0.05, 0], [0.06, 0], [0.02, H + 0.05], [-0.06, H + 0.05], [-0.07, H * 0.5]], 0.014, 0.002);
      b.add(M.alu, neck.translate(s * 0.42, 0, 0));
      b.add(M.alu, new THREE.BoxGeometry(0.08, 0.012, 0.16).translate(s * 0.42, 0.006, 0));
    }
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Front bumper kits (origin: nose centre-line, extends +Z)
// ---------------------------------------------------------------------------
const front = {
  'sport-lip': () => new PartBuilder('front')
    .add(M.black, planPlate(noseOutline(0.82, 0.24, 0.42), 0.018))
    .build(),
  'aggressive': () => {
    const b = new PartBuilder('front');
    b.add(M.carbon, planPlate(noseOutline(0.84, 0.28, 0.42, 4.5, 0.045), 0.022));
    for (const s of [-1, 1]) {
      // Splitter end fences + stacked canards on the bumper corners
      b.add(M.carbon, new THREE.BoxGeometry(0.01, 0.06, 0.2).translate(s * 0.8, 0.02, 0.42));
      for (const [y, z] of [[0.12, 0.47], [0.2, 0.5]]) {
        const c = new THREE.BoxGeometry(0.14, 0.008, 0.08);
        c.rotateZ(s * 0.25);
        b.add(M.carbon, c.translate(s * 0.86, y, z));
      }
    }
    return b.build();
  },
  'amg-style': () => {
    const b = new PartBuilder('front');
    b.add(M.black, planPlate(noseOutline(0.82, 0.26, 0.42, 4.5, 0.03), 0.02));
    // A-wing blade across the intake, in body colour
    b.add(M.paint, crossSection([[0, 0], [0.05, 0], [0.04, 0.025], [0, 0.02]], 1.1).translate(0, 0.07, 0.04));
    b.add(M.chrome, crossSection([[0.0, 0.0], [0.01, 0], [0.01, 0.006], [0, 0.006]], 1.1, 0).translate(0, 0.1, 0.04));
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Rear bumpers & diffusers (origin: tail centre-line, extends -Z)
// ---------------------------------------------------------------------------
const rear = {
  'sport-rear': () => {
    const b = new PartBuilder('rear');
    b.add(M.paint, crossSection([[-0.2, 0], [0.02, 0], [0.04, 0.05], [0.0, 0.1], [-0.2, 0.1]], 1.62));
    for (const s of [-1, 1]) {
      b.add(M.mesh, new THREE.BoxGeometry(0.22, 0.05, 0.02).translate(s * 0.62, 0.055, 0.035));
    }
    return b.build();
  },
  'diffuser': () => {
    const b = new PartBuilder('rear');
    const plate = new THREE.BoxGeometry(1.26, 0.012, 0.42);
    plate.rotateX(-0.22); // kicks up towards the rear
    b.add(M.carbon, plate.translate(0, 0.04, -0.18));
    for (let i = 0; i < 6; i++) {
      const x = -0.55 + (i * 1.1) / 5;
      b.add(M.carbon, crossSection([[-0.38, 0], [0.02, 0.084], [0.02, 0.125], [-0.38, 0.03]], 0.008, 0).translate(x, 0, 0));
    }
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Side skirts (origin: centre, 1 m long along Z, protrudes +X)
// ---------------------------------------------------------------------------
function skirtProfile(points) {
  // points are (x, y) where x is outward; extruded along Z for 1 m
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2 });
  return g.translate(0, 0, -0.5);
}
const skirts = {
  'standard': () => new PartBuilder('skirt')
    .add(M.paint, skirtProfile([[-0.04, 0], [0.02, 0], [0.035, 0.03], [0.02, 0.08], [-0.04, 0.08]]))
    .build(),
  'sport': () => new PartBuilder('skirt')
    .add(M.paint, skirtProfile([[-0.04, 0.015], [0.02, 0.015], [0.03, 0.05], [0.015, 0.09], [-0.04, 0.09]]))
    .add(M.black, skirtProfile([[-0.04, 0], [0.06, 0], [0.06, 0.016], [-0.04, 0.016]]))
    .build(),
  'racing': () => {
    const b = new PartBuilder('skirt');
    b.add(M.carbon, skirtProfile([[-0.04, 0], [0.085, 0], [0.085, 0.014], [0.03, 0.02], [0.02, 0.09], [-0.04, 0.09]]));
    for (const z of [0.3, 0.42]) {
      b.add(M.carbon, new THREE.BoxGeometry(0.06, 0.06, 0.006).translate(0.06, 0.04, z));
    }
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Roof (origin on roof surface)
// ---------------------------------------------------------------------------
const roof = {
  'crossbars': () => {
    const b = new PartBuilder('roof');
    for (const z of [-0.28, 0.28]) {
      b.add(M.alu, crossSection(airfoil(0.07, 0.02).map(([zz, y]) => [zz - 0.035 + z, y + 0.075]), 1.12, 0.002));
      for (const x of [-0.52, 0.52]) b.add(M.alu, new THREE.BoxGeometry(0.05, 0.08, 0.07).translate(x, 0.04, z));
    }
    return b.build();
  },
  'roof-box': () => {
    const b = new PartBuilder('roof');
    const box = new THREE.CapsuleGeometry(0.17, 1.15, 8, 24);
    box.rotateX(Math.PI / 2);
    box.scale(2.0, 0.55, 1);
    b.add(M.black, box.translate(0, 0.17, 0));
    for (const z of [-0.3, 0.3]) b.add(M.alu, new THREE.BoxGeometry(1.0, 0.03, 0.05).translate(0, 0.03, z));
    return b.build();
  },
  'shark-fin': () => {
    const b = new PartBuilder('roof');
    const fin = crossSection([[-0.06, 0], [0.11, 0], [0.09, 0.012], [-0.03, 0.06], [-0.06, 0.012]], 0.045, 0.006);
    b.add(M.carbon, fin);
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Exhaust tips (single tip pointing +Z)
// ---------------------------------------------------------------------------
function tip(material, radius, len, slash = false) {
  const b = new PartBuilder('exhaust');
  const outer = new THREE.CylinderGeometry(radius, radius * 0.92, len, 40, 1, true);
  outer.rotateX(Math.PI / 2);
  b.add(material, outer);
  b.add(material, new THREE.TorusGeometry(radius, radius * 0.08, 10, 40).translate(0, 0, len / 2));
  const inner = new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, len * 0.9, 32, 1, true);
  inner.rotateX(Math.PI / 2);
  b.add(M.mesh, inner);
  if (slash) b.add(material, new THREE.BoxGeometry(radius * 2, 0.004, len * 0.3).translate(0, radius * 0.6, len * 0.3));
  return b.build();
}
const exhaust = {
  'titanium-dual': () => tip(M.titanium, 0.048, 0.14),
  'black-quad': () => {
    const g = new THREE.Group();
    g.name = 'exhaust';
    for (const x of [-0.055, 0.055]) {
      const t = tip(M.black, 0.04, 0.13);
      t.position.x = x;
      g.add(t);
    }
    return g;
  },
  'chrome-oval': () => {
    const t = tip(M.chrome, 0.05, 0.12, true);
    t.scale.set(1.5, 0.75, 1);
    return t;
  },
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
const exporter = new GLTFExporter();
async function save(folder, name, object) {
  const scene = new THREE.Scene();
  scene.add(object);
  const glb = await exporter.parseAsync(scene, { binary: true });
  const file = join(ROOT, folder, `${name}.glb`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(glb));
  console.log(`  ${folder}/${name}.glb  ${(glb.byteLength / 1024).toFixed(0)} KB`);
}

const libraries = {
  wheels,
  spoilers,
  bumpers: { ...prefix('front', front), ...prefix('rear', rear) },
  skirts,
  accessories: { ...prefix('roof', roof), ...prefix('exhaust', exhaust) },
};
function prefix(p, lib) {
  return Object.fromEntries(Object.entries(lib).map(([k, v]) => [`${p}-${k}`, v]));
}

console.log('Generating component GLBs...');
for (const [folder, lib] of Object.entries(libraries)) {
  for (const [name, build] of Object.entries(lib)) await save(folder, name, build());
}
