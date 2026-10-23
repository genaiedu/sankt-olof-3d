import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(process.env.CHURCH_URL||'http://127.0.0.1:8890/');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {AlphaAwareSSAOPass}=await import('/src/AlphaAwareSSAOPass.js');
    const {SSAOPass}=await import('/node_modules/three/examples/jsm/postprocessing/SSAOPass.js');
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,20);
    camera.position.z=5;camera.lookAt(0,0,0);camera.updateMatrixWorld();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const ctx=canvas.getContext('2d');ctx.fillStyle='green';ctx.beginPath();ctx.arc(32,32,12,0,Math.PI*2);ctx.fill();
    const material=new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(canvas),alphaTest:.25,side:THREE.DoubleSide});
    // Exercise the same vertex-hook mechanism used by moving foliage.
    material.onBeforeCompile=shader=>{shader.uniforms.leafTime={value:0};shader.vertexShader='uniform float leafTime;\n'+shader.vertexShader;};
    const leaf=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(leaf);
    const renderer=new THREE.WebGLRenderer();renderer.setSize(128,128);
    const target=new THREE.WebGLRenderTarget(128,128);
    const pixel=(pass,x,y)=>{const p=new Uint16Array(4);renderer.readRenderTargetPixels(pass.normalRenderTarget,x,y,1,1,p);return [...p];};
    const sample=Pass=>{
      const pass=new Pass(scene,camera,128,128,12);pass.render(renderer,target,target);
      const result={background:pixel(pass,0,0),transparent:pixel(pass,88,64),leaf:pixel(pass,64,64),restored:leaf.material===material};
      pass.dispose();return result;
    };
    const before=sample(SSAOPass),after=sample(AlphaAwareSSAOPass);
    target.dispose();renderer.dispose();return {before,after};
  });
  assert.notDeepEqual(result.before.transparent,result.before.background,'reproduce opaque leaf-card depth');
  assert.deepEqual(result.after.transparent,result.after.background,'transparent card areas leave no phantom normal/depth');
  assert.notDeepEqual(result.after.leaf,result.after.background,'actual leaves still contribute to occlusion');
  assert(result.after.restored,'visible leaf material is restored after the auxiliary pass');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({alphaAwareNormalDepth:true,visibleLeavesRetained:true,materialsRestored:true,errors},null,2));
} finally {await browser.close();}
