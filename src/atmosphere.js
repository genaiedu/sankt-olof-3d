import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { celestial, celestialDirection } from './daylight.js';

const smooth=(a,b,v)=>THREE.MathUtils.smoothstep(v,a,b);
const vertex=`varying vec3 worldNormal;varying vec2 texUV;void main(){texUV=uv;worldNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float f=0.;f+=.5*noise(p);p=p*2.07+13.4;f+=.25*noise(p);p=p*2.01+8.4;f+=.125*noise(p);p=p*2.04;f+=.0625*noise(p);return f;}`;

export class Atmosphere {
  constructor(scene,renderer) {
    this.scene=scene;this.renderer=renderer;this.inside=false;this.elapsed=0;this.day=1;this.sunDirection=new THREE.Vector3();this.moonDirection=new THREE.Vector3();
    this.sky=new Sky();this.sky.scale.setScalar(1100);this.sky.name='Atmosphäre · Tag, Dämmerung, Nacht';this.sky.material.toneMapped=true;
    Object.assign(this.sky.material.uniforms,{nightAmount:{value:0},cloudTime:{value:0},hazeColor:{value:scene.fog.color}});
    this.sky.material.fragmentShader='uniform vec3 hazeColor;uniform float nightAmount;uniform float cloudTime;'+noise+this.sky.material.fragmentShader;
    this.sky.material.fragmentShader=this.sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );',`
      vec3 nightSky=mix(vec3(.018,.026,.046),vec3(.0018,.004,.013),smoothstep(0.,.75,direction.y));
      vec3 blueSky=mix(vec3(.42,.58,.72),vec3(.014,.12,.34),pow(clamp(direction.y,0.,1.),.35));
      float twilightStrength=1.-smoothstep(.03,.26,abs(vSunDirection.y));
      vec3 twilight=mix(vec3(.035,.055,.15),vec3(.75,.24,.09),pow(max(0.,cosTheta),3.));
      blueSky=mix(blueSky,twilight,twilightStrength*.78);
      retColor=mix(retColor*.5,blueSky,.82*(1.-smoothstep(.97,.9996,cosTheta)));
      retColor=mix(retColor,nightSky,nightAmount);
      vec2 cloudP=direction.xz/max(direction.y+.16,.16)*1.4+vec2(cloudTime*.003,cloudTime*.001);
      float clouds=smoothstep(.49,.75,fbm(cloudP))*smoothstep(.015,.18,direction.y);
      float silver=pow(max(0.,cosTheta),18.);
      vec3 cloudLight=mix(vec3(.29,.37,.45),vec3(.86,.88,.89),smoothstep(-.03,.25,vSunDirection.y));
      cloudLight=mix(cloudLight,vec3(.74,.31,.12),(1.-smoothstep(0.,.15,abs(vSunDirection.y)))*.48);
      cloudLight+=vec3(.9,.7,.4)*silver;
      cloudLight=mix(cloudLight,vec3(.012,.017,.027),nightAmount);
      retColor=mix(retColor,cloudLight,clouds*.86);
      retColor=mix(hazeColor,retColor,smoothstep(-.015,.13,direction.y));
      gl_FragColor=vec4(retColor,1.);
    `);
    this.sky.material.uniforms.turbidity.value=3.1;this.sky.material.uniforms.rayleigh.value=2.1;this.sky.material.uniforms.mieCoefficient.value=.005;this.sky.material.uniforms.mieDirectionalG.value=.82;
    scene.add(this.sky);scene.background=null;
    this.sun=new THREE.DirectionalLight('#fff1db',3.6);this.sun.name='Sonne · berechneter Ortsstand';this.sun.castShadow=true;
    this.sun.shadow.camera.left=-43;this.sun.shadow.camera.right=43;this.sun.shadow.camera.top=43;this.sun.shadow.camera.bottom=-43;this.sun.shadow.camera.near=.5;this.sun.shadow.camera.far=190;
    this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.00008;this.sun.shadow.radius=2;scene.add(this.sun,this.sun.target);
    this.moonLight=new THREE.DirectionalLight('#a6c4ef',.1);this.moonLight.name='Mondlicht';this.moonLight.castShadow=true;this.moonLight.shadow.camera.copy(this.sun.shadow.camera);this.moonLight.shadow.mapSize.set(1024,1024);this.moonLight.shadow.normalBias=.04;this.moonLight.shadow.bias=-.0001;scene.add(this.moonLight,this.moonLight.target);
    this.hemi=new THREE.HemisphereLight('#b9d6f0','#72705d',1);scene.add(this.hemi);
    this.moon=new THREE.Mesh(new THREE.SphereGeometry(3.8,32,20),new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:`varying vec3 worldNormal;varying vec2 texUV;uniform vec3 sunlight;uniform float visibleStrength;${noise}void main(){float grain=fbm(texUV*82.);float maria=smoothstep(.35,.65,fbm(texUV*12.));float lit=smoothstep(-.025,.16,dot(normalize(worldNormal),sunlight));vec3 rock=mix(vec3(.37,.4,.44),vec3(.86,.88,.84),maria)*(.82+.27*grain);gl_FragColor=vec4(rock*(.018+lit*1.65)*visibleStrength,1.);}`,uniforms:{sunlight:{value:new THREE.Vector3()},visibleStrength:{value:1}},toneMapped:false}));
    this.moon.name='Mond · Position und beleuchtete Hälfte';this.moon.renderOrder=-1;scene.add(this.moon);
    const count=4200,positions=new Float32Array(count*3),sizes=new Float32Array(count);let seed=0x53a10;
    const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<count;i++){const y=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-y*y);positions.set([Math.cos(a)*r*850,y*850,Math.sin(a)*r*850],i*3);sizes[i]=.65+random()**5*2.0;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('size',new THREE.BufferAttribute(sizes,1));
    this.stars=new THREE.Points(geo,new THREE.ShaderMaterial({vertexShader:`attribute float size;varying float elevation;uniform float pixelRatio;void main(){vec4 p=modelMatrix*vec4(position,1.);elevation=normalize(p.xyz-cameraPosition).y;gl_PointSize=size*pixelRatio;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`uniform float night;varying float elevation;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.05,1.,r))*night*smoothstep(0.,.15,elevation);gl_FragColor=vec4(.77,.85,1.,a);}`,uniforms:{night:{value:0},pixelRatio:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
    this.stars.name='Illustrativer Sternenhimmel, kein Sternkatalog';this.stars.renderOrder=1;scene.add(this.stars);
  }
  setTime(date,minutes) {
    const v=celestial(date,minutes);this.values=v;this.sunDirection.fromArray(celestialDirection(v.sun));this.moonDirection.fromArray(celestialDirection(v.moon));
    this.day=smooth(-.09,.20,this.sunDirection.y);this.night=1-smooth(-.22,-.07,this.sunDirection.y);
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDirection).multiplyScalar(1000);this.sky.material.uniforms.nightAmount.value=1-smooth(-.21,-.015,this.sunDirection.y);
    this.sun.position.copy(this.sunDirection).multiplyScalar(85);this.sun.intensity=3.5*smooth(-.015,.25,this.sunDirection.y);this.sun.color.setHSL(.085+.035*smooth(0,.3,this.sunDirection.y),.72-.56*smooth(0,.3,this.sunDirection.y),.78);
    this.sun.visible=this.sunDirection.y>-.02;
    this.moonLight.position.copy(this.moonDirection).multiplyScalar(85);this.moonLight.intensity=this.night*.24*v.illumination.fraction*smooth(-.01,.2,this.moonDirection.y);
    this.moonLight.visible=this.night>.1&&this.moonDirection.y>0;
    this.moon.material.uniforms.sunlight.value.copy(this.sunDirection);this.moon.material.uniforms.visibleStrength.value=.45+.55*(1-this.day);
    this.moon.visible=this.moonDirection.y>-.015;
    this.stars.material.uniforms.night.value=this.night*.9;
    const axis=new THREE.Vector3(0,Math.sin(55.63489*Math.PI/180),-Math.cos(55.63489*Math.PI/180));this.stars.quaternion.setFromAxisAngle(axis,v.instant.valueOf()/86164090.5*Math.PI*2);
    this.scene.fog.color.set('#b2c7d5').lerp(new THREE.Color('#080f20'),1-this.day);
    if(this.sunDirection.y<.12&&this.sunDirection.y>-.18)this.scene.fog.color.lerp(new THREE.Color('#b9836c'),smooth(-.18,-.02,this.sunDirection.y)*(1-smooth(-.02,.12,this.sunDirection.y))*.55);
    this.applyInterior(this.inside);
    return v;
  }
  applyInterior(inside) {
    this.inside=inside;const d=this.day;
    this.scene.environmentIntensity=inside?.025+d*.13:.025+d*.65;
    this.hemi.intensity=inside?.12+d*.48:.11+d*1.05;
    this.hemi.color.set('#91b6d7').lerp(new THREE.Color('#d4e6f3'),d);this.hemi.groundColor.set('#1b2430').lerp(new THREE.Color('#6f7053'),d);
    this.renderer.toneMappingExposure=inside?1.18:1.02+(1-d)*.5;
  }
  tick(dt,camera) {
    this.elapsed+=dt;this.sky.position.copy(camera.position);this.sky.material.uniforms.cloudTime.value=this.elapsed;
    this.moon.position.copy(camera.position).addScaledVector(this.moonDirection,800);this.stars.position.copy(camera.position);
    this.stars.material.uniforms.pixelRatio.value=this.renderer.getPixelRatio();
  }
}
