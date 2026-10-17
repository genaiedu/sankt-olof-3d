import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { pointBlocked } from './navigation.js';

const $ = (id) => document.getElementById(id);
const base = import.meta.env.BASE_URL;
const asset = (name) => `${base}assets/${name}`;
const root = document.documentElement;
const saved = (() => { try { return JSON.parse(localStorage.getItem('sankt-olof-view') || '{}'); } catch { return {}; } })();
const prefs = { palette: 'graphite', theme: 'light', quality: 'auto', light: 'day', ...saved };
const valid = { palette: ['graphite','atelier','slate','plum','bordeaux'], theme: ['light','dark'], quality: ['auto','high','low'], light: ['day','warm'] };
for (const k of Object.keys(valid)) if (!valid[k].includes(prefs[k])) prefs[k] = valid[k][0];
function savePrefs() { try { localStorage.setItem('sankt-olof-view',JSON.stringify(prefs)); } catch {} }
function applyReading() { root.dataset.palette=prefs.palette;root.dataset.theme=prefs.theme; }
applyReading();
for (const d of document.querySelectorAll('dialog')) {
  d.querySelector('.close').addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => { if (e.target === d) { const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close(); } });
  d.addEventListener('close', () => clearInput());
}
function openDialog(id) { clearInput(); if(document.pointerLockElement)document.exitPointerLock();$(id).showModal(); }
$('sources-open').onclick=() => openDialog('sources-dialog');
$('compare-open').onclick=() => {openDialog('sources-dialog');setTimeout(() => $('reference-gallery').scrollIntoView({block:'start'}),40);};
$('settings-open').onclick=() => openDialog('settings-dialog');
for(const k of Object.keys(valid)) {$(k).value=prefs[k];$(k).addEventListener('change',()=>{prefs[k]=$(k).value;applyReading();savePrefs();if(renderer)applyQuality();if(scene)applyLight();});}
fetch(asset('references/credits.json')).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(rows=>{
  for(const row of rows) {
    const figure=document.createElement('figure');const img=document.createElement('img');img.src=`${base}${row.local}`;img.alt=row.kind==='exterior'?`Außenaufnahme der Sankt Olofs kyrka: ${row.title}`:`Innenaufnahme der Sankt Olofs kyrka: ${row.title}`;img.loading='lazy';img.width=640;img.height=440;
    const caption=document.createElement('figcaption');const a=document.createElement('a');a.href=row.url;a.target='_blank';a.rel='noopener';a.textContent=row.title;caption.append(a,document.createElement('br'),`${row.author.trim()} · `);
    if(row.license_url){const l=document.createElement('a');l.href=row.license_url;l.textContent=row.license;l.target='_blank';l.rel='noopener';caption.append(l);}else caption.append(row.license);
    caption.append(' · verkleinerte Kopie');figure.append(img,caption);$('reference-gallery').append(figure);
  }
}).catch(()=>{$('reference-gallery').textContent='Die Bildnachweise konnten nicht geladen werden. Die vollständigen Referenzen stehen im GitHub-Repository.';});

let renderer,scene,camera,controls,model,sun,hemi,pmrem,clock,composer,ao;
let ready=false,mode='orbit',place='overview',yaw=0,pitch=0,indoors=false,frameCount=0,lastStats=0;
const keys=new Set();const pressedMoves=new Set();const windowLights=[];let colliders=[];
const viewport=$('viewport');const stage=document.querySelector('.stage');
const move=new THREE.Vector3();const target=new THREE.Vector3();
const stations={
  overview:{label:'Außenansicht',pos:[-29,17,29],look:[1,4,0],tag:'Architektur',title:'Ein auffälliger Umriss.',text:'Weiße Wände, rote Dächer und gestufte Giebel prägen den heutigen Bau. Die ältesten Teile sind Chor und Sakristei.'},
  nave:{label:'Im Langhaus',pos:[-7,1.66,3],look:[12,2.4,3],tag:'Der Kirchenraum',title:'Zwei Schiffe. Ein Raum.',text:'Das im 15. Jahrhundert hinzugefügte Langhaus hat zwei Schiffe. Pfeiler tragen die Gewölbe. Ihre Bemalung ist hier ornamental angenähert; genaue Motive lassen sich in den Fotografien prüfen.'},
  choir:{label:'Im Chor',pos:[10.9,1.66,3],look:[15,3,3],tag:'Der Hochaltar',title:'Bilder erzählen Glauben.',text:'Der spätmittelalterliche Flügelaltar zeigt die Kreuzigung und Heilige. Seine Front erscheint im Modell als fotografische Fläche. Der Chor gehört zu den ältesten erhaltenen Bauteilen.'},
  font:{label:'Am Taufstein',pos:[-5.7,1.66,-3.2],look:[-7.8,1.1,-3],tag:'Die Ausstattung',title:'Ein Gefäß für einen Anfang.',text:'Der Kirchenführer datiert den Taufstein vermutlich ins frühe 12. Jahrhundert. Die Form ist im Modell vereinfacht. Die hier gewählte Position und die Raummaße sind Annäherungen.'}
};

