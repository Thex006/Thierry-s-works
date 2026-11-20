import bpy, bmesh, math, random, sys, os
from mathutils import Vector, Euler, Matrix

OUT = '/root/jb/fruit'
os.makedirs(OUT, exist_ok=True)
RES = int(os.environ.get('RES', '900'))
SAMPLES = int(os.environ.get('SAMPLES', '96'))

# ---------------------------------------------------------------- scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    sc.render.film_transparent = True
    sc.render.resolution_x = RES
    sc.render.resolution_y = RES
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    try:
        sc.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception:
        pass
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    nt = w.node_tree; bg = nt.nodes['Background']
    grad = nt.nodes.new('ShaderNodeTexGradient')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, math.radians(-90), 0)
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.10, 0.10, 0.11, 1)
    ramp.color_ramp.elements[1].color = (0.95, 0.95, 0.95, 1)
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], grad.inputs['Vector'])
    nt.links.new(grad.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.6
    def area(name, loc, energy, size, color=(1, 1, 1)):
        l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color; l.shape = 'DISK'
        o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc
        d = Vector((0, 0, 0)) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    area('key', (-4, -5, 6), 1400, 5, (1, 0.97, 0.92))
    area('fill', (5, -4, 1), 350, 6, (0.92, 0.95, 1))
    area('rim', (2.5, 5, 4), 900, 3)
    area('under', (0, -3, -4), 120, 6)
    return sc

def mat(name, color, rough=0.4, sss=0.0, sss_rad=(1, 0.3, 0.2), coat=0.0, sheen=0.0, sheen_tint=(1, 1, 1), spec=0.5, trans=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Subsurface Weight'].default_value = sss
    b.inputs['Subsurface Radius'].default_value = sss_rad
    try: b.inputs['Subsurface Scale'].default_value = 0.25
    except Exception: pass
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Sheen Weight'].default_value = sheen
    b.inputs['Sheen Tint'].default_value = (*sheen_tint, 1)
    b.inputs['Specular IOR Level'].default_value = spec
    b.inputs['Transmission Weight'].default_value = trans
    return m

def nodes(m):
    return m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']

def add_bump(m, strength=0.2, scale=40.0, kind='noise', detail=4.0):
    n, l, b = nodes(m)
    tc = n.new('ShaderNodeTexCoord')
    if kind == 'noise':
        t = n.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value = scale; t.inputs['Detail'].default_value = detail
        out = t.outputs['Fac']
    else:
        t = n.new('ShaderNodeTexVoronoi'); t.inputs['Scale'].default_value = scale
        out = t.outputs['Distance']
    l.new(tc.outputs['Object'], t.inputs['Vector'])
    bu = n.new('ShaderNodeBump'); bu.inputs['Strength'].default_value = strength
    l.new(out, bu.inputs['Height']); l.new(bu.outputs['Normal'], b.inputs['Normal'])
    return t

def link(o):
    bpy.context.scene.collection.objects.link(o); return o

def obj_from_bm(name, bm, m=None, smooth=True, subsurf=0):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me))
    if smooth:
        for p in me.polygons: p.use_smooth = True
    if m: me.materials.append(m)
    if subsurf:
        md = o.modifiers.new('s', 'SUBSURF'); md.levels = subsurf; md.render_levels = subsurf
    return o

def sphere(name, f=None, m=None, seg=96, rings=48, r=1.0, subsurf=1):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    if f:
        for v in bm.verts: v.co = f(v.co.copy())
    return obj_from_bm(name, bm, m, subsurf=subsurf)

def apply_mods(o):
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=md.name)

