"""
Exports the Porsche 911 v2 from the user's carPorsche.blend with opening panels.

The source (Sketchfab "Porsche 911 Carrera 4S" by Lionsharp Studios) keeps every body panel as a
separate loose part inside a few big meshes. This script:
  1. finds the loose parts that make up each door (outer skin, window frame, side glass, mirror,
     belt chrome, handle) and the front luggage lid, by where they sit on the car;
  2. separates them into their own objects and gives the skins a dark inner face (a thin
     solidify shell), so an open door or lid shows a trim panel instead of a see-through skin;
  3. adds a hinge empty for each one (door_fl, door_fr: vertical axis at the door's front edge;
     frunk: across the car at the lid's windscreen end; the source already has a node named 'boot'), parented to the world so its local axes
     are the car's axes, and parents the parts to it;
  4. exports assets-src/vehicles/porsche-911-v2.raw.glb for scripts/prepare-vehicles.mjs.

  blender -b ~/Codes/carPorsche.blend --python scripts/export-porsche-911-v2.py -- [--preview DIR]

Blender world frame of the source: +Z up, nose towards -Y, car's left side (driver, LHD) at +X.
"""
import sys
import bmesh
import bpy
from mathutils import Euler, Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = ARGS[ARGS.index('--preview') + 1] if '--preview' in ARGS else None
OUT = '/Users/ashutosh/Codes/car-configurator/assets-src/vehicles/porsche-911-v2.raw.glb'

# Objects that never belong to an opening panel.
SKIP = ('Cylinder', 'underbody', 'windshield', 'window_rear', 'Cube.00', 'Plane.00', 'bumper_front')


def door_box(side):
    """Loose parts fully inside this world box belong to that side's door."""
    return dict(x=(0.45, 1.05) if side > 0 else (-1.08, -0.45), y=(-0.80, 0.53), z=(-0.42, 0.58))


# The front lid is one painted loose part of the main body mesh; matched on its exact footprint.
LID = dict(obj='boot.008_0', x=(-0.66, 0.63), y=(-1.82, -0.72), z=(0.05, 0.26), min_verts=500)

PARTS = {
    'door_fl': dict(box=door_box(+1), hinge=(0.80, -0.72, 0.0)),
    'door_fr': dict(box=door_box(-1), hinge=(-0.83, -0.72, 0.0)),
}
LID_HINGE = (0.0, -0.76, 0.245)

bpy.ops.object.select_all(action='DESELECT')
if bpy.context.object and bpy.context.object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')

# The two light helpers would only be removed later anyway.
for name in ('Hemi.001', 'Hemi.003'):
    if name in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[name])


