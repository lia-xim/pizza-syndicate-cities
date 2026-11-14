# Kairoer Fernsehturm (Cairo Tower, 187 m, 1961) auf der Nilinsel Gezira: runder Schaft mit dem typischen
# Rautengitter (Lotusmuster) in Sandstein, oben ein sich öffnender Lotuskelch mit Aussichtsdeck und Restaurant,
# darüber Laterne und Antenne. Vorplatz mit Palmen. Maßstab wie der Rheinturm, aber kleiner (gut 8 Einheiten).
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from kit import mat, cyl, box, palme

def build(bpy):
    sand = (0.82, 0.62, 0.42)
    gitter = mat(bpy, 'Gitter', sand, gitter=((0.42, 0.28, 0.17), 18, 34))
    stein = mat(bpy, 'Stein', sand, noise=0.08)
    stein_hell = mat(bpy, 'SteinHell', (0.9, 0.8, 0.64), noise=0.06)
    glas = mat(bpy, 'Glas', (0.08, 0.14, 0.22), rough=0.3)
    pflaster = mat(bpy, 'Pflaster', (0.78, 0.7, 0.55), noise=0.15)
    gruen = mat(bpy, 'Palmblatt', (0.12, 0.45, 0.12))
    holz = mat(bpy, 'Stamm', (0.45, 0.32, 0.18))
    rot = mat(bpy, 'Rot', (0.85, 0.1, 0.06)); weiss = mat(bpy, 'Weiss', (0.94, 0.94, 0.92))

    box(bpy, -0.98, -0.98, 0, 0.98, 0.98, 0.04, pflaster)
    # Sockel: runder Eingangsbau
    cyl(bpy, 0.62, 0.58, 0.04, 0.32, stein_hell, 24)
    cyl(bpy, 0.56, 0.56, 0.1, 0.28, glas, 24)
    # Schaft mit Rautengitter, leicht verjüngt
    cyl(bpy, 0.4, 0.34, 0.32, 6.0, gitter, 40)
    # Lotuskelch: Blütenblätter, die sich nach oben öffnen
    cyl(bpy, 0.34, 0.5, 6.0, 6.45, stein, 40)
    for k in range(16):
        a = 2 * math.pi * k / 16
        bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.active_object
        o.scale = (0.05, 0.14, 0.62); o.location = (math.cos(a) * 0.48, math.sin(a) * 0.48, 6.3)
        o.rotation_euler = (0, math.radians(-22), a); o.data.materials.append(stein_hell)
    # Aussichtsdeck und Restaurant
    cyl(bpy, 0.58, 0.58, 6.45, 6.72, glas, 40)
    cyl(bpy, 0.66, 0.64, 6.72, 6.8, stein_hell, 40)
    cyl(bpy, 0.5, 0.5, 6.8, 7.02, glas, 40)
    cyl(bpy, 0.56, 0.4, 7.02, 7.15, stein_hell, 40)
    # Laterne und Antenne
    cyl(bpy, 0.2, 0.17, 7.15, 7.6, stein, 20)
    cyl(bpy, 0.07, 0.05, 7.6, 8.5, weiss, 12)
    z = 8.5
    for k in range(3):
        cyl(bpy, 0.05, 0.04, z, z + 0.14, rot if k % 2 == 0 else weiss, 12); z += 0.14
    # Palmen auf dem Vorplatz
    for (x, y) in ((0.75, -0.7), (-0.7, -0.75), (0.7, 0.72)):
        palme(bpy, x, y, 0.75, holz, gruen)
