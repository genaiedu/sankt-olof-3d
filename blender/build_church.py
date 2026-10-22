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
collisions=[]; groups={}; category='architecture'; landscape={'trees':[],'grassAreas':[],'interpretation':'Photograph-led scenic approximation; dimensions estimated, not surveyed.'}

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
ribmat=material('Rippen · rekonstruierte Rotfassung',(.42,.23,.17),.88)
riblight=material('Rippen · helle Fugen',(.64,.59,.49),.9)
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
flame=material('Kerzenflamme',(1,.47,.08),.4)
flame.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(1,.25,.025,1)
flame.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=2.6
recess=material('Kalkputz · Vertiefungen',(.67,.68,.63),.96)
tiledeep=material('Dachziegel · dunkle Streuung',(.34,.105,.045),.92)
tilewarm=material('Dachziegel · warme Streuung',(.54,.19,.065),.9)
bark=material('Baumrinde · verzweigte Gerüste',(.18,.145,.10),.97)
shutter=material('Glockengiebel · Eichenlamellen',(.46,.31,.13),.87)
greenmetal=material('Glockengiebel · grünliche Metallhauben',(.15,.27,.23),.6,.55)
oculusmat=material('Seitengiebel · dunkles Ocker im Okulus',(.25,.12,.025),.96)
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

def line(name,pts,r,mat,sides=6,cap=False):
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
    if cap:fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(pts)-1)*sides+j for j in range(sides))])
    ob=mesh(name,vs,fs,mat)
    for p in ob.data.polygons:p.use_smooth=True
    return ob

def cylinder(name,x,y,z,r,h,mat,solid=False,n=20):
    pts=[(x,y,z-h/2),(x,y,z+h/2)];ob=line(name,pts,r,mat,n,cap=True)
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

def arch_height(u,r,bottom,top):
    head=r*1.3; a=(head*head-r*r)/(2*r)
    return top-head+math.sqrt(max(0,(r+a)**2-(abs(u)+a)**2))

def arch_curve(center,r,bottom,top,n=24):
    return [(center-r,bottom)]+[(center-r+2*r*i/n,arch_height(-r+2*r*i/n,r,bottom,top)) for i in range(n+1)]+[(center+r,bottom)]

def wall(name,axis,pos,start,end,height,holes=(),thick=.65,tracery=True):
    # Wall is assembled around actual openings; windows are recessed, not decals.
    def segment(a,b,z0,z1):
        if b-a<.001 or z1-z0<.001:return
        if name=='Ostwand mit Chorbogen' and z0>0:
            # One continuous sloping arch soffit, not stair-stepped box bottoms.
            center,w,bottom,top,isdoor=holes[0]
            za=arch_height(a-center,w/2,bottom,top);zb=arch_height(b-center,w/2,bottom,top)
            verts=[(xx,yy,zz) for xx in [pos-thick/2,pos+thick/2] for yy,zz in [(a,za),(b,zb),(b,z1),(a,z1)]]
            mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],plaster)
            collisions.append({'name':name,'min':[pos-thick/2,a,min(za,zb)],'max':[pos+thick/2,b,z1]})
            return
        loc=[(a+b)/2,pos,(z0+z1)/2] if axis=='x' else [pos,(a+b)/2,(z0+z1)/2]
        size=[b-a,thick,z1-z0] if axis=='x' else [thick,b-a,z1-z0]
        box(name,loc,size,plaster,True)
    cuts={start,end}
    for center,w,bottom,top,isdoor in holes:
        steps=64 if name=='Ostwand mit Chorbogen' else 24
        for i in range(steps+1):cuts.add(center-w/2+w*i/steps)
    cuts=sorted(c for c in cuts if start<=c<=end)
    for a,b in zip(cuts,cuts[1:]):
        mid=(a+b)/2; spans=[]
        for center,w,bottom,top,isdoor in holes:
            r=w/2
            if abs(mid-center)<r:
                spans.append((bottom,arch_height(mid-center,r,bottom,top)))
        z=0
        for low,high in sorted(spans):
            segment(a,b,z,low);z=max(z,high)
        segment(a,b,z,height)
    for center,w,bottom,top,isdoor in sorted(holes):
        left=center-w/2;right=center+w/2;r=w/2;spring=top-r*1.3
        def pt(u,z,offset=0):return (u,pos+offset,z) if axis=='x' else (pos+offset,u,z)
        curve=arch_curve(center,r,bottom,top)
        for side in [-1,1]:
            profiles=[(.0,.066),(.10,.043),(.18,.025)]
            if isdoor and name in ['Südportal','Westwand','Sakristei Ost','Sakristei Süd']:
                profiles=[(.0,.068),(.105,.060),(.21,.052),(.315,.045),(.415,.034)]
            for extra,rad in profiles:
                profile=arch_curve(center,r+extra,bottom-.02,top+extra*1.3)
                line('Gestufte Spitzbogenlaibung',[pt(u,z,side*(thick/2+.022-extra*.16)) for u,z in profile],rad,plaster,6)
        if not isdoor:
            v=[pt(u,z) for u,z in arch_curve(center,r-.04,bottom+.03,top-.04)]
            mesh('Fensterglas',v,[tuple(range(len(v)))],glass)
            for u in [center-w/4,center,center+w/4]:
                z=arch_height(u-center,r,bottom,top);line('Bleisprosse',[pt(u,bottom+.04),pt(u,z-.05)],.012,iron,4)
            for z in [bottom+.35+i*.4 for i in range(int((top-bottom)/.4))]:
                head=r*1.3;a=(head*head-r*r)/(2*r)
                half=r if z<spring else max(0,math.sqrt(max(0,(r+a)**2-(z-spring)**2))-a)
                if half>.03:line('Bleisprosse',[pt(center-half+.04,z),pt(center+half-.04,z)],.012,iron,4)
            if tracery=='simple':
                for side in [-1,1]:
                    off=side*(thick/2-.015)
                    line('Westfenster · heller Mittelpfosten',[pt(center,bottom,off),pt(center,top-.23,off)],.043,plaster,6)
                    for sign in [-1,1]:
                        line('Westfenster · einfache Zweilichtteilung',[pt(u,z,off) for u,z in arch_curve(center+sign*r*.46,r*.40,bottom+.035,top-.22)],.028,plaster,6)
            elif tracery:
                circle_z=top-r*.91;circle_r=r*.34;lancet_top=circle_z-circle_r*.74
                for side in [-1,1]:
                    off=side*(thick/2-.025)
                    line('Maßwerk · Mittelpfosten',[pt(center,bottom,off),pt(center,lancet_top-r*.32,off)],.048,plaster,6)
                    for sign in [-1,1]:
                        line('Maßwerk · Zwillingslanzette',[pt(u,z,off) for u,z in arch_curve(center+sign*r*.46,r*.41,bottom+.04,lancet_top)],.046,plaster,6)
                    line('Maßwerk · Rundokulus',[pt(center+circle_r*math.cos(i*math.tau/24),circle_z+circle_r*math.sin(i*math.tau/24),off) for i in range(25)],.047,plaster,6)
            box('Fensterbank',pt(center,bottom-.06),[w+.28,thick+.33,.15] if axis=='x' else [thick+.33,w+.28,.15],stone)

