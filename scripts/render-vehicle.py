"""
Offline photoreal renders of a vehicle (Blender Cycles, path traced).

The car is placed in the same photographed location the web viewer uses
(public/env/dresden_square_*): the HDR lights it, and the sharp panorama is
projected onto a dome with a flat floor so the car stands on the real paving.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/render-vehicle.py -- \
      [--views threeQuarter,side] [--paints pearl-white,racing-red] [--samples 256] [--width 1800] [--out DIR]
"""
import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(ROOT, 'public/models/vehicles/porsche-911-991.glb')
HDR = os.path.join(ROOT, 'public/env/dresden_square_1k.hdr')
PANORAMA = os.path.join(ROOT, 'public/env/dresden_square_8k.jpg')

# Mirrors src/data/demoAssets.ts (porsche-911-991) and src/three/CameraController.tsx.
CAMERA_DISTANCE = 9.4
TARGET = (0, 0.58, 0)
FOV_DEG = 30
VIEWS = {  # three.js coordinates (x, y up, z); the car's nose points to +z
    'threeQuarter': (CAMERA_DISTANCE * 0.62, 1.55, CAMERA_DISTANCE * 0.74),
    'front': (0, 1.05, CAMERA_DISTANCE * 0.95),
    'rear': (0, 1.25, -CAMERA_DISTANCE * 0.95),
    'side': (CAMERA_DISTANCE * 0.98, 0.95, 0),
    'rearQuarter': (CAMERA_DISTANCE * 0.55, 2.1, -CAMERA_DISTANCE * 0.72),
    'wheel': (CAMERA_DISTANCE * 0.62, 0.65, CAMERA_DISTANCE * 0.42),
    'top': (0.001, CAMERA_DISTANCE * 1.25, 0),
}

# Mirrors PAINTS in src/data/products.ts: (colour, metallic, roughness, clear coat)
PAINTS = {
    'factory': ('#c99a0e', 0.6, 0.32, 1),
    'gloss-black': ('#060607', 0, 0.18, 1),
    'matte-black': ('#121214', 0.15, 0.62, 0),
    'pearl-white': ('#e9e7e1', 0.35, 0.3, 1),
    'metallic-silver': ('#c9cdd2', 0.85, 0.36, 1),
    'racing-red': ('#a3070f', 0, 0.3, 1),
    'midnight-blue': ('#0e1f47', 0.7, 0.34, 1),
}

PAINT_MATERIAL = 'paint'
PANORAMA_HEIGHT = 1.9   # metres the panorama was shot from
DOME_RADIUS = 90
LOCATION_ROTATION = math.radians(180)
LIGHT_STRENGTH = 0.48   # exposure of the HDR lighting


def blender_xyz(v):
    """three.js (x, y up, z) -> Blender (x, -z, z up)."""
    return Vector((v[0], -v[2], v[1]))


def srgb(hex_colour):
    h = hex_colour.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]


def principled(mat):
    nodes = mat.node_tree.nodes
    return next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)


def set_inputs(node, **values):
    for name, value in values.items():
        key = name.replace('_', ' ')
        if key in node.inputs:
            socket = node.inputs[key]
            for link in list(socket.links):
                node.id_data.links.remove(link)
            socket.default_value = value