def cut(o, flesh, plane_y=0.0, keep='neg'):
    """Cut object with a big cube so the half facing the camera (-Y) shows the flesh."""
    apply_mods(o)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=8)
    c = obj_from_bm('cutter', bm, flesh, smooth=False)
    c.location = (0, plane_y - 4.0, 0)  # remove the camera-side half so the flesh faces -Y
    md = o.modifiers.new('b', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = c
    try: md.material_mode = 'TRANSFER'
    except Exception: pass
    md.solver = 'EXACT'
    apply_mods(o)
    bpy.data.objects.remove(c)
    # face the cut towards the camera: the cut face sits at y=plane_y facing +Y; rotate so it faces -Y (camera)
    return o

def curve(name, pts, depth, m, res=12):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = depth; cu.bevel_resolution = 4
    cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for p, c in zip(sp.bezier_points, pts):
        p.co = c; p.handle_left_type = p.handle_right_type = 'AUTO'
    o = link(bpy.data.objects.new(name, cu)); cu.materials.append(m)
    return o

def taper_curve(name, pts, depth, m):
    o = curve(name, pts, depth, m)
    o.data.splines[0].bezier_points[-1].radius = 0.55
    return o

def group(objs, name='g'):
    e = link(bpy.data.objects.new(name, None))
    for o in objs: o.parent = e
    return e

def frame_and_render(fname, root_objs, rot=(0, 0, 0), margin=1.08):
    sc = bpy.context.scene
    g = group(root_objs)
    g.rotation_euler = Euler([math.radians(a) for a in rot], 'XYZ')
    bpy.context.view_layer.update()
    # bounding box in world space
    pts = []
    for o in sc.objects:
        if o.type in ('MESH', 'CURVE'):
            dg = bpy.context.evaluated_depsgraph_get()
            oe = o.evaluated_get(dg)
            try: me = oe.to_mesh()
            except Exception: continue
            for v in me.vertices: pts.append(oe.matrix_world @ v.co)
            oe.to_mesh_clear()
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    ctr = (mn + mx) / 2; ext = max(mx.x - mn.x, mx.z - mn.z) * margin
    cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 85
    cam = link(bpy.data.objects.new('cam', cam_d)); sc.camera = cam
    sensor = cam_d.sensor_width
    dist = ext / 2 / math.tan(math.atan(sensor / 2 / cam_d.lens))
    cam.location = (ctr.x, ctr.y - dist - (mx.y - mn.y) / 2, ctr.z)
    cam.rotation_euler = (math.radians(90), 0, 0)
    sc.render.filepath = os.path.join(OUT, fname + '.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', fname, flush=True)

# ---------------------------------------------------------------- fruit builders
def stem_mat():
    m = mat('stem', (0.16, 0.2, 0.04), rough=0.55, sss=0.1)
    return m

def cherry(offset=(0, 0, 0), stem_to=None, seed=1):
    random.seed(seed)
    m = mat('cherry', (0.28, 0.006, 0.02), rough=0.3, sss=0.25, sss_rad=(0.6, 0.05, 0.05), coat=0.3)
    m.node_tree.nodes['Principled BSDF'].inputs['Coat Roughness'].default_value = 0.12
    # slight mottling
    n, l, b = nodes(m)
    t = n.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value = 3
    tc = n.new('ShaderNodeTexCoord'); l.new(tc.outputs['Object'], t.inputs['Vector'])
    r = n.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (0.06, 0.0, 0.005, 1); r.color_ramp.elements[1].color = (0.3, 0.005, 0.02, 1)
    l.new(t.outputs['Fac'], r.inputs['Fac']); l.new(r.outputs['Color'], b.inputs['Base Color'])
    add_bump(m, 0.05, 25)
    def f(c):
        c.z *= 0.92
        rr = math.hypot(c.x, c.y)
        if c.z > 0:  # dimple at top
            c.z -= 0.22 * math.exp(-(rr / 0.28) ** 2)
        if c.z < 0:
            c.z -= 0.04 * math.exp(-(rr / 0.3) ** 2)
        # faint suture line
        c.x *= 1.02
        return c
    o = sphere('cherry', f, m)
    o.location = offset
    objs = [o]
    top = Vector(offset) + Vector((0, 0, 0.66))
    end = stem_to or (top + Vector((0.35, 0.1, 1.9)))
    mid = top.lerp(end, 0.5) + Vector((0.25, 0, 0.1))
    s = curve('stem', [top - Vector((0, 0, 0.1)), mid, end], 0.04, stem_mat())
    objs.append(s)
    return objs

def leaf(length=1.6, width=0.6, m=None, curl=0.25):
    m = m or mat('leaf', (0.08, 0.28, 0.04), rough=0.35, sss=0.2, sss_rad=(0.2, 0.6, 0.1), coat=0.2)
    n, l, b = nodes(m)
    # midrib + veins via wave on object coords
    bm = bmesh.new()
    nx, ny = 40, 14
    verts = []
    for i in range(nx + 1):
        u = i / nx
        row = []
        w = width * math.sin(math.pi * u) ** 0.8 * (1 - 0.25 * u)
        for j in range(ny + 1):
            v = (j / ny) * 2 - 1
            x = u * length
            y = v * w / 2
            z = curl * (v * v) * w + 0.15 * math.sin(u * math.pi) * length * 0.2 - 0.05 * abs(v)
            # serration
            if abs(v) > 0.95:
                y *= 1 + 0.06 * math.sin(u * 60)
            row.append(bm.verts.new((x, y, z)))
        verts.append(row)
    for i in range(nx):
        for j in range(ny):
            bm.faces.new((verts[i][j], verts[i + 1][j], verts[i + 1][j + 1], verts[i][j + 1]))
    o = obj_from_bm('leaf', bm, m)
    md = o.modifiers.new('sol', 'SOLIDIFY'); md.thickness = 0.02
    tc = n.new('ShaderNodeTexCoord')
    sep = n.new('ShaderNodeSeparateXYZ'); l.new(tc.outputs['Object'], sep.inputs['Vector'])
    ab = n.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; l.new(sep.outputs['Y'], ab.inputs[0])
    vein = n.new('ShaderNodeMath'); vein.operation = 'LESS_THAN'; vein.inputs[1].default_value = 0.025; l.new(ab.outputs[0], vein.inputs[0])
    mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs[6].default_value = (0.08, 0.3, 0.04, 1); mix.inputs[7].default_value = (0.35, 0.5, 0.15, 1)
    l.new(vein.outputs[0], mix.inputs[0]); l.new(mix.outputs[2], b.inputs['Base Color'])
    add_bump(m, 0.08, 18)
    return o

def strawberry_shape(c):
    # profile: widest near top, pointed bottom, slight shoulders
    z = c.z
    t = (z + 1) / 2  # 0 bottom, 1 top
    prof = (math.sin(t * math.pi * 0.62 + 0.05) ** 0.9)
    if t > 0.85: prof *= 1 - (t - 0.85) * 1.6
    rr = math.hypot(c.x, c.y)
    if rr > 1e-6:
        k = prof * 1.0
        c.x = c.x / rr * rr * k
        c.y = c.y / rr * rr * k
    c.z = z * 1.15
    if t > 0.9: c.z -= (t - 0.9) * 0.8
    return c

def strawberry_mat():
    m = mat('straw', (0.62, 0.02, 0.03), rough=0.28, sss=0.3, sss_rad=(0.9, 0.1, 0.1), coat=0.35)
    n, l, b = nodes(m)
    tc = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); l.new(tc.outputs['Object'], sep.inputs['Vector'])
    r = n.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].position = 0.55; r.color_ramp.elements[0].color = (0.62, 0.02, 0.03, 1)
    r.color_ramp.elements[1].position = 1.0; r.color_ramp.elements[1].color = (0.85, 0.35, 0.12, 1)
    mp = n.new('ShaderNodeMapRange'); mp.inputs[1].default_value = -1.2; mp.inputs[2].default_value = 1.1
    l.new(sep.outputs['Z'], mp.inputs[0]); l.new(mp.outputs[0], r.inputs['Fac'])
    l.new(r.outputs['Color'], b.inputs['Base Color'])
    # seed dimples
    v = n.new('ShaderNodeTexVoronoi'); v.inputs['Scale'].default_value = 7.5; v.feature = 'F1'
    l.new(tc.outputs['Object'], v.inputs['Vector'])
    bu = n.new('ShaderNodeBump'); bu.inputs['Strength'].default_value = 0.35
    l.new(v.outputs['Distance'], bu.inputs['Height']); l.new(bu.outputs['Normal'], b.inputs['Normal'])
    return m