def roof(name,x0,x1,y0,y1,eave,ridge):
    ym=(y0+y1)/2
    mesh(name,[(x0-.16,y0-.24,eave),(x1+.16,y0-.24,eave),(x1+.16,ym,ridge),(x0-.16,ym,ridge),(x0-.16,y1+.24,eave),(x1+.16,y1+.24,eave)],[(0,1,2,3),(3,2,5,4)],roofmat,.8)
    # Individual curved pan-tile surfaces; a few centimetres of relief survive grazing light.
    for yedge in [y0-.24,y1+.24]:
        dy=ym-yedge;dz=ridge-eave;length=math.hypot(dy,dz);rows=math.ceil(length/.42);cols=math.ceil((x1-x0+.32)/.34)
        for row in range(rows):
            t0=row/rows;t1=min(1,(row+1.10)/rows)
            for col in range(cols):
                xa=x0-.16+(x1-x0+.32)*col/cols;xb=x0-.16+(x1-x0+.32)*(col+1)/cols
                vs=[];tile_uv=[];u0=random.randrange(18)/18;v0=random.randrange(5)/5
                for row_uv,t in enumerate([t0,t1]):
                    for k in range(5):
                        u=k/4;relief=.012+.035*math.sin(u*math.pi)+(.013 if t==t0 else 0)
                        vs.append((xa+(xb-xa)*u,yedge+dy*t,eave+dz*t+relief))
                        tile_uv.append((u0+u*.049,v0+row_uv*.18))
                mesh('Einzelne gewölbte Dachpfanne',vs,[(i,i+1,i+6,i+5) for i in range(4)],roofmat,uv=tile_uv)
        # White fascia, dark gutter, and visible tile ends.
        box('Traufgesims',(sum([x0,x1])/2,yedge+(ym-yedge)*.012,eave-.10),(x1-x0+.2,.20,.17),plaster)
        line('Dachrinne',[(x0-.2,yedge,eave-.07),(x1+.2,yedge,eave-.07)],.052,iron,8)
    for i in range(math.ceil((x1-x0)/.38)):
        xa=x0+i*.38;line('Überlappender Firstziegel',[(xa,ym,ridge+.08),(min(x1+.1,xa+.41),ym,ridge+.08)],.12,roofmat,10)

def solid_gable_core(name,axis,pos,start,end,eave,ridge,thick=.35):
    """Closed triangular masonry prism, independent of applied stepped decoration."""
    outline=[(start,eave),(end,eave),((start+end)/2,ridge)]
    vs=[(pos+d,u,z) if axis=='x' else (u,pos+d,z) for d in [-thick/2,thick/2] for u,z in outline]
    return mesh(name,vs,[(2,1,0),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],plaster)

def porch_roof_join():
    """Extend the cross roof to the main south slope, not to an open vertical end.

    Authored in the same local coordinates as the porch roof, before its rotation.
    The original roof ends at local x=.16. The extension follows the two real
    planar intersection/valley lines; the main roof closes everything beyond them.
    """
    eave=7.8;ridge=12.3;main_ridge=13.0;span=3.24;start=.14
    rng=random.Random(8844) # Keep all existing landscape/tree random choices unchanged.
    def limit(y):
        t=1-abs(y)/span
        return -.24+6.24*(ridge-eave)*t/(main_ridge-eave)+.025
    def clipped(points):
        result=[]
        for a,b in zip(points,points[1:]+points[:1]):
            pa,ua=a;pb,ub=b;fa=limit(pa[1])-pa[0];fb=limit(pb[1])-pb[0]
            if fa>=0:result.append(a)
            if (fa>=0)!=(fb>=0):
                t=fa/(fa-fb)
                result.append((tuple(pa[k]+(pb[k]-pa[k])*t for k in range(3)),tuple(ua[k]+(ub[k]-ua[k])*t for k in range(2))))
        return result
    for edge in [-span,span]:
        # Solid continuous roof plane underneath the pan tiles.
        poly=clipped([((start,edge,eave),(0,0)),((5.22,edge,eave),(1,0)),((5.22,0,ridge),(1,1)),((start,0,ridge),(0,1))])
        mesh('Vorhallendach · geschlossene Anschlussfläche',[p for p,uv in poly],[tuple(range(len(poly)))],roofmat,.8)
        rows=14;cols=15
        for row in range(rows):
            ta=row/rows;tb=min(1,(row+1.10)/rows)
            for col in range(cols):
                xa=start+col*.34;xb=min(5.22,xa+.34)
                if xa>max(limit(edge*(1-ta)),limit(edge*(1-tb))):continue
                u0=rng.randrange(18)/18;v0=rng.randrange(5)/5;grid=[]
                for j,t in enumerate([ta,tb]):
                    for k in range(5):
                        u=k/4;relief=.012+.035*math.sin(u*math.pi)+(.013 if j==0 else 0)
                        grid.append(((xa+(xb-xa)*u,edge*(1-t),eave+(ridge-eave)*t+relief),(u0+u*.049,v0+j*.18)))
                vs=[];uv=[];fs=[]
                for k in range(4):
                    poly=clipped([grid[i] for i in [k,k+1,k+6,k+5]])
                    if len(poly)<3:continue
                    offset=len(vs);vs.extend(p for p,tuv in poly);uv.extend(tuv for p,tuv in poly);fs.append(tuple(range(offset,len(vs))))
                if fs:mesh('Vorhallendach · Anschluss-Dachpfanne',vs,fs,roofmat,uv=uv)
        valley=[]
        for k in range(33):
            y=edge*(1-k/32);x=limit(y)
            if x>=start-.02:valley.append((x,y,eave+(ridge-eave)*k/32+.028))
        line('Vorhallendach · geschlossene Dachkehle',valley,.045,iron,6)
    for i in range(14):
        xa=.08+i*.38;line('Vorhallendach · Anschluss-Firstziegel',[(xa,0,ridge+.08),(min(5.24,xa+.41),0,ridge+.08)],.12,roofmat,10)

