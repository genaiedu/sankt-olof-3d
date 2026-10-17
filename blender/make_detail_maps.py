"""Photographic crops and reconstructed ornament; provenance: docs/RECONSTRUCTION.md."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, math, random
ROOT=Path(__file__).resolve().parents[1]; P=ROOT/'blender/textures'
# Colour adaptations remain separate from the unchanged CC0 source maps.
a=np.asarray(Image.open(P/'white_plaster_02_diff.jpg')).astype(float)
Image.fromarray(np.uint8(218+a*.13)).save(P/'limewash-diff.jpg',quality=94)
a=np.asarray(Image.open(P/'grass_ground_diff.jpg')).astype(float)
a*=np.array([.67,.84,.57]);Image.fromarray(np.uint8(np.clip(a,0,255))).save(P/'grass-green-diff.jpg',quality=93)
a=np.asarray(Image.open(P/'brick_floor_02_diff.jpg')).astype(float)
a*=np.array([1.12,.78,.64]);Image.fromarray(np.uint8(np.clip(a,0,255))).save(P/'brick-red-diff.jpg',quality=94)
Image.open(ROOT/'public/assets/references/11.jpg').crop((415,995,1047,1208)).save(P/'altar-photo.jpg',quality=95)
# Deliberately reconstructed foliage, not a claim to reproduce the fresco iconography.
rng=random.Random(27); N=1024
im=Image.open(P/'white_plaster_02_diff.jpg').resize((N,N)).convert('RGB')
a=np.asarray(im).astype(float);a=a*.84+np.array([18,13,4]);im=Image.fromarray(np.uint8(np.clip(a,0,255)));d=ImageDraw.Draw(im)
for i in range(24):
 x=rng.uniform(30,994);y=rng.uniform(50,974);angle=rng.uniform(0,math.tau)
 pts=[]
 for j in range(75):
  t=j/74; r=10+62*t;ang=angle+7*t; pts.append((x+r*math.cos(ang),y+r*math.sin(ang)))
 d.line(pts,fill=(151,99,77),width=3)
 for j in range(10,70,7):
  xx,yy=pts[j];an=angle+7*j/74
  for side in [-1,1]:
   dx=math.cos(an+side*1.1);dy=math.sin(an+side*1.1)
   d.line([(xx,yy),(xx+dx*15,yy+dy*15)],fill=(158,105,82),width=3)
im.save(P/'vault-ornament.jpg',quality=92)
# Painted pew panel, geometrically reconstructed from the photographic colour scheme.
im=Image.new('RGB',(256,512),(31,64,70));d=ImageDraw.Draw(im)
for inset,col in [(10,(146,155,143)),(20,(47,68,69)),(28,(116,130,115)),(35,(60,76,73))]:d.rectangle((inset,inset,256-inset,512-inset),outline=col,width=6)
d.rounded_rectangle((65,90,191,430),radius=60,fill=(91,106,91),outline=(166,165,140),width=7)
for j in range(7):
 y=175+j*26; d.arc((88,y,153,y+60),10,160,fill=(132,118,88),width=3)
im.save(P/'pew-panel.jpg',quality=93)
