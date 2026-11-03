import type { AttachmentId } from './vehicle';

export type CategoryId = 'wheels' | 'spoilers' | 'bumpers' | 'skirts' | 'paint' | 'lighting' | 'accessories';

/** One product can occupy one slot; selecting another product in the slot replaces it. */
export type SlotId =
  | 'wheels'
  | 'spoiler'
  | 'frontBumper'
  | 'rearBumper'
  | 'diffuser'
  | 'sideSkirts'
  | 'grille'
  | 'mirrors'
  | 'headlights'
  | 'taillights'
  | 'roof'
  | 'exhaust'
  | 'carbonTrim';

export interface Finish {
  id: string;
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  /** Extra cost over the product price. */
  price?: number;
}

/** Material overrides applied to a mesh group (see VehicleAssetConfig.meshGroups). */
export interface MaterialOverride {
  preset?: 'carbon' | 'chrome' | 'glossBlack';
  color?: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
}

export type Implementation =
  | { kind: 'wheels'; model: string }
  | { kind: 'attach'; model: string; attachment: AttachmentId | 'sideSkirt' }
  | { kind: 'material'; overrides: Record<string, MaterialOverride> }
  | { kind: 'preview'; reason: string };

export type ThumbKind =
  | 'wheel'
  | 'spoiler-lip'
  | 'spoiler-blade'
  | 'spoiler-ducktail'
  | 'spoiler-wing'
  | 'front-lip'
  | 'front-aggressive'
  | 'front-amg'
  | 'rear-bumper'
  | 'diffuser'
  | 'skirt'
  | 'grille'
  | 'mirror'
  | 'headlight'
  | 'taillight'
  | 'roof-bars'
  | 'roof-box'
  | 'shark-fin'
  | 'exhaust'
  | 'carbon';

export interface Product {
  id: string;
  slot: SlotId;
  category: CategoryId;
  name: string;
  description: string;
  price: number;
  /** Component-support key checked against the vehicle asset config. */
  component: string;
  impl: Implementation;
  thumb: { kind: ThumbKind; design?: string };
  finishes?: Finish[];
  defaultFinish?: string;
}

export interface PaintOption {
  id: string;
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness?: number;
  price: number;
}

export interface Selection {
  productId: string;
  finishId?: string;
}

export interface Configuration {
  vehicleId: string;
  year?: number;
  generation?: string;
  selections: Partial<Record<SlotId, Selection>>;
  paint: { id: string; color?: string; finish?: string };
}

export interface SavedConfiguration extends Configuration {
  savedAt: string;
  total: number;
}
