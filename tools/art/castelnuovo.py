# Castel Nuovo (Maschio Angioino, Neapel): mächtige Burg aus grauem Tuff mit runden Ecktürmen, Zinnenkranz und
# Kragsteinen, zwischen den beiden vorderen Türmen der weiße Marmor-Triumphbogen über dem Tor.
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from kit import mat, cyl, box

def build(bpy):
    tuff = mat(bpy, 'Tuff', (0.34, 0.32, 0.3), noise=0.15)
    tuff_hell = mat(bpy, 'TuffHell', (0.48, 0.45, 0.41), noise=0.1)
    marmor = mat(bpy, 'Marmor', (0.95, 0.94, 0.9), noise=0.04)
    dunkel = mat(bpy, 'Tor', (0.12, 0.1, 0.1))
    wasser = mat(bpy, 'Graben', (0.25, 0.45, 0.35))
    rasen = mat(bpy, 'Rasen', (0.3, 0.55, 0.2), noise=0.2)
    pflaster = mat(bpy, 'Pflaster', (0.6, 0.57, 0.52), noise=0.12)

    box(bpy, -0.98, -0.98, 0, 0.98, 0.98, 0.03, rasen)
    box(bpy, 0.75, -0.98, 0.0, 0.98, 0.98, 0.035, pflaster)
    box(bpy, -0.98, -0.98, 0.0, 0.98, -0.75, 0.035, pflaster)
    # Mauern zwischen den Türmen
    box(bpy, -0.62, -0.62, 0.03, 0.62, 0.62, 0.95, tuff)
    # runde Türme: zwei vorn an der Torseite (-y), zwei hinten
    for (x, y) in ((-0.62, -0.62), (0.62, -0.62), (0.62, 0.62), (-0.62, 0.62)):
        cyl(bpy, 0.32, 0.27, 0.03, 1.25, tuff, 32, x, y)
        cyl(bpy, 0.31, 0.31, 1.25, 1.33, tuff_hell, 32, x, y)          # Kragsteinkranz
        for k in range(14):                                               # Zinnen
            a = 2 * math.pi * k / 14
            box(bpy, x + math.cos(a) * 0.28 - 0.035, y + math.sin(a) * 0.28 - 0.035, 1.33, x + math.cos(a) * 0.28 + 0.035, y + math.sin(a) * 0.28 + 0.035, 1.43, tuff_hell)
    # Zinnen auf den Mauern
    for i in range(7):
        t = -0.45 + i * 0.15
        box(bpy, 0.6, t - 0.04, 0.95, 0.65, t + 0.04, 1.05, tuff_hell)
        box(bpy, t - 0.04, -0.65, 0.95, t + 0.04, -0.6, 1.05, tuff_hell)
    # Triumphbogen aus weißem Marmor zwischen den vorderen Türmen (Seite -y)
    box(bpy, -0.3, -0.68, 0.03, 0.3, -0.6, 1.05, marmor)
    box(bpy, -0.12, -0.69, 0.05, 0.12, -0.66, 0.45, dunkel)
    box(bpy, -0.1, -0.69, 0.6, 0.1, -0.66, 0.82, dunkel)
    for z in (0.5, 0.88): box(bpy, -0.32, -0.71, z, 0.32, -0.6, z + 0.04, marmor)
    # Innenhof-Dach dunkel andeuten
    box(bpy, -0.5, -0.5, 0.95, 0.5, 0.5, 0.96, tuff_hell)