def gable(x,y0,y1,eave,ridge,decor=True):
    ym=(y0+y1)/2;hw=(y1-y0)/2;step=hw/5
    # A complete solid gable always seals the attic, even between individual steps.
    # Its outer face remains behind the shallow blind-niche relief.
    solid_gable_core('Giebel · durchgehender geschlossener Mauerkern','x',x+.125,y0,y1,eave,ridge)
    # Thin stepped masonry: coping is distinct from the adjacent roof plane.
    for i in range(5):
        z=eave+(ridge-eave)*(i+1)/5
        for sign in [-1,1]:
            yc=ym+sign*(hw-step*(i+.5));box('Treppengiebel',(x+.10,yc,(eave+z)/2),(.34,step+.02,z-eave),plaster)
            box('Ziegelabdeckung',(x,yc,z+.05),(.72,step+.1,.11),roofmat)
    if decor:
        # Recessed blind panels, with modeled reveal returns and little circular blinding.
        for j in range(-3,4):
            yc=ym+j*1.28;top=ridge-1.75-abs(j)*.64;low=eave+.12;r=.43
            outline=arch_curve(yc,r,low,top)
            mesh('Vertiefte Blendnische',[(x-.086,u,z) for u,z in outline],[tuple(range(len(outline)))],recess)
            line('Blendnische · helle Kante',[(x-.23,u,z) for u,z in outline],.085,plaster,8)
            for k in range(len(outline)-1):
                u0,z0=outline[k];u1,z1=outline[k+1]
                mesh('Blendnische · Laibung',[(x-.085,u0,z0),(x-.23,u0,z0),(x-.23,u1,z1),(x-.085,u1,z1)],[(0,1,2,3)],plaster)
        for yc,z,r in [(ym,ridge-1.0,.36),(ym-2.56,ridge-2.70,.26),(ym+2.56,ridge-2.70,.26)]:
            pts=[(x-.087,yc+r*math.cos(k*math.tau/32),z+r*math.sin(k*math.tau/32)) for k in range(32)]
            mesh('Runde vertiefte Giebelblende',pts,[tuple(range(32))],recess)
            line('Runde Giebelblende · Kalkkante',[(x-.23,yc+r*math.cos(k*math.tau/32),z+r*math.sin(k*math.tau/32)) for k in range(33)],.052,plaster,8)
        # Small central attic opening and the asymmetrical little scaffold sockets.
        box('Giebel · dunkle Dachbodenglugge',(x-.115,ym,eave+1.45),(.05,.20,.54),iron)

# Main hall: six vault bays in two aisles. Estimated dimensions from photographs.
box('Kirchenboden',(-1,0,-.1),(18,12,.2),floor)
wall('Nordmauer','x',6,-10,8,7.8,[(-7,1.8,2.1,5.9,False),(-1,1.8,2.1,5.9,False),(5,1.8,2.1,5.9,False)])
wall('Südmauer','x',-6,-10,8,7.8,[(-7,1.8,2.1,5.9,False),(-1,2,0,3.2,True),(5,1.8,2.1,5.9,False)])
wall('Westwand','y',-10,-6,6,7.8,[(0,1.8,0,3.15,True),(-3,1.3,4.2,6.8,False),(3,1.3,4.2,6.8,False)],tracery='simple')
# The photographs show a low, substantial triumphal arch, with masonry and the
# engaged nave vault console ABOVE its apex, not one opening almost to the vault.
wall('Ostwand mit Chorbogen','y',8,-6,6,7.8,[(0,4.8,0,4.7,True)],thick=.85)
# Keep the roof behind the raised west/east gables; no diagonal tile edge across their faces.
roof('Langhausdach',-9.65,7.85,-6,6,7.8,13.0)
gable(-10,-6,6,7.8,13.5);gable(8,-6,6,7.8,13.5,False)
for x in [-10,8]:
    for y in [-6,6]:
        if x==-10 and y==-6:continue # Dedicated rectangular corner building below.
        box('Rechteckige Eckvorlage',(x,y,3.95),(.95,1.0,7.9),plaster,True)
        box('Eckvorlage · abgesetzter Kopf',(x,y,8.0),(1.02,1.07,.22),plaster)
        roof('Eckvorlage · Ziegelschutz',x-.48,x+.48,y-.49,y+.49,8.12,8.44)
        for z in [1.7,3.3,5.0,6.35]:
            for yy in [y-.27,y+.27]:box('Kleine Gerüstöffnung',(x-.488,yy,z),(.022,.10,.10),iron)
# The user's additional October 2026 photographs show a substantial rectangular
# corner volume. Its purpose is deliberately not inferred; all dimensions are estimates.
corner_x=-10.10;corner_y=-6.02;corner_width=1.10;corner_depth=1.18
box('Kantiger südwestlicher Eckbau',(corner_x,corner_y,5.45),(corner_width,corner_depth,10.90),plaster,True)
for yy in [corner_y-corner_depth/2,corner_y+corner_depth/2]:
    box('Eckbau · weißes Traufprofil',(corner_x,yy,10.84),(corner_width+.10,.16,.18),plaster)
# The narrow steep roof runs north/south, between two real stepped white end walls.
before=set(bpy.data.objects)
roof('Eckbau · schmales steiles Ziegeldach',corner_y-corner_depth/2,corner_y+corner_depth/2,-corner_width/2,corner_width/2,10.98,13.32)
for ob in set(bpy.data.objects)-before:
    for v in ob.data.vertices:
        u,vv,z=v.co;v.co=(corner_x+vv,u,z)
for yy in [corner_y-corner_depth/2,corner_y+corner_depth/2]:
    solid_gable_core('Eckbau · geschlossener Giebelkern','y',yy,corner_x-corner_width/2,corner_x+corner_width/2,10.90,13.70,.25)
    for i in range(3):
        step=corner_width/6;top=10.90+(13.70-10.90)*(i+1)/3
        for sign in [-1,1]:
            xx=corner_x+sign*(corner_width/2-step*(i+.5))
            box('Eckbau · gestufte Giebelstirn',(xx,yy,(10.90+top)/2),(step+.015,.29,top-10.90),plaster)
            box('Eckbau · rote Stufenabdeckung',(xx,yy,top+.035),(step+.07,.41,.085),roofmat)
for z in [2.0,3.7,5.2,7.1,8.9,10.0]:
    for yy in [corner_y-.37,corner_y+.37]:box('Eckbau · kleine Gerüstöffnung',(corner_x-corner_width/2-.012,yy,z),(.025,.095,.105),iron)
for zz in [3.0,6.0,8.4]:box('Eckbau · südliches Gerüstloch',(corner_x-.16,corner_y-corner_depth/2-.012,zz),(.095,.025,.105),iron)
for x in [-9.4,7.5]:
    for y in [-6.25,6.25]:
        line('Fallrohr mit Knie',[(x,y,7.65),(x,y,7.25),(x,y+.12,6.95),(x,y+.12,.20)],.043,iron,8)
