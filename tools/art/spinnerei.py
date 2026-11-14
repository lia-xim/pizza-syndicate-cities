# Baumwollspinnerei in Ancoats (Manchester, "Cottonopolis"): langer Backsteinbau mit vielen Fensterreihen,
# Treppenturm mit Wasserbehälter und der hohe runde Fabrikschornstein.
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from kit import mat, cyl, box

def build(bpy):
    ziegel = mat(bpy, 'Ziegel', (0.62, 0.22, 0.14), noise=0.18, scale=60)
    ziegel_d = mat(bpy, 'ZiegelDunkel', (0.42, 0.15, 0.1), noise=0.15)
    stein = mat(bpy, 'Sandstein', (0.78, 0.72, 0.6), noise=0.08)
    fenster = mat(bpy, 'Fenster', (0.14, 0.17, 0.2))
    schiefer = mat(bpy, 'Schiefer', (0.24, 0.26, 0.3), noise=0.1)
    pflaster = mat(bpy, 'Pflaster', (0.45, 0.43, 0.4), noise=0.2)

    box(bpy, -0.98, -0.98, 0, 0.98, 0.98, 0.04, pflaster)
    # Hauptbau: lang entlang x, 4 Geschosse
    x0, x1, y0, y1 = -0.85, 0.85, -0.85, 0.15
    box(bpy, x0, y0, 0.04, x1, y1, 1.7, ziegel)
    for z in (0.45, 0.85, 1.25, 1.65):   # Gesimse
        box(bpy, x0 - 0.01, y0 - 0.01, z, x1 + 0.01, y1 + 0.01, z + 0.04, stein)
    for z in (0.12, 0.52, 0.92, 1.32):   # Fensterreihen an der Langseite (-y) und Stirnseite (+x)
        for i in range(8):
            t = x0 + 0.13 + i * 0.205
            box(bpy, t - 0.06, y0 - 0.01, z + 0.04, t + 0.06, y0, z + 0.3, fenster)
        for i in range(4):
            t = y0 + 0.14 + i * 0.24
            box(bpy, x1, t - 0.06, z + 0.04, x1 + 0.01, t + 0.06, z + 0.3, fenster)
    box(bpy, x0 - 0.02, y0 - 0.02, 1.7, x1 + 0.02, y1 + 0.02, 1.78, schiefer)
    # Treppenturm mit Wasserbehälter
    box(bpy, -0.25, 0.15, 0.04, 0.15, 0.55, 2.2, ziegel_d)
    box(bpy, -0.28, 0.12, 2.2, 0.18, 0.58, 2.28, stein)
    box(bpy, -0.2, 0.2, 2.28, 0.1, 0.5, 2.55, ziegel)
    box(bpy, -0.24, 0.16, 2.55, 0.14, 0.54, 2.6, stein)
    # Schornstein hinten rechts
    cx, cy = 0.55, 0.6
    box(bpy, cx - 0.22, cy - 0.22, 0.04, cx + 0.22, cy + 0.22, 0.5, ziegel_d)
    cyl(bpy, 0.15, 0.09, 0.5, 4.3, ziegel, 20, cx, cy)
    cyl(bpy, 0.12, 0.12, 4.3, 4.42, ziegel_d, 20, cx, cy)
    for z in (1.6, 2.8): cyl(bpy, 0.14, 0.14, z, z + 0.05, ziegel_d, 20, cx, cy)
