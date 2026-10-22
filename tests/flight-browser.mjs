import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.CHURCH_URL||'http://127.0.0.1:8890/',out=process.env.CHURCH_QA_DIR||'/private/tmp/church-flight-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#loading').hidden,{timeout:60000});assert.equal(await page.locator('#viewport').getAttribute('data-mode'),'flight');assert.equal(await page.locator('#time-speed').inputValue(),'1.2');assert.match(await page.locator('#clock-label').textContent(),/^05:/);assert(await page.locator('#walking-tools').isHidden());
  assert(await page.evaluate(()=>document.querySelector('.stage').getBoundingClientRect().height===innerHeight));
  await page.waitForFunction(()=>Number(document.querySelector('#viewport').dataset.flightTime)>1);await page.locator('#flight').click();await page.waitForFunction(()=>document.querySelector('#viewport').dataset.flightPaused==='true');const stopped=await page.locator('#viewport').getAttribute('data-position');await page.waitForTimeout(250);assert.equal(await page.locator('#viewport').getAttribute('data-position'),stopped);
  await page.screenshot({path:out+'/start.png'});await page.locator('#fullscreen').click();await page.waitForFunction(()=>Boolean(document.fullscreenElement));await page.locator('#flight').click();
  const phases=[];
  for(const leg of [6,9,11,14,18,24,27]){
    await page.waitForFunction(n=>Number(document.querySelector('#viewport').dataset.flightLeg)===n,leg,{timeout:105000});
    assert(await page.locator('#flight-text').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'single credit line must fit');
    assert.equal(await page.locator('#flight-caption').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    await page.screenshot({path:out+`/phase-${leg}.png`});phases.push(leg);console.log('FLIGHT_PHASE',leg,await page.locator('#viewport').getAttribute('data-position'));
  }
  await page.waitForFunction(()=>Number(document.querySelector('#viewport').dataset.flightTime)<2,{timeout:40000});assert.equal(await page.locator('#viewport').getAttribute('data-flight-leg'),'0');
  assert.deepEqual(errors,[]);await page.locator('#flight').click();const report={startFillsViewport:true,defaultAutoplay:true,twentyMinuteDay:true,pauseStopsCamera:true,browserFullscreenAfterClick:true,phases,loopReturnedToStart:true,singleLineCredits:true,noCaptionPanel:true,errors};await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