for y in [-6.28,6.28]:
    box('Langhaus · Sockelzone',(-1,y,.18),(18.6,.10,.36),plaster)

masonry_rib_seen=set()
def masonry_rib(name,points,width,depth,red=True):
    """Chamfered masonry web with a flat soffit, not a smooth round pipe.

    Photographs show broad rectangular ribs and narrow pale block joints.
    Joint strips share the swept geometry instead of overlapping another tube.
    """
    # Adjacent vault caps share ONE arch, not two coincident shadow-casting webs.
    curve=tuple(tuple(round(v,5) for v in p) for p in points)
    key=(width,depth,red,min(curve,tuple(reversed(curve))))
    if key in masonry_rib_seen:return
    masonry_rib_seen.add(key)
    pts=[];joints=[];distance=0;block=.68;joint=.024
    for k,(aa,bb) in enumerate(zip(points,points[1:])):
        a=Vector(aa);b=Vector(bb);length=(b-a).length
        if k==0:pts.append(a)
        cuts=[0,length]
        for j in range(math.floor(distance/block),math.ceil((distance+length)/block)+1):
            for boundary in [j*block,j*block+joint]:
                if distance+1e-6<boundary<distance+length-1e-6:cuts.append(boundary-distance)
        cuts=sorted(cuts)
        for low,high in zip(cuts,cuts[1:]):
            pts.append(a+(b-a)*(high/length));joints.append((distance+(low+high)/2)%block<joint)
        distance+=length
    # A bevel at the lower two corners catches light like a built rib profile.
    profile=[(-.5,-1.25),(.5,-1.25),(.5,.25),(.30,.55),(-.30,.55),(-.5,.25)]
    vs=[];fs=[]
    for i,p in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized();normal=tangent.cross(Vector((0,0,1)))
        if normal.length<.01:normal=Vector((1,0,0))
        normal.normalize();down=tangent.cross(normal).normalized()
        for u,v in profile:vs.append(tuple(p+normal*(u*width)+down*(v*depth)))
    for i in range(len(pts)-1):
        for j in range(6):fs.append((i*6+j,i*6+(j+1)%6,(i+1)*6+(j+1)%6,(i+1)*6+j))
    fs.extend([tuple(range(5,-1,-1)),tuple((len(pts)-1)*6+j for j in range(6))])
    ob=mesh(name,vs,fs,ribmat if red else riblight)
    ob.data.materials.append(riblight if red else ribmat)
    for i,is_joint in enumerate(joints):
        for j in range(6):ob.data.polygons[i*6+j].material_index=1 if red and is_joint else 0
    return ob

def vault(cx,cy,ax=3,ay=3,base=3.5,rise=3.8,ornament=True):
    def h(u,v):
        dome=math.sqrt(max(0,1-(u*u+v*v)/2));height=base+rise*dome
        if cx==5 and abs(cy)==3 and ax==3:
            # Both eastern nave cells share this one wall-attached spring above
            # the chancel arch. Blend the complete cap and EVERY rib together;
            # no detached stub, added floor column, or disconnected cover plate.
            inner=(1-math.copysign(1,cy)*v)/2
            end=min(1,max(0,(cx+ax*u-6.6)/.95));end=end*end*(3-2*end)
            weight=end*inner**4
            height=height*(1-weight)+5.25*weight
        return height
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
        masonry_rib('Diagonalrippe · gemauertes Fasenprofil',pts,.23,.21)
    for edge in [-1,1]:
        pts=[(cx+ax*(-1+2*i/32),cy+edge*ay,h(-1+2*i/32,edge)-.055) for i in range(33)];masonry_rib('Gurtbogen · breites Mauerprofil',pts,.34,.26,False)
        pts=[(cx+edge*ax,cy+ay*(-1+2*i/32),h(edge,-1+2*i/32)-.055) for i in range(33)];masonry_rib('Schildbogen · gefasstes Mauerprofil',pts,.31,.25)
for x in [-7,-1,5]:
    for y in [-3,3]:vault(x,y)
for x in [-4,2]:
    # Archaeological report 2015:10, p.8: western pier round, eastern ten-sided.
    cylinder('Mittelpfeiler',x,0,1.8,.58,3.6,plaster,True,32 if x<0 else 10)
    cylinder('Pfeilerbasis',x,0,.15,.69,.3,stone,n=32)
    cylinder('Kapitellring',x,0,3.45,.69,.22,plaster,n=32 if x<0 else 10)
    cylinder('Pfeiler · rotes unteres Kämpferband',x,0,3.33,.635,.055,ribmat,n=32 if x<0 else 10)
    cylinder('Pfeiler · rotes oberes Kämpferband',x,0,3.58,.70,.055,ribmat,n=32 if x<0 else 10)

# A true engaged wall console, visible above the lowered choir arch in refs
# 07–10 and the user's close view. It meets the continuous eastern vault cells.
console_top=5.20
verts=[(x,y,z) for z,w,front in [(4.83,.23,7.62),(5.13,.44,7.33)] for x,y in [(front,-w),(8.08,-w),(8.08,w),(front,w)]]
mesh('Chorbogen · wandgebundene Gewölbekonsole',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],plaster)
box('Chorbogen · heller Kämpfer',(7.72,0,5.14),(.80,1.02,.12),plaster)
box('Chorbogen · schmales rotes Kämpferband',(7.70,0,5.205),(.84,1.06,.045),ribmat)
collisions.append({'name':'Chorbogen · wandgebundene Gewölbekonsole','min':[7.28,-.53,4.83],'max':[8.12,.53,5.23]})

# Older chancel and eastern sacristy. Their shared y=0 axis is a photographic
# approximation from the aerial and opposing exterior views, not a measured plan.
box('Chorboden',(12,0,-.05),(8,6,.1),floor)
wall('Chor Süd','x',-3,8,16,6.0,[(10.1,1.55,1.7,4.8,False),(14.0,1.55,1.7,4.8,False)])
wall('Chor Nord','x',3,8,16,6.0,[(12,1.3,2.1,4.8,False)])
wall('Chor Ost','y',16,-3,3,6.0,[(2.1,1.2,0,2.3,True)])
roof('Chordach',8,16,-3,3,6.0,9.6);gable(16,-3,3,6,10,False)
for x in [10,14]:vault(x,0,2,3,3,3,True)
box('Sakristeiboden',(18.5,0,-.05),(5,6,.1),floor)
wall('Sakristei Süd','x',-3,16,21,4.4,[(18.5,1.1,0,2.3,True)])
# The new southeast reference shows a brown, ground-level pointed door here.
# Model the leaf closed, preserving the existing interior access via the chancel.
door_outline=arch_curve(18.5,.515,.025,2.265)
door_verts=[(x,y,z) for y in [-3.18,-2.94] for x,z in door_outline];door_n=len(door_outline)
door_faces=[tuple(range(door_n-1,-1,-1)),tuple(range(door_n,door_n*2))]+[(i,(i+1)%door_n,(i+1)%door_n+door_n,i+door_n) for i in range(door_n)]
mesh('Sakristei · geschlossene braune Südportaltür',door_verts,door_faces,wood)
collisions.append({'name':'Sakristei Südportal · geschlossene Tür','min':[17.95,-3.18,0],'max':[19.05,-2.94,2.3]})
for z in [.28,.56,.84,1.12,1.40,1.66,1.90,2.08]:
    half=.50
    while half>.025 and arch_height(half,.515,.025,2.265)<z:half-=.02
    if half>.025:line('Sakristeitür · schmale horizontale Brettfuge',[(18.5-half,-3.185,z),(18.5+half,-3.185,z)],.005,iron,4)
