# Oriental Pearl Tower (Shanghai, 468 m): drei schräge Stützen und drei senkrechte Säulen tragen die große rosa Kugel,
# darüber drei Säulen zur kleineren oberen Kugel, ganz oben die kleine Kugel und die Antenne. Kleinere Perlen an den Säulen.
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from kit import mat, cyl, box

def kugel(bpy, r, z, m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=r, location=(0, 0, z))
    o = bpy.context.active_object; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o

def stab(bpy, a, b, r, m):
    # Zylinder von Punkt a nach Punkt b
    from mathutils import Vector
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.active_object; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o

def build(bpy):
    beton = mat(bpy, 'Beton', (0.78, 0.76, 0.74), noise=0.05)
    rosa = mat(bpy, 'Perle', (0.86, 0.22, 0.45), rough=0.25, noise=0.06)
    glas = mat(bpy, 'Glas', (0.25, 0.3, 0.42), rough=0.2)
    pflaster = mat(bpy, 'Pflaster', (0.62, 0.6, 0.58), noise=0.12)
    rot = mat(bpy, 'Rot', (0.85, 0.1, 0.06)); weiss = mat(bpy, 'Weiss', (0.94, 0.94, 0.92))

    box(bpy, -0.98, -0.98, 0, 0.98, 0.98, 0.04, pflaster)
    # drei schräge Stützen und drei Säulen bis zur großen Kugel
    for k in range(3):
        ang = math.radians(90 + 120 * k)
        stab(bpy, (math.cos(ang) * 0.85, math.sin(ang) * 0.85, 0.04), (math.cos(ang) * 0.2, math.sin(ang) * 0.2, 2.4), 0.08, beton)
        cx, cy = math.cos(ang + math.pi / 3) * 0.32, math.sin(ang + math.pi / 3) * 0.32
        cyl(bpy, 0.11, 0.11, 0.04, 9.0, beton, 16, cx, cy)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.18, location=(cx * 1.2, cy * 1.2, 5.3))
        bpy.context.active_object.data.materials.append(rosa); bpy.ops.object.shade_smooth()
    # große Kugel mit Fensterband
    kugel(bpy, 0.95, 3.1, rosa)
    cyl(bpy, 0.97, 0.97, 3.0, 3.22, glas, 40)
    # obere Kugel
    kugel(bpy, 0.6, 7.6, rosa)
    cyl(bpy, 0.62, 0.62, 7.5, 7.66, glas, 32)
    # Spitze: Schaft, kleine Kugel, Antenne
    cyl(bpy, 0.16, 0.12, 8.2, 9.6, beton, 16)
    kugel(bpy, 0.24, 9.7, rosa)
    cyl(bpy, 0.06, 0.03, 9.9, 11.0, weiss, 10)
    cyl(bpy, 0.03, 0.01, 11.0, 11.4, rot, 8)
    # Eingangshalle
    cyl(bpy, 0.45, 0.45, 0.04, 0.32, glas, 24)
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.name != 'Boden':
            o.scale.z *= 0.93; o.location.z *= 0.93
