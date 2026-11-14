# Art-déco-Hotel am Ocean Drive (Miami Beach): pastellfarbener Bau mit gerundeter Ecke, Fensterbändern mit
# Sonnenblenden ("eyebrows"), gestufter Turm-Aufsatz mit senkrechter Neonschrift, Terrasse mit Sonnenschirmen und Palmen.
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from kit import mat, cyl, box, palme

def build(bpy):
    weiss = mat(bpy, 'Putz', (0.96, 0.94, 0.88), noise=0.03)
    rosa = mat(bpy, 'Rosa', (0.96, 0.62, 0.66), noise=0.03)
    tuerkis = mat(bpy, 'Tuerkis', (0.3, 0.8, 0.76))
    glas = mat(bpy, 'Glas', (0.16, 0.3, 0.38), rough=0.2)
    neon = mat(bpy, 'Neon', (1.0, 0.25, 0.65), emit=3.0)
    sand = mat(bpy, 'Terrasse', (0.86, 0.8, 0.66), noise=0.1)
    gruen = mat(bpy, 'Palmblatt', (0.12, 0.5, 0.15)); holz = mat(bpy, 'Stamm', (0.5, 0.36, 0.2))

    box(bpy, -0.98, -0.98, 0, 0.98, 0.98, 0.04, sand)
    # Baukörper: drei Geschosse, vorn rechts gerundete Ecke
    box(bpy, -0.8, -0.55, 0.04, 0.45, 0.8, 1.55, weiss)
    cyl(bpy, 0.35, 0.35, 0.04, 1.55, weiss, 32, 0.45, -0.2)
    box(bpy, 0.45, -0.2, 0.04, 0.8, 0.8, 1.55, weiss)
    # Farbbänder und Sonnenblenden über den Fensterreihen
    for z in (0.45, 0.95, 1.45):
        box(bpy, -0.82, -0.57, z, 0.45, 0.82, z + 0.05, rosa)
        cyl(bpy, 0.38, 0.38, z, z + 0.05, rosa, 32, 0.45, -0.2)
        box(bpy, 0.45, -0.22, z, 0.82, 0.82, z + 0.05, rosa)
    for z in (0.15, 0.62, 1.12):
        for i in range(4):
            t = -0.7 + i * 0.3
            box(bpy, t - 0.1, -0.57, z, t + 0.1, -0.55, z + 0.24, glas)
            box(bpy, 0.8, t + 0.25, z, 0.82, t + 0.45, z + 0.24, glas)
        cyl(bpy, 0.355, 0.355, z, z + 0.24, glas, 32, 0.45, -0.2)
    # gestufter Aufsatz mit Neonschrift
    box(bpy, -0.1, -0.35, 1.55, 0.3, 0.05, 1.95, weiss)
    box(bpy, 0.0, -0.25, 1.95, 0.2, -0.05, 2.25, tuerkis)
    box(bpy, 0.05, -0.2, 2.25, 0.15, -0.1, 2.5, weiss)
    box(bpy, 0.3, -0.3, 0.6, 0.34, 0.0, 1.9, tuerkis)
    box(bpy, 0.34, -0.25, 0.7, 0.36, -0.05, 1.8, neon)                       # senkrechte Leuchtschrift
    box(bpy, -0.12, -0.57, 1.56, 0.32, -0.55, 1.6, neon)
    # Terrasse mit Sonnenschirmen und Palmen
    for (x, y) in ((1.35, -1.25), (1.6, -1.6)):
        cyl(bpy, 0.015, 0.015, 0.04, 0.38, weiss, 6, x, y)
        cyl(bpy, 0.22, 0.0, 0.32, 0.45, rosa if x < 1.5 else tuerkis, 12, x, y)
    for (x, y) in ((0.9, -0.85), (-0.85, -0.85)):
        palme(bpy, x, y, 0.95, holz, gruen)
