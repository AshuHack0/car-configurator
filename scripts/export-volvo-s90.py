"""
Converts the CGTrader "Volvo S90" Blender file (by lazercar) into a GLB the configurator can load.

  blender -b "Volvo S90.blend" --python scripts/export-volvo-s90.py -- <resized-textures-dir> <out.glb>

It applies the modifiers at a web-friendly level, thins the heaviest wheel and cabin meshes,
points materials at down-sized textures, groups each wheel under wheel_fl / wheel_fr / wheel_rl /
wheel_rr, and puts the tyres on the ground with the car centred.
Run scripts/optimize-glb.mjs on the result.
"""
import bmesh, bpy, os, re, sys
from mathutils import Vector

tex_dir, out_path = sys.argv[sys.argv.index('--') + 1:][:2]

collection_of = {o.name: c.name for c in bpy.data.collections for o in c.objects}

# Fuel and charging flaps are loose pieces inside larger panels. Lift each into its own object
# (keeping the panel's modifiers) so it can hinge open.
def split_island(source, vertex_count, name):
    def islands(bm):
        seen, found = set(), []
        for v in bm.verts:
            if v.index in seen:
                continue
            stack, group = [v], []
            seen.add(v.index)
            while stack:
                a = stack.pop()
                group.append(a)
                for e in a.link_edges:
                    b = e.other_vert(a)
                    if b.index not in seen:
                        seen.add(b.index)
                        stack.append(b)
            found.append(group)
        return found
    flap = source.copy()
    flap.data = source.data.copy()
    flap.name = name
    source.users_collection[0].objects.link(flap)
    collection_of[name] = collection_of.get(source.name)
    for obj, keep_flap in ((flap, True), (source, False)):
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        match = [g for g in islands(bm) if len(g) == vertex_count]
        assert len(match) == 1, f'{name}: expected one island of {vertex_count} vertices, found {len(match)}'
        inside = set(v.index for v in match[0])
        gone = [v for v in bm.verts if (v.index in inside) != keep_flap]
        bmesh.ops.delete(bm, geom=gone, context='VERTS')
        bm.to_mesh(obj.data)
        bm.free()
    return flap

charge_flap = split_island(bpy.data.objects['Fender Front'], 22, 'Charge Flap')
fuel_flap = split_island(bpy.data.objects['Body Frame'], 46, 'Fuel Flap')

# Window glass is modelled as a thick slab. In a browser both faces refract, which doubles
# everything seen through it, so each pane is exported as a single surface.
for o in bpy.data.objects:
    if collection_of.get(o.name) == 'Glass':
        for m in [m for m in o.modifiers if m.type == 'SOLIDIFY']:
            o.modifiers.remove(m)

# The black printed border of each window ("... Null") lies exactly on the glass. Moved 2 mm
# inwards so the two surfaces do not flicker against each other.
for o in bpy.data.objects:
    mats = [m.name for m in o.data.materials if m]
    if mats and all(m.startswith('null') for m in mats):
        for m in [m for m in o.modifiers if m.type == 'SOLIDIFY']:
            o.modifiers.remove(m)
        d = o.modifiers.new('inset', 'DISPLACE')
        d.strength = -0.002
        d.mid_level = 0

# Textures: use the down-sized copies.
files = {f.lower(): os.path.join(tex_dir, f) for f in os.listdir(tex_dir)}
for img in bpy.data.images:
    name = re.sub(r'\.\d{3}$', '', img.name).lower()
    path = files.get(name) or files.get(os.path.basename(img.filepath).lower())
    if not path:
        continue
    if img.packed_file:
        img.unpack(method='REMOVE')
    img.filepath = path
    img.reload()

# Smoothing level, then extra thinning for parts that are far denser than a browser needs.
DECIMATE = [
    (r'^Brake Disc', 0.25), (r'^Caliper', 0.5), (r'^Tire', 0.7), (r'^Rim Emblem', 0.4),
    (r'Seat|Dashboard|Plane\.0(27|57)|^Shell$|CenterConsole|Vents|Knobs|SeatBelts|SteeringWheel', 0.6),
    (r'Emitters Headlight|Reflector Highbeam|WindsheildWiper', 0.5),
]
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == 'SUBSURF':
            # Painted panels and glass get the model's full render smoothness: reflections show every facet.
            m.levels = 2 if collection_of.get(o.name) in ('BodyPanels', 'Glass') else min(max(m.levels, 1), 1)
    for pattern, ratio in DECIMATE:
        if re.search(pattern, o.name):
            d = o.modifiers.new('web', 'DECIMATE')
            d.ratio = ratio
            break

