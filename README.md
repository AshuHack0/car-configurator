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
