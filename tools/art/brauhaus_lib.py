# Altbier-Brauhaus der Düsseldorfer Altstadt (Spielart Kneipe), Grundfläche 2 x 2 Felder (x, y von -1 bis 1).
# Schmales hohes Altstadthaus mit Treppengiebel zur Gasse, Sprossenfenstern mit Klappläden, Rundbögen im Erdgeschoss,
# Wirtshausschild am Ausleger, Fässer und Stehtische auf dem Türfeld davor (Feld vorn unten: x 1..2, y -2..-1).
import math

def mat(bpy, name, rgb, rough=0.8, noise=0.0, scale=30, emit=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough
    if noise:
        tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = scale; tex.inputs['Detail'].default_value = 8
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = (*[c * (1 - noise) for c in rgb], 1); ramp.color_ramp.elements[1].color = (*[min(1, c * (1 + noise)) for c in rgb], 1)
        nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = (*rgb, 1)
    if emit:
        b.inputs['Emission Color'].default_value = (*rgb, 1); b.inputs['Emission Strength'].default_value = emit
    return m

def box(bpy, x0, y0, z0, x1, y1, z1, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.active_object; o.scale = (x1 - x0, y1 - y0, z1 - z0); o.data.materials.append(m); return o

def prism(bpy, x0, y0, x1, y1, z0, z1, m, axis='x'):
    # Satteldach: First parallel zu axis
    import bmesh
    me = bpy.data.meshes.new('dach'); bm = bmesh.new()
    if axis == 'x':
        ym = (y0 + y1) / 2
        v = [bm.verts.new(p) for p in [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, ym, z1), (x1, ym, z1)]]
        faces = [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]
    else:
        xm = (x0 + x1) / 2
        v = [bm.verts.new(p) for p in [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (xm, y0, z1), (xm, y1, z1)]]
        faces = [(1, 2, 5, 4), (3, 0, 4, 5), (0, 1, 4), (2, 3, 5), (0, 3, 2, 1)]
    for f in faces: bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('dach', me); bpy.context.scene.collection.objects.link(o); o.data.materials.append(m); return o

def build(bpy, wand=(0.95, 0.88, 0.68), laden=(0.05, 0.42, 0.12), dach=(0.82, 0.12, 0.06), sockel=(0.45, 0.36, 0.28), schild='Uerige'):
    W = mat(bpy, 'Wand', wand, noise=0.08, scale=40)
    S = mat(bpy, 'Sockel', sockel, noise=0.15)
    D = mat(bpy, 'Dach', dach, noise=0.18, scale=60)
    L = mat(bpy, 'Laden', laden)
    G = mat(bpy, 'Glas', (0.1, 0.13, 0.2), rough=0.3)
    F = mat(bpy, 'Fenster', (0.95, 0.85, 0.5), emit=0.6)          # warm erleuchtete Gaststube
    H = mat(bpy, 'Holz', (0.38, 0.22, 0.1), noise=0.2)
    M = mat(bpy, 'Messing', (0.85, 0.65, 0.2), rough=0.35)
    P = mat(bpy, 'Pflaster', (0.5, 0.47, 0.42), noise=0.25)

    # Grundplatte: 2x2 Felder plus Türfeld davor (Kopfsteinpflaster)
    box(bpy, -0.98, -0.98, 0, 0.98, 0.98, 0.03, P)
    box(bpy, 1.0, -1.98, 0, 1.98, -1.0, 0.03, P)
    # Haus: Erdgeschoss mit Sockel, zwei Obergeschosse, Giebel zur Gasse (vorn rechts, Fläche x = 0.9)
    x0, x1, y0, y1 = -0.85, 0.9, -0.9, 0.75
    box(bpy, x0, y0, 0.03, x1, y1, 0.2, S)
    box(bpy, x0, y0, 0.2, x1, y1, 1.55, W)
    # Gesims zwischen den Geschossen
    for z in (0.9,):
        box(bpy, x0 - 0.02, y0 - 0.02, z, x1 + 0.02, y1 + 0.02, z + 0.05, S)
    # Satteldach mit First quer zur Gasse (Giebel zeigt nach +x)
    prism(bpy, x0 - 0.06, y0 - 0.08, x1 + 0.04, y1 + 0.08, 1.55, 2.45, D, axis='x')
    # Treppengiebel an der Giebelseite (x = x1): Stufen
    # Treppengiebel als eine Scheibe: getrepptes Profil in der y-z-Ebene, nach x ausgezogen
    import bmesh
    steps = 5; ym = (y0 + y1) / 2; half = (y1 - y0) / 2 + 0.05
    prof = [(ym - half, 1.55)]
    for i in range(steps):
        w = half * (1 - i / steps); w2 = half * (1 - (i + 1) / steps); z = 1.55 + 0.9 * (i + 1) / steps
        prof += [(ym - w, z), (ym - max(w2, 0.08), z)]
    prof += [(ym + max(half * (1 - (steps) / steps), 0.08), 1.55 + 0.9)]
    for i in reversed(range(steps)):
        w = half * (1 - i / steps); w2 = half * (1 - (i + 1) / steps); z = 1.55 + 0.9 * (i + 1) / steps
        prof += [(ym + max(w2, 0.08), z), (ym + w, z)]
    prof += [(ym + half, 1.55)]
    me = bpy.data.meshes.new('giebel'); bm = bmesh.new()
    front = [bm.verts.new((x1 + 0.07, y, z)) for (y, z) in prof]
    face = bm.faces.new(front)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.x -= 0.2
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    g = bpy.data.objects.new('giebel', me); bpy.context.scene.collection.objects.link(g); g.data.materials.append(W)
    # Gauben auf der Langseite (-y)
    for xc in (-0.4, 0.3):
        box(bpy, xc - 0.16, y0 + 0.2, 1.75, xc + 0.16, y0 + 0.45, 2.02, W)
        prism(bpy, xc - 0.2, y0 + 0.12, xc + 0.2, y0 + 0.5, 2.02, 2.17, D, axis='y')
        box(bpy, xc - 0.1, y0 + 0.18, 1.8, xc + 0.1, y0 + 0.2, 1.98, G)
    # Fenster mit Klappläden: Giebelseite (+x) und Langseite (-y)
    def win_x(yc, z, w=0.22, h=0.42, lit=False):
        box(bpy, x1, yc - w / 2, z, x1 + 0.02, yc + w / 2, z + h, F if lit else G)
        for s in (-1, 1): box(bpy, x1, yc + s * (w / 2 + 0.07) - 0.06, z, x1 + 0.03, yc + s * (w / 2 + 0.07) + 0.06, z + h, L)
    def win_y(xc, z, w=0.22, h=0.42, lit=False):
        box(bpy, xc - w / 2, y0 - 0.02, z, xc + w / 2, y0, z + h, F if lit else G)
        for s in (-1, 1): box(bpy, xc + s * (w / 2 + 0.07) - 0.06, y0 - 0.03, z, xc + s * (w / 2 + 0.07) + 0.06, y0, z + h, L)
    for z in (1.05,):
        for yc in (-0.45, 0.25): win_x(yc, z)
        for xc in (-0.55, 0.05, 0.55): win_y(xc, z)
    # Erdgeschoss: große erleuchtete Bogenfenster der Schankstube und die Tür zur Gasse an der Ecke vorn
    for yc in (-0.15, 0.4): win_x(yc, 0.32, 0.34, 0.5, lit=True)
    for xc in (-0.5, 0.0): win_y(xc, 0.32, 0.34, 0.5, lit=True)
    box(bpy, 0.42, y0 - 0.03, 0.2, 0.74, y0, 0.85, H)            # Eingangstür (Holz) nahe der vorderen Ecke
    box(bpy, 0.38, y0 - 0.05, 0.85, 0.78, y0, 0.92, S)
    # Ausleger mit Wirtshausschild an der vorderen Ecke
    box(bpy, x1, y0 - 0.02, 1.0, x1 + 0.45, y0 + 0.02, 1.03, H)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.2, depth=0.04, location=(x1 + 0.32, y0, 0.8), rotation=(math.radians(90), 0, 0))
    bpy.context.active_object.data.materials.append(M)
    # Fässer und Stehtische auf dem Türfeld
    for (fx, fy) in ((1.25, -1.25), (1.55, -1.6), (1.25, -1.75)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.13, depth=0.32, location=(fx, fy, 0.19))
        bpy.context.active_object.data.materials.append(H)
        for z in (0.1, 0.28):
            bpy.ops.mesh.primitive_torus_add(major_radius=0.135, minor_radius=0.012, location=(fx, fy, z)); bpy.context.active_object.data.materials.append(S)
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.15, depth=0.03, location=(fx, fy, 0.37))
        bpy.context.active_object.data.materials.append(H)
