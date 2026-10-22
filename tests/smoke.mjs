import {readFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pointBlocked} from '../src/navigation.js';
const json=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const raw=await json('../public/assets/collisions.json');
const boxes=raw.map(b=>({min:{x:b.min[0],y:b.min[2],z:-b.max[1]},max:{x:b.max[0],y:b.max[2],z:-b.min[1]}}));
// Open portals and the complete central route must remain traversable after Blender changes.
for(const [name,x,z] of [['Westportal',-10,0],['Südportal',-1,12],['Vorhallentür',-1,6],['Chorbogen',8,0],['Sakristeitür',16,-2.1]])assert.equal(pointBlocked(x,z,boxes),false,name);
for(const [a,b] of [[[-13,0],[-9.3,0]],[[-9.3,0],[-9.3,3]],[[-9.3,3],[6,3]],[[6,3],[6,0]],[[6,0],[13.5,0]],[[-1,13.5],[-1,3]]]){
  const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.08);
  for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;assert.equal(pointBlocked(x,z,boxes),false,`Durchgehende Portalroute bei ${x},${z}`);}
}
assert.equal(pointBlocked(-10,2.8,boxes),true,'Altes seitlich versetztes Westportal ist nun eine geschlossene Wand');
assert.equal(pointBlocked(-7,6,boxes),true,'Rücksprungwand ist keine offene frühere Vorhallentür');
for(const [name,x,z] of [['Nordwand',5,-6],['Westwand',-10,-3],['Mittelpfeiler',-4,0],['Altar',14.45,0],['Banklehne',-8.87,4.6]])assert.equal(pointBlocked(x,z,boxes),true,name);
const glb=await readFile(new URL('../public/assets/sankt-olof.glb',import.meta.url));
assert.equal(glb.readUInt32LE(0),0x46546c67);assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length);assert(glb.length<8_000_000);
const chunk=glb.readUInt32LE(12);const document=JSON.parse(glb.subarray(20,20+chunk).toString());
assert(document.extensionsUsed.includes('EXT_meshopt_compression'));assert(document.extensionsUsed.includes('EXT_texture_webp'));
assert(document.meshes.length>10&&document.meshes.length<60);assert(document.materials.some(m=>m.name.includes('Foto')));
const credits=await json('../public/assets/references/credits.json');assert.equal(credits.length,14);
for(const row of credits){assert(row.author.trim());assert(row.license);await stat(new URL('../public/'+row.local,import.meta.url));}
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');assert(!/fonts\.google|unpkg|jsdelivr/.test(html));assert(html.includes('Rekonstruktion · angenähert'));assert(html.includes('id="touch-pad"'));assert(html.includes('id="sources-dialog"'));
for(const id of ['time','clock-input','date','time-play','time-speed','flare'])assert(html.includes(`id="${id}"`),id);
const landscape=await json('../public/assets/landscape.json');assert(landscape.trees.length>=12);assert(landscape.paths.length>10);
assert(landscape.trees.every(t=>Number.isFinite(t.crownZ)&&t.radius>1));
const source=await readFile(new URL('../blender/build_church.py',import.meta.url),'utf8');assert(!source.includes("cylinder('Treppentürmchen'"));assert(source.includes('Glockengiebel'));
console.log(`PASS: ${raw.length} colliders, continuous portal–altar route, solid walls/furniture, ${(glb.length/1e6).toFixed(2)} MB GLB, ${document.meshes.length} meshes, ${credits.length} credited photos.`);
