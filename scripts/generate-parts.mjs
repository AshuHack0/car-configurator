/**
 * Generates the demo component library as real GLB files in public/models/.
 *
 * Every part is authored in a canonical frame so the runtime attachment
 * system can place it on any vehicle:
 *   - Wheels:   centred on origin, axle along X, outer face towards +X, outer radius 0.362 m.
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
 * Realism rules the shapes follow (the first version was built from boxes and read as a toy):
 *   - Wheel faces are one machined disc with the spoke windows cut out, so every window has a
 *     rounded corner and a chamfered edge, like a cast or forged alloy. Behind the face sit a
 *     stepped barrel and a diamond-cut lip; lug nuts sit in dark pockets.
 *   - Aero parts are lofted from rounded cross-sections and taper into rounded ends instead of
 *     stopping in a flat cut. Small brackets and fences have bevelled edges.
 *
 * Run: npm run generate:parts
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

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
// Materials (placeholders; rebound by name at runtime, see bindPartMaterials)
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
  cap: mat('Gloss_Black', 0x050505, 0.2, 0.15),
  lug: mat('Lug', 0x9a9a9a, 1, 0.2),
  pocket: mat('Mesh_Grille', 0x080808, 0.4, 0.6),
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
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    }
    for (const key of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
    }
    const key = material.name;
    if (!this.buckets.has(key)) this.buckets.set(key, { material, geos: [] });
    this.buckets.get(key).geos.push(g);
    return this;
  }
  build() {
    const group = new THREE.Group();
    group.name = this.name;
    for (const { material, geos } of this.buckets.values()) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), material);
      mesh.name = `${this.name}_${material.name}`;
      group.add(mesh);
    }
    return group;
  }
}

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { const x = clamp01(t); return x * x * (3 - 2 * x); };

/** Chaikin corner cutting: turns a polygon's sharp corners into smooth fillets. */
function chaikin(points, iterations = 3, closed = true) {
  let pts = points;
  for (let k = 0; k < iterations; k++) {
    const out = [];
    const n = pts.length;
    const last = closed ? n : n - 1;
    if (!closed) out.push(pts[0]);
    for (let i = 0; i < last; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(pts[n - 1]);
    pts = out;
  }
  return pts;
}

const axleX = (g) => g.rotateZ(-Math.PI / 2); // lathe/cylinder Y axis -> X axis

/** Revolves a (radius, axial x) profile around the wheel axle. */
function lathe(profile, segments = 96) {
  return axleX(new THREE.LatheGeometry(profile.map(([r, x]) => new THREE.Vector2(r, x)), segments));
}

/** Box with rounded, bevelled edges, centred on the origin. */
function roundedBox(w, h, d, r = 0.004) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const shape = new THREE.Shape();
  const x = w / 2 - r, y = h / 2 - r;
  shape.moveTo(-x, -h / 2);
  shape.lineTo(x, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -y);
  shape.lineTo(w / 2, y);
  shape.quadraticCurveTo(w / 2, h / 2, x, h / 2);
  shape.lineTo(-x, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, y);
  shape.lineTo(-w / 2, -y);
  shape.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-4, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 3, curveSegments: 4,
  });
  g.translate(0, 0, -(d - 2 * r) / 2);
  return g;
}

/**
 * A flat plate from a 2D outline with bevelled (rounded) edges. The outline is (a, b) in the
 * plate's plane; the plate is `thickness` thick along its local Z, centred on Z = 0.
 */
