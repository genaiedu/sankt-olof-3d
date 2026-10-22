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
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { pointBlocked } from './navigation.js';
import { Atmosphere } from './atmosphere.js';
import { Vegetation } from './vegetation.js';
import { clockText, nextDate, solarEvents, steeringStep } from './daylight.js';
import { sampleFlight, flightCaption, FLIGHT_DURATION } from './flight.js';

const $ = (id) => document.getElementById(id);
const base = import.meta.env.BASE_URL;
const asset = (name) => `${base}assets/${name}`;
const root = document.documentElement;
const saved = (() => { try { return JSON.parse(localStorage.getItem('sankt-olof-view') || '{}'); } catch { return {}; } })();
const prefs = { palette: 'graphite', theme: 'light', quality: 'auto', date:'2026-09-22', time:saved.light==='warm'?1050:840, flare:true, ...saved };
const valid = { palette: ['graphite','atelier','slate','plum','bordeaux'], theme: ['light','dark'], quality: ['auto','high','low'] };
for (const k of Object.keys(valid)) if (!valid[k].includes(prefs[k])) prefs[k] = valid[k][0];
if(!/^20\d\d-\d\d-\d\d$/.test(prefs.date)||!Number.isFinite(Date.parse(prefs.date)))prefs.date='2026-09-22';
if(!Number.isFinite(prefs.time))prefs.time=840;prefs.time=THREE.MathUtils.clamp(prefs.time,0,1439);prefs.flare=prefs.flare!==false;
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
$('flight-sources').onclick=() => openDialog('sources-dialog');
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

let renderer,scene,camera,controls,model,sun,hemi,pmrem,clock,composer,ao,bloom,soften,atmosphere,vegetation;
let ready=false,mode='orbit',place='overview',yaw=0,pitch=0,indoors=false,frameCount=0,lastStats=0;
let playing=false,skyMinute=-1,turnVelocity=0,timeElapsed=0;
let flightTime=0,flightPaused=true;
const keys=new Set();const pressedMoves=new Set();const windowLights=[],nightLights=[];let colliders=[];
const viewport=$('viewport');const stage=document.querySelector('.stage');
const move=new THREE.Vector3();const target=new THREE.Vector3();
const stations={
  overview:{label:'Außenansicht',pos:[-26,13,26],look:[1,5.4,0],tag:'Architektur',title:'Ein auffälliger Umriss.',text:'Weiße Wände, rote Dächer und gestufte Giebel prägen den heutigen Bau. Die ältesten Teile sind Chor und Sakristei.'},
  nave:{label:'Im Langhaus',pos:[-7,1.66,3],look:[12,2.4,0],tag:'Der Kirchenraum',title:'Zwei Schiffe. Ein Raum.',text:'Das im 15. Jahrhundert hinzugefügte Langhaus hat zwei Schiffe. Pfeiler tragen die Gewölbe. Ihre Bemalung ist hier ornamental angenähert; genaue Motive lassen sich in den Fotografien prüfen.'},
  choir:{label:'Im Chor',pos:[10.9,1.66,0],look:[15,3,0],tag:'Der Hochaltar',title:'Bilder erzählen Glauben.',text:'Der spätmittelalterliche Flügelaltar zeigt die Kreuzigung und Heilige. Seine Front erscheint im Modell als fotografische Fläche. Der Chor gehört zu den ältesten erhaltenen Bauteilen.'},
  font:{label:'Am Taufstein',pos:[-5.7,1.66,-3.2],look:[-7.8,1.1,-3],tag:'Die Ausstattung',title:'Ein Gefäß für einen Anfang.',text:'Der Kirchenführer datiert den Taufstein vermutlich ins frühe 12. Jahrhundert. Die Form ist im Modell vereinfacht. Die hier gewählte Position und die Raummaße sind Annäherungen.'}
};