def strawberry_flesh():
    m = mat('sflesh', (0.9, 0.3, 0.3), rough=0.35, sss=0.4, sss_rad=(1, 0.3, 0.3), coat=0.3)
    n, l, b = nodes(m)
    tc = n.new('ShaderNodeTexCoord')
    mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.05, 1.05, 0.85)
    l.new(tc.outputs['Object'], mp.inputs['Vector'])
    g = n.new('ShaderNodeTexGradient'); g.gradient_type = 'SPHERICAL'
    l.new(mp.outputs['Vector'], g.inputs['Vector'])
    ns = n.new('ShaderNodeTexNoise'); ns.inputs['Scale'].default_value = 6
    l.new(tc.outputs['Object'], ns.inputs['Vector'])
    add = n.new('ShaderNodeMath'); add.operation = 'MULTIPLY_ADD'; add.inputs[1].default_value = 0.12
    l.new(ns.outputs['Fac'], add.inputs[0]); l.new(g.outputs['Fac'], add.inputs[2])
    r = n.new('ShaderNodeValToRGB'); e = r.color_ramp.elements
    e[0].position = 0.0; e[0].color = (0.5, 0.0, 0.02, 1)
    e[1].position = 0.92; e[1].color = (0.97, 0.62, 0.6, 1)
    e3 = e.new(0.3); e3.color = (0.82, 0.03, 0.06, 1)
    e4 = e.new(0.62); e4.color = (0.95, 0.4, 0.42, 1)
    l.new(add.outputs[0], r.inputs['Fac']); l.new(r.outputs['Color'], b.inputs['Base Color'])
    add_bump(m, 0.15, 30)
    return m

def calyx(top_z, n_leaves=9, scale=1.0):
    m = mat('calyx', (0.1, 0.32, 0.05), rough=0.4, sss=0.2, sss_rad=(0.2, 0.6, 0.1))
    add_bump(m, 0.1, 20)
    objs = []
    for i in range(n_leaves):
        a = i / n_leaves * 2 * math.pi + random.uniform(-0.15, 0.15)
        lf = leaf(0.75 * scale * random.uniform(0.85, 1.1), 0.42 * scale, m, curl=0.15)
        lf.location = (0, 0, top_z)
        lf.rotation_euler = Euler((0, math.radians(-random.uniform(-25, 5)), a), 'XYZ')
        objs.append(lf)
    s = curve('sstem', [(0, 0, top_z - 0.05), (0.05, 0, top_z + 0.25), (0.1, 0.02, top_z + 0.28)], 0.06, stem_mat())
    objs.append(s)
    return objs

def strawberry(half=False):
    random.seed(4)
    m = strawberry_mat()
    o = sphere('straw', strawberry_shape, m)
    top = 1.15 - 0.08
    objs = [o]
    if half:
        o.rotation_euler = (0, 0, 0)
        cut(o, strawberry_flesh(), 0.0)
        objs += calyx(top - 0.05, 7, 0.9)
        # remove calyx leaves behind cut? keep, they're behind
    else:
        # seeds
        sm = mat('seed', (0.85, 0.65, 0.25), rough=0.3, coat=0.4)
        apply_mods(o)
        me = o.data
        pts = []
        N = 260
        bm = bmesh.new()
        for i in range(N):
            zz = 1 - 2 * (i + 0.5) / N
            phi = i * math.pi * (3 - math.sqrt(5))
            d = Vector((math.cos(phi) * math.sqrt(1 - zz * zz), math.sin(phi) * math.sqrt(1 - zz * zz), zz))
            p = strawberry_shape(d.copy())
            if p.z > 0.95: continue
            nrm = (p - Vector((0, 0, p.z * 0.6))).normalized()
            loc = p - nrm * 0.005
            r = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.028)
            q = nrm.to_track_quat('Z', 'Y').to_matrix().to_4x4()
            sc_m = Matrix.Diagonal((0.8, 0.8, 1.6, 1))
            bmesh.ops.transform(bm, matrix=Matrix.Translation(loc) @ q @ sc_m, verts=r['verts'])
        so = obj_from_bm('seeds', bm, sm)
        objs.append(so)
        objs += calyx(top, 9)
    return objs