function plate(points, thickness, bevel = 0.003) {
  const shape = new THREE.Shape(points.map(([a, b]) => new THREE.Vector2(a, b)));
  const depth = Math.max(1e-4, thickness - 2 * bevel);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 16,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/**
 * Lofts a closed (z, y) cross-section across the car's width (X), centred on x = 0.
 * The section is smoothed (rounded edges) and, over the outer `taper` fraction of each half,
 * shrinks to `endScale` along an elliptical curve, so the part ends in a rounded tip.
 * `sweep` pushes the ends rearwards (+Z) and `rise` lifts them, following the body's plan curve.
 */
function loft(section, width, { taper = 0.1, endScale = 0.25, sweep = 0, rise = 0, stations = 56, smoothing = 2, base } = {}) {
  // Outward-facing triangles need the section counter-clockwise in (z, y).
  let area = 0;
  for (let j = 0; j < section.length; j++) {
    const a = section[j], b = section[(j + 1) % section.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const P = chaikin(area < 0 ? section.slice().reverse() : section, smoothing);
  const m = P.length;
  const zc = P.reduce((s, p) => s + p[0], 0) / m;
  const yb = base ?? Math.min(...P.map((p) => p[1]));
  const positions = [];
  const uvs = [];
  const perimeter = [0];
  for (let j = 1; j <= m; j++) {
    const a = P[j - 1], b = P[j % m];
    perimeter.push(perimeter[j - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  for (let i = 0; i < stations; i++) {
    const x = -width / 2 + (width * i) / (stations - 1);
    const t = Math.abs((2 * x) / width);
    const u = taper > 0 ? clamp01((t - (1 - taper)) / taper) : 0;
    const s = endScale + (1 - endScale) * Math.sqrt(1 - u * u);
    const dz = sweep * t * t;
    const dy = rise * t * t;
    for (let j = 0; j < m; j++) {
      positions.push(x, yb + (P[j][1] - yb) * s + dy, zc + (P[j][0] - zc) * s + dz);
      uvs.push(x * 4, perimeter[j] * 4);
    }
  }
  const index = [];
  for (let i = 0; i < stations - 1; i++) {
    for (let j = 0; j < m; j++) {
      const a = i * m + j, b = i * m + ((j + 1) % m), c = (i + 1) * m + j, d = (i + 1) * m + ((j + 1) % m);
      index.push(a, c, b, b, c, d);
    }
  }
  // End caps: a fan around each end section's centre.
  for (const [i, flip] of [[0, false], [stations - 1, true]]) {
    let cy = 0, cz = 0;
    for (let j = 0; j < m; j++) { cy += positions[(i * m + j) * 3 + 1]; cz += positions[(i * m + j) * 3 + 2]; }
    const centre = positions.length / 3;
    positions.push(positions[i * m * 3], cy / m, cz / m);
    uvs.push(0, 0);
    for (let j = 0; j < m; j++) {
      const a = i * m + j, b = i * m + ((j + 1) % m);
      if (flip) index.push(centre, b, a); else index.push(centre, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function airfoil(chord, thick, camber = 0.6) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push([t * chord, thick * 4 * t * (1 - t) * 0.9 + t * thick * camber]);
  }
  for (let i = 15; i >= 1; i--) {
    const t = i / 16;
    pts.push([t * chord, -thick * 0.25 * 4 * t * (1 - t) + t * thick * camber]);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Wheels
// ---------------------------------------------------------------------------
/** Window radii: hub boss inside R_IN, the face's outer ring outside R_OUT. */
const R_IN = 0.086;
const R_OUT = 0.234;
/** Wheel face: outer radius, thickness, and where its front surface sits (lip front is 0.1135). */
const FACE_R = 0.252;
const FACE_T = 0.03;
const FACE_FRONT = 0.094;

const tOf = (r) => clamp01((r - R_IN) / (R_OUT - R_IN));

/** A spoke: its centre-line angle and half-width, both as functions of radius. */
const spoke = (centre, halfWidth) => ({ c: centre, w: halfWidth });
const edge = (s, side) => (r) => s.c(r) + side * Math.asin(Math.min(0.95, s.w(r) / r));

/**
 * Outline of the window between two neighbouring spokes, from rIn (or where the spokes part)
 * to rOut, as a smooth closed polygon in the face plane.
 */
function windowOutline(a, b, rIn, rOut, wrap = 0) {
  const left = edge(a, 1);
  const right = (r) => edge(b, -1)(r) + wrap;
  // Start where the gap is at least 4 mm wide, so neighbouring spokes that meet (twin spokes,
  // Y-spoke forks) open into a pointed window instead of an impossible one.
  let r0 = rIn;
  while (r0 < rOut - 0.02 && (right(r0) - left(r0)) * r0 < 0.004) r0 += 0.002;
  const pts = [];
  const polar = (r, ang) => [r * Math.cos(ang), r * Math.sin(ang)];
  const arc = (r, from, to) => {
    const n = Math.max(2, Math.ceil(Math.abs(to - from) / 0.09));
    for (let i = 0; i <= n; i++) pts.push(polar(r, lerp(from, to, i / n)));
  };
  const edgeRun = (fn, from, to) => {
    const n = 7;
    for (let i = 1; i < n; i++) { const r = lerp(from, to, i / n); pts.push(polar(r, fn(r))); }
  };
  arc(r0, left(r0), right(r0));
  edgeRun(right, r0, rOut);
  arc(rOut, right(rOut), left(rOut));
  edgeRun(left, rOut, r0);
  return chaikin(pts, 2);
}

/**
 * The cast/forged face: a disc with the windows cut out. ExtrudeGeometry's bevel gives every
 * window a rounded, chamfered edge, which is what makes a machined wheel catch the light.
 * `rings` are extra window bands (rIn, rOut, spokes) for multi-tier designs.
 */
function wheelFace(spokes, { rings } = {}) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, FACE_R, 0, Math.PI * 2, false);
  const bands = rings ?? [{ rIn: R_IN, rOut: R_OUT, spokes }];
  for (const band of bands) {
    const list = band.spokes.slice().sort((p, q) => p.c(band.rOut) - q.c(band.rOut));
    for (let i = 0; i < list.length; i++) {
      const wrap = i === list.length - 1 ? Math.PI * 2 : 0;
      const outline = windowOutline(list[i], list[(i + 1) % list.length], band.rIn, band.rOut, wrap);
      shape.holes.push(new THREE.Path(outline.map(([u, v]) => new THREE.Vector2(u, v))));
    }
  }
  const bevel = 0.005;
  const depth = FACE_T - 2 * bevel;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.0035, bevelSegments: 3, curveSegments: 128,
  });
  g.rotateY(Math.PI / 2); // extrusion (Z) -> axle (X)
  g.translate(FACE_FRONT - depth - bevel, 0, 0);
  return g;
}

/** Tyre: rounded sidewalls, squared shoulders and four circumferential tread grooves. */
function tyreProfile() {
  const side = [
    [0.266, -0.106], [0.274, -0.114], [0.288, -0.119], [0.305, -0.122], [0.322, -0.122],
    [0.337, -0.119], [0.348, -0.113], [0.355, -0.104], [0.3595, -0.094], [0.3615, -0.084],
  ];
  const tread = [];
  const grooves = [-0.054, -0.018, 0.018, 0.054];
  let x = -0.08;
  tread.push([0.362, x]);
  for (const gx of grooves) {
    tread.push([0.362, gx - 0.007], [0.3605, gx - 0.0055], [0.353, gx - 0.0045], [0.353, gx + 0.0045], [0.3605, gx + 0.0055], [0.362, gx + 0.007]);
  }
  tread.push([0.362, 0.08]);
  const mirrored = side.slice().reverse().map(([r, a]) => [r, -a]);
  return [...side, ...tread, ...mirrored];
}

/** Everything a wheel has besides its face design: tyre, lip, barrel, lug nuts and centre cap. */
function wheelBase(b, { lugs = 5, centreLock = false } = {}) {
  b.add(M.tire, lathe(tyreProfile(), 112));
  // Diamond-cut lip: a polished ring on the outer face, rolling over into the tyre bead.
  b.add(M.lip, lathe([
    [0.281, 0.095], [0.285, 0.1], [0.2845, 0.107], [0.281, 0.112], [0.276, 0.1135],
    [0.27, 0.111], [0.264, 0.105], [0.258, 0.097], [0.249, 0.09],
  ], 144));
  // Barrel, seen through the spoke windows: bead seat, drop centre, inner flange.
  b.add(M.rim, lathe([
    [0.281, 0.095], [0.272, 0.089], [0.265, 0.08], [0.263, 0.035], [0.24, 0.015], [0.238, -0.055],
    [0.262, -0.075], [0.266, -0.1], [0.276, -0.113], [0.279, -0.119], [0.27, -0.121], [0.262, -0.116],
  ], 128));
  // Hub boss: a gentle dome over the centre of the face.
  b.add(M.rim, lathe([[0.084, FACE_FRONT], [0.07, FACE_FRONT + 0.0015], [0.045, FACE_FRONT + 0.0035], [0.0, FACE_FRONT + 0.004]], 96));

  if (centreLock) {
    // Single centre-lock nut: hex with a machined flange and a cap.
    b.add(M.lip, axleX(new THREE.CylinderGeometry(0.05, 0.054, 0.006, 64)).translate(FACE_FRONT + 0.006, 0, 0));
    b.add(M.lug, axleX(new THREE.CylinderGeometry(0.036, 0.036, 0.022, 6)).translate(FACE_FRONT + 0.018, 0, 0));
    b.add(M.cap, lathe([[0.026, FACE_FRONT + 0.028], [0.024, FACE_FRONT + 0.031], [0.016, FACE_FRONT + 0.035], [0, FACE_FRONT + 0.036]], 48));
    return;
  }
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2 + Math.PI / 2;
    const y = 0.058 * Math.cos(a), z = 0.058 * Math.sin(a);
    // Dark pocket the nut sits in, then a hex nut with a chamfered top.
    b.add(M.pocket, axleX(new THREE.CylinderGeometry(0.0155, 0.0155, 0.002, 32)).translate(FACE_FRONT + 0.0045, y, z));
    b.add(M.lug, axleX(new THREE.CylinderGeometry(0.0098, 0.0098, 0.009, 6)).translate(FACE_FRONT + 0.0075, y, z));
    b.add(M.lug, axleX(new THREE.CylinderGeometry(0.0065, 0.0098, 0.003, 6)).translate(FACE_FRONT + 0.0135, y, z));
  }
  // Centre cap: domed gloss-black cap ringed with a polished bezel.
  b.add(M.cap, lathe([[0.0315, FACE_FRONT + 0.004], [0.031, FACE_FRONT + 0.009], [0.027, FACE_FRONT + 0.013], [0.016, FACE_FRONT + 0.0155], [0, FACE_FRONT + 0.016]], 64));
  b.add(M.lip, new THREE.TorusGeometry(0.0315, 0.0022, 10, 64).rotateY(Math.PI / 2).translate(FACE_FRONT + 0.008, 0, 0));
}

const tw = (wIn, wOut, power = 1) => (r) => lerp(wIn, wOut, Math.pow(tOf(r), power));
const at = (theta) => () => theta;

const wheels = {
  // 10 pairs of fine spokes ("20 fine twin spokes"): each pair joins at the hub and parts towards the lip.
  'multi-spoke': () => {
    const b = new PartBuilder('wheel');
    wheelBase(b);
    const spokes = [];
    for (let i = 0; i < 10; i++) {
      const th = (i / 10) * Math.PI * 2;
      for (const s of [-1, 1]) spokes.push(spoke((r) => th + s * 0.075 * smooth(tOf(r) * 1.4), tw(0.0085, 0.0062)));
    }
    b.add(M.rim, wheelFace(spokes));
    return b.build();
  },
  // Classic twin 5-spoke: broad pairs that merge into the hub, with a narrow slot between each pair.
  'amg-twin': () => {
    const b = new PartBuilder('wheel');
    wheelBase(b);
    const spokes = [];
    for (let i = 0; i < 5; i++) {
      const th = (i / 5) * Math.PI * 2;
      for (const s of [-1, 1]) spokes.push(spoke((r) => th + s * 0.16 * smooth(tOf(r) * 1.25), tw(0.02, 0.0135)));
    }
    b.add(M.rim, wheelFace(spokes));
    return b.build();
  },
  // Motorsport cross-spoke look: an inner ring of 10 spokes and an outer lattice of 20, split by a
  // ring, on a centre-lock hub.
  'racing-mesh': () => {
    const b = new PartBuilder('wheel');
    wheelBase(b, { centreLock: true });
    const inner = [], outer = [];
    for (let i = 0; i < 10; i++) inner.push(spoke(at((i / 10) * Math.PI * 2), () => 0.0085));
    for (let i = 0; i < 20; i++) {
      const th = (i / 20) * Math.PI * 2 + Math.PI / 20;
      const s = i % 2 ? 1 : -1;
      outer.push(spoke((r) => th + s * 0.09 * ((r - 0.172) / 0.062), () => 0.0058));
    }
    b.add(M.rim, wheelFace(null, {
      rings: [{ rIn: R_IN, rOut: 0.162, spokes: inner }, { rIn: 0.172, rOut: R_OUT, spokes: outer }],
    }));
    return b.build();
  },
  // 5 Y-spokes: a solid stem from the hub that forks into two arms halfway out.
  'sport-y': () => {
    const b = new PartBuilder('wheel');
    wheelBase(b);
    const spokes = [];
    for (let i = 0; i < 5; i++) {
      const th = (i / 5) * Math.PI * 2;
      for (const s of [-1, 1]) {
        spokes.push(spoke(
          (r) => th + s * 0.25 * smooth((r - 0.135) / (R_OUT - 0.135)),
          (r) => (r < 0.15 ? lerp(0.022, 0.012, clamp01((r - R_IN) / (0.15 - R_IN))) : 0.012),
        ));
      }
    }
    b.add(M.rim, wheelFace(spokes));
    return b.build();
  },
  // 7 swept spokes that widen into the hub, like a turbine.
  'forged-turbine': () => {
    const b = new PartBuilder('wheel');
    wheelBase(b);
    const spokes = [];
    for (let i = 0; i < 7; i++) {
      const th = (i / 7) * Math.PI * 2;
      spokes.push(spoke((r) => th + 0.55 * Math.pow(tOf(r), 1.2), tw(0.026, 0.013, 0.8)));
    }
    b.add(M.rim, wheelFace(spokes));
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Front splitter outline
// ---------------------------------------------------------------------------
/**
 * Plan outline used by front splitters. Noses are flat across the middle and sweep back
 * sharply at the corners, so the edge follows z = sweep * |x / w| ^ power.
 * Returned as (x, z) points; the outline is rounded off at the corners.
 */
function noseOutline(w, depth, sweep, power = 4.5, lip = 0.02, steps = 40) {
  const front = [];
  for (let i = 0; i <= steps; i++) {
    const x = -w + (2 * w * i) / steps;
    front.push([x, sweep * Math.pow(Math.abs(x / w), power) - lip]);
  }
  const back = front.slice().reverse().map(([x, z]) => [x * 0.94, z + depth]);
  return chaikin([...front, ...back], 2);
}

/** A splitter plate lying flat (plan outline in x, z), `thickness` thick, top at y = 0. */
function splitter(outline, thickness) {
  // plate() builds in its (a, b) plane extruded along Z; turn it so (a, b) = (x, z) and Z = up.
  const g = plate(outline.map(([x, z]) => [x, -z]), thickness, Math.min(0.004, thickness / 3));
  g.rotateX(-Math.PI / 2);
  g.translate(0, -thickness / 2, 0);
  return g;
}

/** A thin vertical fin from a side outline (z, y), `thickness` across X, centred on x = 0. */
function fin(outline, thickness, bevel = 0.002) {
  const g = plate(chaikin(outline, 2).map(([z, y]) => [-z, y]), thickness, bevel);
  g.rotateY(Math.PI / 2);
  return g;
}

// ---------------------------------------------------------------------------
// Spoilers
// ---------------------------------------------------------------------------
const spoilers = {
  'standard-lip': () => new PartBuilder('spoiler')
    .add(M.paint, loft([[-0.08, 0], [0.06, 0], [0.085, 0.034], [0.07, 0.042], [-0.08, 0.008]], 1.2, { taper: 0.1, endScale: 0.15, sweep: 0.025 }))
    .build(),
  'sport-blade': () => {
    const b = new PartBuilder('spoiler');
    b.add(M.paint, loft(airfoil(0.2, 0.03).map(([z, y]) => [z - 0.08, y + 0.11]), 1.3, { taper: 0.07, endScale: 0.35, sweep: 0.03, rise: 0.01, base: 0.11 }));
    for (const x of [-0.4, 0.4]) {
      // Tapered stanchion: wide foot on the lid, slim neck under the blade.
      b.add(M.black, fin([[-0.05, 0], [0.05, 0], [0.025, 0.115], [-0.02, 0.115]], 0.022, 0.004).translate(x, 0, 0));
    }
    return b.build();
  },
  'carbon-ducktail': () => new PartBuilder('spoiler')
    .add(M.carbon, loft([[-0.12, 0], [0.08, 0], [0.13, 0.07], [0.115, 0.08], [-0.12, 0.01]], 1.26, { taper: 0.14, endScale: 0.12, sweep: 0.04 }))
    .build(),
  'gt-wing': () => {
    const b = new PartBuilder('spoiler');
    const H = 0.32;
    b.add(M.carbon, loft(airfoil(0.34, 0.045).map(([z, y]) => [z - 0.14, y + H]), 1.78, { taper: 0.015, endScale: 0.8, base: H }));
    b.add(M.carbon, loft(airfoil(0.12, 0.02).map(([z, y]) => [z + 0.17, y + H + 0.07]), 1.78, { taper: 0.015, endScale: 0.8, base: H + 0.07 }));
    for (const s of [-1, 1]) {
      // End plates with a raked, rounded outline.
      b.add(M.carbon, fin([[-0.17, H - 0.07], [0.2, H - 0.05], [0.27, H + 0.03], [0.26, H + 0.13], [0.12, H + 0.14], [-0.17, H + 0.04]], 0.008, 0.002)
        .translate(s * 0.893, 0, 0));
      // Swan-neck uprights: hang the wing from above, as on modern GT cars.
      b.add(M.alu, fin([[-0.06, 0], [0.07, 0], [0.04, H * 0.55], [0.08, H + 0.06], [0.0, H + 0.065], [-0.04, H * 0.5]], 0.016, 0.003)
        .translate(s * 0.42, 0, 0));
      b.add(M.alu, roundedBox(0.08, 0.012, 0.16, 0.004).translate(s * 0.42, 0.006, 0));
    }
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Front bumper kits (origin: nose centre-line, extends +Z)
// ---------------------------------------------------------------------------
const front = {
  'sport-lip': () => new PartBuilder('front')
    .add(M.black, splitter(noseOutline(0.82, 0.24, 0.42), 0.02))
    .build(),
  'aggressive': () => {
    const b = new PartBuilder('front');
    b.add(M.carbon, splitter(noseOutline(0.84, 0.28, 0.42, 4.5, 0.045), 0.022));
    for (const s of [-1, 1]) {
      // Splitter end fences + stacked canards on the bumper corners.
      b.add(M.carbon, fin([[0.3, 0], [0.52, 0], [0.5, 0.05], [0.34, 0.07]], 0.01).translate(s * 0.8, -0.01, 0));
      for (const [y, z] of [[0.12, 0.47], [0.2, 0.5]]) {
        const c = splitter(chaikin([[-0.07, -0.04], [0.07, -0.025], [0.07, 0.03], [-0.07, 0.045]], 2), 0.008);
        c.rotateZ(s * 0.25);
        b.add(M.carbon, c.translate(s * 0.86, y, z));
      }
    }
    return b.build();
  },
  'amg-style': () => {
    const b = new PartBuilder('front');
    b.add(M.black, splitter(noseOutline(0.82, 0.26, 0.42, 4.5, 0.03), 0.02));
    // A-wing blade across the intake, in body colour, with a chrome accent strip.
    b.add(M.paint, loft([[0, 0], [0.05, 0.002], [0.042, 0.026], [0, 0.02]], 1.1, { taper: 0.08, endScale: 0.3, sweep: 0.05 }).translate(0, 0.07, 0.04));
    b.add(M.chrome, loft([[0, 0], [0.01, 0], [0.01, 0.006], [0, 0.006]], 1.1, { taper: 0.08, endScale: 0.3, sweep: 0.05, smoothing: 1 }).translate(0, 0.1, 0.04));
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Rear bumpers & diffusers (origin: tail centre-line, extends -Z)
// ---------------------------------------------------------------------------
const rear = {
  'sport-rear': () => {
    const b = new PartBuilder('rear');
    b.add(M.paint, loft([[-0.2, 0], [0.02, 0], [0.04, 0.05], [0.0, 0.1], [-0.2, 0.1]], 1.62, { taper: 0.06, endScale: 0.5, sweep: -0.06 }));
    for (const s of [-1, 1]) {
      // Vent: chrome-free black surround with a darker mesh insert.
      b.add(M.black, roundedBox(0.24, 0.06, 0.02, 0.008).translate(s * 0.62, 0.055, 0.032));
      b.add(M.mesh, roundedBox(0.21, 0.04, 0.02, 0.006).translate(s * 0.62, 0.055, 0.036));
    }
    return b.build();
  },
  'diffuser': () => {
    const b = new PartBuilder('rear');
    // Floor that kicks up towards the back, with rounded edges.
    b.add(M.carbon, loft([[-0.4, 0.0], [0.03, 0.085], [0.03, 0.097], [-0.4, 0.012]], 1.26, { taper: 0.03, endScale: 0.7, smoothing: 1 }));
    for (let i = 0; i < 6; i++) {
      const x = -0.55 + (i * 1.1) / 5;
      b.add(M.carbon, fin([[-0.38, 0.01], [0.025, 0.09], [0.03, 0.13], [-0.34, 0.035]], 0.008, 0.0025).translate(x, 0, 0));
    }
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Side skirts (origin: centre, 1 m long along Z, stretched at runtime; protrudes +X)
// ---------------------------------------------------------------------------
function skirtProfile(points) {
  // points are (x, y) where x is outward; rounded off, then extruded along Z for 1 m.
  const shape = new THREE.Shape(chaikin(points, 2).map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.99, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.005, bevelSegments: 3 });
  return g.translate(0, 0, -0.495);
}
const skirts = {
  'standard': () => new PartBuilder('skirt')
    .add(M.paint, skirtProfile([[-0.04, 0], [0.02, 0], [0.035, 0.03], [0.02, 0.08], [-0.04, 0.08]]))
    .build(),
  'sport': () => new PartBuilder('skirt')
    .add(M.paint, skirtProfile([[-0.04, 0.015], [0.02, 0.015], [0.03, 0.05], [0.015, 0.09], [-0.04, 0.09]]))
    .add(M.black, skirtProfile([[-0.04, 0], [0.06, 0.002], [0.062, 0.012], [-0.04, 0.016]]))
    .build(),
  'racing': () => {
    const b = new PartBuilder('skirt');
    b.add(M.carbon, skirtProfile([[-0.04, 0], [0.085, 0.002], [0.087, 0.012], [0.03, 0.02], [0.02, 0.09], [-0.04, 0.09]]));
    for (const z of [0.3, 0.42]) {
      // Winglets: small rounded plates standing on the blade.
      const w = plate(chaikin([[0, 0], [0.065, 0], [0.065, 0.025], [0.02, 0.06], [0, 0.06]], 2), 0.006, 0.002);
      b.add(M.carbon, w.translate(0.02, 0.012, z));
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
      b.add(M.alu, loft(airfoil(0.07, 0.02, 0).map(([zz, y]) => [zz - 0.035 + z, y + 0.075]), 1.12, { taper: 0.03, endScale: 0.6, base: 0.075 }));
      for (const x of [-0.52, 0.52]) {
        // Feet: tapered towers with rounded edges.
        b.add(M.alu, fin([[-0.045, 0], [0.045, 0], [0.03, 0.08], [-0.03, 0.08]], 0.05, 0.008).translate(x, 0, z));
      }
    }
    return b.build();
  },
  'roof-box': () => {
    const b = new PartBuilder('roof');
    const box = new THREE.CapsuleGeometry(0.17, 1.15, 12, 48);
    box.rotateX(Math.PI / 2);
    box.scale(2.0, 0.55, 1);
    b.add(M.black, box.translate(0, 0.17, 0));
    for (const z of [-0.3, 0.3]) b.add(M.alu, roundedBox(1.0, 0.03, 0.05, 0.008).translate(0, 0.03, z));
    return b.build();
  },
  'shark-fin': () => {
    const b = new PartBuilder('roof');
    // Side outline of a modern antenna fin; the thick bevel rounds it into a pebble shape.
    const outline = chaikin([[-0.075, 0], [0.11, 0], [0.105, 0.008], [-0.03, 0.062], [-0.06, 0.045]], 3);
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(-z, y))), {
      depth: 0.02, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.008, bevelSegments: 6,
    });
    g.translate(0, 0, -0.01);
    g.rotateY(Math.PI / 2);
    b.add(M.carbon, g);
    return b.build();
  },
};

// ---------------------------------------------------------------------------
// Exhaust tips (single tip pointing +Z)
// ---------------------------------------------------------------------------
/** Double-wall tip with a rolled lip, revolved around Z, plus a dark perforated core. */
function tip(material, radius, len, slash = false) {
  const b = new PartBuilder('exhaust');
  const R = radius;
  const back = -len / 2, front = len / 2;
  const profile = [
    [R * 0.9, back], [R * 0.97, back + len * 0.3], [R, front - 0.008], [R * 0.995, front - 0.002],
    [R * 0.97, front], [R * 0.91, front - 0.001], [R * 0.885, front - 0.006], [R * 0.875, back + len * 0.2], [R * 0.86, back],
  ];
  const shell = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), 64);
  shell.rotateX(Math.PI / 2);
  b.add(material, shell);
  const core = new THREE.CylinderGeometry(R * 0.7, R * 0.7, len * 0.9, 32, 1, true);
  core.rotateX(Math.PI / 2);
  b.add(M.mesh, core.translate(0, 0, -0.01));
  b.add(M.mesh, new THREE.CircleGeometry(R * 0.86, 32).translate(0, 0, front - len * 0.55));
  if (slash) {
    // Angled cut face on the lip.
    b.add(material, roundedBox(R * 1.9, 0.004, len * 0.3, 0.0015).translate(0, R * 0.6, len * 0.3));
  }
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
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
async function save(folder, name, object) {
  const scene = new THREE.Scene();
  scene.add(object);
  const raw = await exporter.parseAsync(scene, { binary: true });
  // Weld shared vertices and Draco-compress: the detailed wheels are several MB uncompressed.
  const doc = await io.readBinary(new Uint8Array(raw));
  await doc.transform(dedup(), weld(), draco({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 12 }));
  const glb = await io.writeBinary(doc);
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

const only = process.argv[2];
console.log('Generating component GLBs...');
for (const [folder, lib] of Object.entries(libraries)) {
  if (only && only !== folder) continue;
  for (const [name, build] of Object.entries(lib)) await save(folder, name, build());
}
