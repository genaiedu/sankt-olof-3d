import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.CHURCH_URL||'http://127.0.0.1:8890/',out=process.env.CHURCH_QA_DIR||'/private/tmp/church-graphics-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const errors=[],badResponses=[],external=[];
try{
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)badResponses.push([r.status(),r.url()]);});
  await page.route('**/*',r=>{if(!r.request().url().startsWith(new URL(base).origin)){external.push(r.request().url());return r.abort();}return r.continue();});
  const start=async()=>{await page.locator('#start-without-photos').click();await page.waitForFunction(()=>document.querySelector('#loading').hidden,{timeout:60000});};
  await page.goto(base);await start();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#viewport').getAttribute('data-mode'),'flight');await page.locator('#flight').click();await page.waitForFunction(()=>document.querySelector('#viewport').dataset.flightPaused==='true');
  await page.screenshot({path:out+'/00-drohnenstart.png'});await page.locator('#explore').click();
  if(!await page.locator('#time').isVisible())await page.locator('#time-controls summary').click();await page.getByRole('button',{name:'Tag',exact:true}).click();await page.locator('#time-controls summary').click();
  // A loaded model and passing controls alone do not prove that pixels render.
  assert((await page.locator('#viewport canvas').screenshot()).length>60_000,'3D canvas must not be a blank render target');
  await page.screenshot({path:out+'/01-tag.png'});
  const position=()=>page.locator('#viewport').getAttribute('data-position');
  if(!await page.locator('#time').isVisible())await page.locator('#time-controls summary').click();
  const firstPosition=await position();await page.getByRole('button',{name:'Untergang',exact:true}).click();
  assert.equal(await position(),firstPosition,'time controls must not orbit the camera');
  await page.screenshot({path:out+'/02-sonnenuntergang.png'});
  await page.getByRole('button',{name:'Nacht',exact:true}).click();assert(Number(await page.locator('#viewport').getAttribute('data-solar-altitude'))<-15);
  await page.screenshot({path:out+'/03-nacht.png'});
  const before=await page.locator('#viewport').getAttribute('data-clock');await page.locator('#time-play').click();await page.waitForFunction(old=>document.getElementById('viewport').dataset.clock!==old,before);await page.locator('#time-play').click();assert.equal(await page.locator('#time-play').getAttribute('aria-pressed'),'false');
  await page.locator('#clock-input').fill('14:20');await page.locator('#clock-input').press('Tab');await page.waitForFunction(()=>document.getElementById('viewport').dataset.clock==='14:20');
  await page.reload();await start();assert.match(await page.locator('#viewport').getAttribute('data-clock'),/^05:0\d$/);assert.equal(await page.locator('#viewport').getAttribute('data-mode'),'flight');await page.locator('#explore').click();assert.equal(await page.locator('#time-play').getAttribute('aria-pressed'),'false');
  if(!await page.locator('#date').isVisible())await page.locator('#time-controls summary').click();
  await page.locator('#clock-input').fill('14:20');await page.locator('#clock-input').press('Tab');
  const autumnAltitude=Number(await page.locator('#viewport').getAttribute('data-solar-altitude'));
  await page.locator('#date').fill('2026-06-21');await page.locator('#date').press('Tab');assert(Number(await page.locator('#viewport').getAttribute('data-solar-altitude'))>autumnAltitude+8);
  await page.locator('#date').fill('2026-09-22');await page.locator('#date').press('Tab');await page.locator('#time-controls summary').click();
  for(const place of ['nave','choir','font']){await page.locator(`[data-place=${place}]`).click();assert.equal(await page.locator('#viewport').getAttribute('data-mode'),'walk');await page.screenshot({path:out+`/innen-${place}.png`});}
  await page.locator('#walk').isVisible().then(async visible=>{if(!visible)await page.locator('#orbit').click();});await page.locator('#walk').click();
  await page.locator('#viewport').focus();const a=(await position()).split(',').map(Number),oldHeading=Number(await page.locator('#viewport').getAttribute('data-heading'));
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(550);await page.keyboard.up('ArrowRight');await page.waitForTimeout(60);const heading=Number(await page.locator('#viewport').getAttribute('data-heading'));assert(heading<oldHeading-.2);assert.equal(await position(),a.map(n=>n.toFixed(3)).join(','),'turning must not translate the walker');
  await page.waitForTimeout(260);assert.equal(Number(await page.locator('#viewport').getAttribute('data-heading')),heading,'release must stop rotation without drift');
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(450);await page.keyboard.up('ArrowUp');const b=(await position()).split(',').map(Number);assert(Math.hypot(b[0]-a[0],b[2]-a[2])>.3);
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(450);await page.keyboard.up('ArrowDown');const c=(await position()).split(',').map(Number);assert(Math.hypot(c[0]-a[0],c[2]-a[2])<.22);assert.equal(Number(await page.locator('#viewport').getAttribute('data-heading')),heading,'backward movement must not turn the camera around');
  await page.screenshot({path:out+'/04-begehung.png'});
  const rendered=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  // Aim through short, bounded mouse gestures; no camera-state injection.
  async function aim(direction){
    const v=(await page.locator('#viewport').getAttribute(direction)).split(',').map(Number),goalYaw=Math.atan2(-v[0],-v[2]),goalPitch=Math.asin(v[1]);
    const y=Number(await page.locator('#viewport').getAttribute('data-heading')),p=Number(await page.locator('#viewport').getAttribute('data-pitch')),dy=Math.atan2(Math.sin(goalYaw-y),Math.cos(goalYaw-y)),dp=goalPitch-p,n=Math.ceil(Math.max(Math.abs(dy),Math.abs(dp))/.6);
    const box=await page.locator('#viewport').boundingBox(),start={x:box.x+box.width*.5,y:box.y+box.height*.5};
    for(let i=0;i<n;i++){await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x-dy/n/.003,start.y-dp/n/.003,{steps:8});await page.mouse.up();}
    await rendered();const actual=Number(await page.locator('#viewport').getAttribute('data-heading'));assert(Math.abs(Math.atan2(Math.sin(actual-goalYaw),Math.cos(actual-goalYaw)))<.025);
  }
  await aim('data-sun-direction');await page.screenshot({path:out+'/05-gegenlicht.png'});
  if(!await page.locator('#time').isVisible())await page.locator('#time-controls summary').click();
  await page.getByRole('button',{name:'Nacht',exact:true}).click();assert(Number(await page.locator('#viewport').getAttribute('data-moon-altitude'))>0);await page.locator('#time-controls summary').click();await aim('data-moon-direction');await page.screenshot({path:out+'/mond.png'});
  for(const place of ['nave','choir']){await page.locator(`[data-place=${place}]`).click();await rendered();await page.screenshot({path:out+`/nacht-innen-${place}.png`});}
  await page.locator('[data-place=overview]').click();
  await page.locator('#fullscreen').click();await page.waitForFunction(()=>Boolean(document.fullscreenElement));await rendered();await page.screenshot({path:out+'/06-vollbild.png'});await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);await rendered();
  const palettes=[];
  for(const palette of ['graphite','atelier','slate','plum','bordeaux'])for(const theme of ['light','dark']){
    await page.locator('#settings-open').click();await page.locator('#palette').selectOption(palette);await page.locator('#theme').selectOption(theme);assert.equal(await page.locator('html').getAttribute('data-palette'),palette);await page.locator('#settings-dialog .close').click();palettes.push(palette+'/'+theme);
  }
  await page.locator('#settings-open').click();await page.locator('#palette').selectOption('graphite');await page.locator('#theme').selectOption('light');await page.locator('#quality').selectOption('low');await page.locator('#settings-dialog .close').click();
  if(!await page.locator('#time').isVisible())await page.locator('#time-controls summary').click();await page.getByRole('button',{name:'Tag',exact:true}).click();await page.locator('#time-controls summary').click();await rendered();
  assert((await page.locator('#viewport canvas').screenshot()).length>60_000,'Low quality must still render the model');await page.screenshot({path:out+'/sparsame-grafik.png'});
  for(const width of [768,390]){await page.setViewportSize({width,height:844});await page.locator('[data-place=overview]').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+`/mobil-${width}.png`,fullPage:true});}
  await page.locator('#flight').click();await page.locator('#flight').click();await rendered();assert(await page.locator('#walking-tools').isHidden());assert(await page.locator('#flight-text').evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/mobil-rundflug.png'});
  const fps=await page.locator('#viewport').getAttribute('data-fps');
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await start();assert.equal(await page.locator('#viewport').getAttribute('data-flight-paused'),'true');assert.equal(await page.locator('#time-play').getAttribute('aria-pressed'),'false');
  await ctx.close();
  assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);assert.deepEqual(external,[]);
  const report={modelLoaded:true,nonBlankCanvas:true,timeDoesNotMoveCamera:true,daySunsetNight:true,dateChangesSolarAltitude:true,timelapsePause:true,reloadStartsAtFive:true,threeInteriorStations:true,interruptibleArrowSteering:true,forwardBackwardWithoutTurning:true,nightInteriorScreenshots:true,sunAndMoonAimedWithMouse:true,fullscreen:true,lowQualityNonBlank:true,mobileTourFits:true,reducedMotionStartsPaused:true,palettes,viewportWidths:[1440,768,390],fps,errors,badResponses,external};
  await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
