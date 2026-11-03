import type { CategoryId, Finish, PaintOption, Product, SlotId } from '@/types/product';

export const CATEGORIES: { id: CategoryId; name: string; blurb: string; slots: SlotId[] }[] = [
  { id: 'wheels', name: 'Wheels', blurb: 'Forged & cast alloys', slots: ['wheels'] },
  { id: 'spoilers', name: 'Spoilers', blurb: 'Lips, ducktails & GT wings', slots: ['spoiler'] },
  { id: 'bumpers', name: 'Bumpers', blurb: 'Front kits, rear bumpers & diffusers', slots: ['frontBumper', 'rearBumper', 'diffuser'] },
  { id: 'skirts', name: 'Side skirts', blurb: 'Sill extensions & blades', slots: ['sideSkirts'] },
  { id: 'paint', name: 'Paint', blurb: 'Gloss, metallic & matte', slots: [] },
  { id: 'lighting', name: 'Lighting', blurb: 'Headlight & taillight tints', slots: ['headlights', 'taillights'] },
  { id: 'accessories', name: 'Accessories', blurb: 'Grille, roof, exhaust & carbon', slots: ['grille', 'mirrors', 'roof', 'exhaust', 'carbonTrim'] },
];

export const SLOT_LABELS: Record<SlotId, string> = {
  wheels: 'Wheels',
  spoiler: 'Rear spoiler',
  frontBumper: 'Front bumper',
  rearBumper: 'Rear bumper',
  diffuser: 'Rear diffuser',
  sideSkirts: 'Side skirts',
  grille: 'Front grille',
  mirrors: 'Mirrors',
  headlights: 'Headlights',
  taillights: 'Taillights',
  roof: 'Roof',
  exhaust: 'Exhaust tips',
  carbonTrim: 'Carbon trim',
};

const RIM_FINISHES: Record<string, Finish> = {
  gloss: { id: 'gloss-black', name: 'Gloss Black', color: '#0b0b0d', metalness: 0.6, roughness: 0.18, clearcoat: 1 },
  satin: { id: 'satin-black', name: 'Satin Black', color: '#1a1b1e', metalness: 0.5, roughness: 0.55 },
  silver: { id: 'hyper-silver', name: 'Hyper Silver', color: '#c7cbd1', metalness: 1, roughness: 0.22, price: 4000 },
  bronze: { id: 'bronze', name: 'Satin Bronze', color: '#8a6131', metalness: 1, roughness: 0.38, price: 6000 },
  gunmetal: { id: 'gunmetal', name: 'Gunmetal', color: '#3c4047', metalness: 0.95, roughness: 0.32, price: 5000 },
  polished: { id: 'polished', name: 'Polished', color: '#e8eaed', metalness: 1, roughness: 0.06, price: 9000 },
};
const finishes = (...keys: (keyof typeof RIM_FINISHES)[]) => keys.map((k) => RIM_FINISHES[k]);

