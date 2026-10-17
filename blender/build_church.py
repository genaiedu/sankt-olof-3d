"""Build an explicitly interpretive present-day reconstruction in Blender.
Run: Blender --background --python blender/build_church.py
Coordinates: x east, y north, z up. All dimensions are estimates, not survey data.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
T=ROOT/'blender/textures'; OUT=ROOT/'public/assets'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
random.seed(25)
collisions=[]; groups={}; category='architecture'

def material(name,color,rough=.8,metal=0,asset=None,photo=None):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    n=m.node_tree.nodes; l=m.node_tree.links; bs=n.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    if asset or photo:
        img=n.new('ShaderNodeTexImage');img.image=bpy.data.images.load(str(T/(photo or f'{asset}_diff.jpg')),check_existing=True);l.new(img.outputs['Color'],bs.inputs['Base Color'])
    if asset:
        for kind,slot in [('rough','Roughness'),('nor_gl','Normal')]:
            path=T/f'{asset}_{kind}.jpg'
            if not path.exists():continue
            tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path),check_existing=True);tex.image.colorspace_settings.name='Non-Color'
            if kind=='nor_gl':
                norm=n.new('ShaderNodeNormalMap');norm.inputs['Strength'].default_value=.65;l.new(tex.outputs['Color'],norm.inputs['Color']);l.new(norm.outputs['Normal'],bs.inputs[slot])
            else:l.new(tex.outputs['Color'],bs.inputs[slot])
    return m
plaster=material('Kalkputz · CC0 Fotomaterial',(.84,.82,.75),asset='white_plaster_02',photo='limewash-diff.jpg')
floor=material('Roter Ziegelboden · angenähert',(.45,.24,.14),asset='brick_floor_02',photo='brick-red-diff.jpg')
roofmat=material('Rote Dachziegel · angenähert',(.6,.24,.09),asset='clay_roof_tiles')
grass=material('Gras · hypothetische Umgebung',(.2,.25,.12),asset='grass_ground',photo='grass-green-diff.jpg')
vaultmat=material('Gewölbemalerei · frei rekonstruierte Ranken',(.65,.57,.43),photo='vault-ornament.jpg')
ribmat=material('Rippen · rekonstruierte Rotfassung',(.24,.075,.045),.88)
riblight=material('Rippen · helle Fugen',(.47,.40,.30),.9)
wood=material('Dunkles Eichenholz',(.12,.075,.04),.68)
pew=material('Bankfassung · angenäherte Farbe',(.065,.14,.16),.64)
pewlight=material('Bankprofile',(.32,.38,.35),.7)
panelmat=material('Bankmalerei · schematische Ergänzung',(.15,.25,.23),photo='pew-panel.jpg')
brass=material('Messing',(.63,.43,.17),.26,.86)
iron=material('Schmiedeeisen',(.045,.04,.035),.6,.65)
stone=material('Naturstein',(.27,.26,.23),.95)
gravel=material('Kieswege · hypothetischer Verlauf',(.49,.46,.37),1)
green=material('Altartuch',(.045,.21,.105),.95)
wax=material('Kerzenwachs',(.88,.85,.71),.6)
leaves=[material('Laub '+str(i),(.09+i*.015,.16+i*.016,.055+i*.009),.95) for i in range(4)]
altarphoto=material('Hochaltar · Foto Rosbach CC BY-SA 3.0',(.8,.7,.5),photo='altar-photo.jpg')
trinityphoto=material('Trinitätsaltar · Foto Rosbach CC BY-SA 3.0',(.7,.6,.4),photo='trinity-photo.jpg')
glass=material('Fensterglas',(.53,.63,.62),.25,.1)
glass.diffuse_color=(.53,.63,.62,.48)
glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.48
glass.surface_render_method='DITHERED'
purple=material('Fenster · farbiger Glasakzent',(.28,.09,.26),.3,.05)

def mesh(name,verts,faces,mat,scale=.5,uv=None):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
    layer=me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        axis=max(range(3),key=lambda i:abs(poly.normal[i])); a,b=[i for i in range(3) if i!=axis]
        for li in poly.loop_indices:
            vi=me.loops[li].vertex_index;v=verts[vi]
            layer.data[li].uv=uv[vi] if uv else (v[a]*scale,v[b]*scale)
    groups.setdefault((category,mat.name),[]).append(ob)
    return ob

def box(name,loc,size,mat,solid=False,scale=.5):
    x,y,z=loc;a,b,c=[s/2 for s in size]
    vs=[(x+dx*a,y+dy*b,z+dz*c) for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    ob=mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,scale)
    if solid:collisions.append({'name':name,'min':[x-a,y-b,z-c],'max':[x+a,y+b,z+c]})
    return ob

def line(name,pts,r,mat,sides=6):
    vs=[];fs=[]
    for i,p in enumerate(pts):
        tangent=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(i-1,0)])
        if tangent.length<.00001:tangent=Vector((0,0,1))
        tangent.normalize();normal=tangent.cross(Vector((0,0,1)))
        if normal.length<.01:normal=tangent.cross(Vector((0,1,0)))
        normal.normalize();bi=tangent.cross(normal).normalized()
        for j in range(sides):
            v=Vector(p)+r*(math.cos(j*math.tau/sides)*normal+math.sin(j*math.tau/sides)*bi);vs.append(tuple(v))
    for i in range(len(pts)-1):
        for j in range(sides):fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    ob=mesh(name,vs,fs,mat)
    for p in ob.data.polygons:p.use_smooth=True
    return ob

def cylinder(name,x,y,z,r,h,mat,solid=False,n=20):
    pts=[(x,y,z-h/2),(x,y,z+h/2)];ob=line(name,pts,r,mat,n)
    if solid:collisions.append({'name':name,'min':[x-r,y-r,z-h/2],'max':[x+r,y+r,z+h/2]})
    return ob

def sphere(name,loc,scale,mat,n=10):
    vs=[];fs=[]
    for j in range(n+1):
        p=math.pi*j/n
        for i in range(n*2):
            a=math.tau*i/(n*2);vs.append((loc[0]+scale[0]*math.sin(p)*math.cos(a),loc[1]+scale[1]*math.sin(p)*math.sin(a),loc[2]+scale[2]*math.cos(p)))
    for j in range(n):
        for i in range(n*2):
            a=j*n*2+i;b=j*n*2+(i+1)%(n*2);fs.append((a,b,b+n*2,a+n*2))
    ob=mesh(name,vs,fs,mat)
    for p in ob.data.polygons:p.use_smooth=True
    return ob

def wall(name,axis,pos,start,end,height,holes=(),thick=.65):
    # Wall is assembled around actual openings; windows are recessed, not decals.
    def segment(a,b,z0,z1):
        if b-a<.001 or z1-z0<.001:return
        loc=[(a+b)/2,pos,(z0+z1)/2] if axis=='x' else [pos,(a+b)/2,(z0+z1)/2]
        size=[b-a,thick,z1-z0] if axis=='x' else [thick,b-a,z1-z0]
        box(name,loc,size,plaster,True)
    cuts={start,end}
    for center,w,bottom,top,isdoor in holes:
        for i in range(25):cuts.add(center-w/2+w*i/24)
    cuts=sorted(c for c in cuts if start<=c<=end)
    for a,b in zip(cuts,cuts[1:]):
        mid=(a+b)/2; spans=[]
        for center,w,bottom,top,isdoor in holes:
            r=w/2
            if abs(mid-center)<r:
                spans.append((bottom,top-r+math.sqrt(max(0,r*r-(mid-center)**2))))
        z=0
        for low,high in sorted(spans):
            segment(a,b,z,low);z=max(z,high)
        segment(a,b,z,height)
    for center,w,bottom,top,isdoor in sorted(holes):
        left=center-w/2;right=center+w/2;r=w/2;spring=top-r
        def pt(u,z,offset=0):return (u,pos+offset,z) if axis=='x' else (pos+offset,u,z)
        curve=[pt(left,bottom)]+[pt(center+r*math.cos(math.pi-i*math.pi/32),spring+r*math.sin(math.pi-i*math.pi/32)) for i in range(33)]+[pt(right,bottom)]
        for side in [-1,1]:line('Profilierte Fensterlaibung', [pt((p[0] if axis=='x' else p[1]),p[2],side*(thick/2+.018)) for p in curve],.065,plaster,8)
        if not isdoor:
            v=[pt(left+.08,bottom+.05),pt(right-.08,bottom+.05)]+[pt(center+(r-.08)*math.cos(i*math.pi/32),spring+(r-.08)*math.sin(i*math.pi/32)) for i in range(33)]
            mesh('Fensterglas',v,[tuple(range(len(v)))],glass)
            for u in [center-w/4,center,center+w/4]:
                z=spring+math.sqrt(max(0,r*r-(u-center)**2));line('Bleisprosse',[pt(u,bottom+.04),pt(u,z-.05)],.012,iron,4)
            for z in [bottom+.35+i*.4 for i in range(int((top-bottom)/.4))]:
                half=r if z<spring else math.sqrt(max(0,r*r-(z-spring)**2))
                if half>.03:line('Bleisprosse',[pt(center-half+.04,z),pt(center+half-.04,z)],.012,iron,4)
            box('Fensterbank',pt(center,bottom-.05),[w+.24,thick+.25,.12] if axis=='x' else [thick+.25,w+.24,.12],plaster)

def roof(name,x0,x1,y0,y1,eave,ridge):
    ym=(y0+y1)/2
    mesh(name,[(x0-.16,y0-.24,eave),(x1+.16,y0-.24,eave),(x1+.16,ym,ridge),(x0-.16,ym,ridge),(x0-.16,y1+.24,eave),(x1+.16,y1+.24,eave)],[(0,1,2,3),(3,2,5,4)],roofmat,.8)
    line('Firstziegel',[(x0,ym,ridge+.04),(x1,ym,ridge+.04)],.13,roofmat,10)

def gable(x,y0,y1,eave,ridge,decor=True):
    ym=(y0+y1)/2;hw=(y1-y0)/2;step=hw/5
    # Five stepped shoulders on each side, with tiled coping.
    for i in range(5):
        z=eave+(ridge-eave)*(i+1)/5
        for sign in [-1,1]:
            yc=ym+sign*(hw-step*(i+.5));box('Treppengiebel',(x,yc,(eave+z)/2),(.58,step+.02,z-eave),plaster)
            box('Ziegelabdeckung',(x,yc,z+.05),(.7,step+.1,.11),roofmat)
    if decor:
        # Applied shallow blind-arch frames, an interpretation of the photographed tracery.
        for j in range(-3,4):
            yc=ym+j*.95; top=ridge-.5-abs(j)*.76; low=eave-.15;r=.30
            pts=[(x-.34,yc-r,low),(x-.34,yc-r,top-r)]+[(x-.34,yc+r*math.cos(math.pi-k*math.pi/20),top-r+r*math.sin(math.pi-k*math.pi/20)) for k in range(21)]+[(x-.34,yc+r,low)]
            line('Blendarkade · angenähert',pts,.09,plaster,8)

# Main hall: six vault bays in two aisles. Estimated dimensions from photographs.
box('Kirchenboden',(-1,0,-.1),(18,12,.2),floor)
wall('Nordmauer','x',6,-10,8,7.8,[(-7,1.5,2.1,5.6,False),(-1,1.5,2.1,5.6,False),(5,1.5,2.1,5.6,False)])
wall('Südmauer','x',-6,-10,8,7.8,[(-7,2,0,3.2,True),(-1,1.5,2.1,5.6,False),(5,1.5,2.1,5.6,False)])
wall('Westwand','y',-10,-6,6,7.8,[(-2.8,1.8,0,2.8,True),(-3,1.2,4.2,6.8,False),(3,1.2,4.2,6.8,False)])
wall('Ostwand mit Chorbogen','y',8,-6,6,7.8,[(-3,4.8,0,6.7,True)])
roof('Langhausdach',-10,8,-6,6,7.8,13.0)
gable(-10,-6,6,7.8,13.5);gable(8,-6,6,7.8,13.5,False)
for x in [-10,8]:
    for y in [-6,6]:box('Eckvorlage',(x,y,3.8),(.9,.9,7.6),plaster,True)

def vault(cx,cy,ax=3,ay=3,base=3.5,rise=3.8,ornament=True):
    def h(u,v):return base+rise*math.sqrt(max(0,1-(u*u+v*v)/2))
    n=24;vs=[];uv=[];fs=[]
    for j in range(n+1):
        for i in range(n+1):
            u=-1+2*i/n;v=-1+2*j/n;vs.append((cx+ax*u,cy+ay*v,h(u,v)));uv.append(((u+1)/2,(v+1)/2))
    for j in range(n):
        for i in range(n):
            a=j*(n+1)+i;fs.append((a,a+n+1,a+n+2,a+1))
    ob=mesh('Gewölbekappe · Geometrie angenähert',vs,fs,vaultmat if ornament else plaster,uv=uv)
    for p in ob.data.polygons:p.use_smooth=True
    for sign in [-1,1]:
        pts=[]
        for i in range(49):
            u=-1+2*i/48;v=sign*u;pts.append((cx+ax*u,cy+ay*v,h(u,v)-.045))
        line('Diagonalrippe',pts,.105,riblight,8)
        for k in range(0,48,4):line('Rote Rippenfassung',pts[k:k+3],.111,ribmat,8)
    for edge in [-1,1]:
        pts=[(cx+ax*(-1+2*i/32),cy+edge*ay,h(-1+2*i/32,edge)-.06) for i in range(33)];line('Gurtbogen',pts,.15,riblight,8)
        pts=[(cx+edge*ax,cy+ay*(-1+2*i/32),h(edge,-1+2*i/32)-.06) for i in range(33)];line('Schildbogen',pts,.15,ribmat,8)
for x in [-7,-1,5]:
    for y in [-3,3]:vault(x,y)
for x in [-4,2]:
    cylinder('Mittelpfeiler',x,0,1.8,.58,3.6,plaster,True,32)
    cylinder('Pfeilerbasis',x,0,.15,.69,.3,stone,n=32)
    cylinder('Kapitellring',x,0,3.45,.69,.22,riblight,n=32)

# Older chancel and eastern sacristy.
box('Chorboden',(12,-3,-.05),(8,6,.1),floor)
wall('Chor Süd','x',-6,8,16,6.0,[(12,1.5,1.9,4.8,False)])
wall('Chor Nord','x',0,8,16,6.0,[(12,1.3,2.1,4.8,False)])
wall('Chor Ost','y',16,-6,0,6.0,[(-.9,1.2,0,2.3,True)])
roof('Chordach',8,16,-6,0,6.0,9.6);gable(16,-6,0,6,10,False)
for x in [10,14]:vault(x,-3,2,3,3,3,True)
box('Sakristeiboden',(18.5,-3,-.05),(5,6,.1),floor)
wall('Sakristei Süd','x',-6,16,21,4.4,[(18.5,1.1,1.6,3.5,False)])
wall('Sakristei Nord','x',0,16,21,4.4)
wall('Sakristei Ost','y',21,-6,0,4.4,[(-3,1.1,1.6,3.5,False)])
box('Sakristeidecke',(18.5,-3,4.35),(5,6,.12),plaster)
roof('Sakristeidach',16,21,-6,0,4.4,7.4);gable(21,-6,0,4.4,7.7,False)

# Southern porch/tower with its transverse stepped gable and small stair turret.
box('Vorhallenboden',(-7,-8,-.05),(6,4,.1),floor)
wall('Vorhalle West','y',-10,-10,-6,7.8)
wall('Vorhalle Ost','y',-4,-10,-6,7.8)
wall('Südportal','x',-10,-10,-4,7.8,[(-7,2.1,0,3.2,True),(-7,1.4,4.7,6.8,False)])
# The porch roof runs north/south: transform the generated roof/gable geometry.
before=set(bpy.data.objects)
roof('Vorhallendach',-4,0,-3,3,7.8,11.8);gable(-4,-3,3,7.8,12.3)
for ob in set(bpy.data.objects)-before:
    for v in ob.data.vertices:
        x,y,z=v.co;v.co=(-7+y,-6+x,z)
cylinder('Treppentürmchen',-10.25,-6.7,6.4,.75,12.8,plaster,True,n=8)
sphere('Turmhaube',(-10.25,-6.7,13.1),(.84,.84,.45),iron,10)
line('Spitze',[(-10.25,-6.7,13.4),(-10.25,-6.7,14.5)],.055,iron)
line('Turmkreuz',[(-10.65,-6.7,14.2),(-9.85,-6.7,14.2)],.05,iron)

category='interior'
# Painted pew blocks, retaining walking aisles and a cross passage.
for cy in [-3,3]:
    for row in range(10):
        x=-8.6+row*1.32
        if -2.2<x<-.2:continue
        for side in [-1,1]:
            yc=cy+side*1.65
            box('Sitzbank',(x,yc,.46),(.48,2.1,.12),wood,True)
            box('Banklehne',(x-.27,yc,.78),(.10,2.15,.64),pew,True)
            for yy in [yc-1.02,yc+1.02]:
                box('Bankwange',(x,yy,.53),(.73,.10,1.06),pew,True)
                box('Bankprofil',(x,yy,1.04),(.82,.14,.065),pewlight)
                # Front-facing painted panels on the aisle ends.
                mesh('Gemalte Bankfüllung',[(x-.30,yy+side*.057,.14),(x+.30,yy+side*.057,.14),(x+.30,yy+side*.057,.91),(x-.30,yy+side*.057,.91)],[(0,1,2,3)],panelmat,uv=[(0,0),(1,0),(1,1),(0,1)])
for cy in [-3,3]:
    for side in [-1,1]:
        box('Bankabschluss',(4.45,cy+side*1.7,.6),(.18,2.2,1.2),pew,True)
        box('Abschlussprofil',(4.45,cy+side*1.7,1.21),(.25,2.3,.08),pewlight)

def photo_board(name,x,y,z,w,h,mat):
    box(name+' Rückwand',(x+.04,y,z),(.12,w+.15,h+.15),wood)
    # Facing west; UV preserves photographic orientation.
    mesh(name,[(x-.035,y-w/2,z-h/2),(x-.035,y+w/2,z-h/2),(x-.035,y+w/2,z+h/2),(x-.035,y-w/2,z+h/2)],[(3,2,1,0)],mat,uv=[(1,0),(0,0),(0,1),(1,1)])
    for yy in [y-w/2,y+w/2]:box('Vergoldeter Altarrahmen',(x-.06,yy,z),(.15,.065,h+.12),brass)
    for zz in [z-h/2,z+h/2]:box('Vergoldeter Altarrahmen',(x-.06,y,zz),(.15,w+.12,.065),brass)
photo_board('Hochaltar · fotografische Oberfläche',15.1,-3,3.3,4.8,1.62,altarphoto)
box('Altarmensa',(14.45,-3,.65),(1.1,2.7,1.3),plaster,True)
box('Altartuch',(13.88,-3,.7),(.03,2.65,1.0),green)
box('Altarplatte',(14.4,-3,1.33),(1.3,2.9,.12),plaster)
photo_board('Trinitätsaltar · fotografische Oberfläche',2.03,-.75,2.9,1.45,3.3,trinityphoto)
box('Trinitätsaltarsockel',(1.7,-.75,.6),(1.3,1.65,1.2),floor,True)
for yy in [-4.35,-1.65]:box('Chorschranke mit Durchgang',(10,yy,.5),(.15,1.6,1),wood,True)
for y in [-5,-1]:box('Schrankenpfosten',(10,y,.7),(.14,.14,1.4),pew)
# Pulpit near the south-eastern part of the nave; geometry and decoration simplified.
cylinder('Kanzelstütze',6.7,-4.9,.8,.32,1.6,wood,True,n=8)
cylinder('Kanzelkorb',6.7,-4.9,1.95,.9,1.25,pew,True,n=8)
cylinder('Kanzelgesims',6.7,-4.9,2.59,1.02,.12,brass,n=8)
cylinder('Schalldeckel',6.7,-4.9,4.3,1.12,.18,pew,n=8)
# Romanesque font as a simplified volumetric object.
cylinder('Taufsteinfuß',-7.8,3,.18,.53,.36,stone,True)
cylinder('Taufsteinschaft',-7.8,3,.6,.25,.8,stone)
cylinder('Taufschale',-7.8,3,1.06,.62,.42,stone)
cylinder('Taufeinsatz',-7.8,3,1.28,.51,.028,brass)
# West organ case, recognisably approximate rather than invented carving.
box('Orgelgehäuse',(-9.2,3,2.1),(.7,3.8,3.5),pew,True)
for i in range(21):
    y=1.3+i*.17;h=1.3+1.1*(.5+.5*math.cos((i-10)/10*math.pi*2))
    cylinder('Orgelpfeife',-8.8,y,2+h/2,.05,h,brass,n=8)

def chandelier(x,y,z):
    line('Kette',[(x,y,z+.3),(x,y,7)],.018,iron)
    cylinder('Leuchterschaft',x,y,z,.055,1,brass,n=10)
    sphere('Messingkugel',(x,y,z-.6),(.24,.24,.28),brass,10)
    for tier,(r,dz) in enumerate([(.8,0),(.51,.55)]):
        for i in range(8):
            a=i*math.tau/8;xx=x+r*math.cos(a);yy=y+r*math.sin(a)
            pts=[(x+r*t*math.cos(a),y+r*t*math.sin(a),z+dz-.22-.30*math.sin(t*math.pi)+.38*t*t) for t in [j/20 for j in range(21)]]
            line('Geschwungener Leuchterarm',pts,.027,brass)
            cylinder('Tropfschale',xx,yy,z+dz+.12,.10,.035,brass,n=10)
            cylinder('Kerze',xx,yy,z+dz+.3,.024,.34,wax,n=6)
for x in [-6,0,5]:
    for y in [-3,3]:chandelier(x,y,4.4)
chandelier(12,-3,4.0)

category='landscape'
box('Wiesengelände',(1,0,-.25),(110,100,.3),grass,scale=.26)
# Paths and gravestones are explicitly scenic approximations, never real grave records.
for x,y,sx,sy in [(-15,0,4,43),(25,0,3,43),(5,10,38,3),(5,-14,38,3),(-7,-12,4,5)]:box('Kiesweg',(x,y,-.065),(sx,sy,.07),gravel)
for x in range(-29,36,4):
    for y in [-23,-19,17,22,27]:
        if abs(x+15)<3:continue
        if random.random()<.18:continue
        h=random.uniform(.55,1.05);w=random.uniform(.4,.7)
        box('Anonymisierter Grabstein',(x+random.uniform(-.3,.3),y,h/2),(.18,w,h),stone,True)
        box('Grabsockel',(x,y,.08),(.36,w+.18,.16),stone)
for x in [-36,38]:
    box('Friedhofsmauer',(x,0,.45),(.65,68,.9),stone,True)
for y in [-34,34]:box('Friedhofsmauer',(1,y,.45),(74,.65,.9),stone,True)
for x,y in [(-32,-29),(-24,-30),(-6,-29),(12,-29),(30,-27),(34,0),(34,27),(18,30),(-3,30),(-27,28),(-33,10),(-32,-7)]:
    h=random.uniform(5.5,8)
    cylinder('Baumstamm',x,y,h/2,.24,h,wood,True,n=8)
    for j in range(6):
        a=j*2.4;r=random.uniform(.5,1.6);sphere('Baumkrone · hypothetisch',(x+math.cos(a)*r,y+math.sin(a)*r,h+random.uniform(-1,1)),(2.2,2.0,2.4),leaves[j%4],7)

# Join by category and material to keep WebGL draw calls low.
for (cat,mat),obs in groups.items():
    obs=[ob for ob in obs if ob.name in bpy.data.objects]
    bpy.ops.object.select_all(action='DESELECT')
    for ob in obs:ob.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]
    if len(obs)>1:bpy.ops.object.join()
    ob=bpy.context.object;ob.name=f'{cat} | {mat}'
    ob['reconstruction']='interpretive; dimensions estimated from photographs'
    ob['category']=cat
    # All thin surfaces must remain visible from the walking side as well.
    for m in ob.data.materials:m.use_backface_culling=False
for img in bpy.data.images:
    if img.source=='FILE':img.pack()
bpy.context.scene.world.color=(.35,.4,.45)
# Authoring camera and lights, retained in the .blend but not exported.
def camera(name,loc,target):
    bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.name=name;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.lens=28;return c
bpy.context.scene.camera=camera('Außenansicht',(-30,-29,16),(0,-1,5))
camera('Innenansicht',(-7,-3,1.65),(14,-3,3))
bpy.ops.object.light_add(type='SUN',location=(-10,-20,25));bpy.context.object.rotation_euler=(.5,-.3,-.5);bpy.context.object.data.energy=3
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/sankt-olof.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'blender/sankt-olof.raw.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_extras=True,export_yup=True,export_materials='EXPORT',export_image_format='AUTO')
(OUT/'collisions.json').write_text(json.dumps(collisions,separators=(',',':')))
print('RECONSTRUCTION_EXPORT',len(collisions),'colliders',round((ROOT/'blender/sankt-olof.raw.glb').stat().st_size/1e6,2),'MB')
