# Moschee im mamlukischen Stil der Kairoer Altstadt: Mauern mit rot-weißen Steinstreifen (Ablaq), hohes Portal,
# gerippte Steinkuppel auf hohem Tambour, ein Stufenminarett (quadratisch, achteckig, rund) mit Zwiebelhelm.
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from kit import mat, cyl, box, dome

def build(bpy):
    hell = mat(bpy, 'SteinHell', (0.9, 0.82, 0.66), noise=0.06)
    rot = mat(bpy, 'SteinRot', (0.66, 0.3, 0.2), noise=0.08)
    sockel = mat(bpy, 'Sockel', (0.66, 0.56, 0.42), noise=0.1)
    kuppel = mat(bpy, 'Kuppel', (0.84, 0.74, 0.56), noise=0.08)
    dunkel = mat(bpy, 'Fenster', (0.12, 0.1, 0.14))
    gold = mat(bpy, 'Gold', (0.95, 0.75, 0.2), rough=0.3)
    pflaster = mat(bpy, 'Pflaster', (0.78, 0.7, 0.56), noise=0.12)

    box(bpy, -0.98, -0.98, 0, 0.98, 0.98, 0.04, pflaster)
    # Mauern mit Streifen
    z = 0.04; k = 0
    while z < 1.25:
        h = 0.09
        box(bpy, -0.8, -0.8, z, 0.75, 0.8, min(z + h, 1.25), rot if k % 2 else hell); z += h; k += 1
    box(bpy, -0.79, -0.79, 1.24, 0.74, 0.79, 1.26, hell)    # Flachdach
    # Zinnenkranz
    for i in range(9):
        t = -0.75 + i * 0.19
        box(bpy, 0.73, t - 0.05, 1.25, 0.77, t + 0.05, 1.37, hell)
        box(bpy, t - 0.05, -0.82, 1.25, t + 0.05, -0.78, 1.37, hell)
    # Hohes Portal mit Spitzbogennische (Langseite -y) und Fensterreihen
    box(bpy, -0.2, -0.86, 0.04, 0.2, -0.78, 1.45, hell)
    box(bpy, -0.12, -0.87, 0.1, 0.12, -0.84, 1.1, dunkel)
    for t in (-0.55, 0.45):
        box(bpy, t - 0.07, -0.83, 0.55, t + 0.07, -0.8, 0.95, dunkel)
    for t in (-0.45, 0.0, 0.45):
        box(bpy, 0.75, t - 0.07, 0.55, 0.78, t + 0.07, 0.95, dunkel)
    # Gerippte Kuppel auf hohem Tambour (hinten, damit das Minarett vorn frei steht)
    cx, cy = -0.15, 0.2
    cyl(bpy, 0.42, 0.42, 1.25, 1.7, hell, 24, cx, cy)
    for i in range(12):
        a = 2 * math.pi * i / 12
        box(bpy, cx + math.cos(a) * 0.42 - 0.03, cy + math.sin(a) * 0.42 - 0.03, 1.38, cx + math.cos(a) * 0.42 + 0.03, cy + math.sin(a) * 0.42 + 0.03, 1.6, dunkel)
    dome(bpy, 0.42, 1.7, kuppel, hoehe=1.35, x=cx, y=cy)
    for i in range(16):   # Rippen
        a = 2 * math.pi * i / 16
        bpy.ops.mesh.primitive_torus_add(major_radius=0.42, minor_radius=0.012, location=(cx, cy, 1.7), rotation=(math.radians(90), 0, a))
        o = bpy.context.active_object; o.scale.z = 1.35; o.data.materials.append(sockel)
        import bmesh
        bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 0], context='VERTS'); bm.to_mesh(o.data); bm.free()
    cyl(bpy, 0.02, 0.015, 2.25, 2.45, gold, 8, cx, cy)
    # Stufenminarett an der rechten Ecke: quadratisch, achteckig, rund, Zwiebelhelm
    mx, my = 0.6, 0.62
    box(bpy, mx - 0.16, my - 0.16, 1.25, mx + 0.16, my + 0.16, 2.1, hell)
    box(bpy, mx - 0.19, my - 0.19, 2.1, mx + 0.19, my + 0.19, 2.16, sockel)
    cyl(bpy, 0.14, 0.13, 2.16, 2.9, rot, 8, mx, my, smooth=False)
    cyl(bpy, 0.18, 0.18, 2.9, 2.95, sockel, 16, mx, my)
    cyl(bpy, 0.1, 0.09, 2.95, 3.45, hell, 16, mx, my)
    cyl(bpy, 0.14, 0.14, 3.45, 3.5, sockel, 16, mx, my)
    for i in range(6):
        a = 2 * math.pi * i / 6
        cyl(bpy, 0.012, 0.012, 3.5, 3.72, sockel, 6, mx + math.cos(a) * 0.08, my + math.sin(a) * 0.08)
    dome(bpy, 0.11, 3.72, kuppel, hoehe=1.6, x=mx, y=my)
    cyl(bpy, 0.012, 0.01, 3.9, 4.05, gold, 6, mx, my)
