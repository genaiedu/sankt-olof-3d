import * as THREE from 'three';

function randomGenerator(seed) {return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
function leafTexture() {
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),r=randomGenerator(425);
  x.strokeStyle='#4c5432';x.lineWidth=2.2;x.beginPath();x.moveTo(126,248);x.bezierCurveTo(117,170,142,100,121,12);x.stroke();
  for(let j=0;j<190;j++){
    const a=r()*Math.PI*2,d=Math.sqrt(r())*113,px=128+Math.cos(a)*d,y=128+Math.sin(a)*d,l=10+r()*11;
    x.save();x.translate(px,y);x.rotate(a+r());x.fillStyle=`hsl(${78+r()*20} ${30+r()*21}% ${32+r()*22}%)`;
    x.beginPath();x.moveTo(0,0);x.bezierCurveTo(l*.7,-l*.2,l*.65,-l*.8,0,-l*1.2);x.bezierCurveTo(-l*.65,-l*.8,-l*.7,-l*.2,0,0);x.fill();x.strokeStyle='#a9ac76';x.lineWidth=.6;x.beginPath();x.moveTo(0,0);x.lineTo(0,-l*1.1);x.stroke();x.restore();
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function grassTexture() {
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),r=randomGenerator(3356);
  for(let i=0;i<22;i++){const p=20+r()*88,h=20+r()*95;x.fillStyle=`hsl(${65+r()*25} ${25+r()*20}% ${22+r()*25}%)`;x.beginPath();x.moveTo(p-1.2,128);x.quadraticCurveTo(p-6,128-h*.6,p+(r()-.5)*38,128-h);x.quadraticCurveTo(p+2,128-h*.3,p+1.3,128);x.fill();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export class Vegetation {
  constructor(scene,data) {
    this.group=new THREE.Group();this.group.name='Blattkronen und Wiesendetails · instanziert';this.wind={value:0};scene.add(this.group);
    this.material=new THREE.MeshStandardMaterial({map:leafTexture(),roughness:.86,side:THREE.DoubleSide,alphaTest:.25});
    const wind=this.wind;this.material.onBeforeCompile=s=>{
      s.uniforms.leafTime=wind;s.vertexShader='uniform float leafTime;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      float phase=instanceMatrix[3].x*.7+instanceMatrix[3].z*.9;
      transformed.x+=sin(leafTime*.8+phase)*.05*(position.y+.5);
      transformed.z+=sin(leafTime*.6+phase)*.03;
      #endif`);
    };
    const trees=data.trees||[],perTree=1600,obj=new THREE.Object3D(),color=new THREE.Color();
    this.leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),this.material,trees.length*perTree);
    this.leaves.castShadow=true;this.leaves.receiveShadow=true;this.leaves.name='Alpha-getestetes Zweiglaub';let i=0;
    for(let j=0;j<perTree;j++)for(const tree of trees){
      const r=randomGenerator((tree.seed||73)+j*743),a=r()*Math.PI*2,cost=r()*2-1,rr=Math.cbrt(r())*(tree.radius||3),s=Math.sqrt(1-cost*cost);
      obj.position.set(tree.x+Math.cos(a)*s*rr,(tree.crownZ??tree.height-1)+cost*rr*.8,-tree.y+Math.sin(a)*s*rr);
      obj.rotation.set((r()-.5)*1.7,r()*Math.PI*2,(r()-.5)*1.4);const size=.85+r()*.65;obj.scale.set(size,size*.9,1);obj.updateMatrix();this.leaves.setMatrixAt(i,obj.matrix);
      color.setHSL(.20+r()*.065,.28+r()*.12,.4+r()*.15);this.leaves.setColorAt(i++,color);
    }
    this.leafCount=i;this.group.add(this.leaves);
    const gm=new THREE.MeshStandardMaterial({map:grassTexture(),roughness:1,side:THREE.DoubleSide,alphaTest:.4});
    this.grass=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),gm,12500);this.grass.name='Einzelne Grasbüschel';this.grass.receiveShadow=true;const r=randomGenerator(9851);i=0;
    const paths=[...(data.paths||[]),...(data.graveAreas||[]),...(data.exclusions||[])];
    for(let n=0;n<30000&&i<12500;n++){
      const x=(r()-.5)*105,y=(r()-.5)*92;
      if((x>-12&&x<23&&y>-12&&y<8)||paths.some(p=>Math.abs(x-p.x)<p.width/2+.2&&Math.abs(y-p.y)<p.depth/2+.2))continue;
      if((data.pathPolylines||[]).some(p=>(p.points||[]).some(q=>Math.hypot(q[0]-x,q[1]-y)<(p.width||2))))continue;
      const h=.08+r()*.22;obj.position.set(x,h*.5-.035,-y);obj.scale.set(.22+r()*.25,h,1);obj.rotation.set(0,r()*Math.PI,0);obj.updateMatrix();this.grass.setMatrixAt(i,obj.matrix);color.setHSL(.2+r()*.05,.22,.58+r()*.22);this.grass.setColorAt(i++,color);
    }
    this.grassCount=i;this.grass.count=i;this.group.add(this.grass);
    // Continue the foreground beyond the authored churchyard, without a hard edge.
    const terrain=new THREE.PlaneGeometry(1400,1400,70,70);terrain.rotateX(-Math.PI/2);const vertices=terrain.attributes.position;
    for(let j=0;j<vertices.count;j++){const x=vertices.getX(j),z=vertices.getZ(j),distance=Math.hypot(x,z),rise=THREE.MathUtils.smoothstep(distance,90,200);vertices.setY(j,-.42+rise*(8+7*Math.sin(x*.018)*Math.cos(z*.012)));}terrain.computeVertexNormals();
    const ground=new THREE.Mesh(terrain,new THREE.MeshStandardMaterial({color:'#596846',roughness:1}));ground.receiveShadow=true;ground.name='Landschaftshorizont · angenähert';this.group.add(ground);
  }
  setQuality(low) {this.leaves.count=Math.floor(this.leafCount*(low?.32:1));this.grass.count=Math.floor(this.grassCount*(low?.24:1));this.leaves.castShadow=!low;}
  tick(dt) {this.wind.value+=dt;}
}