box('Sakristeitür · dunkler Beschlag',(18.79,-3.195,1.06),(.045,.025,.16),iron)
line('Sakristeitür · schlichter Griff',[(18.79,-3.218,1.09),(18.65,-3.218,1.09)],.012,iron,6)
wall('Sakristei Nord','x',3,16,21,4.4)
wall('Sakristei Ost','y',21,-3,3,4.4,[(0,1.1,1.6,3.5,False)])
box('Sakristeidecke',(18.5,0,4.35),(5,6,.12),plaster)
roof('Sakristeidach',16,21,-3,3,4.4,7.4);gable(21,-3,3,4.4,7.7,False)

# Southern porch and its tall, THIN bell gable, not a cylindrical stair tower.
# This assembly is authored around local x=-7, then moved six units east below:
# the photograph-confirmed porch west wall is x=-4, recessed from west facade x=-10.
porch_objects_start=set(bpy.data.objects);porch_collision_start=len(collisions)
box('Vorhallenboden',(-7,-9,-.05),(6,6,.1),floor)
wall('Vorhalle West','y',-10,-12,-6,7.8,[(-10.3,1.55,1.9,5.5,False)])
wall('Vorhalle Ost','y',-4,-12,-6,7.8,[(-8,1.35,2.2,5.1,False)])
wall('Südportal','x',-12,-10,-4,7.8,[(-7,2.1,0,3.5,True),(-7,1.8,6.6,11.45,True)])
# The porch roof runs north/south: transform the generated roof/gable geometry.
before=set(bpy.data.objects)
roof('Vorhallendach',-6,0,-3,3,7.8,12.3)
porch_roof_join()
for ob in set(bpy.data.objects)-before:
    for v in ob.data.vertices:
        x,y,z=v.co;v.co=(-7+y,-6+x,z)
# The little side gables on the porch are visible from opposite sides in the
# additional user photographs. Their oculi are cut through masonry, with deep returns.
def side_oculus_gable(wall_x,outward,cy):
    half=1.05;eave=7.8;cz=9.36;radius=.32;front=wall_x+outward*.39;back=wall_x-outward*.08
    def silhouette(y):
        d=abs(y-cy)
        return 11.38 if d<.32 else (10.62 if d<.68 else 9.83)
    steps=104
    for i in range(steps):
        a=cy-half+2*half*i/steps;b=cy-half+2*half*(i+1)/steps;mid=(a+b)/2;top=silhouette(mid)
        spans=[(eave,top)]
        if abs(mid-cy)<radius:
            dz=math.sqrt(max(0,radius*radius-(mid-cy)**2));spans=[(eave,cz-dz),(cz+dz,top)]
        for low,high in spans:
            if high>low:box('Seitlicher Treppengiebel · Mauer mit Rundöffnung',((front+back)/2,mid,(low+high)/2),(abs(front-back),b-a+.002,high-low),plaster)
    for a,b,z in [(-half,-.68,9.83),(-.68,-.32,10.62),(-.32,.32,11.38),(.32,.68,10.62),(.68,half,9.83)]:
        box('Seitengiebel · rote Stufenabdeckung',((front+back)/2,cy+(a+b)/2,z+.035),(abs(front-back)+.12,b-a+.055,.08),roofmat)
    n=48;outer=.46;inside=radius;verts=[]
    for x,r in [(front+outward*.025,outer),(front+outward*.025,inside),(back,inside)]:
        verts.extend([(x,cy+r*math.cos(k*math.tau/n),cz+r*math.sin(k*math.tau/n)) for k in range(n)])
    # White front ring and an actual cylindrical inner stone reveal.
    mesh('Okulus · plastische weiße Steinumfassung',verts,[(k,(k+1)%n,(k+1)%n+n,k+n) for k in range(n)],plaster)
    mesh('Okulus · tiefe runde Laibung',verts,[(n+k,n+(k+1)%n,2*n+(k+1)%n,2*n+k) for k in range(n)],recess)
    disk=[(back-outward*.025,cy+inside*math.cos(k*math.tau/n),cz+inside*math.sin(k*math.tau/n)) for k in range(n)]
    mesh('Okulus · zurückliegender dunkler Ockerabschluss',disk,[tuple(range(n))],oculusmat)
    cylinder_axis=[(wall_x+outward*.345,cy-.25,6.67),(wall_x+outward*.345,cy-.25,6.79)]
    line('Seitengiebel · kleiner dunkler Wandanker',cylinder_axis,.045,iron,6)
side_oculus_gable(-10,-1,-10.3);side_oculus_gable(-4,1,-8)
# Explicit front is stepped around the tall pointed sound opening.
for i in range(5):
    halfwidth=3-i*.52;low=7.8+i*1.12;high=low+1.12
    # Leave the central opening genuinely open through the gable masonry.
    n=math.ceil(halfwidth*2/.08)
    for j in range(n):
        xa=-7-halfwidth+2*halfwidth*j/n;xb=-7-halfwidth+2*halfwidth*(j+1)/n;mid=(xa+xb)/2
        cut=arch_height(mid+7,.9,6.6,11.45) if abs(mid+7)<.9 else 6.6
        z0=max(low,cut)
        if high>z0:box('Südlicher Glockengiebel · Mauer',(mid,-12,(z0+high)/2),(xb-xa+.003,.44,high-z0),plaster)
    for side in [-1,1]:
        box('Glockengiebel · Ziegelstufen',(-7+side*(halfwidth-.26),-12,high+.045),(.59,.62,.09),roofmat)
