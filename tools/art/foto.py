# Stadtfoto (200 x 200, JPEG) aus Fußgängersicht: ein oder mehrere Modelle nebeneinander, Perspektive von unten,
# Himmel mit Verlauf, Boden als Platz.
#   blender -b -P foto.py -- <ausgabe.jpg> <modell.py>:<x>:<y> [...] -- <kamera_x> <kamera_y> <kamera_z> <ziel_z> <brennweite>
import bpy, sys, math, importlib.util
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
cut = args.index('--')
out = args[0]; models = args[1:cut]; cx, cy, cz, tz, lens = map(float, args[cut + 1:cut + 6])

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'; scene.cycles.samples = 96; scene.cycles.use_denoising = False
scene.render.resolution_x = 200; scene.render.resolution_y = 200; scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'JPEG'; scene.render.image_settings.quality = 88

# Himmel: Verlauf von kräftigem Blau oben zu hellem Dunst am Horizont
world = bpy.data.worlds.new('Himmel'); scene.world = world; world.use_nodes = True
nt = world.node_tree; bg = nt.nodes['Background']
tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); ramp = nt.nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (0.75, 0.82, 0.92, 1)
ramp.color_ramp.elements[1].position = 0.6; ramp.color_ramp.elements[1].color = (0.18, 0.38, 0.78, 1)
nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
bg.inputs['Strength'].default_value = 0.9

sun_data = bpy.data.lights.new('Sonne', 'SUN'); sun_data.energy = 4.0; sun_data.angle = math.radians(2)
sun = bpy.data.objects.new('Sonne', sun_data); scene.collection.objects.link(sun)
sun.rotation_mode = 'QUATERNION'; sun.rotation_quaternion = (-Vector((-1.0, -0.55, 1.6)).normalized()).to_track_quat('-Z', 'Y')

# Boden
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -0.005)); g = bpy.context.active_object
m = bpy.data.materials.new('Boden'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.55, 0.5, 0.42, 1); g.data.materials.append(m)

for spec_ in models:
    path, ox, oy = spec_.rsplit(':', 2)
    before = set(scene.objects)
    spec = importlib.util.spec_from_file_location('m' + str(len(before)), path); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    mod.build(bpy)
    for o in set(scene.objects) - before:
        if o.parent is None: o.location.x += float(ox); o.location.y += float(oy)

cam_data = bpy.data.cameras.new('Kamera'); cam_data.lens = lens; cam_data.clip_end = 300
cam = bpy.data.objects.new('Kamera', cam_data); scene.collection.objects.link(cam); scene.camera = cam
cam.location = (cx, cy, cz)
cam.rotation_mode = 'QUATERNION'; cam.rotation_quaternion = (Vector((0, 0, tz)) - cam.location).to_track_quat('-Z', 'Y')
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print('FERTIG', out)
