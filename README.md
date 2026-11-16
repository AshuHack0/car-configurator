# Modifed — 3D Car Configurator (frontend-only demo)

A client-presentation demo of a real-time 3D vehicle configurator. Everything runs in the browser:
Next.js 14 + React Three Fiber + drei, CSS Modules, React state and `localStorage`. No backend, database or external API.

```bash
npm install
npm run dev          # http://localhost:3000
```

Demo flow: Home → **Start Customizing** → Mercedes-Benz → E-Class W213 → **Open 3D configurator** →
Wheels: Obsidian Multi-Spoke → Spoilers: Carbon-Fibre Ducktail → Paint: Matte Black →
Bumpers: Sport Rear Diffuser → open the price pill (bottom right) → **Save** / **Reset** / **Restore**.

## What is real 3D and what is not

| Thing | How it works |
| --- | --- |
| Vehicle | A real GLB (`public/models/vehicles/ferrari.glb`, Draco-compressed) loaded with `useGLTF`, cloned per mount. |
| Wheels | The rig finds the four `wheel_*` nodes, measures each tyre (centre, diameter, width), hides the original rim/tyre meshes (brakes stay), and fits four clones of the selected wheel GLB with the correct position, outward rotation and scale. |
| Spoilers, bumpers, diffusers, side skirts, exhaust tips | Real GLB parts mounted at named attachment points. Points are rays snapped onto the body (`src/data/demoAssets.ts`). Side skirts are sized from the measured wheelbase. |
| Grille, light tints, carbon trim | Existing meshes re-skinned (material swap, restored on removal). |
| Paint | The `Body_Color` material is replaced with a physical clear-coat material. Body-colour parts follow it. |
| Mirror caps, roof accessories | **Preview only** on this model (mirrors are fused into the body; the stand-in is an open-top spider). The UI labels these clearly. |

### Rendering (what makes it look like a real car)

- **Surfaces** — the source GLB ships every material at metalness 0.2 / roughness 0.8 (everything reads as plastic).
  `surfaces` in `src/data/demoAssets.ts` maps each mesh/material to a physical preset: refractive glass and lenses,
  chrome, alloy, rubber, leather, trim plastic. A new vehicle GLB gets its own map.
- **Paint** — `MeshPhysicalMaterial` base coat under a mirror-smooth clear coat; solid colours are non-metallic.
- **Studio** — a procedural photo studio rendered into the environment map (dark surround, long softbox strips,
  light floor for the lower-body horizon reflection). Nothing is downloaded.
- **Camera & post** — ~30° lens, N8AO ambient occlusion, subtle bloom, Khronos PBR Neutral tone mapping (true paint
  colours), two-layer soft contact shadow on a seamless cyclorama floor.
- **Phones** — alpha-blended glass instead of transmission, no post-processing, smaller shadow/env maps.

### Important: the vehicle body is a stand-in

No free, licensed GLBs of the Mercedes/BMW/Audi/Porsche models exist, so **every vehicle currently uses the same
studio stand-in body** ("Ferrari 458 Italia" by vicent091036, CC BY 4.0, from the three.js examples). The configurator
shows a "Demo 3D body" badge for this. Brand/model/generation/year selection, pricing and saving are per vehicle.

To use a real model for a specific car (e.g. a purchased E-Class W213 GLB):

1. Put the file in `public/models/vehicles/` (Draco/Meshopt/KTX2 compression is supported; decoders are local in `public/draco` and `public/basis`).
2. In `src/data/demoAssets.ts`, copy the stand-in config and set `modelUrl`, `standIn: false`, the wheel node names,
   the paint material name, the attachment rays and the `support` map for that file.
3. Point the vehicle's `assetId` in `src/data/vehicles.ts` at the new config.

No viewer or replacement code needs to change. If a model fails to load, the viewer shows a fallback with Retry.

## Real vehicle models