def raspberry(seed=3):
    random.seed(seed)
    m = mat('rasp', (0.62, 0.02, 0.08), rough=0.3, sss=0.6, sss_rad=(1.0, 0.15, 0.25), coat=0.4)
    n, l, b = nodes(m)
    ns = n.new('ShaderNodeTexNoise'); ns.inputs['Scale'].default_value = 2
    r = n.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (0.42, 0.005, 0.04, 1); r.color_ramp.elements[1].color = (0.72, 0.03, 0.1, 1)
    l.new(ns.outputs['Fac'], r.inputs['Fac']); l.new(r.outputs['Color'], b.inputs['Base Color'])
    bm = bmesh.new()
    N = 150
    for i in range(N):
        zz = 1 - 2 * (i + 0.5) / N
        if zz < -0.82: continue
        phi = i * math.pi * (3 - math.sqrt(5)) + random.uniform(-0.05, 0.05)
        rr = math.sqrt(1 - zz * zz)
        d = Vector((math.cos(phi) * rr, math.sin(phi) * rr, zz))
        # conical-ish: narrower at top
        p = Vector((d.x * (1 - 0.15 * max(zz, 0)), d.y * (1 - 0.15 * max(zz, 0)), d.z * 1.12))
        size = 0.18 * random.uniform(0.85, 1.12) * (1 - 0.1 * max(zz, 0))
        res = bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=14, radius=size)
        nrm = d.normalized()
        q = nrm.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=Matrix.Translation(p * 0.95) @ q @ Matrix.Diagonal((1, 1, 0.85, 1)), verts=res['verts'])
    o = obj_from_bm('rasp', bm, m)
    core = sphere('core', lambda c: Vector((c.x * 0.85, c.y * 0.85, c.z * 0.95)), m, seg=32, rings=16, subsurf=0)
    # tiny hairs skipped; bottom opening dark
    return [o, core]

def citrus_face_mat(rind=(0.1, 0.42, 0.02), pulp=(0.38, 0.72, 0.04), segs=10, pith=(0.9, 0.95, 0.75)):
    m = mat('cface', pulp, rough=0.15, sss=0.5, sss_rad=(0.5, 1, 0.2), coat=0.6, trans=0.15)
    n, l, b = nodes(m)
    tc = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); l.new(tc.outputs['Object'], sep.inputs['Vector'])
    # radius in XZ plane (face is at y=0)
    sq = lambda a: (lambda mm: (setattr(mm, 'operation', 'POWER'), mm.inputs.__getitem__(1).__setattr__('default_value', 2.0), l.new(a, mm.inputs[0]), mm)[-1])(n.new('ShaderNodeMath'))
    x2 = sq(sep.outputs['X']); z2 = sq(sep.outputs['Z'])
    ad = n.new('ShaderNodeMath'); ad.operation = 'ADD'; l.new(x2.outputs[0], ad.inputs[0]); l.new(z2.outputs[0], ad.inputs[1])
    rt = n.new('ShaderNodeMath'); rt.operation = 'SQRT'; l.new(ad.outputs[0], rt.inputs[0])
    at = n.new('ShaderNodeMath'); at.operation = 'ARCTAN2'; l.new(sep.outputs['Z'], at.inputs[0]); l.new(sep.outputs['X'], at.inputs[1])
    mul = n.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = segs / (2 * math.pi); l.new(at.outputs[0], mul.inputs[0])
    fr = n.new('ShaderNodeMath'); fr.operation = 'FRACT'; l.new(mul.outputs[0], fr.inputs[0])
    c5 = n.new('ShaderNodeMath'); c5.operation = 'SUBTRACT'; c5.inputs[1].default_value = 0.5; l.new(fr.outputs[0], c5.inputs[0])
    ab = n.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; l.new(c5.outputs[0], ab.inputs[0])
    # membrane width grows towards center slightly
    memb = n.new('ShaderNodeMath'); memb.operation = 'GREATER_THAN'; memb.inputs[1].default_value = 0.482; l.new(ab.outputs[0], memb.inputs[0])
    # ring masks via color ramp on radius
    rr = n.new('ShaderNodeValToRGB'); e = rr.color_ramp.elements; rr.color_ramp.interpolation = 'CONSTANT'
    e[0].position = 0.0; e[0].color = (*pith, 1)  # center core
    e[1].position = 0.06; e[1].color = (*pulp, 1)
    e3 = e.new(0.88); e3.color = (*pith, 1)
    e4 = e.new(0.935); e4.color = (*rind, 1)
    l.new(rt.outputs[0], rr.inputs['Fac'])
    # vesicle texture
    vo = n.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 22; l.new(tc.outputs['Object'], vo.inputs['Vector'])
    vr = n.new('ShaderNodeValToRGB'); vr.color_ramp.elements[0].color = (*[c * 0.8 for c in pulp], 1); vr.color_ramp.elements[1].color = (*[min(1, c * 1.15) for c in pulp], 1)
    l.new(vo.outputs['Distance'], vr.inputs['Fac'])
    # pulp region = between 0.1 and 0.86 radius and not membrane
    inner = n.new('ShaderNodeMath'); inner.operation = 'LESS_THAN'; inner.inputs[1].default_value = 0.88; l.new(rt.outputs[0], inner.inputs[0])
    inner2 = n.new('ShaderNodeMath'); inner2.operation = 'GREATER_THAN'; inner2.inputs[1].default_value = 0.06; l.new(rt.outputs[0], inner2.inputs[0])
    pm = n.new('ShaderNodeMath'); pm.operation = 'MULTIPLY'; l.new(inner.outputs[0], pm.inputs[0]); l.new(inner2.outputs[0], pm.inputs[1])
    mix1 = n.new('ShaderNodeMix'); mix1.data_type = 'RGBA'; l.new(pm.outputs[0], mix1.inputs[0]); l.new(rr.outputs['Color'], mix1.inputs[6]); l.new(vr.outputs['Color'], mix1.inputs[7])
    mm2 = n.new('ShaderNodeMath'); mm2.operation = 'MULTIPLY'; l.new(memb.outputs[0], mm2.inputs[0]); l.new(pm.outputs[0], mm2.inputs[1])
    mix2 = n.new('ShaderNodeMix'); mix2.data_type = 'RGBA'; l.new(mm2.outputs[0], mix2.inputs[0]); l.new(mix1.outputs[2], mix2.inputs[6]); mix2.inputs[7].default_value = (*pith, 1)
    l.new(mix2.outputs[2], b.inputs['Base Color'])
    bu = n.new('ShaderNodeBump'); bu.inputs['Strength'].default_value = 0.3
    l.new(vo.outputs['Distance'], bu.inputs['Height']); l.new(bu.outputs['Normal'], b.inputs['Normal'])
    return m

