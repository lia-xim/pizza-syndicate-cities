# Torre dos Clérigos (Porto, 1763): barocker Glockenturm aus hellem Granit, quadratischer Schaft mit Gesimsen und
# Pilastern, oben Glockenstube mit Rundbögen, Laterne mit Kuppel und Kreuz. Davor die Kirche mit Giebel.
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from kit import mat, cyl, box, dome

def build(bpy):
    granit = mat(bpy, 'Granit', (0.66, 0.62, 0.54), noise=0.12)
    dunkel = mat(bpy, 'Granitdunkel', (0.42, 0.39, 0.34), noise=0.1)
    fenster = mat(bpy, 'Fenster', (0.1, 0.1, 0.14))
    dach = mat(bpy, 'Dach', (0.66, 0.28, 0.16), noise=0.15)
    pflaster = mat(bpy, 'Pflaster', (0.6, 0.58, 0.55), noise=0.15)
    gold = mat(bpy, 'Gold', (0.9, 0.72, 0.25), rough=0.3)

    box(bpy, -0.98, -0.98, 0, 0.98, 0.98, 0.04, pflaster)
    # Kirchenschiff (hinten links) mit Satteldach
    box(bpy, -0.9, -0.2, 0.04, 0.1, 0.9, 1.2, granit)
    box(bpy, -0.92, -0.22, 1.2, 0.12, 0.92, 1.27, dunkel)
    import bmesh
    me = bpy.data.meshes.new('dach'); bm = bmesh.new()
    v = [bm.verts.new(p) for p in [(-0.92, -0.22, 1.27), (0.12, -0.22, 1.27), (0.12, 0.92, 1.27), (-0.92, 0.92, 1.27), (-0.92, 0.35, 1.75), (0.12, 0.35, 1.75)]]
    for f in [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]: bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('dach', me); bpy.context.scene.collection.objects.link(o); o.data.materials.append(dach)
    # Turm: vorn rechts, quadratisch, sich nach oben leicht verjüngend in Absätzen
    tx, ty = 0.45, -0.45
    stufen = [(0.42, 0.04, 1.4), (0.38, 1.4, 3.0), (0.34, 3.0, 4.3), (0.3, 4.3, 5.2)]
    for (h, z0, z1) in stufen:
        box(bpy, tx - h, ty - h, z0, tx + h, ty + h, z1, granit)
        box(bpy, tx - h - 0.04, ty - h - 0.04, z1 - 0.06, tx + h + 0.04, ty + h + 0.04, z1, dunkel)
        for s in (-1, 1):   # Pilaster an den Ecken
            box(bpy, tx + h - 0.06, ty + s * (h - 0.06) - 0.04, z0, tx + h + 0.02, ty + s * (h - 0.06) + 0.04, z1, dunkel)
            box(bpy, tx + s * (h - 0.06) - 0.04, ty - h - 0.02, z0, tx + s * (h - 0.06) + 0.04, ty - h + 0.06, z1, dunkel)
        # Fenster an den sichtbaren Seiten
        zm = (z0 + z1) / 2
        box(bpy, tx + h, ty - 0.06, zm - 0.2, tx + h + 0.01, ty + 0.06, zm + 0.2, fenster)
        box(bpy, tx - 0.06, ty - h - 0.01, zm - 0.2, tx + 0.06, ty - h, zm + 0.2, fenster)
    # Glockenstube mit großen Rundbögen
    h = 0.3; z0, z1 = 5.2, 5.9
    box(bpy, tx - h, ty - h, z0, tx + h, ty + h, z1, granit)
    box(bpy, tx + h, ty - 0.12, z0 + 0.1, tx + h + 0.01, ty + 0.12, z1 - 0.15, fenster)
    box(bpy, tx - 0.12, ty - h - 0.01, z0 + 0.1, tx + 0.12, ty - h, z1 - 0.15, fenster)
    for (sx, sy) in ((1, 1), (1, -1), (-1, 1), (-1, -1)):   # Eckvasen
        cyl(bpy, 0.05, 0.02, z1, z1 + 0.25, dunkel, 8, tx + sx * (h - 0.02), ty + sy * (h - 0.02))
    # Laterne und Kuppel mit Kreuz
    cyl(bpy, 0.22, 0.2, z1, z1 + 0.45, granit, 8, tx, ty, smooth=False)
    dome(bpy, 0.21, z1 + 0.45, dunkel, hoehe=1.4, x=tx, y=ty)
    cyl(bpy, 0.06, 0.03, z1 + 0.74, z1 + 0.95, granit, 8, tx, ty)
    box(bpy, tx - 0.012, ty - 0.012, z1 + 0.95, tx + 0.012, ty + 0.012, z1 + 1.25, gold)
    box(bpy, tx - 0.08, ty - 0.012, z1 + 1.12, tx + 0.08, ty + 0.012, z1 + 1.16, gold)