| Vehicle | 3D body | Source (credit shown in the site footer) |
| --- | --- | --- |
| BMW M4 (G82) | `public/models/vehicles/bmw-m4-g82.glb` | "BMW M4 Competition 2021" by 3DCars4U, CC BY 4.0 |
| Porsche 911 (991 body; 992 shows a "3D body: 991" badge) | `public/models/vehicles/porsche-911-991.glb` | "(FREE) Porsche 911 Carrera 4S" by Lionsharp Studios, CC BY-SA 4.0 |
| Everything else | Ferrari stand-in ("Demo 3D body" badge) | see above |

Adding a car:

1. Download a GLB (check the licence allows commercial use) into `assets-src/vehicles/` (git-ignored; originals are large).
2. Add an entry to `CARS` in `scripts/prepare-vehicles.mjs` (real length, wheel/brake node names, extras to remove) and
   run `npm run prepare:vehicles <id>`. It scales the car to real size, puts the tyres on the ground, names the wheels
   `wheel_fl/fr/rl/rr`, simplifies and Draco-compresses it (the M4 went from 50 MB to 2.4 MB).
3. Add a `VehicleAssetConfig` in `src/data/demoAssets.ts` (paint material, `surfaces`, attachment rays) and point the
   vehicle's `assetId` at it. Mesh groups and surfaces can match by material with a `mat:` prefix.

## Upload your car (photo identification) — pilot: Porsche & BMW

`/identify` → the customer uploads 3–8 photos → `POST /api/identify` sends them to a vision model with a structured
JSON output schema — Google Gemini (`gemini-3.8-flash` with fallbacks, free tier: 20 requests/day per model) or Claude (`claude-opus-5-5`), chosen by `AI_PROVIDER`
→ the answer is checked against the catalog → the customer confirms or corrects make, generation,
year and paint → the configurator opens that vehicle with their paint as "Your paint".

The car is **identified, not reconstructed**: the 3D body always comes from our library (`assetId` in
`src/data/vehicles.ts`), so every customer gets studio quality and every part fits.

Setup: copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`). Without a key the page
works but identification returns "not configured". Note: on Gemini's free tier Google may use submitted content to
improve its products — use a paid tier or Claude before real customer photos go through it.

| Where | What |
| --- | --- |
| `src/app/api/identify/route.ts` | Request validation, provider choice |
| `src/lib/identify/core.ts` | Prompt, output schema, catalog validation (shared by both providers) |
| `src/lib/identify/providers.ts` | Claude and Gemini calls and their error handling |
| `src/components/identify/IdentifyFlow.tsx` | Upload, shot guide, result and correction UI |
| `src/lib/resizeImage.ts` | Client-side resize to 1568 px JPEG (also strips EXIF/GPS) |
| `IDENTIFY_BRANDS` in `src/data/vehicles.ts` | Brands the pilot accepts; add a brand here to open it up |

Photos are not stored. Licence plates are never transcribed. A server-side refusal fallback (`fallbacks: "default"`) is on.

## Component GLBs

The wheel, spoiler, bumper, skirt, roof and exhaust parts in `public/models/` are generated procedurally (no AI or
3D-generation service was used) by:

```bash
npm run generate:parts
```

Each part is authored in a canonical frame (documented at the top of `scripts/generate-parts.mjs`) with named
material slots (`Paint`, `Carbon`, `Rim_Finish`…) that the configurator rebinds at runtime. Product thumbnails are
SVGs drawn from the same spoke layouts. To use designer-made parts, replace a GLB at the same path, keeping
the frame and material names.

## Structure

```
src/app/                      pages: home, /vehicles, /configurator/[vehicleId]
src/components/configurator/  top bar, category nav, product & paint panels, summary bar, viewer overlay
src/three/                    VehicleScene, VehicleModel, rig (measurement + attachment points),
                              Wheel/Spoiler/BumperReplacement, PartAttachment, PaintCustomizer, MaterialSwap
src/data/                     vehicles, products & INR prices, per-vehicle 3D asset configs
src/hooks/                    useConfigurator (selections, pricing, localStorage), useVehicle
```

Prices are illustrative INR demo values only.