def lime_rind():
    m = mat('rind', (0.13, 0.4, 0.03), rough=0.35, sss=0.15, sss_rad=(0.3, 1, 0.2), coat=0.3)
    add_bump(m, 0.25, 60, 'voronoi')
    return m

def lime_slice():
    face = citrus_face_mat()
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, radius=1.0, segments=128)
    # extrude to thickness along Y
    geom = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    vs = [g for g in geom['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, 0.16), verts=vs)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
    o = obj_from_bm('slice', bm, face, smooth=False)
    o.data.materials.append(lime_rind())
    # side faces -> rind material
    for p in o.data.polygons:
        if abs(p.normal.y) < 0.5: p.material_index = 1; p.use_smooth = True
    md = o.modifiers.new('bv', 'BEVEL'); md.width = 0.015; md.segments = 3
    return [o]

def lime_half():
    face = citrus_face_mat()
    o = sphere('lime', lambda c: Vector((c.x, c.y, c.z * 0.92)), lime_rind())
    cut(o, face, 0.0)
    return [o]

def peach_skin(base=(0.98, 0.55, 0.12), blush=(0.7, 0.08, 0.05), fuzz=0.6):
    m = mat('pskin', base, rough=0.55, sss=0.35, sss_rad=(1, 0.5, 0.2), sheen=fuzz, sheen_tint=(1, 0.85, 0.7))
    n, l, b = nodes(m)
    tc = n.new('ShaderNodeTexCoord')
    ns = n.new('ShaderNodeTexNoise'); ns.inputs['Scale'].default_value = 1.2; ns.inputs['Detail'].default_value = 6
    l.new(tc.outputs['Object'], ns.inputs['Vector'])
    ns2 = n.new('ShaderNodeTexNoise'); ns2.inputs['Scale'].default_value = 18
    l.new(tc.outputs['Object'], ns2.inputs['Vector'])
    ad = n.new('ShaderNodeMath'); ad.operation = 'MULTIPLY_ADD'; ad.inputs[1].default_value = 0.25
    l.new(ns2.outputs['Fac'], ad.inputs[0]); l.new(ns.outputs['Fac'], ad.inputs[2])
    r = n.new('ShaderNodeValToRGB'); e = r.color_ramp.elements
    e[0].position = 0.45; e[0].color = (*base, 1); e[1].position = 0.72; e[1].color = (*blush, 1)
    l.new(ad.outputs[0], r.inputs['Fac']); l.new(r.outputs['Color'], b.inputs['Base Color'])
    add_bump(m, 0.06, 40)
    return m

def stone_fruit_shape(c, crease=0.08, sq=0.95):
    c.z *= sq
    # crease along the x=0 plane on the +y (back) side wraps around
    ang = math.atan2(c.y, c.x)
    k = math.exp(-((abs(c.x)) / 0.12) ** 2) * (0.5 + 0.5 * max(0, -c.y))
    c *= 1 - crease * k * (1 - abs(c.z) * 0.5)
    rr = math.hypot(c.x, c.y)
    if c.z > 0: c.z -= 0.12 * math.exp(-(rr / 0.3) ** 2)
    if c.z < 0: c.z *= 1.05
    return c

def flesh_mat(outer=(1.0, 0.5, 0.06), inner=(0.7, 0.1, 0.03), edge=(0.98, 0.4, 0.05)):
    m = mat('flesh', outer, rough=0.18, sss=0.5, sss_rad=(1, 0.6, 0.2), coat=0.6)
    n, l, b = nodes(m)
    tc = n.new('ShaderNodeTexCoord')
    g = n.new('ShaderNodeTexGradient'); g.gradient_type = 'SPHERICAL'; l.new(tc.outputs['Object'], g.inputs['Vector'])
    ns = n.new('ShaderNodeTexNoise'); ns.inputs['Scale'].default_value = 5; l.new(tc.outputs['Object'], ns.inputs['Vector'])
    ad = n.new('ShaderNodeMath'); ad.operation = 'MULTIPLY_ADD'; ad.inputs[1].default_value = 0.15
    l.new(ns.outputs['Fac'], ad.inputs[0]); l.new(g.outputs['Fac'], ad.inputs[2])
    r = n.new('ShaderNodeValToRGB'); e = r.color_ramp.elements
    e[0].position = 0.08; e[0].color = (*edge, 1)
    e[1].position = 0.75; e[1].color = (*inner, 1)
    e3 = e.new(0.35); e3.color = (*outer, 1)
    e4 = e.new(0.58); e4.color = (*outer, 1)
    l.new(ad.outputs[0], r.inputs['Fac']); l.new(r.outputs['Color'], b.inputs['Base Color'])
    t = n.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value = 3; t.inputs['Distortion'].default_value = 4
    l.new(tc.outputs['Object'], t.inputs['Vector'])
    bu = n.new('ShaderNodeBump'); bu.inputs['Strength'].default_value = 0.08
    l.new(t.outputs['Fac'], bu.inputs['Height']); l.new(bu.outputs['Normal'], b.inputs['Normal'])
    return m

def pit(scale=(0.32, 0.22, 0.42)):
    m = mat('pit', (0.35, 0.13, 0.06), rough=0.6, sss=0.1)
    t = add_bump(m, 0.9, 6, 'noise', 8)
    t.inputs['Distortion'].default_value = 2.0
    def f(c):
        c = Vector((c.x * scale[0], c.y * scale[1], c.z * scale[2]))
        if c.z > 0: c.z += 0.08 * (c.z / scale[2]) ** 4
        return c
    o = sphere('pit', f, m, seg=64, rings=32)
    return o

def peach_half(base=(0.98, 0.55, 0.12), blush=(0.7, 0.08, 0.05), flesh=None, pitscale=(0.32, 0.22, 0.42), fuzz=0.6):
    o = sphere('peach', lambda c: stone_fruit_shape(c), peach_skin(base, blush, fuzz))
    o.rotation_euler = (0, 0, math.radians(90))  # crease faces sideways, cut along it
    apply_rot(o)
    cut(o, flesh or flesh_mat(), 0.0)
    p = pit(pitscale); p.location = (0, 0.06, 0.02)
    return [o, p]

def apply_rot(o):
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.select_set(False)

def peach_whole(base=(0.98, 0.55, 0.12), blush=(0.7, 0.08, 0.05), fuzz=0.6, leafy=True):
    o = sphere('peachw', lambda c: stone_fruit_shape(c, 0.1), peach_skin(base, blush, fuzz))
    objs = [o]
    if leafy:
        s = curve('pst', [(0, 0, 0.75), (0.05, 0, 0.95)], 0.05, mat('wood', (0.25, 0.15, 0.06), 0.7))
        lf = leaf(1.3, 0.45); lf.location = (0.04, 0, 0.9); lf.rotation_euler = (math.radians(-10), math.radians(-25), math.radians(30))
        objs += [s, lf]
    return objs

def passion_half():
    shell = mat('pshell', (0.22, 0.05, 0.12), rough=0.45, sss=0.1, coat=0.2)
    n, l, b = nodes(shell)
    ns = n.new('ShaderNodeTexNoise'); ns.inputs['Scale'].default_value = 4
    tc = n.new('ShaderNodeTexCoord'); l.new(tc.outputs['Object'], ns.inputs['Vector'])
    r = n.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (0.12, 0.02, 0.07, 1); r.color_ramp.elements[1].color = (0.38, 0.1, 0.2, 1)
    l.new(ns.outputs['Fac'], r.inputs['Fac']); l.new(r.outputs['Color'], b.inputs['Base Color'])
    vo = n.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 9; l.new(tc.outputs['Object'], vo.inputs['Vector'])
    bu = n.new('ShaderNodeBump'); bu.inputs['Strength'].default_value = 0.3; l.new(vo.outputs['Distance'], bu.inputs['Height']); l.new(bu.outputs['Normal'], b.inputs['Normal'])
    o = sphere('pass', lambda c: Vector((c.x, c.y, c.z * 1.05)), shell)
    # inner face: thin white pith ring, then yellow pulp with seeds
    face = mat('pface', (0.95, 0.6, 0.05), rough=0.08, sss=0.6, sss_rad=(1, 0.7, 0.1), coat=0.9)
    n, l, b = nodes(face)
    tc = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); l.new(tc.outputs['Object'], sep.inputs['Vector'])
    vl = n.new('ShaderNodeVectorMath'); vl.operation = 'LENGTH'; l.new(tc.outputs['Object'], vl.inputs[0])
    rr = n.new('ShaderNodeValToRGB'); e = rr.color_ramp.elements; rr.color_ramp.interpolation = 'LINEAR'
    e[0].position = 0.0; e[0].color = (0.98, 0.62, 0.05, 1)
    e[1].position = 0.86; e[1].color = (0.9, 0.5, 0.03, 1)
    e3 = e.new(0.88); e3.color = (0.96, 0.9, 0.75, 1)
    e4 = e.new(0.96); e4.color = (0.98, 0.92, 0.8, 1)
    e5 = e.new(0.975); e5.color = (0.2, 0.04, 0.1, 1)
    l.new(vl.outputs['Value'], rr.inputs['Fac'])
    vo = n.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 13; vo.inputs['Randomness'].default_value = 0.9
    l.new(tc.outputs['Object'], vo.inputs['Vector'])
    sd = n.new('ShaderNodeMath'); sd.operation = 'LESS_THAN'; sd.inputs[1].default_value = 0.2; l.new(vo.outputs['Distance'], sd.inputs[0])
    inside = n.new('ShaderNodeMath'); inside.operation = 'LESS_THAN'; inside.inputs[1].default_value = 0.8; l.new(vl.outputs['Value'], inside.inputs[0])
    seedm = n.new('ShaderNodeMath'); seedm.operation = 'MULTIPLY'; l.new(sd.outputs[0], seedm.inputs[0]); l.new(inside.outputs[0], seedm.inputs[1])
    mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'; l.new(seedm.outputs[0], mix.inputs[0]); l.new(rr.outputs['Color'], mix.inputs[6]); mix.inputs[7].default_value = (0.03, 0.02, 0.01, 1)
    l.new(mix.outputs[2], b.inputs['Base Color'])
    inv = n.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; l.new(vo.outputs['Distance'], inv.inputs[1])
    bh = n.new('ShaderNodeMath'); bh.operation = 'MULTIPLY'; l.new(inv.outputs[0], bh.inputs[0]); l.new(inside.outputs[0], bh.inputs[1])
    bu = n.new('ShaderNodeBump'); bu.inputs['Strength'].default_value = 0.6; l.new(bh.outputs[0], bu.inputs['Height']); l.new(bu.outputs['Normal'], b.inputs['Normal'])
    cut(o, face, 0.0)
    return [o]

def rosemary():
    m = mat('rosem', (0.12, 0.25, 0.1), rough=0.45, sss=0.2, sss_rad=(0.2, 0.5, 0.2))
    stem = curve('rst', [(0, 0, -1.6), (0.08, 0, 0), (0, 0, 1.6)], 0.03, mat('rwood', (0.3, 0.25, 0.12), 0.6))
    bm = bmesh.new()
    random.seed(7)
    for i in range(200):
        t = i / 200
        z = -1.5 + t * 3.1
        a = i * 2.4
        L = 0.42 * (1 - 0.5 * t) + random.uniform(-0.05, 0.05)
        res = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=1)
        d = Vector((math.cos(a), math.sin(a), 0.9)).normalized()
        q = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=Matrix.Translation((0.05 * math.sin(z), 0, z)) @ q @ Matrix.Translation((0, 0, L / 2)) @ Matrix.Diagonal((0.035, 0.012, L / 2, 1)), verts=res['verts'])
    o = obj_from_bm('needles', bm, m)
    return [stem, o]

