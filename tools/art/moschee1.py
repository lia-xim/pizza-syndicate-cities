# Moschee im osmanischen Stil (wie die Muhammad-Ali-Moschee): Gebetshalle aus hellem Kalkstein mit Bogenfenstern,
# große Zentralkuppel auf Tambour, vier Eckkuppeln, zwei schlanke Bleistift-Minarette mit Balkonen.
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from kit import mat, cyl, box, dome, palme

def build(bpy):
    stein = mat(bpy, 'Kalkstein', (0.88, 0.8, 0.64), noise=0.07)
    sockel = mat(bpy, 'Sockel', (0.7, 0.6, 0.46), noise=0.1)
    blei = mat(bpy, 'Blei', (0.5, 0.56, 0.62), rough=0.45, noise=0.05)
    gold = mat(bpy, 'Gold', (0.95, 0.75, 0.2), rough=0.3)
    dunkel = mat(bpy, 'Fenster', (0.12, 0.1, 0.14))
    pflaster = mat(bpy, 'Pflaster', (0.8, 0.72, 0.58), noise=0.12)
    gruen = mat(bpy, 'Palmblatt', (0.12, 0.45, 0.12)); holz = mat(bpy, 'Stamm', (0.45, 0.32, 0.18))

    box(bpy, -0.98, -0.98, 0, 0.98, 0.98, 0.04, pflaster)
    box(bpy, -0.82, -0.82, 0.04, 0.82, 0.82, 0.12, sockel)
    box(bpy, -0.75, -0.75, 0.12, 0.75, 0.75, 1.05, stein)
    box(bpy, -0.78, -0.78, 1.05, 0.78, 0.78, 1.12, sockel)            # Gesims
    # Bogenfenster an den sichtbaren Seiten (+x und -y): Rechteck mit halbrundem Abschluss
    for t in (-0.45, 0.0, 0.45):
        for (fx, fy, rx, ry) in ((0.75, t, 0.02, 0.1), (t, -0.75, 0.1, 0.02)):
            box(bpy, fx - rx, fy - ry, 0.35, fx + rx, fy + ry, 0.75, dunkel)
            bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.1, depth=0.05, location=(fx, fy, 0.75),
                                                rotation=(math.radians(90), 0, math.radians(90) if rx < ry else 0))
            bpy.context.active_object.data.materials.append(dunkel)
    # Eingangsportal an der vorderen Ecke
    box(bpy, 0.5, -0.78, 0.12, 0.72, -0.74, 0.9, dunkel)
    # Tambour und Zentralkuppel, Eckkuppeln
    cyl(bpy, 0.5, 0.5, 1.12, 1.42, stein, 32)
    for k in range(12):
        a = 2 * math.pi * k / 12
        box(bpy, math.cos(a) * 0.5 - 0.03, math.sin(a) * 0.5 - 0.03, 1.2, math.cos(a) * 0.5 + 0.03, math.sin(a) * 0.5 + 0.03, 1.36, dunkel)
    dome(bpy, 0.52, 1.42, blei, hoehe=1.05)
    cyl(bpy, 0.03, 0.02, 1.95, 2.25, gold, 8); dome(bpy, 0.05, 2.25, gold)
    for (x, y) in ((0.5, 0.5), (-0.5, 0.5), (0.5, -0.5), (-0.5, -0.5)):
        cyl(bpy, 0.2, 0.2, 1.12, 1.22, stein, 16, x, y); dome(bpy, 0.2, 1.22, blei, x=x, y=y)
    # Zwei Bleistift-Minarette an der linken und rechten Ecke
    for (x, y) in ((-0.86, -0.86), (0.86, 0.86)):
        cyl(bpy, 0.1, 0.1, 0.04, 0.3, sockel, 12, x, y)
        cyl(bpy, 0.075, 0.065, 0.3, 3.75, stein, 12, x, y)
        for z in (2.2, 3.05):
            cyl(bpy, 0.13, 0.13, z, z + 0.05, sockel, 16, x, y)
        cyl(bpy, 0.075, 0.0, 3.75, 4.35, blei, 12, x, y)
        cyl(bpy, 0.012, 0.012, 4.3, 4.5, gold, 6, x, y)
    palme(bpy, 0.85, -0.2, 0.7, holz, gruen)