export const PRODUCTS: Product[] = [
  // ---- Wheels -----------------------------------------------------------
  {
    id: 'wheel-multi-spoke', slot: 'wheels', category: 'wheels', component: 'wheels',
    name: 'Obsidian Multi-Spoke 20"', description: '20 fine twin spokes, flow-formed. Staggered fitment.',
    price: 85_000, impl: { kind: 'wheels', model: '/models/wheels/multi-spoke.glb' },
    thumb: { kind: 'wheel', design: 'multi-spoke' }, finishes: finishes('gloss', 'satin', 'gunmetal', 'silver'), defaultFinish: 'gloss-black',
  },
  {
    id: 'wheel-amg-twin', slot: 'wheels', category: 'wheels', component: 'wheels',
    name: 'Silver AMG-Style Twin 5-Spoke', description: 'Classic AMG-inspired twin 5-spoke, 20".',
    price: 1_10_000, impl: { kind: 'wheels', model: '/models/wheels/amg-twin.glb' },
    thumb: { kind: 'wheel', design: 'amg-twin' }, finishes: finishes('silver', 'polished', 'gloss', 'gunmetal'), defaultFinish: 'hyper-silver',
  },
  {
    id: 'wheel-racing-mesh', slot: 'wheels', category: 'wheels', component: 'wheels',
    name: 'Bronze Racing Cross-Spoke', description: 'Motorsport cross-spoke with centre-lock look, forged.',
    price: 1_20_000, impl: { kind: 'wheels', model: '/models/wheels/racing-mesh.glb' },
    thumb: { kind: 'wheel', design: 'racing-mesh' }, finishes: finishes('bronze', 'gloss', 'silver'), defaultFinish: 'bronze',
  },
  {
    id: 'wheel-sport-y', slot: 'wheels', category: 'wheels', component: 'wheels',
    name: 'Sport Y-Spoke 19"', description: 'Lightweight cast Y-spoke for daily performance.',
    price: 45_000, impl: { kind: 'wheels', model: '/models/wheels/sport-y.glb' },
    thumb: { kind: 'wheel', design: 'sport-y' }, finishes: finishes('gunmetal', 'gloss', 'silver', 'satin'), defaultFinish: 'gunmetal',
  },
  {
    id: 'wheel-forged-turbine', slot: 'wheels', category: 'wheels', component: 'wheels',
    name: 'Forged Turbine 7-Spoke 21"', description: 'Directional-look monoblock with swept spokes.',
    price: 98_000, impl: { kind: 'wheels', model: '/models/wheels/forged-turbine.glb' },
    thumb: { kind: 'wheel', design: 'forged-turbine' }, finishes: finishes('satin', 'polished', 'bronze', 'gloss'), defaultFinish: 'satin-black',
  },

  // ---- Spoilers ---------------------------------------------------------
  {
    id: 'spoiler-standard', slot: 'spoiler', category: 'spoilers', component: 'spoiler',
    name: 'Standard Lip Spoiler', description: 'Subtle boot-lid lip, painted in body colour.',
    price: 12_000, impl: { kind: 'attach', model: '/models/spoilers/standard-lip.glb', attachment: 'spoiler' },
    thumb: { kind: 'spoiler-lip' },
  },
  {
    id: 'spoiler-sport', slot: 'spoiler', category: 'spoilers', component: 'spoiler',
    name: 'Sport Blade Spoiler', description: 'Raised aero blade on gloss-black stanchions.',
    price: 22_000, impl: { kind: 'attach', model: '/models/spoilers/sport-blade.glb', attachment: 'spoiler' },
    thumb: { kind: 'spoiler-blade' },
  },
  {
    id: 'spoiler-carbon', slot: 'spoiler', category: 'spoilers', component: 'spoiler',
    name: 'Carbon-Fibre Ducktail', description: 'Pre-preg 2×2 twill carbon, UV clear-coated.',
    price: 28_000, impl: { kind: 'attach', model: '/models/spoilers/carbon-ducktail.glb', attachment: 'spoiler' },
    thumb: { kind: 'spoiler-ducktail' },
  },
  {
    id: 'spoiler-gt-wing', slot: 'spoiler', category: 'spoilers', component: 'spoiler',
    name: 'GT Racing Wing', description: 'Dual-element carbon wing on swan-neck uprights.',
    price: 35_000, impl: { kind: 'attach', model: '/models/spoilers/gt-wing.glb', attachment: 'spoiler' },
    thumb: { kind: 'spoiler-wing' },
  },

  // ---- Bumpers ----------------------------------------------------------
  {
    id: 'front-sport', slot: 'frontBumper', category: 'bumpers', component: 'frontBumper',
    name: 'Sport Front Bumper Lip', description: 'Gloss-black splitter that follows the nose line.',
    price: 25_000, impl: { kind: 'attach', model: '/models/bumpers/front-sport-lip.glb', attachment: 'frontLower' },
    thumb: { kind: 'front-lip' },
  },
  {
    id: 'front-aggressive', slot: 'frontBumper', category: 'bumpers', component: 'frontBumper',
    name: 'Aggressive Front Kit', description: 'Carbon splitter with end fences and stacked canards.',
    price: 65_000, impl: { kind: 'attach', model: '/models/bumpers/front-aggressive.glb', attachment: 'frontLower' },
    thumb: { kind: 'front-aggressive' },
  },
  {
    id: 'front-amg', slot: 'frontBumper', category: 'bumpers', component: 'frontBumper',
    name: 'AMG-Style Front Bumper', description: 'A-wing blade in body colour with chrome accent.',
    price: 48_000, impl: { kind: 'attach', model: '/models/bumpers/front-amg-style.glb', attachment: 'frontLower' },
    thumb: { kind: 'front-amg' },
  },
  {
    id: 'rear-sport', slot: 'rearBumper', category: 'bumpers', component: 'rearBumper',
    name: 'Sport Rear Bumper', description: 'Lower valance with black mesh side vents.',
    price: 38_000, impl: { kind: 'attach', model: '/models/bumpers/rear-sport-rear.glb', attachment: 'rearLower' },
    thumb: { kind: 'rear-bumper' },
  },
  {
    id: 'diffuser-sport', slot: 'diffuser', category: 'bumpers', component: 'diffuser',
    name: 'Sport Rear Diffuser', description: 'Carbon diffuser with six vertical strakes.',
    price: 18_000, impl: { kind: 'attach', model: '/models/bumpers/rear-diffuser.glb', attachment: 'rearLower' },
    thumb: { kind: 'diffuser' },
  },

  // ---- Side skirts ------------------------------------------------------
  {
    id: 'skirt-standard', slot: 'sideSkirts', category: 'skirts', component: 'sideSkirts',
    name: 'Standard Side Skirts', description: 'OEM-style sill extensions in body colour.',
    price: 15_000, impl: { kind: 'attach', model: '/models/skirts/standard.glb', attachment: 'sideSkirt' },
    thumb: { kind: 'skirt', design: 'standard' },
  },
  {
    id: 'skirt-sport', slot: 'sideSkirts', category: 'skirts', component: 'sideSkirts',
    name: 'Sport Side Skirts', description: 'Body-colour sills with a gloss-black blade.',
    price: 22_000, impl: { kind: 'attach', model: '/models/skirts/sport.glb', attachment: 'sideSkirt' },
    thumb: { kind: 'skirt', design: 'sport' },
  },
  {
    id: 'skirt-racing', slot: 'sideSkirts', category: 'skirts', component: 'sideSkirts',
    name: 'Racing Side Skirts', description: 'Wide carbon blades with rear winglets.',
    price: 30_000, impl: { kind: 'attach', model: '/models/skirts/racing.glb', attachment: 'sideSkirt' },
    thumb: { kind: 'skirt', design: 'racing' },
  },

  // ---- Lighting ---------------------------------------------------------
  {
    id: 'head-ice', slot: 'headlights', category: 'lighting', component: 'headlights',
    name: 'Ice-Blue LED Signature', description: 'Cool 6500K daytime running signature.',
    price: 18_000, impl: { kind: 'material', overrides: { headlightLeds: { color: '#cfe8ff', emissive: '#7cc4ff', emissiveIntensity: 3 } } },
    thumb: { kind: 'headlight', design: '#7cc4ff' },
  },
  {
    id: 'head-amber', slot: 'headlights', category: 'lighting', component: 'headlights',
    name: 'Amber DRL Retrofit', description: 'Motorsport-style amber running lights.',
    price: 14_000, impl: { kind: 'material', overrides: { headlightLeds: { color: '#ffc46b', emissive: '#ffa21a', emissiveIntensity: 3 } } },
    thumb: { kind: 'headlight', design: '#ffa21a' },
  },
  {
    id: 'head-smoked', slot: 'headlights', category: 'lighting', component: 'headlights',
    name: 'Smoked Headlight Lenses', description: 'Dark-tinted projector glass.',
    price: 12_000, impl: { kind: 'material', overrides: { headlightGlass: { color: '#1b1d22', roughness: 0.05, metalness: 0.4 } } },
    thumb: { kind: 'headlight', design: '#2a2d33' },
  },
  {
    id: 'tail-smoked', slot: 'taillights', category: 'lighting', component: 'taillights',
    name: 'Smoked Taillights', description: 'Dark smoked lenses with red glow.',
    price: 16_000, impl: { kind: 'material', overrides: { taillights: { color: '#2a0507', emissive: '#ff1a1a', emissiveIntensity: 0.6, roughness: 0.08 } } },
    thumb: { kind: 'taillight', design: '#3a0a0c' },
  },
  {
    id: 'tail-red', slot: 'taillights', category: 'lighting', component: 'taillights',
    name: 'Illuminated Red Taillights', description: 'Full-brightness LED light-bar look.',
    price: 14_000, impl: { kind: 'material', overrides: { taillights: { color: '#ff2a2a', emissive: '#ff0000', emissiveIntensity: 2.2 } } },
    thumb: { kind: 'taillight', design: '#ff2a2a' },
  },

  // ---- Accessories ------------------------------------------------------
  {
    id: 'grille-black', slot: 'grille', category: 'accessories', component: 'grille',
    name: 'Gloss Black Grille', description: 'Night-package gloss black intakes.',
    price: 14_000, impl: { kind: 'material', overrides: { grille: { preset: 'glossBlack' } } },
    thumb: { kind: 'grille', design: '#0a0a0a' },
  },
  {
    id: 'grille-chrome', slot: 'grille', category: 'accessories', component: 'grille',
    name: 'Chrome Grille', description: 'Bright polished chrome intake surrounds.',
    price: 18_000, impl: { kind: 'material', overrides: { grille: { preset: 'chrome' } } },
    thumb: { kind: 'grille', design: '#d9dde3' },
  },
  {
    id: 'grille-carbon', slot: 'grille', category: 'accessories', component: 'grille',
    name: 'Carbon Grille', description: 'Clear-coated carbon weave intakes.',
    price: 24_000, impl: { kind: 'material', overrides: { grille: { preset: 'carbon' } } },
    thumb: { kind: 'grille', design: 'carbon' },
  },
  {
    id: 'mirror-carbon', slot: 'mirrors', category: 'accessories', component: 'mirrors',
    name: 'Carbon Mirror Caps', description: 'Replacement caps in 2×2 twill carbon.',
    price: 16_000, impl: { kind: 'preview', reason: 'Mirrors are fused into the body mesh of this 3D model, so the caps cannot be swapped in 3D yet.' },
    thumb: { kind: 'mirror', design: 'carbon' },
  },
  {
    id: 'mirror-black', slot: 'mirrors', category: 'accessories', component: 'mirrors',
    name: 'Gloss Black Mirror Caps', description: 'Piano-black caps for the night look.',
    price: 9_000, impl: { kind: 'preview', reason: 'Mirrors are fused into the body mesh of this 3D model, so the caps cannot be swapped in 3D yet.' },
    thumb: { kind: 'mirror', design: '#0a0a0a' },
  },
  {
    id: 'roof-fin', slot: 'roof', category: 'accessories', component: 'roof',
    name: 'Carbon Shark-Fin', description: 'Low-profile antenna housing.',
    price: 6_000, impl: { kind: 'attach', model: '/models/accessories/roof-shark-fin.glb', attachment: 'roof' },
    thumb: { kind: 'shark-fin' },
  },
  {
    id: 'roof-bars', slot: 'roof', category: 'accessories', component: 'roof',
    name: 'Aero Roof Crossbars', description: 'Black anodised aluminium crossbars.',
    price: 21_000, impl: { kind: 'attach', model: '/models/accessories/roof-crossbars.glb', attachment: 'roof' },
    thumb: { kind: 'roof-bars' },
  },
  {
    id: 'roof-box', slot: 'roof', category: 'accessories', component: 'roof',
    name: 'Touring Roof Box', description: '420 L gloss-black aero cargo box.',
    price: 48_000, impl: { kind: 'attach', model: '/models/accessories/roof-roof-box.glb', attachment: 'roof' },
    thumb: { kind: 'roof-box' },
  },
  {
    id: 'exhaust-titanium', slot: 'exhaust', category: 'accessories', component: 'exhaust',
    name: 'Burnt Titanium Tips', description: 'Heat-blued titanium, Ø96 mm.',
    price: 32_000, impl: { kind: 'attach', model: '/models/accessories/exhaust-titanium-dual.glb', attachment: 'exhaust' },
    thumb: { kind: 'exhaust', design: 'titanium' },
  },
  {
    id: 'exhaust-black', slot: 'exhaust', category: 'accessories', component: 'exhaust',
    name: 'Black Ceramic Quad Tips', description: 'Ceramic-coated quad outlets.',
    price: 26_000, impl: { kind: 'attach', model: '/models/accessories/exhaust-black-quad.glb', attachment: 'exhaust' },
    thumb: { kind: 'exhaust', design: 'black' },
  },
  {
    id: 'exhaust-chrome', slot: 'exhaust', category: 'accessories', component: 'exhaust',
    name: 'Chrome Oval Tips', description: 'Slash-cut polished oval outlets.',
    price: 19_000, impl: { kind: 'attach', model: '/models/accessories/exhaust-chrome-oval.glb', attachment: 'exhaust' },
    thumb: { kind: 'exhaust', design: 'chrome' },
  },
  {
    id: 'carbon-pack', slot: 'carbonTrim', category: 'accessories', component: 'carbonTrim',
    name: 'Carbon Exterior Pack', description: 'Accent trim and aero pieces in carbon.',
    price: 42_000, impl: { kind: 'material', overrides: { accentTrim: { preset: 'carbon' }, carbonTrim: { preset: 'carbon' } } },
    thumb: { kind: 'carbon' },
  },
  {
    id: 'carbon-blackline', slot: 'carbonTrim', category: 'accessories', component: 'carbonTrim',
    name: 'Black Line Trim Pack', description: 'Gloss-black accent trim de-chrome.',
    price: 22_000, impl: { kind: 'material', overrides: { accentTrim: { preset: 'glossBlack' } } },
    thumb: { kind: 'grille', design: '#0a0a0a' },
  },
];