function fail(message) {
  $('load-text').textContent=message;$('progress').hidden=true;
  const a=document.createElement('a');a.href='https://www.svenskakyrkan.se/simrishamn/st-olofs-kyrka';a.textContent='Offizielle Fotos und 360°-Ansichten öffnen ↗';a.className='text-link';$('loading').append(a);
  $('status').textContent='3D nicht verfügbar';
}
function lowQuality() { return prefs.quality==='low'||(prefs.quality==='auto'&&(matchMedia('(pointer:coarse)').matches||(navigator.deviceMemory&&navigator.deviceMemory<4))); }
function applyQuality() {
  const low=lowQuality();renderer.setPixelRatio(Math.min(devicePixelRatio,low?1.25:1.8));
  renderer.shadowMap.enabled=true;
  if(sun){sun.shadow.mapSize.set(low?1024:3072,low?1024:3072);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}sun.shadow.needsUpdate=true;}
  if(vegetation)vegetation.setQuality(low);
  for(const [i,l] of nightLights.entries())l.castShadow=!low&&i<2;
  if(ao)ao.enabled=!low;if(bloom)bloom.enabled=!low;
  resize();
}
function applyLight() {
  if(!atmosphere)return;
  const values=atmosphere.setTime(prefs.date,prefs.time);skyMinute=Math.floor(prefs.time);
  $('clock-label').textContent=clockText(prefs.time);$('clock-input').value=clockText(prefs.time);$('time').value=Math.floor(prefs.time);$('date').value=prefs.date;
  const events=solarEvents(prefs.date);$('sun-events').textContent=`Aufgang ${clockText(events.sunrise)} · Untergang ${clockText(events.sunset)} · Ortszeit Sankt Olof`;
  const phase=values.sun.altitude>.09?'Tag':values.sun.altitude>-.10?'Dämmerung':'Nacht';
  $('light-phase').textContent=phase;viewport.dataset.solarAltitude=(values.sun.altitude*180/Math.PI).toFixed(2);viewport.dataset.sunDirection=atmosphere.sunDirection.toArray().join(',');viewport.dataset.moonDirection=atmosphere.moonDirection.toArray().join(',');viewport.dataset.moonAltitude=(values.moon.altitude*180/Math.PI).toFixed(2);viewport.dataset.clock=clockText(prefs.time);
  $('moon-info').textContent=`Mond: ${Math.round(values.illumination.fraction*100)} % beleuchtet · ${values.moon.altitude>0?'über':'unter'} dem Horizont`;
  setInteriorLighting(indoors);
}
function setInteriorLighting(inside) {
  indoors=inside;if(!atmosphere)return;atmosphere.applyInterior(inside);
  for(const l of windowLights)l.intensity=l.userData.candle?(4+(1-atmosphere.day)*9):(inside?l.userData.strength*atmosphere.day:0);
  for(const l of nightLights){l.intensity=l.userData.strength*(1-atmosphere.day);l.visible=l.intensity>.01;}
  model?.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.name.includes('Kerzenflamme'))m.emissiveIntensity=1.5+(1-atmosphere.day)*2;if(m.name.includes('Fensterglas')){m.emissive.set('#ffd5a1');m.emissiveIntensity=(1-atmosphere.day)*.48;}}});
}
function resize() {
  if(!renderer)return;
  const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();
  if(composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);ao.setSize(Math.round(w*renderer.getPixelRatio()*.75),Math.round(h*renderer.getPixelRatio()*.75));if(soften)soften.uniforms.pixel.value.set(.72/Math.max(w,1),.72/Math.max(h,1));}
  fitFlightText();
}
function fitFlightText(){const el=$('flight-text');el.style.fontSize='';const width=el.clientWidth;if(width&&el.scrollWidth>width)el.style.fontSize=`${Math.max(12,parseFloat(getComputedStyle(el).fontSize)*width/el.scrollWidth*.97)}px`;}
document.fonts.ready.then(fitFlightText);
function insideBuilding(p) {
  return (p.x>-10.2&&p.x<8.3&&Math.abs(p.z)<6.3)||(p.x>=8&&p.x<21.3&&Math.abs(p.z)<3.3)||(p.x>-4.3&&p.x<2.3&&p.z>=6&&p.z<12.4);
}
function blocked(x,z) {
  return pointBlocked(x,z,colliders);
}
function setLook(look) {camera.lookAt(...look);yaw=camera.rotation.y;pitch=camera.rotation.x;}
function setMode(next) {
  if(mode==='flight'&&next!=='flight'){flightPaused=true;pauseTime();}
  mode=next;controls.enabled=next==='orbit';clearInput();document.body.classList.toggle('tour-view',next==='flight');
  $('flight').textContent=next==='flight'?(flightPaused?'Flug fortsetzen':'Flug pausieren'):'Rundflug';$('flight').setAttribute('aria-pressed',String(next==='flight'&&!flightPaused));
  $('walk').hidden=next==='walk';$('orbit').hidden=next==='orbit';$('walking-tools').hidden=next!=='walk';$('touch-pad').hidden=next!=='walk'||(!matchMedia('(pointer:coarse)').matches&&innerWidth>760);
  $('help').textContent=next==='orbit'?'Ziehen zum Drehen · Scrollen zum Zoomen':'↑ / ↓: vor & zurück · ← / →: drehen · Ziehen: umsehen';
  $('reticle').hidden=next!=='walk';
  if(next==='orbit'&&document.pointerLockElement)document.exitPointerLock();
}
function updateFlight(dt){
  if(!flightPaused&&!document.querySelector('dialog[open]'))flightTime=(flightTime+dt)%FLIGHT_DURATION;
  const frame=sampleFlight(flightTime);camera.position.copy(frame.position);setLook(frame.look.toArray());
  const caption=flightCaption(frame.leg,flightTime);if($('flight-text').textContent!==caption.text){$('flight-text').textContent=caption.text;fitFlightText();}$('flight-caption').style.opacity=flightPaused?1:caption.opacity;
  const inside=insideBuilding(camera.position)&&camera.position.y<7.5;if(inside!==indoors)setInteriorLighting(inside);
  viewport.dataset.flightTime=flightTime.toFixed(3);viewport.dataset.flightLeg=String(frame.leg);viewport.dataset.flightPaused=String(flightPaused);
}
function startFlight(paused=false){
  if(!ready)return;prefs.time=300;applyLight();flightTime=0;flightPaused=paused;setMode('flight');$('view-label').textContent='Drohnenflug · Sankt Olof';$('time-speed').value='1.2';
  if(paused)pauseTime();else startTime();updateFlight(0);updateMap();
}
$('flight').onclick=()=>{if(mode!=='flight'){startFlight();return;}flightPaused=!flightPaused;if(flightPaused)pauseTime();else startTime();$('flight').textContent=flightPaused?'Flug fortsetzen':'Flug pausieren';$('flight').setAttribute('aria-pressed',String(!flightPaused));};
$('explore').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();goTo('overview');};
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
$('walk').onclick=()=>{if(!ready)return;place='walk';setMode('walk');camera.position.set(-15,1.66,0);setLook([-9,1.9,0]);$('view-label').textContent='Freie Begehung';viewport.focus({preventScroll:true});updateMap();};
$('orbit').onclick=()=>goTo('overview');
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else stage.scrollIntoView({block:'start'});}catch{$('help').textContent='Vollbild ist hier nicht verfügbar. Die Begehung bleibt bedienbar.';}};
$('lock-mouse').onclick=async()=>{try{if(document.pointerLockElement)document.exitPointerLock();else await viewport.requestPointerLock();}catch{$('help').textContent='Zum Umsehen im Bild ziehen.';}};
document.addEventListener('pointerlockchange',()=>{$('lock-mouse').textContent=document.pointerLockElement?'Maus lösen (Esc)':'Maus koppeln';clearInput();});
function clearInput(){keys.clear();pressedMoves.clear();turnVelocity=0;for(const b of document.querySelectorAll('[data-move]'))b.classList.remove('pressed');}
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
function look(dx,dy){yaw-=dx*.003;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-1.48,1.48);camera.rotation.set(pitch,yaw,0,'YXZ');}
viewport.addEventListener('pointermove',e=>{if(mode!=='walk'||!camera)return;if(document.pointerLockElement===viewport)look(e.movementX,e.movementY);else if(dragging&&e.pointerId===dragId){look(e.clientX-pointerX,e.clientY-pointerY);pointerX=e.clientX;pointerY=e.clientY;}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(ev,()=>dragging=false);
viewport.addEventListener('contextmenu',e=>e.preventDefault());
function updateMap(){
  if(!camera)return;
  viewport.dataset.position=camera.position.toArray().map(n=>n.toFixed(3)).join(',');
  viewport.dataset.mode=mode;
  viewport.dataset.heading=yaw.toFixed(4);
  viewport.dataset.pitch=pitch.toFixed(4);
  const direction=new THREE.Vector3();camera.getWorldDirection(direction);
  const angle=Math.atan2(-direction.z,direction.x)*180/Math.PI;
  $('map-marker').setAttribute('transform',`translate(${camera.position.x.toFixed(2)} ${(-camera.position.z).toFixed(2)}) rotate(${angle.toFixed(1)})`);
}
function stepWalk(dt) {
  const f=Number(keys.has('KeyW')||keys.has('ArrowUp')||pressedMoves.has('forward'))-Number(keys.has('KeyS')||keys.has('ArrowDown')||pressedMoves.has('backward'));
  const turn=Number(keys.has('KeyD')||keys.has('ArrowRight')||pressedMoves.has('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||pressedMoves.has('left'));
  const steering=steeringStep(yaw,turnVelocity,turn,dt);yaw=steering.yaw;turnVelocity=steering.velocity;camera.rotation.set(pitch,yaw,0,'YXZ');
  if(f){
    const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?3.4:2.1)*dt;
    move.set(-Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(speed*f);
    // Separate axes allow sliding along walls; small substeps prevent tunnelling.
    const n=Math.max(1,Math.ceil(move.length()/.08));
    for(let i=0;i<n;i++){if(!blocked(camera.position.x+move.x/n,camera.position.z))camera.position.x+=move.x/n;if(!blocked(camera.position.x,camera.position.z+move.z/n))camera.position.z+=move.z/n;}
  }
  camera.position.y=1.66;
  const inside=insideBuilding(camera.position);if(inside!==indoors)setInteriorLighting(inside);
}
function loop(){
  requestAnimationFrame(loop);if(!renderer||document.hidden)return;
  const elapsed=Math.min(clock.getDelta(),.25),dt=Math.min(elapsed,.05);
  if(playing&&ready&&!document.querySelector('dialog[open]')){
    prefs.time+=elapsed*Number($('time-speed').value);timeElapsed+=elapsed;
    if(prefs.time>=1440){prefs.time-=1440;prefs.date=nextDate(prefs.date);}
    if(Math.floor(prefs.time)!==skyMinute)applyLight();
    if(timeElapsed>3){savePrefs();timeElapsed=0;}
  }
  if(ready){if(mode==='walk')stepWalk(dt);else if(mode==='flight')updateFlight(elapsed);else controls.update();updateMap();}
  const motion=matchMedia('(prefers-reduced-motion:reduce)').matches?0:dt;
  atmosphere?.tick(motion,camera,prefs.flare,lowQuality());vegetation?.tick(motion);
  if(composer)composer.render();else renderer.render(scene,camera);frameCount++;
  if(performance.now()-lastStats>1600){viewport.dataset.fps=(frameCount*1000/(performance.now()-lastStats)).toFixed(1);frameCount=0;$('status').textContent=ready?(mode==='walk'?(indoors?'Im Kirchenraum':'Auf dem Kirchhof'):'Modell bereit'):'Modell lädt';lastStats=performance.now();}
}
async function init(){
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    viewport.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;$('loading').hidden=false;fail('Die Grafikverbindung wurde unterbrochen. Bitte lade die Seite neu oder wähle eine sparsame Grafikqualität.');});
    scene=new THREE.Scene();scene.fog=new THREE.Fog('#c7d8e1',95,440);
    camera=new THREE.PerspectiveCamera(58,1,.09,1800);camera.rotation.order='YXZ';camera.position.fromArray(stations.overview.pos);camera.lookAt(...stations.overview.look);
    composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));ao=new SSAOPass(scene,camera,512,512,12);ao.kernelRadius=.6;ao.minDistance=.001;ao.maxDistance=.025;composer.addPass(ao);bloom=new UnrealBloomPass(new THREE.Vector2(512,512),.14,.65,1.3);composer.addPass(bloom);
    soften=new ShaderPass({uniforms:{tDiffuse:{value:null},pixel:{value:new THREE.Vector2()}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D tDiffuse;uniform vec2 pixel;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv)*.40;c+=(texture2D(tDiffuse,vUv+vec2(pixel.x,0.))+texture2D(tDiffuse,vUv-vec2(pixel.x,0.))+texture2D(tDiffuse,vUv+vec2(0.,pixel.y))+texture2D(tDiffuse,vUv-vec2(0.,pixel.y)))*.10;c+=(texture2D(tDiffuse,vUv+pixel)+texture2D(tDiffuse,vUv-pixel)+texture2D(tDiffuse,vUv+vec2(pixel.x,-pixel.y))+texture2D(tDiffuse,vUv+vec2(-pixel.x,pixel.y)))*.05;gl_FragColor=c;}'});composer.addPass(soften);composer.addPass(new OutputPass());composer.addPass(new FXAAPass());
    controls=new OrbitControls(camera,renderer.domElement);controls.target.fromArray(stations.overview.look);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=15;controls.maxDistance=75;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.1;controls.enablePan=false;
    atmosphere=new Atmosphere(scene,renderer);sun=atmosphere.sun;hemi=atmosphere.hemi;
    for(const [x,z,power] of [[-7,-5.5,55],[-1,-5.5,65],[5,-5.5,65],[-7,5.5,65],[5,5.5,65],[12,2.5,60],[12,-2.5,60]]) {
      const p=new THREE.PointLight('#e2e9df',0,12,2);p.position.set(x,3.7,z);p.userData.strength=power;windowLights.push(p);scene.add(p);
    }
    for(const x of [-6,0,5,12]){const p=new THREE.PointLight('#f2bd79',0,11,2);p.position.set(x,3.8,0);p.userData.candle=true;windowLights.push(p);scene.add(p);}
    for(const [x,y,z,power] of [[-5,5.9,0,170],[3,5.9,0,180],[11.8,4.5,1.2,70],[-1,4.9,9,85],[18.5,3.25,0,70]]){
      const p=new THREE.PointLight('#ffe8cb',0,20,2);p.name='Warme Innenbeleuchtung bei Nacht';p.position.set(x,y,z);p.userData.strength=power;p.shadow.mapSize.set(512,512);p.shadow.camera.near=.15;p.shadow.camera.far=20;p.shadow.normalBias=.035;p.shadow.bias=-.0001;nightLights.push(p);scene.add(p);
    }
    clock=new THREE.Clock();applyQuality();applyLight();new ResizeObserver(resize).observe(viewport);window.addEventListener('resize',resize);
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);pmrem=new THREE.PMREMGenerator(renderer);
    const environmentPromise=new RGBELoader().loadAsync(asset('textures/daylight.hdr')).then(hdr=>{const env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;hdr.dispose();pmrem.dispose();}).catch(()=>{ /* Hemisphere and local lights remain a usable fallback. */ });
    const collisionPromise=fetch(asset('collisions.json')).then(r=>{if(!r.ok)throw Error('Kollisionsdaten fehlen');return r.json();}).then(rows=>{colliders=rows.map(b=>new THREE.Box3(new THREE.Vector3(b.min[0],b.min[2],-b.max[1]),new THREE.Vector3(b.max[0],b.max[2],-b.min[1])));});
    const gltf=await loader.loadAsync(asset('sankt-olof.glb'),e=>{if(e.total){const v=Math.min(90,Math.round(e.loaded/e.total*90));$('progress').value=v;$('load-text').textContent=`Gebäude und Materialien laden … ${v} %`;}});
    model=gltf.scene;
    model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])m[key].anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);if(m.name.includes('Fensterglas')){m.transparent=true;m.opacity=.42;m.depthWrite=false;}if(m.name.includes('Rotfassung'))m.roughness=.9;}});
    scene.add(model);await collisionPromise;await environmentPromise;
    const landscape=await fetch(asset('landscape.json')).then(r=>{if(!r.ok)throw Error('Landschaftsdaten fehlen');return r.json();});vegetation=new Vegetation(scene,landscape);vegetation.setQuality(lowQuality());
    ready=true;$('walk').disabled=false;$('flight').disabled=false;$('progress').value=100;$('loading').hidden=true;startFlight(matchMedia('(prefers-reduced-motion:reduce)').matches);$('status').textContent='Modell bereit';
  }catch(e){console.error('Sankt Olof loading failed',e);fail('Die 3D-Ansicht konnte nicht geladen werden. Prüfe die Internetverbindung und ob dein Browser WebGL unterstützt.');}
  if(renderer)loop();
}
function pauseTime(){playing=false;$('time-play').setAttribute('aria-pressed','false');$('time-play').textContent='Zeitraffer starten';savePrefs();}
function startTime(){playing=true;$('time-play').setAttribute('aria-pressed','true');$('time-play').textContent='Zeitraffer pausieren';}
function selectTime(value){pauseTime();prefs.time=THREE.MathUtils.clamp(value,0,1439);applyLight();savePrefs();}
$('time').addEventListener('input',e=>selectTime(Number(e.target.value)));
$('clock-input').addEventListener('change',e=>{const [h,m]=e.target.value.split(':').map(Number);if(Number.isFinite(h+m))selectTime(h*60+m);});
$('date').addEventListener('change',e=>{if(/^20\d\d-\d\d-\d\d$/.test(e.target.value)&&Number.isFinite(Date.parse(e.target.value))){pauseTime();prefs.date=e.target.value;applyLight();savePrefs();}});
$('time-play').onclick=()=>{if(playing)pauseTime();else startTime();};
for(const b of document.querySelectorAll('[data-sky]'))b.onclick=()=>{const events=solarEvents(prefs.date);selectTime({dawn:events.sunrise+8,day:780,sunset:events.sunset-8,night:1350}[b.dataset.sky]);};
$('flare').checked=prefs.flare;$('flare').onchange=e=>{prefs.flare=e.target.checked;savePrefs();};
if(innerWidth<850)$('time-controls').open=false;
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseTime();if(mode==='flight'){flightPaused=true;$('flight').textContent='Flug fortsetzen';$('flight').setAttribute('aria-pressed','false');}clock?.getDelta();}});
init();
