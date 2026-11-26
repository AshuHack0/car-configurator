# 6. 3D asset pipeline

How a car goes from a source file (Blender `.blend` or a downloaded GLB) to the website. Every step is a
script in `scripts/`, so it can be re-run when the source changes.

## 6.1 Budgets per car

| Measure | Limit | Why |
|---|---|---|
| Download (GLB) | ≤ 15 MB | Loads in a few seconds on 4G |
| GPU texture memory | ≤ 200 MB | The original Volvo used ~920 MB and strained laptops |
| Triangles | ≤ 1.5 M | Smooth orbiting on mid-range laptops |
| Textures | 2048 px only for close-up parts (tyres, rims, front seats, dashboard); 1024 px for the rest | |

## 6.2 Steps

1. **Source and licence.** Get the model (CGTrader, Sketchfab, TurboSquid, or a commissioned model).
   Record the author, licence and source page. Do not publish until the licence allows commercial use.
2. **Export from Blender** with a per-car script that separates opening panels, adds hinge points and
   (if needed) builds missing parts:
   - Volvo S90: `scripts/export-volvo-s90.py`
   - Porsche 911 v2: `scripts/export-porsche-911-v2.py` (separates doors and front lid, adds a simple cabin)

   ```bash
   blender -b ~/Codes/carPorsche.blend --python scripts/export-porsche-911-v2.py
   ```
3. **Prepare:** rename and split wheels and brakes, scale to the real length, centre the car, put the tyres
   on the ground, compress geometry (Draco).

   ```bash
   node scripts/prepare-vehicles.mjs porsche-911-v2
   ```
4. **Compress textures for the GPU** (KTX2 / Basis Universal): colour maps ETC1S, normal maps UASTC, data
   maps ETC1S marked linear.

   ```bash
   node scripts/optimize-volvo-v3.mjs public/models/vehicles/<car>.glb public/models/vehicles/<car>.ktx.glb
   mv public/models/vehicles/<car>.ktx.glb public/models/vehicles/<car>.glb
   ```
5. **Configure** the car in `src/data/demoAssets.ts` (moving to the `vehicle_asset.config` column in the
   database): wheel nodes, attachment points for parts, surface materials, opening panels and their
   hotspots, cabin camera, factory paint.
6. **Check in the browser:** every camera view, every opening panel, interior view, one wheel and one body
   kit fitted, on a phone and a laptop.

## 6.3 Cars done

| Car | Source | Licence | Opening parts | Interior |
|---|---|---|---|---|
| Volvo S90 v3 | CGTrader, "Volvo S90" by lazercar | **Not checked yet** | Doors, boot, fuel flap | Original, 3 trim colours |
| Porsche 911 v2 | Sketchfab, "(FREE) Porsche 911 Carrera 4S" by Lionsharp Studios | CC BY-SA 4.0 (credit required) | Doors, front lid | Simple cabin built by script |
| BMW M4 | Sketchfab, "BMW M4 Competition 2021" by 3DCars4U | CC BY 4.0 (credit required) | — | — |

## 6.4 Lessons learned

- GPU-compressed textures must carry the right colour flag: roughness and normal maps marked as sRGB make
  surfaces look glossy.
- Panels that will open need a dark inner face; otherwise an open door looks hollow.
- Name hinge nodes uniquely: the 911 source already had a node called `boot`, so the lid hinge is `frunk`.
- Keep the car's own tyres when fitting aftermarket rims; they look far more real than generated tyres.