def watermelon_face():
    m = mat('wface', (0.9, 0.12, 0.15), rough=0.25, sss=0.6, sss_rad=(1, 0.2, 0.2), coat=0.5)
    n, l, b = nodes(m)
    tc = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); l.new(tc.outputs['Object'], sep.inputs['Vector'])
    # radius in XZ
    vm = n.new('ShaderNodeVectorMath'); vm.operation = 'MULTIPLY'; vm.inputs[1].default_value = (1, 0, 1)
    l.new(tc.outputs['Object'], vm.inputs[0])
    vl = n.new('ShaderNodeVectorMath'); vl.operation = 'LENGTH'; l.new(vm.outputs[0], vl.inputs[0])
    rr = n.new('ShaderNodeValToRGB'); e = rr.color_ramp.elements
    e[0].position = 0.0; e[0].color = (0.92, 0.1, 0.14, 1)
    e[1].position = 0.8; e[1].color = (0.95, 0.22, 0.25, 1)
    e3 = e.new(0.86); e3.color = (0.95, 0.85, 0.7, 1)
    e4 = e.new(0.91); e4.color = (0.75, 0.88, 0.55, 1)
    e5 = e.new(0.94); e5.color = (0.08, 0.3, 0.06, 1)
    l.new(vl.outputs['Value'], rr.inputs['Fac'])
    vo = n.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 16; l.new(tc.outputs['Object'], vo.inputs['Vector'])
    vr = n.new('ShaderNodeMath'); vr.operation = 'MULTIPLY'; vr.inputs[1].default_value = 0.12; l.new(vo.outputs['Distance'], vr.inputs[0])
    hsv = n.new('ShaderNodeHueSaturation'); l.new(rr.outputs['Color'], hsv.inputs['Color'])
    vv = n.new('ShaderNodeMath'); vv.operation = 'ADD'; vv.inputs[1].default_value = 0.92; l.new(vr.outputs[0], vv.inputs[0]); l.new(vv.outputs[0], hsv.inputs['Value'])
    l.new(hsv.outputs['Color'], b.inputs['Base Color'])
    bu = n.new('ShaderNodeBump'); bu.inputs['Strength'].default_value = 0.35
    l.new(vo.outputs['Distance'], bu.inputs['Height']); l.new(bu.outputs['Normal'], b.inputs['Normal'])
    return m

