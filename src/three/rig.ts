import * as THREE from 'three';
import type { AttachmentId, AttachmentPoint, Vec3, VehicleAssetConfig } from '@/types/vehicle';

/** Canonical size of the generated wheel parts (see scripts/generate-parts.mjs). */
const PART_WHEEL_DIAMETER = 0.724;
const PART_WHEEL_WIDTH = 0.244;

export interface Placement {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface WheelSlot {
  node: string;
  /** Original meshes hidden when a replacement wheel is fitted. */
  originals: THREE.Mesh[];
  placement: Placement;
}

export interface VehicleRig {
  wheels: WheelSlot[];
  bounds: THREE.Box3;
  attachments: Partial<Record<AttachmentId | 'sideSkirt', Placement[]>>;
  /** Meshes for each named group in asset.meshGroups. */
  groups: Record<string, THREE.Mesh[]>;
}

const sanitize = (s: string) => s.replace(/\s/g, '_');

/**
 * Measures a freshly cloned vehicle (in its own model space) and resolves every
 * named attachment point into concrete transforms. Nothing here is specific to
 * one car — it is driven entirely by the VehicleAssetConfig.
 */
export function buildRig(root: THREE.Object3D, asset: VehicleAssetConfig): VehicleRig {
  root.updateMatrixWorld(true);
  const flip = asset.forward === '+z' ? Math.PI : 0;

  // ---- Wheels ---------------------------------------------------------
  const wheels: WheelSlot[] = [];
  for (const nodeName of asset.wheels.nodes) {
    const node = root.getObjectByName(nodeName);
    if (!node) continue;
    const originals: THREE.Mesh[] = [];
    node.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !asset.wheels.keep.test(o.name)) originals.push(o as THREE.Mesh);
    });
    if (!originals.length) continue;
    const box = new THREE.Box3();
    originals.forEach((m) => box.expandByObject(m));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const s = size.y / PART_WHEEL_DIAMETER;
    const sx = THREE.MathUtils.clamp(size.x / PART_WHEEL_WIDTH, 0.8, 1.35) * s;
    // Parts face +X; wheels on the -X side are turned around so their face points outwards.
    const outward = center.x >= 0 ? 0 : Math.PI;
    wheels.push({
      node: nodeName,
      originals,
      placement: { position: center.toArray() as Vec3, rotation: [0, outward, 0], scale: [sx, s, s] },
    });
  }

  // ---- Raycast targets ------------------------------------------------
  const wanted = new Set(asset.bodyMeshes.map(sanitize));
  const targets: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && (wanted.has(o.name) || wanted.has(o.parent?.name ?? ''))) targets.push(o as THREE.Mesh);
  });
  const bounds = new THREE.Box3();
  (targets.length ? targets : [root]).forEach((t) => bounds.expandByObject(t));

  const raycaster = new THREE.Raycaster();
  const snap = (from: Vec3, dir?: Vec3): THREE.Vector3 => {
    const origin = new THREE.Vector3(...from);
    if (!dir) return origin;
    raycaster.set(origin, new THREE.Vector3(...dir).normalize());
    const hit = raycaster.intersectObjects(targets, false)[0];
    return hit ? hit.point : origin;
  };

  const resolve = (p: AttachmentPoint): Placement[] => {
    const point = snap(p.from, p.dir).add(new THREE.Vector3(...(p.offset ?? [0, 0, 0])));
    const rot = p.rotation ?? [0, 0, 0];
    const placement: Placement = {
      position: point.toArray() as Vec3,
      rotation: [rot[0], rot[1] + flip, rot[2]],
      scale: p.scale ?? [1, 1, 1],
    };
    if (!p.mirrorX) return [placement];
    return [placement, { ...placement, position: [-point.x, point.y, point.z] }];
  };

  const attachments: VehicleRig['attachments'] = {};
  for (const [id, point] of Object.entries(asset.attachments) as [AttachmentId, AttachmentPoint][]) {
    attachments[id] = resolve(point);
  }

  // ---- Side skirts: derived from the measured wheel positions ----------
  if (asset.sideSkirt && wheels.length === 4) {
    const { height, inset, gapFactor } = asset.sideSkirt;
    const placements: Placement[] = [];
    for (const side of [1, -1]) {
      const pair = wheels.filter((w) => Math.sign(w.placement.position[0]) === side);
      if (pair.length !== 2) continue;
      const [za, zb] = pair.map((w) => w.placement.position[2]);
      const diameter = pair[0].placement.scale[1] * PART_WHEEL_DIAMETER;
      const length = Math.abs(zb - za) - diameter * gapFactor;
      const zMid = (za + zb) / 2;
      // Sample the sill a little above the skirt; if the ray misses, fall back to the body's widest point.
      const hit = snap([side * 3, height + 0.11, zMid], [-side, 0, 0]);
      const sillX = Math.abs(hit.x) < 2.5 ? hit.x : side * bounds.max.x;
      placements.push({
        position: [sillX - side * inset, height, zMid],
        rotation: [0, 0, 0],
        scale: [side, 1, Math.max(length, 0.5)],
      });
    }
    attachments.sideSkirt = placements;
  }

  const groups: Record<string, THREE.Mesh[]> = {};
  for (const [group, names] of Object.entries(asset.meshGroups)) {
    const set = new Set(names.map(sanitize));
    groups[group] = [];
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && (set.has(o.name) || set.has(o.parent?.name ?? ''))) groups[group].push(o as THREE.Mesh);
    });
  }

  return { wheels, bounds, attachments, groups };
}