for o in bpy.data.objects:
    o.hide_set(False)
    o.hide_viewport = False
    o.select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects['Hood']
bpy.ops.object.convert(target='MESH')

# Doors: every door part is one object mirrored to both sides. Split each into a left and a
# right piece so the four doors can swing separately.
DOORS = {
    'front': ['Door Front', 'Door Front Handle', 'FrontDoorGlass', 'MIrror', 'MIrrorTurnSignal Glass',
              'MirrorTurnsignal Reflector', 'Plane.057'],
    'rear': ['Door Rear', 'Door Rear Handle', 'RearDoorGlass', 'Plane.027'],
}
# Hinge line of each door: (distance from the centre line, position along the car) in the source file.
HINGE = {'front': (0.86, -0.93), 'rear': (0.86, 0.12)}
door_parts = {}
by_name = {o.name.strip(): o for o in bpy.data.objects}
for axle, names in DOORS.items():
    for name in names:
        left = by_name[name]
        right = left.copy()
        right.data = left.data.copy()
        left.users_collection[0].objects.link(right)
        for obj, positive in ((left, True), (right, False)):
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            gone = [v for v in bm.verts if ((obj.matrix_world @ v.co).x > 0) != positive]
            bmesh.ops.delete(bm, geom=gone, context='VERTS')
            bm.to_mesh(obj.data)
            bm.free()
            obj.name = f"{name} {'L' if positive else 'R'}"
            door_parts.setdefault((axle, positive), []).append(obj)

# Tyres on the ground, car centred front to back.
xs, ys, zs = [], [], []
for o in bpy.data.objects:
    for v in o.bound_box:
        w = o.matrix_world @ Vector(v)
        ys.append(w.y); zs.append(w.z)
shift_y, shift_z = -(min(ys) + max(ys)) / 2, -min(zs)
for o in bpy.data.objects:
    o.location.y += shift_y
    o.location.z += shift_z

# One node per wheel, so the configurator can swap rims and keep the brakes.
for corner in ('FL', 'FR', 'RL', 'RR'):
    empty = bpy.data.objects.new('wheel_' + corner.lower(), None)
    bpy.context.scene.collection.objects.link(empty)
    for o in bpy.data.objects:
        if o.type == 'MESH' and collection_of.get(o.name) == 'Wheels' and o.name.strip().endswith(' ' + corner):
            o.parent = empty

# One node per door, placed on its hinge line, so the door swings by turning that node.
for (axle, positive), parts in door_parts.items():
    x, y = HINGE[axle]
    empty = bpy.data.objects.new(f"door_{'f' if axle == 'front' else 'r'}{'l' if positive else 'r'}", None)
    empty.location = (x if positive else -x, y + shift_y, 0)
    bpy.context.scene.collection.objects.link(empty)
    bpy.context.view_layer.update()
    for o in parts:
        o.parent = empty
        o.matrix_parent_inverse = empty.matrix_world.inverted()

# Boot lid (with the lamps and lettering it carries) hinges at its front edge; the flaps hinge
# on their front edge like the doors. Positions are (x, along the car, height) in the source file.
boot_parts = [o for o in bpy.data.objects if o.type == 'MESH' and (
    o.name.strip() == 'Trunk' or 'trunktaillight' in o.name.lower() or o.name.startswith('Lettering Rear'))]
for node, (x, y, z), parts in (
    ('boot', (0, 1.85, 1.10), boot_parts),
    ('flap_fuel', (-0.86, 1.245, 0.96), [fuel_flap]),
    ('flap_charge', (0.90, -1.205, 0.81), [charge_flap]),
):
    empty = bpy.data.objects.new(node, None)
    empty.location = (x, y + shift_y, z + shift_z)
    bpy.context.scene.collection.objects.link(empty)
    bpy.context.view_layer.update()
    for o in parts:
        o.parent = empty
        o.matrix_parent_inverse = empty.matrix_world.inverted()
print('EXPORT boot parts', [o.name for o in boot_parts])

tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)
print('EXPORT triangles', tris, 'shift', round(shift_y, 4), round(shift_z, 4))
bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', export_yup=True, export_apply=False,
                          export_cameras=False, export_lights=False, export_image_format='AUTO')
print('EXPORT done', os.path.getsize(out_path))