def make_glass(mat, tint, roughness=0.0, base_reflect=0.06):
    """
    Single-surface car glass: see-through tint mixed with a mirror reflection by a Schlick
    Fresnel term. The term uses |N.I| so it is the same from either side of the surface;
    Blender's Fresnel node goes fully mirror-like on back faces, which rendered windows black.
    """
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    mix = tree.nodes.new('ShaderNodeMixShader')
    geo = tree.nodes.new('ShaderNodeNewGeometry')
    dot = tree.nodes.new('ShaderNodeVectorMath')
    dot.operation = 'DOT_PRODUCT'
    absolute = tree.nodes.new('ShaderNodeMath')
    absolute.operation = 'ABSOLUTE'
    grazing = tree.nodes.new('ShaderNodeMath')   # 1 - |cos|
    grazing.operation = 'SUBTRACT'
    grazing.inputs[0].default_value = 1.0
    power = tree.nodes.new('ShaderNodeMath')
    power.operation = 'POWER'
    power.inputs[1].default_value = 5.0
    schlick = tree.nodes.new('ShaderNodeMath')   # base + (1 - base) * grazing^5
    schlick.operation = 'MULTIPLY_ADD'
    schlick.inputs[1].default_value = 1.0 - base_reflect
    schlick.inputs[2].default_value = base_reflect
    clear = tree.nodes.new('ShaderNodeBsdfTransparent')
    clear.inputs['Color'].default_value = srgb(tint)
    gloss = tree.nodes.new('ShaderNodeBsdfGlossy')
    gloss.inputs['Roughness'].default_value = roughness
    tree.links.new(geo.outputs['Normal'], dot.inputs[0])
    tree.links.new(geo.outputs['Incoming'], dot.inputs[1])
    tree.links.new(dot.outputs['Value'], absolute.inputs[0])
    tree.links.new(absolute.outputs['Value'], grazing.inputs[1])
    tree.links.new(grazing.outputs['Value'], power.inputs[0])
    tree.links.new(power.outputs['Value'], schlick.inputs[0])
    tree.links.new(schlick.outputs['Value'], mix.inputs['Fac'])
    tree.links.new(clear.outputs['BSDF'], mix.inputs[1])
    tree.links.new(gloss.outputs['BSDF'], mix.inputs[2])
    tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])


def apply_surfaces():
    """The same per-material presets the web viewer applies (`surfaces` in demoAssets.ts)."""
    for mat in bpy.data.materials:
        p = principled(mat)
        if mat.name == 'window':
            make_glass(mat, '#9aa4a8', base_reflect=0.1)   # lightly tinted side and screen glass
        elif mat.name == 'glass':
            make_glass(mat, '#ffffff', 0.02)
        elif p is None:
            continue
        elif mat.name == 'license':
            # Blank show plate: the source model has a real registration baked into its texture.
            set_inputs(p, Base_Color=srgb('#f1f1ee'), Metallic=0.0, Roughness=0.35)
        elif mat.name == 'lights':
            set_inputs(p, Base_Color=srgb('#ffffff'), Metallic=1.0, Roughness=0.06)
        elif mat.name == 'silver':
            set_inputs(p, Base_Color=srgb('#c3c6cb'), Metallic=1.0, Roughness=0.22)
        elif mat.name == 'rubber':
            set_inputs(p, Base_Color=srgb('#0c0c0d'), Metallic=0.0, Roughness=0.85)
        elif mat.name == 'full_black':
            set_inputs(p, Base_Color=srgb('#0b0b0c'), Metallic=0.0, Roughness=0.6)
        elif mat.name == 'plastic':
            set_inputs(p, Base_Color=srgb('#111214'), Metallic=0.0, Roughness=0.5)
        elif mat.name == 'Material.001':
            set_inputs(p, Base_Color=srgb('#e0601a'), Metallic=0.0, Roughness=0.4, Coat_Weight=1.0)


def apply_paint(paint_id):
    colour, metallic, roughness, coat = PAINTS[paint_id]
    p = principled(bpy.data.materials[PAINT_MATERIAL])
    set_inputs(p, Base_Color=srgb(colour), Metallic=float(metallic), Roughness=float(roughness),
               Coat_Weight=float(coat), Coat_Roughness=0.015, Coat_IOR=1.6)


