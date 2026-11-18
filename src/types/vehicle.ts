export type Vec3 = [number, number, number];

export type BrandId = 'mercedes' | 'bmw' | 'audi' | 'porsche' | 'lamborghini';

export interface Brand {
  id: BrandId;
  name: string;
  tagline: string;
  accent: string;
}

export type BodyStyle = 'sedan' | 'suv' | 'coupe';

export interface Generation {
  code: string;
  label: string;
  years: number[];
}

export interface Vehicle {
  id: string;
  brand: BrandId;
  model: string;
  /** Generation shown by default, e.g. "W213". */
  generation: string;
  generations: Generation[];
  body: BodyStyle;
  basePrice: number;
  power: string;
  /** Key into VEHICLE_ASSETS. Several vehicles can share one asset set. */
  assetId: string;
}

/**
 * A ray used to find a point on the vehicle body. The ray is cast from `from`
 * along `dir` (model space) against the body meshes; the hit point becomes the
 * attachment origin. If nothing is hit, `from` is used as-is.
 */
export interface AttachmentPoint {
  from: Vec3;
  dir?: Vec3;
  /** Added after snapping (model space). */
  offset?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  /** Also place a mirrored copy at -x. */
  mirrorX?: boolean;
}

export type SurfaceKind =
  | 'glass'      // window glass: clear, mirror-smooth, slightly tinted
  | 'lens'       // light lenses (headlight / taillight covers)
  | 'chrome'
  | 'alloy'      // painted / machined wheel alloy
  | 'metal'      // raw or brushed metal (brake discs, exhaust)
  | 'rubber'
  | 'plastic'    // textured black trim plastic
  | 'glossPlastic'
  | 'leather'
  | 'fabric'
  | 'carbon'
  | 'accent';    // painted accents, calipers, badges

export interface SurfacePreset {
  kind: SurfaceKind;
  /** sRGB hex; omitted keeps the model's colour. */
  color?: string;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export type AttachmentId = 'spoiler' | 'frontLower' | 'rearLower' | 'roof' | 'exhaust';

/**
 * Which component systems a vehicle's 3D asset actually supports.
 *  - "replace":  original meshes exist and are swapped for the new part
 *  - "attach":   no separate original mesh; the part is mounted at a named attachment point
 *  - "material": the part is changed by re-skinning existing meshes
 *  - "none":     not possible on this asset; products fall back to a labelled preview
 */
export type ComponentSupport = 'replace' | 'attach' | 'material' | 'none';

export interface VehicleAssetConfig {
  id: string;
  label: string;
  modelUrl: string;
  /** Credit line for the 3D asset. */
  credit: string;
  /** Where the model comes from (shown with the credit, required by CC licences). */
  sourceUrl?: string;
  /** True when the GLB is a generic stand-in rather than the actual model. */
  standIn: boolean;
  /**
   * Generation codes this body actually represents. When the customer's generation is not
   * listed, the viewer says which body is shown (e.g. a 991 body for a 992 car).
   */
  generations?: string[];
  /**
   * Catalog vehicle ids this body really is. Other vehicles may borrow it as their brand's closest
   * body (e.g. every BMW shows the M4 until it has its own model); the viewer then names the body.
   */
  vehicles?: string[];
  /** Short name used in that notice, e.g. "BMW M4 (G82)". */
  shortLabel?: string;
  /** Direction the car's nose points in model space. */
  forward: '-z' | '+z';
  /** Uniform scale applied to the whole vehicle. */
  scale: number;
  /** Material that carries the body paint. */
  paintMaterial: string;
  /** Nodes whose descendant meshes form a road wheel; `keep` meshes (e.g. brakes) stay visible. */
  wheels: { nodes: string[]; keep: RegExp };
  /** Meshes used as raycast targets for snapping. */
  bodyMeshes: string[];
  attachments: Partial<Record<AttachmentId, AttachmentPoint>>;
  /** Side skirts are derived from wheel positions; these refine the fit. */
  sideSkirt?: { height: number; inset: number; gapFactor: number };
  /** Named mesh groups that material products re-skin. */
  meshGroups: Record<string, string[]>;
  support: Record<string, ComponentSupport>;
  /**
   * Physically based surface for each part of the GLB. Keys are matched against
   * the mesh name, then its parent's name, then the material name. Meshes with no
   * match keep their original material.
   */
  surfaces?: Record<string, SurfacePreset>;
  /**
   * Offline photo renders (scripts/render-vehicle.py), served as `${base}/${paintId}-${view}.jpg`.
   * The configurator shows these in Photo view while only a listed paint is chosen.
   */
  renders?: { base: string; paints: string[]; views: string[] };
  /** Shown on the preview card when a component is not supported by this asset. */
  unsupportedNotes?: Record<string, string>;
  camera: { distance: number; target: Vec3 };
}
