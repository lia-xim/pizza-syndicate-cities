# Rendert ein Modell im Blickwinkel von Pizza Syndicate (Blender, im Hintergrund):
#   blender -b -P render.py -- <modell.py> <ausgabe.rgba> <höhe_px> [anker_y]
# Geometrie des Spiels: Rautenraster mit Feldern von 64 x 32 Pixeln (Zweipunkt-Dimetrie 2:1), also Kamera
# orthografisch, 30° über dem Horizont, 45° gedreht. 1 Blender-Einheit = 1 Feldkante.
# Die Grundfläche (Feld 2x2 um den Ursprung, x/y von -1 bis 1) landet wie bei den Originalen mit ihrer unteren
# Spitze auf Pixel (128, Höhe) der Leinwand; die Leinwand ist 256 Pixel breit.
# Ausgabe: 8 Byte Kopf (u32 Breite, u32 Höhe) und RGBA-Bytes, Zeile 0 oben. Schatten kommen als eigener Kanal:
# Pixel mit Alpha 0 und Rot 255 sind Schatten auf dem Boden (Schattenfänger).
import bpy, sys, math, struct, importlib.util
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
model_path, out_path, H = argv[0], argv[1], int(argv[2])
# Pixelzeile der Mitte der 2x2-Grundfläche: Wahrzeichen wie Big Ben H-32, normale Gebäude H-64 (davor liegt das Türfeld)
ANCHOR_Y = int(argv[3]) if len(argv) > 3 else H - 32
W = 256
PX = 64 / math.sqrt(2)            # Pixel je Blender-Einheit quer
ELEV = math.radians(30)

# Leere Szene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 64
scene.cycles.use_denoising = False
scene.render.film_transparent = True
scene.render.filter_size = 0.01   # harte Kanten wie im Original
scene.render.resolution_x = W
scene.render.resolution_y = H
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'

# Welt: gleichmäßiges Umgebungslicht
world = bpy.data.worlds.new('Welt'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.62, 0.64, 0.68, 1); bg.inputs[1].default_value = 0.36

# Kamera: Blick von vorn rechts unten auf den Ursprung. Bildschirm-rechts = +x+y (p+q), Bildschirm-unten = +x-y (p-q)
cam_data = bpy.data.cameras.new('Kamera'); cam_data.type = 'ORTHO'; cam_data.ortho_scale = max(W, H) / PX
cam = bpy.data.objects.new('Kamera', cam_data); scene.collection.objects.link(cam); scene.camera = cam
view = Vector((1, -1, 0)).normalized() * math.cos(ELEV) + Vector((0, 0, 1)) * math.sin(ELEV)   # vom Ziel zur Kamera
cam.rotation_mode = 'XYZ'
cam.rotation_euler = (math.radians(90) - ELEV, 0, math.radians(45))
# Ursprung soll bei Pixel (128, ANCHOR_Y) liegen (Mitte der 2x2-Raute): Kamera im Bild nach oben schieben
up = cam.rotation_euler.to_matrix() @ Vector((0, 1, 0))
shift = (ANCHOR_Y - H / 2) / PX
cam.location = view * 50 + up * shift
cam_data.clip_end = 200

# Sonne von links vorn oben (linke Flächen hell, rechte etwas dunkler), Schatten fallen nach rechts hinten
sun_data = bpy.data.lights.new('Sonne', 'SUN'); sun_data.energy = 4.8; sun_data.angle = math.radians(3)
sun = bpy.data.objects.new('Sonne', sun_data); scene.collection.objects.link(sun)
# Licht fällt aus Richtung links (-x-y), etwas von vorn (+x-y) und von oben
sun.rotation_mode = 'QUATERNION'; sun.rotation_quaternion = (-Vector((-1.0, -0.55, 2.2)).normalized()).to_track_quat('-Z', 'Y')

# Schattenfänger-Boden
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
ground = bpy.context.active_object; ground.is_shadow_catcher = True; ground.name = 'Boden'

# Modell laden
spec = importlib.util.spec_from_file_location('modell', model_path); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
mod.build(bpy)

# Zwei Durchgänge: Bild mit Schatten (Schattenfänger) und Bild ohne Boden, um Schatten von Objekt zu trennen
def render():
    bpy.ops.render.render(write_still=False)
    img = bpy.data.images['Render Result']
    tmp = out_path + '.tmp.png'; img.save_render(tmp)
    im = bpy.data.images.load(tmp); px = list(im.pixels); bpy.data.images.remove(im)
    return px
full = render()
ground.hide_render = True
obj = render()
with open(out_path, 'wb') as f:
    f.write(struct.pack('<II', W, H))
    buf = bytearray(W * H * 4)
    for y in range(H):
        src = (H - 1 - y) * W * 4      # Blender: Zeile 0 unten
        for x in range(W):
            i = src + x * 4; o = (y * W + x) * 4
            a = obj[i + 3]
            if a >= 0.5:
                buf[o:o + 4] = bytes(int(max(0, min(1, obj[i + k] / max(a, 1e-6))) * 255 + 0.5) for k in range(3)) + b'\xff'
            elif full[i + 3] > 0.25:
                buf[o:o + 4] = b'\xff\x00\x00\x00'   # Schatten
            else:
                buf[o:o + 4] = b'\x00\x00\x00\x00'
    f.write(buf)
print('FERTIG', out_path)