def islands(obj):
    """Loose parts of a mesh as lists of vertex indices, with their world-space bounds."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    mw = obj.matrix_world
    seen, out = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, ids = [v], []
        seen.add(v.index)
        while stack:
            x = stack.pop()
            ids.append(x.index)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in seen:
                    seen.add(y.index)
                    stack.append(y)
        pts = [mw @ bm.verts[i].co for i in ids]
        lo = Vector([min(p[k] for p in pts) for k in range(3)])
        hi = Vector([max(p[k] for p in pts) for k in range(3)])
        out.append((ids, lo, hi))
    bm.free()
    return out


def inside(lo, hi, box):
    return all(box[a][0] <= lo[k] and hi[k] <= box[a][1] for k, a in enumerate('xyz'))


def separate(obj, vert_ids, name):
    """Moves the given vertices (and their faces) out of obj into a new object called name."""
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_mode(type='VERT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bm = bmesh.from_edit_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    wanted = set(vert_ids)
    for v in bm.verts:
        v.select = v.index in wanted
    bm.select_flush(True)
    bmesh.update_edit_mesh(obj.data)
    before = set(bpy.data.objects)
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    new = [o for o in bpy.data.objects if o not in before]
    if not new:
        return None
    new[0].name = name
    return new[0]


def inner_shell(obj, thickness_m=0.012):
    """Thin solidify shell whose inside and rim use the dark trim material."""
    trim = bpy.data.materials['full_black']
    if trim.name not in [s.material.name for s in obj.material_slots if s.material]:
        obj.data.materials.append(trim)
    idx = [s.material.name if s.material else '' for s in obj.material_slots].index(trim.name)
    scale = obj.matrix_world.to_scale().x
    mod = obj.modifiers.new('inner', 'SOLIDIFY')
    mod.thickness = thickness_m / scale
    mod.offset = -1
    mod.material_offset = idx
    mod.material_offset_rim = idx
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)


def hinge(name, location):
    empty = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(empty)
    empty.location = location
    return empty


def attach(parts, empty):
    bpy.context.view_layer.update()
    for p in parts:
        mw = p.matrix_world.copy()
        p.parent = empty
        p.matrix_world = mw


meshes = [o for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith(SKIP)]

# ---- Doors ----------------------------------------------------------------
for node, spec in PARTS.items():
    found = []
    for obj in list(meshes):
        ids = [i for part, lo, hi in islands(obj) if inside(lo, hi, spec['box']) for i in part]
        if not ids:
            continue
        mat = obj.active_material.name if obj.active_material else '?'
        piece = separate(obj, ids, f'{node}_{obj.name.split("_")[0]}')
        if piece:
            found.append(piece)
            print(f'  {node}: {piece.name} ({mat}, {len(piece.data.vertices)} verts)')
    # Only the door's outer skin (from the main body mesh) gets a trim panel: shelling the thin
    # window frame and fender strips produced long spikes.
    for p in found:
        if p.name.endswith('boot.008'):
            inner_shell(p)
    attach(found, hinge(node, spec['hinge']))
    print('DOOR', node, len(found), 'parts')

# ---- Front luggage lid ("boot" in the configurator) ------------------------
body = bpy.data.objects[LID['obj']]
lid_ids = [i for part, lo, hi in islands(body)
           if len(part) >= LID['min_verts'] and inside(lo, hi, {k: LID[k] for k in 'xyz'}) for i in part]
lid = separate(body, lid_ids, 'boot_lid')
inner_shell(lid)
# Dark luggage well under the lid, so the open lid does not reveal the hollow shell.
# Kept below the lid's lowest (front) edge, z 0.07, so it never shows through when closed.
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.015, -1.27, -0.13))
well = bpy.context.object
well.name = 'boot_well'
well.scale = (1.1, 0.9, 0.3)
well.data.materials.append(bpy.data.materials['full_black'])
attach([lid], hinge('frunk', LID_HINGE))
print('LID', len(lid.data.vertices), 'verts')

# ---- Cabin -----------------------------------------------------------------
# The source has no interior, only two flat seat outlines (Cube.002). A simple but complete cabin is
# built here so open doors and the seated view show a real interior: bucket seats, dashboard with
# instrument hood, steering wheel (left-hand drive), centre console, carpet, small rear seats and a
# headliner (the roof is single-sided, so without it the sky shows through from inside).
# Coordinates are in the source's world frame (see top); the car's centre line is x = -0.015.
import math

CX = -0.015


def material(name, color, roughness, sheen=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0.0
    if sheen and 'Sheen Weight' in bsdf.inputs:
        bsdf.inputs['Sheen Weight'].default_value = sheen
    return m


LEATHER = material('leather', (0.012, 0.012, 0.013), 0.5, 0.3)
CARPET = material('carpet', (0.008, 0.008, 0.009), 1.0)
HEADLINER = material('headliner', (0.05, 0.05, 0.052), 1.0)
PLASTIC = bpy.data.materials['plastic']
SILVER = bpy.data.materials['silver']

cabin = []


def box(name, size, loc, mat, rot=(0, 0, 0), bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new('round', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'NONE'
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    cabin.append(o)
    return o


def along(origin, rx, dist):
    """Point `dist` along the local up axis of something rotated by rx about X."""
    return (origin[0], origin[1] - math.sin(rx) * dist, origin[2] + math.cos(rx) * dist)


# Replace the flat seat outlines.
if 'Cube.002_0' in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects['Cube.002_0'])

BACK_TILT = -0.25  # top of the backrest leans rearwards
for side, sx in (('l', CX + 0.31), ('r', CX - 0.31)):
    box(f'seat_{side}_cushion', (0.38, 0.46, 0.10), (sx, 0.12, -0.25), LEATHER, rot=(-0.06, 0, 0), bevel=0.03)
    for b in (-1, 1):
        box(f'seat_{side}_bolster{b}', (0.07, 0.44, 0.16), (sx + b * 0.19, 0.12, -0.22), LEATHER, bevel=0.03)
    back_c = (sx, 0.42, 0.06)
    box(f'seat_{side}_back', (0.38, 0.10, 0.62), back_c, LEATHER, rot=(BACK_TILT, 0, 0), bevel=0.035)
    for b in (-1, 1):
        box(f'seat_{side}_wing{b}', (0.07, 0.15, 0.52), (sx + b * 0.19, 0.40, 0.03), LEATHER, rot=(BACK_TILT, 0, 0), bevel=0.03)
    box(f'seat_{side}_head', (0.26, 0.09, 0.17), along(back_c, BACK_TILT, 0.37), LEATHER, rot=(BACK_TILT, 0, 0), bevel=0.035)

# Dashboard across the car, with an instrument hood in front of the driver.
box('dash', (1.42, 0.34, 0.24), (CX, -0.72, 0.06), LEATHER, bevel=0.05)
box('dash_lower', (1.30, 0.20, 0.18), (CX, -0.60, -0.10), PLASTIC, bevel=0.03)
box('dash_trim', (1.36, 0.012, 0.025), (CX, -0.552, 0.02), SILVER, bevel=0.004)
bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.32, location=(CX + 0.31, -0.64, 0.17), rotation=(0, math.pi / 2, 0))
hood = bpy.context.object
hood.name = 'dash_hood'
hood.scale = (0.55, 1, 1)
bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.shade_smooth()
hood.data.materials.append(LEATHER)
cabin.append(hood)

# Steering wheel: rim facing the driver, tilted 25 degrees from vertical.
WHEEL_RX = math.radians(-65)
wheel_c = (CX + 0.31, -0.44, 0.10)
bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.017, major_segments=64, minor_segments=16,
                                 location=wheel_c, rotation=(WHEEL_RX, 0, 0))
rim = bpy.context.object
rim.name = 'steering_rim'
bpy.ops.object.shade_smooth()
rim.data.materials.append(LEATHER)
cabin.append(rim)
bpy.ops.mesh.primitive_cylinder_add(radius=0.055, depth=0.045, location=wheel_c, rotation=(WHEEL_RX, 0, 0))
hub = bpy.context.object
hub.name = 'steering_hub'
bpy.ops.object.shade_smooth()
hub.data.materials.append(PLASTIC)
cabin.append(hub)
for k, ang in enumerate((math.pi / 2, math.pi * 7 / 6, -math.pi / 6)):
    # Spokes from the hub to the rim (3 o'clock, 9 o'clock and 6 o'clock), in the wheel's plane.
    local = Vector((math.cos(ang) * 0.11, math.sin(ang) * 0.11, 0))
    local.rotate(Euler((WHEEL_RX, 0, 0)))
    box(f'steering_spoke{k}', (0.03, 0.12, 0.012), (wheel_c[0] + local.x, wheel_c[1] + local.y, wheel_c[2] + local.z), PLASTIC,
            rot=(WHEEL_RX, 0, ang - math.pi / 2), bevel=0.004)
col_c = along(wheel_c, WHEEL_RX, -0.15)
bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.28, location=col_c, rotation=(WHEEL_RX, 0, 0))
col = bpy.context.object
col.name = 'steering_column'
col.data.materials.append(PLASTIC)
cabin.append(col)

# Centre console with a gear selector, floor, small rear seats and the headliner.
box('console', (0.22, 0.90, 0.28), (CX, -0.12, -0.24), PLASTIC, bevel=0.03)
box('console_trim', (0.23, 0.70, 0.01), (CX, -0.10, -0.098), SILVER, bevel=0.003)
box('gear', (0.05, 0.08, 0.07), (CX, -0.22, -0.06), LEATHER, bevel=0.02)
box('floor', (1.42, 1.95, 0.03), (CX, 0.05, -0.37), CARPET, bevel=0)
box('rear_seats', (1.10, 0.36, 0.22), (CX, 0.80, -0.20), LEATHER, bevel=0.04)
box('rear_backs', (1.10, 0.10, 0.36), (CX, 0.97, 0.02), LEATHER, rot=(-0.35, 0, 0), bevel=0.04)
# Over the front seats only: the roof drops behind the B-pillar and the edges curve down.
box('headliner', (0.92, 0.66, 0.012), (CX, 0.22, 0.515), HEADLINER, bevel=0)
print('CABIN', len(cabin), 'parts')

if PREVIEW:
    sc = bpy.context.scene
    bpy.data.objects['door_fl'].rotation_euler[2] = -1.1
    bpy.data.objects['door_fr'].rotation_euler[2] = 1.1
    bpy.data.objects['frunk'].rotation_euler[0] = -1.15
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys() else 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 1200, 700
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[1].default_value = 1.6
    shots = [((5.5, -5.0, 2.2), (0, -0.4, 0.1)), ((-5.5, -4.5, 2.6), (0, -0.4, 0.1)), ((2.2, -1.2, 1.4), (0, -0.4, 0.1)),
             ((CX + 0.31, 0.32, 0.30), (CX + 0.2, -0.7, 0.12)), ((2.4, 0.1, 0.5), (0, 0.1, -0.05))]
    for i, (pos, tgt) in enumerate(shots):
        cam.location = pos
        cam.data.lens = 18 if i == 3 else 50
        cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = f'{PREVIEW}/p911open_{i}.png'
        bpy.ops.render.render(write_still=True)
    bpy.data.objects['door_fl'].rotation_euler[2] = 0
    bpy.data.objects['door_fr'].rotation_euler[2] = 0
    bpy.data.objects['frunk'].rotation_euler[0] = 0
    bpy.data.objects.remove(cam)

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_lights=False,
                          export_cameras=False, export_yup=True)
print('EXPORTED', OUT)