function fail(message) {
  $('load-text').textContent=message;$('progress').hidden=true;
  const a=document.createElement('a');a.href='https://www.svenskakyrkan.se/simrishamn/st-olofs-kyrka';a.textContent='Offizielle Fotos und 360°-Ansichten öffnen ↗';a.className='text-link';$('loading').append(a);
  $('status').textContent='3D nicht verfügbar';
}
function lowQuality() { return prefs.quality==='low'||(prefs.quality==='auto'&&(matchMedia('(pointer:coarse)').matches||innerWidth<850)); }
function applyQuality() {
  const low=lowQuality();renderer.setPixelRatio(Math.min(devicePixelRatio,low?1.25:1.8));
  renderer.shadowMap.enabled=true;
  if(sun){sun.shadow.mapSize.set(low?1024:2048,low?1024:2048);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}sun.shadow.needsUpdate=true;}
  resize();
}
function applyLight() {
  if(!sun)return;
  const warm=prefs.light==='warm';
  sun.color.set(warm?'#ffce98':'#fff0db');sun.position.set(warm?-24:-15,warm?15:29,26);
  sun.intensity=warm?2.7:3.2;
  scene.background.set(warm?'#cbd1d1':'#c7d8e1');scene.fog.color.copy(scene.background);
  setInteriorLighting(indoors);
}
function setInteriorLighting(inside) {
  indoors=inside;scene.environmentIntensity=inside?.18:.75;hemi.intensity=inside?.85:1.5;
  for(const l of windowLights) l.intensity=inside?l.userData.strength:0;
  renderer.toneMappingExposure=inside?1.22:1.0;
}
function resize() {
  if(!renderer)return;
  const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();
  if(composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);ao.setSize(Math.round(w*renderer.getPixelRatio()*.75),Math.round(h*renderer.getPixelRatio()*.75));}
}
function insideBuilding(p) {
  return (p.x>-10.2&&p.x<8.3&&Math.abs(p.z)<6.3)||(p.x>=8&&p.x<21.3&&p.z>-.2&&p.z<6.3)||(p.x>-10.3&&p.x<-3.7&&p.z>=6&&p.z<10.4);
}
function blocked(x,z) {
  return pointBlocked(x,z,colliders);
}
function setLook(look) {camera.lookAt(...look);yaw=camera.rotation.y;pitch=camera.rotation.x;}
function setMode(next) {
  mode=next;controls.enabled=next==='orbit';clearInput();
  $('walk').hidden=next==='walk';$('orbit').hidden=next==='orbit';$('walking-tools').hidden=next==='orbit';$('touch-pad').hidden=next==='orbit'||(!matchMedia('(pointer:coarse)').matches&&innerWidth>760);
  $('help').textContent=next==='orbit'?'Ziehen zum Drehen · Scrollen zum Zoomen':matchMedia('(pointer:coarse)').matches?'Steuerkreuz: gehen · Bild ziehen: umsehen':'WASD / Pfeile: gehen · Bild ziehen: umsehen';
  $('reticle').hidden=next==='orbit';
  if(next==='orbit'&&document.pointerLockElement)document.exitPointerLock();
}
function goTo(key) {
  if(!ready)return;
  place=key;const s=stations[key];setMode(key==='overview'?'orbit':'walk');camera.position.fromArray(s.pos);setLook(s.look);
  if(mode==='orbit'){controls.target.fromArray(s.look);controls.update();}
  $('view-label').textContent=s.label;$('context-label').textContent=s.tag;$('context-title').textContent=s.title;$('context-text').textContent=s.text;
  for(const b of document.querySelectorAll('[data-place]')){const active=b.dataset.place===key;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
  setInteriorLighting(key!=='overview');viewport.focus({preventScroll:true});updateMap();
  // On small screens standpoints live below the viewer: bring the selected view into reach.
  if(innerWidth<=760&&stage.getBoundingClientRect().bottom<120)stage.scrollIntoView({block:'start',behavior:'instant'});
}
for(const b of document.querySelectorAll('[data-place]'))b.onclick=()=>goTo(b.dataset.place);
$('walk').onclick=()=>{if(!ready)return;place='walk';setMode('walk');camera.position.set(-16,1.66,8);setLook([-7,2,8]);$('view-label').textContent='Freie Begehung';viewport.focus({preventScroll:true});};
$('orbit').onclick=()=>goTo('overview');
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else stage.scrollIntoView({block:'start'});}catch{$('help').textContent='Vollbild ist hier nicht verfügbar. Die Begehung bleibt bedienbar.';}};
$('lock-mouse').onclick=async()=>{try{if(document.pointerLockElement)document.exitPointerLock();else await viewport.requestPointerLock();}catch{$('help').textContent='Zum Umsehen im Bild ziehen.';}};
document.addEventListener('pointerlockchange',()=>{$('lock-mouse').textContent=document.pointerLockElement?'Maus lösen (Esc)':'Maus koppeln';clearInput();});
function clearInput(){keys.clear();pressedMoves.clear();for(const b of document.querySelectorAll('[data-move]'))b.classList.remove('pressed');}
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
document.addEventListener('keydown',e=>{
  if(mode!=='walk'||!ready||document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA|BUTTON|A/.test(document.activeElement?.tagName||''))return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
for(const b of document.querySelectorAll('[data-move]')){
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pressedMoves.add(b.dataset.move);b.classList.add('pressed');});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{pressedMoves.delete(b.dataset.move);b.classList.remove('pressed');});
}
let dragging=false,pointerX=0,pointerY=0,dragId;
viewport.addEventListener('pointerdown',e=>{viewport.focus({preventScroll:true});if(mode==='walk'){dragging=true;dragId=e.pointerId;pointerX=e.clientX;pointerY=e.clientY;viewport.setPointerCapture(e.pointerId);}});
function look(dx,dy){yaw-=dx*.003;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-1.34,1.34);camera.rotation.set(pitch,yaw,0,'YXZ');}
viewport.addEventListener('pointermove',e=>{if(mode!=='walk'||!camera)return;if(document.pointerLockElement===viewport)look(e.movementX,e.movementY);else if(dragging&&e.pointerId===dragId){look(e.clientX-pointerX,e.clientY-pointerY);pointerX=e.clientX;pointerY=e.clientY;}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(ev,()=>dragging=false);
viewport.addEventListener('contextmenu',e=>e.preventDefault());
function updateMap(){
  if(!camera)return;
  viewport.dataset.position=camera.position.toArray().map(n=>n.toFixed(3)).join(',');
  viewport.dataset.mode=mode;
  const direction=new THREE.Vector3();camera.getWorldDirection(direction);
  const angle=Math.atan2(-direction.z,direction.x)*180/Math.PI;
  $('map-marker').setAttribute('transform',`translate(${camera.position.x.toFixed(2)} ${(-camera.position.z).toFixed(2)}) rotate(${angle.toFixed(1)})`);
}
function stepWalk(dt) {
  const f=Number(keys.has('KeyW')||keys.has('ArrowUp')||pressedMoves.has('forward'))-Number(keys.has('KeyS')||keys.has('ArrowDown')||pressedMoves.has('backward'));
  const r=Number(keys.has('KeyD')||keys.has('ArrowRight')||pressedMoves.has('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||pressedMoves.has('left'));
  if(f||r){
    const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?3.4:2.1)*dt;
    move.set(-Math.sin(yaw)*f+Math.cos(yaw)*r,0,-Math.cos(yaw)*f-Math.sin(yaw)*r).normalize().multiplyScalar(speed);
    // Separate axes allow sliding along walls; small substeps prevent tunnelling.
    const n=Math.max(1,Math.ceil(move.length()/.08));
    for(let i=0;i<n;i++){if(!blocked(camera.position.x+move.x/n,camera.position.z))camera.position.x+=move.x/n;if(!blocked(camera.position.x,camera.position.z+move.z/n))camera.position.z+=move.z/n;}
  }
  camera.position.y=1.66;
  const inside=insideBuilding(camera.position);if(inside!==indoors)setInteriorLighting(inside);
}
function loop(){
  requestAnimationFrame(loop);if(!renderer||document.hidden)return;
  const dt=Math.min(clock.getDelta(),.05);
  if(ready){if(mode==='walk')stepWalk(dt);else controls.update();updateMap();}
  if(composer&&!lowQuality())composer.render();else renderer.render(scene,camera);frameCount++;
  if(performance.now()-lastStats>1600){$('status').textContent=ready?(mode==='walk'?(indoors?'Im Kirchenraum':'Auf dem Kirchhof'):'Modell bereit'):'Modell lädt';lastStats=performance.now();}
}
async function init(){
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    viewport.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;$('loading').hidden=false;fail('Die Grafikverbindung wurde unterbrochen. Bitte lade die Seite neu oder wähle eine sparsame Grafikqualität.');});
    scene=new THREE.Scene();scene.background=new THREE.Color('#c7d8e1');scene.fog=new THREE.Fog('#c7d8e1',65,140);
    camera=new THREE.PerspectiveCamera(58,1,.09,180);camera.rotation.order='YXZ';camera.position.fromArray(stations.overview.pos);camera.lookAt(...stations.overview.look);
    composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));ao=new SSAOPass(scene,camera,512,512,16);ao.kernelRadius=.7;ao.minDistance=.0005;ao.maxDistance=.035;composer.addPass(ao);composer.addPass(new OutputPass());
    controls=new OrbitControls(camera,renderer.domElement);controls.target.fromArray(stations.overview.look);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=15;controls.maxDistance=75;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.1;controls.enablePan=false;
    hemi=new THREE.HemisphereLight('#e1ecf4','#6b654c',1.5);scene.add(hemi);
    sun=new THREE.DirectionalLight('#fff0db',3.2);sun.castShadow=true;sun.position.set(-15,29,26);sun.shadow.camera.left=-34;sun.shadow.camera.right=34;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;sun.shadow.camera.near=1;sun.shadow.camera.far=100;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;scene.add(sun);sun.target.position.set(0,0,0);scene.add(sun.target);
    for(const [x,z,power] of [[-7,-5.5,55],[-1,-5.5,65],[5,-5.5,65],[-1,5.5,65],[5,5.5,65],[12,5.5,60],[12,.5,60]]) {
      const p=new THREE.PointLight('#e2e9df',0,12,2);p.position.set(x,3.7,z);p.userData.strength=power;windowLights.push(p);scene.add(p);
    }
    for(const x of [-6,0,5,12]){const p=new THREE.PointLight('#f2dab4',0,11,2);p.position.set(x,4,x===12?3:0);p.userData.strength=20;windowLights.push(p);scene.add(p);}
    clock=new THREE.Clock();applyQuality();applyLight();new ResizeObserver(resize).observe(viewport);window.addEventListener('resize',resize);
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);pmrem=new THREE.PMREMGenerator(renderer);
    const environmentPromise=new RGBELoader().loadAsync(asset('textures/daylight.hdr')).then(hdr=>{const env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;hdr.dispose();pmrem.dispose();}).catch(()=>{ /* Hemisphere and local lights remain a usable fallback. */ });
    const collisionPromise=fetch(asset('collisions.json')).then(r=>{if(!r.ok)throw Error('Kollisionsdaten fehlen');return r.json();}).then(rows=>{colliders=rows.map(b=>new THREE.Box3(new THREE.Vector3(b.min[0],b.min[2],-b.max[1]),new THREE.Vector3(b.max[0],b.max[2],-b.min[1])));});
    const gltf=await loader.loadAsync(asset('sankt-olof.glb'),e=>{if(e.total){const v=Math.round(e.loaded/e.total*90);$('progress').value=v;$('load-text').textContent=`Gebäude und Materialien laden … ${v} %`;}});
    model=gltf.scene;
    model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])m[key].anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);if(m.name.includes('Fensterglas')){m.transparent=true;m.opacity=.42;m.depthWrite=false;}if(m.name.includes('Rotfassung'))m.roughness=.9;}});
    scene.add(model);await collisionPromise;await environmentPromise;
    ready=true;$('walk').disabled=false;$('progress').value=100;$('loading').hidden=true;goTo('overview');
  }catch(e){console.error('Sankt Olof loading failed',e);fail('Die 3D-Ansicht konnte nicht geladen werden. Prüfe die Internetverbindung und ob dein Browser WebGL unterstützt.');}
  if(renderer)loop();
}
init();