def watermelon_rind():
    m = mat('wrind', (0.1, 0.35, 0.06), rough=0.3, coat=0.4)
    n, l, b = nodes(m)
    tc = n.new('ShaderNodeTexCoord')
    w = n.new('ShaderNodeTexWave'); w.inputs['Scale'].default_value = 3; w.inputs['Distortion'].default_value = 6
    w.wave_type = 'BANDS'; w.bands_direction = 'Y'
    l.new(tc.outputs['Object'], w.inputs['Vector'])
    r = n.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (0.03, 0.15, 0.03, 1); r.color_ramp.elements[1].color = (0.25, 0.5, 0.12, 1)
    l.new(w.outputs['Fac'], r.inputs['Fac']); l.new(r.outputs['Color'], b.inputs['Base Color'])
    return m

def seeds_on(points, normal=(0, -1, 0)):
    sm = mat('wseed', (0.03, 0.02, 0.015), rough=0.15, coat=0.8)
    bm = bmesh.new()
    for p, ang in points:
        res = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1)
        M = Matrix.Translation(p) @ Matrix.Rotation(ang, 4, 'Y') @ Matrix.Diagonal((0.045, 0.025, 0.075, 1))
        bmesh.ops.transform(bm, matrix=M, verts=res['verts'])
    return obj_from_bm('wseeds', bm, sm)

