# Rheinturm Düsseldorf (240 m, 1982) im Maßstab des Spiels: 1 Einheit = 1 Feldkante, Turm gut 11 Einheiten hoch.
# Sockelbau, schlanker Betonschaft mit der Lichtzeitpegel-Uhr (Lichterkette am Schaft), Korb mit Restaurant und
# Aussichtsplattform, Betonspitze und rot-weiße Antenne. Grundfläche 2 x 2 Felder, gepflasterter Vorplatz.
import math

def mat(bpy, name, rgb, rough=0.75, emit=0.0, noise=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    if noise:
        # leichte Struktur wie bei den vorgerenderten Originalen (Betonflecken, Fugen)
        tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = 28; tex.inputs['Detail'].default_value = 6
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = (*[c * (1 - noise) for c in rgb], 1); ramp.color_ramp.elements[1].color = (*[min(1, c * (1 + noise)) for c in rgb], 1)
        nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = (*rgb, 1)
    if emit:
        b.inputs['Emission Color'].default_value = (*rgb, 1); b.inputs['Emission Strength'].default_value = emit
    return m

def cyl(bpy, r1, r2, z0, z1, m, verts=32):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=z1 - z0, location=(0, 0, (z0 + z1) / 2))
    o = bpy.context.active_object; o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o

def build(bpy):
    beton = mat(bpy, 'Beton', (0.3, 0.29, 0.27), noise=0.12)
    beton_hell = mat(bpy, 'BetonHell', (0.66, 0.65, 0.62), noise=0.06)
    beton_dunkel = mat(bpy, 'BetonDunkel', (0.28, 0.27, 0.26), noise=0.1)
    glas = mat(bpy, 'Glas', (0.06, 0.09, 0.14), rough=0.25)
    pflaster = mat(bpy, 'Pflaster', (0.6, 0.55, 0.48), noise=0.2)
    rot = mat(bpy, 'Rot', (0.85, 0.08, 0.05))
    weiss = mat(bpy, 'Weiss', (0.94, 0.94, 0.92))
    licht = mat(bpy, 'Licht', (1.0, 0.85, 0.3), emit=1.2)

    # Vorplatz 2 x 2 Felder und niedriger Eingangsbau um den Schaftfuß
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.02)); p = bpy.context.active_object
    p.scale = (1.96, 1.96, 0.04); p.data.materials.append(pflaster)
    cyl(bpy, 0.8, 0.78, 0.04, 0.3, beton_hell, 8)
    cyl(bpy, 0.74, 0.74, 0.12, 0.26, glas, 8)
    # Schaft: grauer Beton, verjüngt sich nach oben
    cyl(bpy, 0.42, 0.27, 0.3, 7.4, beton)
    # Lichtzeitpegel: dezente Lichterkette am Schaft (zur Kamera hin)
    d = (math.cos(math.radians(-45)), math.sin(math.radians(-45)))
    for i in range(30):
        z = 0.9 + i * 0.21
        if i % 7 == 6:
            continue
        r = 0.42 + (0.27 - 0.42) * (z - 0.3) / 7.1 + 0.005
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.022, location=(d[0] * r, d[1] * r, z))
        bpy.context.active_object.data.materials.append(licht)
    # Kopf ("Korb") von unten nach oben:
    cyl(bpy, 0.27, 0.62, 7.4, 7.95, beton)                 # Trichter, der sich nach oben weitet
    cyl(bpy, 0.62, 0.74, 7.95, 8.42, glas, 48)             # Restaurant: nach außen geneigtes Glasband
    for k in range(24):                                     # helle Streben im Glasband
        ang = 2 * math.pi * k / 24
        r0, r1 = 0.63, 0.75
        bpy.ops.mesh.primitive_cube_add(size=1)
        o = bpy.context.active_object; o.data.materials.append(beton_hell)
        o.scale = (0.035, 0.035, 0.5)
        o.location = (math.cos(ang) * (r0 + r1) / 2, math.sin(ang) * (r0 + r1) / 2, 8.185)
        o.rotation_euler = (0, math.atan2(r1 - r0, 0.47), ang)
    cyl(bpy, 0.8, 0.78, 8.42, 8.5, beton_hell, 48)         # Dachscheibe über dem Restaurant
    cyl(bpy, 0.46, 0.42, 8.5, 8.75, beton, 32)             # Hals
    cyl(bpy, 0.66, 0.66, 8.75, 8.81, beton_hell, 40)       # untere Plattform
    cyl(bpy, 0.3, 0.28, 8.81, 9.02, beton_dunkel, 24)
    cyl(bpy, 0.56, 0.56, 9.02, 9.08, beton_hell, 40)       # obere Plattform
    cyl(bpy, 0.2, 0.15, 9.08, 9.75, beton)                 # obere Spitze
    # Antenne: weißer Mast, oben rot-weiß
    cyl(bpy, 0.075, 0.05, 9.75, 10.9, weiss, 12)
    z = 10.9
    for k in range(4):
        cyl(bpy, 0.05, 0.04, z, z + 0.16, rot if k % 2 == 0 else weiss, 12); z += 0.16
    cyl(bpy, 0.02, 0.008, z, z + 0.25, rot, 8)

    # Etwas stauchen (7 %), damit Turm samt Antenne in zwei Bildteile à 256 Pixel passt
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.name != 'Boden':
            o.scale.z *= 0.93; o.location.z *= 0.93