# Dark recess behind louver slats; the light wood is legible through the pointed opening.
outline=arch_curve(-7,.88,6.6,11.42)
mesh('Glockenöffnung · Schatten',[ (x,-11.87,z) for x,z in outline],[tuple(range(len(outline)))],wood)
for zz in [6.65+i*.16 for i in range(29)]:
    half=.84
    while half>.02 and arch_height(half,.9,6.6,11.45)<zz:half-=.025
    if half>.03:
        slat=box('Glockengiebel · einzelne Holzlamelle',(-7,-12.06,zz),(2*half,.13,.09),shutter)
        # A horizontal highlight on each projecting edge makes the louver relief visible.
        box('Lamellenkante',(-7,-12.135,zz+.045),(2*half,.035,.025),shutter)
line('Glockengiebel · Mittelpfosten',[(-7,-12.14,6.65),(-7,-12.14,11.22)],.052,shutter,6)
line('Glockenöffnung · hölzerner Rundokulus',[(-7+.25*math.cos(k*math.tau/32),-12.145,10.97+.25*math.sin(k*math.tau/32)) for k in range(33)],.025,shutter,6)
for sign in [-1,1]:
    line('Glockenöffnung · hölzerne Zwillingslanzette',[(u,-12.145,z) for u,z in arch_curve(-7+sign*.39,.34,6.67,10.61)],.025,shutter,6)
for r,off in [(1.0,-12.29),(1.10,-12.265),(1.2,-12.235),(1.30,-12.205)]:
    line('Glockenöffnung · gestuftes Spitzbogenprofil',[(u,off,z) for u,z in arch_curve(-7,r,6.48,11.45+(r-.9)*1.3)],.064,plaster,8)
for sign in [-1,1]:
    for j in range(3):
        xx=-7+sign*(1.52+j*.49);top=12.65-j*.98
        outline=arch_curve(xx,.18,8.0,top)
        mesh('Glockengiebel · schlanke Blendnische',[(u,-12.235,z) for u,z in outline],[tuple(range(len(outline)))],recess)
        line('Glockengiebel · Nischenkante',[(u,-12.30,z) for u,z in outline],.038,plaster,6)
for j in range(7):
    xx=-9.35+j*.78;outline=arch_curve(xx,.20,5.05,5.70)
    mesh('Glockengiebel · Blendbogenfries',[(u,-12.337,z) for u,z in outline],[tuple(range(len(outline)))],recess)
box('Glockengiebel · quadratischer Scheitel',(-7,-12,13.86),(.93,.48,1.04),plaster)
box('Glockengiebel · Scheitelgesims',(-7,-12,14.40),(1.10,.69,.15),plaster)
for xx in [-9.45,-4.55]:
    box('Glockengiebel · seitliche schmale Vorlage',(xx,-12.17,3.86),(.36,.36,7.72),plaster)
    box('Glockengiebel · Haubenuntergesims',(xx,-12.17,7.80),(.73,.63,.16),plaster)
    a=.43;b=.38;z=7.9
    mesh('Glockengiebel · kleine grünliche Metallhaube',[(xx-a,-12.17-b,z),(xx+a,-12.17-b,z),(xx+a,-12.17+b,z),(xx-a,-12.17+b,z),(xx,-12.17,z+.42)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],greenmetal)
    for dx,dy in [(-a,-b),(a,-b),(a,b),(-a,b)]:line('Metallhaube · Falznaht',[(xx+dx,-12.17+dy,z),(xx,-12.17,z+.42)],.012,greenmetal,4)
mesh('Glockengiebel · kantige Metallhaube',[(-7.60,-12.40,14.48),(-6.40,-12.40,14.48),(-6.40,-11.60,14.48),(-7.60,-11.60,14.48),(-7,-12,14.78)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],iron)
sphere('Glockengiebel · kleiner Metallknauf',(-7,-12,14.96),(.16,.16,.23),iron,10)
line('Glockengiebel · Kreuzstamm',[(-7,-12,15.12),(-7,-12,16.15)],.045,iron,8)
line('Glockengiebel · Kreuzquerbalken',[(-7.45,-12,15.78),(-6.55,-12,15.78)],.045,iron,8)
for xx,zz in [(-7,16.15),(-7.45,15.78),(-6.55,15.78)]:
    sphere('Glockengiebel · Kreuzendknopf',(xx,-12,zz),(.09,.055,.09),iron,8)
for ob in set(bpy.data.objects)-porch_objects_start:
    for v in ob.data.vertices:v.co.x+=6
for collider in collisions[porch_collision_start:]:
    collider['min'][0]+=6;collider['max'][0]+=6

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
photo_board('Hochaltar · fotografische Oberfläche',15.1,0,3.3,4.8,1.62,altarphoto)
box('Altarmensa',(14.45,0,.65),(1.1,2.7,1.3),plaster,True)
box('Altartuch',(13.88,0,.7),(.03,2.65,1.0),green)
box('Altarplatte',(14.4,0,1.33),(1.3,2.9,.12),plaster)
photo_board('Trinitätsaltar · fotografische Oberfläche',2.03,-.75,2.9,1.45,3.3,trinityphoto)
box('Trinitätsaltarsockel',(1.7,-.75,.6),(1.3,1.65,1.2),floor,True)
for yy in [-1.35,1.35]:box('Chorschranke mit Durchgang',(10,yy,.5),(.15,1.6,1),wood,True)
for y in [-2,2]:box('Schrankenpfosten',(10,y,.7),(.14,.14,1.4),pew)
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
            sphere('Kleine Kerzenflamme',(xx,yy,z+dz+.52),(.022,.022,.070),flame,6)
for x in [-6,0,5]:
    for y in [-3,3]:chandelier(x,y,4.4)
chandelier(12,0,4.0)

category='landscape'
# Keep every walkable path and the church threshold at zero. Only the outer edge slopes down.
vs=[];fs=[];nx=28;ny=26
for j in range(ny+1):
    y=-50+100*j/ny
    for i in range(nx+1):
        x=-54+110*i/nx;outside=max(abs(x-1)-38,abs(y)-34,0)
        vs.append((x,y,-.09-min(.85,outside*.065)))
for j in range(ny):
    for i in range(nx):
        a=j*(nx+1)+i;fs.append((a,a+1,a+nx+2,a+nx+1))
mesh('Kirchhofrasen · nur Rand abfallend',vs,fs,grass,.26)
landscape['groundZ']=0
landscape['treeHeightMeaning']='height is the nominal branch-system height above ground; crownZ=height-1 is the foliage centre; radius is the foliage crown radius; all positions use Blender x-east/y-north/z-up.'
landscape['paths']=[];landscape['pathPolylines']=[]
def path_rect(x,y,width,depth):
    # Tiny height offsets prevent coplanar intersections from flickering in WebGL.
    box('Heller Kirchhof-Kiesweg',(x,y,-.035+len(landscape['paths'])*.00012),(width,depth,.06),gravel)
    landscape['paths'].append({'x':x,'y':y,'width':width,'depth':depth})