def watermelon_wedge(angle=56, thick=0.42):
    face = watermelon_face(); rind = watermelon_rind()
    bm = bmesh.new()
    a0 = math.radians(90 - angle / 2); a1 = math.radians(90 + angle / 2)
    N = 48
    verts = [bm.verts.new((0, 0, 0))]
    for i in range(N + 1):
        a = a0 + (a1 - a0) * i / N
        verts.append(bm.verts.new((math.cos(a), 0, math.sin(a))))
    f = bm.faces.new(verts)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    vs = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, thick, 0), verts=vs)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    o = obj_from_bm('wedge', bm, face, smooth=False)
    o.data.materials.append(rind)
    for p in o.data.polygons:
        c = p.center
        if abs(p.normal.y) < 0.5 and math.hypot(c.x, c.z) > 0.9: p.material_index = 1; p.use_smooth = True
    md = o.modifiers.new('bv', 'BEVEL'); md.width = 0.02; md.segments = 3
    random.seed(11)
    pts = []
    for i in range(9):
        a = math.radians(90 + random.uniform(-angle / 2 + 8, angle / 2 - 8))
        rad = random.uniform(0.45, 0.72)
        pts.append((Vector((math.cos(a) * rad, -0.005, math.sin(a) * rad)), a - math.pi / 2))
    s = seeds_on(pts)
    return [o, s]

def watermelon_cube():
    face = watermelon_face()
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    o = obj_from_bm('wcube', bm, face, smooth=False)
    o.location = (0, 0, 0)
    md = o.modifiers.new('bv', 'BEVEL'); md.width = 0.06; md.segments = 4
    s = seeds_on([(Vector((0.1, -0.505, 0.15)), 0.3), (Vector((-0.2, -0.505, -0.2)), -0.4)])
    return [o, s]

def cherry_pair():
    a = cherry((-0.62, 0, 0), stem_to=Vector((0.05, 0.05, 2.6)), seed=1)
    b = cherry((0.62, 0.15, -0.25), stem_to=Vector((0.05, 0.05, 2.6)), seed=2)
    lf = leaf(1.9, 0.9); lf.location = (0.05, 0.05, 2.55); lf.rotation_euler = (math.radians(-20), math.radians(-35), math.radians(15))
    return a + b + [lf]

def apricot_whole():
    return peach_whole(base=(1.0, 0.55, 0.08), blush=(0.92, 0.3, 0.03), fuzz=0.35, leafy=False)

def apricot_half():
    return peach_half(base=(1.0, 0.55, 0.08), blush=(0.92, 0.3, 0.03),
                      flesh=flesh_mat(outer=(1.0, 0.55, 0.06), inner=(0.95, 0.42, 0.04), edge=(1.0, 0.5, 0.05)),
                      pitscale=(0.3, 0.18, 0.38), fuzz=0.35)

JOBS = {
    'cherry_single': (lambda: cherry(), (8, 0, -12)),
    'cherry_pair': (cherry_pair, (10, 0, 8)),
    'cherry_tilt': (lambda: cherry(stem_to=Vector((-0.6, 0.1, 1.7)), seed=5), (-14, 0, 20)),
    'strawberry_whole': (lambda: strawberry(False), (12, 0, -8)),
    'strawberry_half': (lambda: strawberry(True), (0, 0, 22)),
    'strawberry_tilt': (lambda: strawberry(False), (-25, 15, 35)),
    'raspberry': (lambda: raspberry(), (20, 0, 0)),
    'lime_slice': (lime_slice, (-25, 0, 10)),
    'lime_half': (lime_half, (8, 0, 32)),
    'peach_half': (lambda: peach_half(), (8, 0, 26)),
    'passion_half': (passion_half, (-6, 0, -28)),
    'peach_whole': (lambda: peach_whole(), (10, 0, 0)),
    'apricot_whole': (apricot_whole, (12, 0, 10)),
    'apricot_half': (apricot_half, (10, 0, -24)),
    'rosemary': (rosemary, (0, 10, -30)),
    'watermelon_wedge': (lambda: watermelon_wedge(), (10, 0, 0)),
    'watermelon_cube': (watermelon_cube, (-28, 0, 35)),
    'watermelon_wedge2': (lambda: watermelon_wedge(40, 0.35), (15, 25, -20)),
}

if __name__ == '__main__':
    names = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(JOBS)
    for nm in names:
        reset()
        fn, rot = JOBS[nm]
        objs = fn()
        frame_and_render(nm, objs, rot)
