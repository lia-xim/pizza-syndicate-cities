# Gemeinsame Bausteine für die Blender-Modelle (Materialien, Grundkörper). Einheiten: 1 = Feldkante.
import math

def mat(bpy, name, rgb, rough=0.8, noise=0.0, scale=30, emit=0.0, gitter=None):
    # gitter = (dunkle Farbe, Wiederholung um den Umfang, Wiederholung in der Höhe): Rautengitter über die UV-Koordinaten
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough
    if gitter:
        dark, su, sv = gitter
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (su, sv, 1); mp.inputs['Rotation'].default_value = (0, 0, math.radians(45))
        ch = nt.nodes.new('ShaderNodeTexChecker'); ch.inputs['Scale'].default_value = 1
        ch.inputs['Color1'].default_value = (*rgb, 1); ch.inputs['Color2'].default_value = (*dark, 1)
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], ch.inputs['Vector'])
        nt.links.new(ch.outputs['Color'], b.inputs['Base Color'])
    elif noise:
        tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = scale; tex.inputs['Detail'].default_value = 8
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = (*[c * (1 - noise) for c in rgb], 1); ramp.color_ramp.elements[1].color = (*[min(1, c * (1 + noise)) for c in rgb], 1)
        nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = (*rgb, 1)
    if emit:
        b.inputs['Emission Color'].default_value = (*rgb, 1); b.inputs['Emission Strength'].default_value = emit
    return m

def cyl(bpy, r1, r2, z0, z1, m, verts=32, x=0.0, y=0.0, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=z1 - z0, location=(x, y, (z0 + z1) / 2))
    o = bpy.context.active_object; o.data.materials.append(m)
    if smooth: bpy.ops.object.shade_smooth()
    return o

def box(bpy, x0, y0, z0, x1, y1, z1, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.active_object; o.scale = (x1 - x0, y1 - y0, z1 - z0); o.data.materials.append(m); return o

def dome(bpy, r, z, m, hoehe=1.0, segs=32, x=0.0, y=0.0):
    # Halbkugel (optional gestreckt) auf Höhe z
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=segs // 2, radius=r, location=(x, y, z))
    o = bpy.context.active_object; o.scale.z = hoehe; o.data.materials.append(m); bpy.ops.object.shade_smooth()
    # untere Hälfte entfernen
    import bmesh
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    return o

def palme(bpy, x, y, h, stamm, blatt):
    cyl(bpy, 0.05, 0.035, 0.03, h, stamm, 8, x, y)
    for k in range(7):
        a = 2 * math.pi * k / 7
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.09, radius2=0.0, depth=0.55, location=(x + math.cos(a) * 0.22, y + math.sin(a) * 0.22, h - 0.05))
        o = bpy.context.active_object; o.rotation_euler = (math.radians(100) * math.sin(a) * -1, math.radians(100) * math.cos(a), 0)
        o.rotation_euler = (0, math.radians(105), a); o.data.materials.append(blatt)
