# Infobild eines Wahrzeichens (136 x 143 Pixel wie die Originale): das Modell im Spielwinkel vor Himmelsverlauf,
# auf die Bildhöhe eingepasst.   blender -b -P info.py -- <modell.py> <ausgabe.rgba>
import bpy, sys, math, struct, importlib.util
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
model_path, out_path = argv[0], argv[1]
W, H = 136, 143
ELEV = math.radians(30)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'; scene.cycles.samples = 64; scene.cycles.use_denoising = False
scene.render.film_transparent = True; scene.render.filter_size = 1.0
scene.render.resolution_x = W; scene.render.resolution_y = H; scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new('Welt'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.62, 0.64, 0.68, 1); bg.inputs[1].default_value = 0.42
sun_data = bpy.data.lights.new('Sonne', 'SUN'); sun_data.energy = 4.2
sun = bpy.data.objects.new('Sonne', sun_data); scene.collection.objects.link(sun)
sun.rotation_mode = 'QUATERNION'; sun.rotation_quaternion = (-Vector((-1.0, -0.55, 2.2)).normalized()).to_track_quat('-Z', 'Y')

spec = importlib.util.spec_from_file_location('modell', model_path); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
mod.build(bpy)

# Kamera auf die Höhe des Modells einpassen
zmax = max((o.matrix_world @ Vector(c)).z for o in scene.objects if o.type == 'MESH' for c in o.bound_box)
cam_data = bpy.data.cameras.new('Kamera'); cam_data.type = 'ORTHO'
cam = bpy.data.objects.new('Kamera', cam_data); scene.collection.objects.link(cam); scene.camera = cam
cam.rotation_euler = (math.radians(90) - ELEV, 0, math.radians(45))
view = Vector((1, -1, 0)).normalized() * math.cos(ELEV) + Vector((0, 0, 1)) * math.sin(ELEV)
target = Vector((0, 0, zmax * 0.5 * math.cos(ELEV)))
cam_data.ortho_scale = (zmax * math.cos(ELEV) + 2.2) * 1.05
cam.location = target + view * 50; cam_data.clip_end = 200

bpy.ops.render.render(write_still=False)
img = bpy.data.images['Render Result']; tmp = out_path + '.tmp.png'; img.save_render(tmp)
im = bpy.data.images.load(tmp); px = list(im.pixels); bpy.data.images.remove(im)
with open(out_path, 'wb') as f:
    f.write(struct.pack('<II', W, H)); buf = bytearray(W * H * 4)
    for y in range(H):
        t = y / (H - 1); sky = (int(120 + 90 * t), int(160 + 70 * t), int(220 + 25 * t))   # Himmel: oben kräftig blau, unten hell
        for x in range(W):
            i = ((H - 1 - y) * W + x) * 4; o = (y * W + x) * 4; a = px[i + 3]
            c = [int(max(0, min(1, px[i + k])) * 255 + 0.5) for k in range(3)]
            buf[o:o + 4] = bytes(int(c[k] * a + sky[k] * (1 - a)) if a < 1 else c[k] for k in range(3)) + b'\xff'
    f.write(buf)
print('FERTIG', out_path)