export const PAINTS: PaintOption[] = [
  { id: 'factory', name: 'Factory Finish', color: '#c99a0e', metalness: 0.55, roughness: 0.28, clearcoat: 1, price: 0 },
  { id: 'gloss-black', name: 'Gloss Black', color: '#09090b', metalness: 0.45, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, price: 85_000 },
  { id: 'matte-black', name: 'Matte Black', color: '#141416', metalness: 0.25, roughness: 0.72, clearcoat: 0, price: 1_15_000 },
  { id: 'pearl-white', name: 'Pearl White', color: '#efede7', metalness: 0.25, roughness: 0.25, clearcoat: 1, price: 95_000 },
  { id: 'metallic-silver', name: 'Metallic Silver', color: '#aeb3ba', metalness: 0.9, roughness: 0.3, clearcoat: 1, price: 90_000 },
  { id: 'racing-red', name: 'Racing Red', color: '#a3070f', metalness: 0.45, roughness: 0.26, clearcoat: 1, price: 95_000 },
  { id: 'midnight-blue', name: 'Midnight Blue', color: '#0e1f47', metalness: 0.75, roughness: 0.3, clearcoat: 1, price: 1_05_000 },
];

export const CUSTOM_PAINT_FINISHES = [
  { id: 'gloss', name: 'Gloss', metalness: 0.4, roughness: 0.22, clearcoat: 1 },
  { id: 'metallic', name: 'Metallic', metalness: 0.85, roughness: 0.3, clearcoat: 1 },
  { id: 'satin', name: 'Satin', metalness: 0.4, roughness: 0.48, clearcoat: 0.3 },
  { id: 'matte', name: 'Matte', metalness: 0.2, roughness: 0.75, clearcoat: 0 },
];
export const CUSTOM_PAINT_PRICE = 1_35_000;

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);

export function productFinish(product: Product, finishId?: string): Finish | undefined {
  if (!product.finishes) return undefined;
  return product.finishes.find((f) => f.id === (finishId ?? product.defaultFinish)) ?? product.finishes[0];
}

export const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;