def path_strip(points,width):
    vs=[];closed=points[0]==points[-1];count=len(points)-1 if closed else len(points)
    for i,(x,y) in enumerate(points):
        p=Vector(points[(i-1)%count] if closed else points[max(0,i-1)]);q=Vector(points[(i+1)%count] if closed else points[min(len(points)-1,i+1)]);t=(q-p).normalized();n=Vector((-t.y,t.x))*width/2
        vs.extend([(x+n.x,y+n.y,-.003),(x-n.x,y-n.y,-.003)])
    mesh('Geschwungener Kiesweg um die Kirche',vs,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(points)-1)],gravel)
    landscape['pathPolylines'].append({'points':[list(p) for p in points],'width':width})
    # Conservative axis-aligned masks also support a simple grass-exclusion client.
    for a,b in zip(points,points[1:]):
        landscape['paths'].append({'x':(a[0]+b[0])/2,'y':(a[1]+b[1])/2,'width':abs(b[0]-a[0])+width,'depth':abs(b[1]-a[1])+width})
ring=[(-13,-8),(-12,-9),(-8,-9),(-6,-11),(-5.8,-13),(-3,-14.3),(1,-14.3),(5,-12.5),(7,-10),(17,-5.9),(23.4,-5.6),(24.0,0),(23.4,4.7),(19,5.7),(10,5.7),(7.4,8.5),(-6,8.8),(-11,7.8),(-13,5),(-13,-8)]
path_strip(ring,2.3)
for args in [(-24,0,23,2.5),(-26,13,29,2.1),(-26,-15,29,2.1),(-16.5,-22,2.3,16),(-31,-3,2.0,55),(9,-17.5,2.1,14),(17,16.5,2.1,21),(28,-4,2.3,57),(1,25,56,2.1),(-4,-25,53,2.1),(-1,-13.1,2.8,2.4)]:path_rect(*args)
landscape['grassAreas']=[{'x':1,'y':0,'width':71,'depth':63}]
landscape['exclusions']=[{'x':-.9,'y':0,'width':21,'depth':14},{'x':14.5,'y':0,'width':16,'depth':8},{'x':-1,'y':-9,'width':8,'depth':8},{'x':32,'y':9,'width':8,'depth':6}]
landscape['walkRoutes']={'westToAltar':[[-13,0],[-9.3,0],[-9.3,-3],[6,-3],[6,0],[13.5,0]],'southToAltar':[[-1,-13.5],[-1,-3],[6,-3],[6,0],[13.5,0]],'southPortal':[-1,-12],'porchDoor':[-1,-6],'choirPortal':[8,0],'sacristyDoor':[16,2.1]}

def near_path(x,y,pad=.9):
    return any(abs(x-p['x'])<p['width']/2+pad and abs(y-p['y'])<p['depth']/2+pad for p in landscape['paths'])

def grave(x,y,style):
    h=random.uniform(.55,1.15);w=random.uniform(.48,.80)
    box('Anonymer Grabsockel',(x,y,.07),(.40,w+.20,.14),stone)
    if style==0:
        box('Anonymer rechteckiger Grabstein',(x,y,h/2+.12),(.18,w,h),stone,True)
    elif style==1:
        # Rounded head is a shallow stone slab, not a decorative sphere.
        outline=[(y-w/2,.13),(y+w/2,.13),(y+w/2,h*.70)]+[(y+math.cos(k*math.pi/16)*w/2,h*.70+math.sin(k*math.pi/16)*w*.45) for k in range(17)]
        verts=[(x+side*.10,yy,zz) for side in [-1,1] for yy,zz in outline];n=len(outline)
        faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        mesh('Anonymer Grabstein mit Rundkopf',verts,faces,stone)
    elif style==2:
        box('Anonymes Steinkreuz · Stamm',(x,y,h*.65),(.17,.15,h*1.25),stone)
        box('Anonymes Steinkreuz · Arme',(x,y,h*.95),(.17,w*.9,.15),stone)
    elif style==3:
        r=w*.35
        mesh('Anonymer Obelisk',[(x+dx*r,y+dy*r,.14) for dx,dy in [(-1,-1),(1,-1),(1,1),(-1,1)]]+[(x+dx*r*.58,y+dy*r*.58,h*1.4) for dx,dy in [(-1,-1),(1,-1),(1,1),(-1,1)]]+[(x,y,h*1.65)],[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,8),(5,6,8),(6,7,8),(7,4,8)],stone)
    else:
        box('Anonyme liegende Grabplatte',(x+.48,y,.12),(.95,w,.11),stone)
    if style in [0,1,3] and random.random()<.65:
        # Low narrow stone edging and soil bed; no names or copied grave inscriptions.
        bx=x+.82;bw=1.45;bd=w+.18
        for yy in [y-bd/2,y+bd/2]:box('Grabbeet · Einfassung',(bx,yy,.075),(bw,.065,.13),stone)
        for xx in [bx-bw/2,bx+bw/2]:box('Grabbeet · Einfassung',(xx,y,.075),(.065,bd,.13),stone)
        box('Grabbeet · dunkle Erde',(bx,y,.019),(bw-.10,bd-.10,.03),wood)
    landscape.setdefault('graveAreas',[]).append({'x':x+.4,'y':y,'width':1.8,'depth':w+.3})

for x in range(-28,36,3):
    for y in [-30,-27,-22,-19,-16,-11,11,16,19,22,28,31]:
        xx=x+random.uniform(-.25,.25);yy=y+random.uniform(-.18,.18)
        if near_path(xx,yy) or (-13<xx<25 and -14<yy<10) or (29<xx<36 and 5<yy<13):continue
        if random.random()<.15:continue
        grave(xx,yy,random.choices(range(5),weights=[50,30,4,5,11])[0])

def rough_block(name,loc,size):
    x,y,z=loc;a,b,c=[v/2 for v in size]
    vs=[(x+dx*a+random.uniform(-.07,.07),y+dy*b+random.uniform(-.045,.045),z+dz*c+random.uniform(-.035,.035)) for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],stone)