def build_location():
    # World: the HDR lights the car (diffuse light and soft reflections).
    world = bpy.data.worlds.new('Location')
    bpy.context.scene.world = world
    world.use_nodes = True
    tree = world.node_tree
    tree.nodes.clear()
    coord = tree.nodes.new('ShaderNodeTexCoord')
    mapping = tree.nodes.new('ShaderNodeMapping')
    mapping.inputs['Rotation'].default_value = (0, 0, LOCATION_ROTATION)
    env = tree.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(HDR)
    bg = tree.nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = LIGHT_STRENGTH
    out = tree.nodes.new('ShaderNodeOutputWorld')
    tree.links.new(coord.outputs['Generated'], mapping.inputs['Vector'])
    tree.links.new(mapping.outputs['Vector'], env.inputs['Vector'])
    tree.links.new(env.outputs['Color'], bg.inputs['Color'])
    tree.links.new(bg.outputs['Background'], out.inputs['Surface'])

    # Dome + floor showing the sharp panorama, projected from where it was photographed.
    mesh = bpy.data.meshes.new('LocationDome')
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=DOME_RADIUS)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.01], context='VERTS')
    bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=DOME_RADIUS)
    bm.to_mesh(mesh)
    bm.free()
    dome = bpy.data.objects.new('LocationDome', mesh)
    bpy.context.scene.collection.objects.link(dome)
    # Seen by the camera and in reflections; diffuse light comes from the HDR instead.
    dome.visible_diffuse = False
    dome.visible_shadow = False
    dome.visible_transmission = True

    mat = bpy.data.materials.new('LocationPanorama')
    mat.use_nodes = True
    t = mat.node_tree
    t.nodes.clear()
    geo = t.nodes.new('ShaderNodeNewGeometry')
    sub = t.nodes.new('ShaderNodeVectorMath')
    sub.operation = 'SUBTRACT'
    sub.inputs[1].default_value = (0, 0, PANORAMA_HEIGHT)
    rot = t.nodes.new('ShaderNodeVectorRotate')
    rot.rotation_type = 'Z_AXIS'
    rot.inputs['Angle'].default_value = -LOCATION_ROTATION
    pano = t.nodes.new('ShaderNodeTexEnvironment')
    pano.image = bpy.data.images.load(PANORAMA)
    # Contact shadow: the photo already contains its own lighting, so the car's
    # shadow is added as ambient occlusion (right for an overcast sky).
    ao = t.nodes.new('ShaderNodeAmbientOcclusion')
    ao.samples = 32
    ao.inputs['Distance'].default_value = 2.4
    power = t.nodes.new('ShaderNodeMath')
    power.operation = 'POWER'
    power.inputs[1].default_value = 3.4
    shade = t.nodes.new('ShaderNodeVectorMath')
    shade.operation = 'SCALE'
    emit = t.nodes.new('ShaderNodeEmission')
    out = t.nodes.new('ShaderNodeOutputMaterial')
    t.links.new(geo.outputs['Position'], sub.inputs[0])
    t.links.new(sub.outputs['Vector'], rot.inputs['Vector'])
    t.links.new(rot.outputs['Vector'], pano.inputs['Vector'])
    t.links.new(ao.outputs['AO'], power.inputs[0])
    t.links.new(pano.outputs['Color'], shade.inputs[0])
    t.links.new(power.outputs['Value'], shade.inputs['Scale'])
    t.links.new(shade.outputs['Vector'], emit.inputs['Color'])
    t.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    mesh.materials.append(mat)


def setup_render(width, samples):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = 'GPU'
    except Exception as e:  # falls back to CPU
        print('GPU unavailable:', e)
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.02
    scene.cycles.max_bounces = 8
    scene.render.resolution_x = width
    scene.render.resolution_y = round(width / 1.5)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 86
    # Standard keeps the photographed backdrop's colours as shot.
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--views', default='threeQuarter,side,rearQuarter')
    ap.add_argument('--paints', default='pearl-white,racing-red')
    ap.add_argument('--samples', type=int, default=256)
    ap.add_argument('--width', type=int, default=1800)
    ap.add_argument('--out', default=os.path.join(ROOT, 'public/renders/porsche-911'))
    args = ap.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=MODEL)
    print('materials:', sorted(m.name for m in bpy.data.materials))
    apply_surfaces()
    build_location()
    setup_render(args.width, args.samples)

    cam_data = bpy.data.cameras.new('Camera')
    cam_data.sensor_fit = 'VERTICAL'
    cam_data.angle_y = math.radians(FOV_DEG)
    cam_data.clip_end = 500
    cam = bpy.data.objects.new('Camera', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    target = blender_xyz(TARGET)

    os.makedirs(args.out, exist_ok=True)
    for paint in args.paints.split(','):
        apply_paint(paint)
        for view in args.views.split(','):
            cam.location = blender_xyz(VIEWS[view])
            cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
            bpy.context.scene.render.filepath = os.path.join(args.out, f'{paint}-{view}.jpg')
            bpy.ops.render.render(write_still=True)
            print('rendered', bpy.context.scene.render.filepath)


main()