def stone_wall(axis,pos,a,b,gate=None):
    spans=[(a,b)] if gate is None else [(a,gate-1.65),(gate+1.65,b)]
    for low,high in spans:
        for row in range(3):
            u=low
            while u<high:
                size=min(random.uniform(.55,1.13),high-u)
                if size<.08:break
                loc=(u+size/2,pos,.15+row*.28) if axis=='x' else (pos,u+size/2,.15+row*.28)
                rough_block('Kirchhof · einzelne Bruchsteine',loc,(size,.66,.28) if axis=='x' else (.66,size,.28));u+=size
        loc=((low+high)/2,pos,.43) if axis=='x' else (pos,(low+high)/2,.43)
        size=(high-low,.61,.86) if axis=='x' else (.61,high-low,.86)
        # Invisible collision volume keeps the visually irregular wall continuous.
        x,y,z=loc;aa,bb,cc=[v/2 for v in size];collisions.append({'name':'Kirchhofmauer','min':[x-aa,y-bb,z-cc],'max':[x+aa,y+bb,z+cc]})
stone_wall('x',-34,-36,38,9);stone_wall('x',34,-36,38,28)
stone_wall('y',-36,-34,34,-3);stone_wall('y',38,-34,34,9)
for yy in [-4.7,-1.3]:
    box('Westlicher Torpfosten',(-36,yy,.68),(.67,.67,1.36),plaster,True)
    box('Torpfosten · Steinabdeckung',(-36,yy,1.39),(.79,.79,.12),stone)
    for z in [.4,.85,1.13]:line('Geöffnetes Kirchhoftor',[(-36,yy,z),(-33.5,yy,z)],.025,iron,6)
    for i in range(8):line('Kirchhoftor · Stäbe',[(-36+i*.34,yy,.30),(-36+i*.34,yy,1.2)],.017,iron,5)

# Plain red-roofed cemetery service shed, scaled from the contextual aerial reference.
box('Kirchhof · kleiner Nebenbau',(32,9,1.25),(6,3.4,2.5),plaster,True)
roof('Nebenbau · rotes Ziegeldach',29,35,7.3,10.7,2.55,3.65)
for xx in [30,32.4]:box('Nebenbau · dunkle Tür',(xx,7.285,1.03),(1.0,.05,2.06),wood)
for xx in [30.3,33.5]:box('Nebenbau · kleines Fenster',(xx,10.725,1.48),(.74,.035,.70),glass)
def bench(x,y):
    for j in range(5):box('Kirchhofbank · Sitzlatte',(x,y+(j-2)*.105,.49),(1.8,.09,.075),wood)
    for j in range(3):box('Kirchhofbank · Rückenlatte',(x,y+.27,.77+j*.12),(1.8,.065,.09),wood)
    for xx in [x-.68,x+.68]:
        line('Kirchhofbank · Metallgestell',[(xx,y-.20,.04),(xx,y-.20,.47),(xx,y+.25,.47),(xx,y+.29,1.08)],.035,iron,6)
bench(-19,8.5);bench(20,-13);bench(-22,-12)

def tapered_branch(points,radii):
    vs=[];fs=[];sides=5
    for i,p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)]);tangent.normalize();a=tangent.cross(Vector((0,0,1)))
        if a.length<.01:a=tangent.cross(Vector((0,1,0)))
        a.normalize();b=tangent.cross(a).normalized()
        for k in range(sides):vs.append(tuple(Vector(p)+radii[i]*(a*math.cos(k*math.tau/sides)+b*math.sin(k*math.tau/sides))))
    for i in range(len(points)-1):
        for k in range(sides):fs.append((i*sides+k,i*sides+(k+1)%sides,(i+1)*sides+(k+1)%sides,(i+1)*sides+k))
    ob=mesh('Natürlich verzweigter Baum · Astgerüst',vs,fs,bark)
    for p in ob.data.polygons:p.use_smooth=True

def tree(x,y,h,r,seed):
    rng=random.Random(seed);lean=Vector((rng.uniform(-.5,.5),rng.uniform(-.5,.5),0));base=Vector((x,y,0))
    stem=[base+lean*(i/6)**1.4+Vector((rng.uniform(-.05,.05),rng.uniform(-.05,.05),h*.88*i/6)) for i in range(7)]
    tapered_branch([tuple(p) for p in stem],[.25*(1-i/7)**1.1+.025 for i in range(7)])
    collisions.append({'name':'Baumstamm','min':[x-.28,y-.28,0],'max':[x+.28,y+.28,2.0]})
    def fork(start,vec,width,depth):
        mid=start+vec*.48+Vector((rng.uniform(-.12,.12),rng.uniform(-.12,.12),rng.uniform(-.04,.14)))
        end=start+vec
        tapered_branch([tuple(start),tuple(mid),tuple(end)],[width,width*.62,max(.012,width*.24)])
        if depth:
            for side in [-1,1]:
                angle=math.atan2(vec.y,vec.x)+side*rng.uniform(.38,.86);length=vec.length*rng.uniform(.46,.65)
                branch=Vector((math.cos(angle)*length*.82,math.sin(angle)*length*.82,length*rng.uniform(.32,.70)))
                fork(end,branch,width*.47,depth-1)
    for i in range(9):
        t=.40+i*.054;angle=i*2.399+rng.uniform(-.18,.18);spread=r*rng.uniform(.47,.72)
        start=base+lean*t+Vector((0,0,h*t));vec=Vector((math.cos(angle)*spread,math.sin(angle)*spread,h*rng.uniform(.20,.32)))
        fork(start,vec,.13*(1-t)+.018,2)
    landscape['trees'].append({'x':x,'y':y,'groundZ':0,'height':h,'radius':r,'crownZ':h-1,'seed':seed})

tree_positions=[(-33,-29),(-24,-31),(-13,-31),(-2,-31),(10,-31),(23,-30),(34,-28),(35,-15),(35,-2),(35,22),(30,30),(19,31),(7,31),(-5,31),(-18,31),(-30,29),(-33,18),(-33,6),(-33,-13),(-18,17.5),(-14,5),(18,7)]
for i,(x,y) in enumerate(tree_positions):
    small=i>=19;tree(x,y,random.uniform(4.1,5.1) if small else random.uniform(8.0,10.5),random.uniform(1.55,2.0) if small else random.uniform(2.6,3.7),3200+i*17)

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
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/sankt-olof.blend'))
RAW=Path('/private/tmp/sankt-olof-detailed.raw.glb')
bpy.ops.export_scene.gltf(filepath=str(RAW),export_format='GLB',export_cameras=False,export_lights=False,export_extras=True,export_yup=True,export_materials='EXPORT',export_image_format='AUTO')
(OUT/'collisions.json').write_text(json.dumps(collisions,separators=(',',':')))
(OUT/'landscape.json').write_text(json.dumps(landscape,separators=(',',':')))
triangles=sum(len(p.vertices)-2 for ob in bpy.data.objects if ob.type=='MESH' for p in ob.data.polygons)
print('RECONSTRUCTION_EXPORT',len(collisions),'colliders',round(RAW.stat().st_size/1e6,2),'MB',triangles,'triangles',len(bpy.data.materials),'materials',len(landscape['trees']),'trees')
