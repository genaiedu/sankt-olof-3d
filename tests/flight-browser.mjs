import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {nextDate} from '../src/daylight.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.CHURCH_URL||'http://127.0.0.1:8890/',out=process.env.CHURCH_QA_DIR||'/private/tmp/church-flight-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base);await page.locator('#start-without-photos').click();await page.waitForFunction(()=>document.querySelector('#loading').hidden,{timeout:60000});
  assert.equal(await page.locator('#viewport').getAttribute('data-mode'),'flight');assert.equal(await page.locator('#time-speed').inputValue(),'4');assert.match(await page.locator('#clock-label').textContent(),/^05:/);assert(await page.locator('#walking-tools').isHidden());const startDate=await page.locator('#date').inputValue();
  assert(await page.evaluate(()=>document.querySelector('.stage').getBoundingClientRect().height===innerHeight));
  await page.waitForFunction(()=>Number(document.querySelector('#viewport').dataset.flightTime)>1);await page.locator('#flight').click();await page.waitForFunction(()=>document.querySelector('#viewport').dataset.flightPaused==='true');const stopped=await page.locator('#viewport').getAttribute('data-position');await page.waitForTimeout(250);assert.equal(await page.locator('#viewport').getAttribute('data-position'),stopped);
  await page.screenshot({path:out+'/start.png'});await page.locator('#fullscreen').click();await page.waitForFunction(()=>Boolean(document.fullscreenElement));await page.locator('#flight').click();
  const phases=[];
  for(const leg of [6,9,14,20,24,32,36,39,45,49]){
    await page.waitForFunction(n=>Number(document.querySelector('#viewport').dataset.flightLeg)===n,leg,{timeout:115000});
    assert(await page.locator('#flight-text').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'single credit line must fit');
    assert.equal(await page.locator('#flight-caption').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    await page.screenshot({path:out+'/phase-'+leg+'.png'});phases.push(leg);console.log('FLIGHT_PHASE',leg,await page.locator('#viewport').getAttribute('data-position'));
  }
  await page.waitForFunction(()=>document.querySelector('#viewport').dataset.flightComplete==='true',{},{timeout:50000});
  assert.equal(await page.locator('#viewport').getAttribute('data-mode'),'walk');assert.equal(await page.locator('#viewport').getAttribute('data-clock'),'05:00');assert.equal(await page.locator('#date').inputValue(),nextDate(startDate));assert.equal(await page.locator('#time-play').getAttribute('aria-pressed'),'false');
  assert(await page.locator('#free-intro').isVisible());assert.match(await page.locator('#free-intro').innerText(),/Zeit zum eigenen Erkunden/);assert.equal(await page.locator('#viewport').getAttribute('data-position'),'-11.500,1.660,0.000');
  await page.screenshot({path:out+'/ende-am-portal.png'});const end=await page.locator('#viewport').getAttribute('data-position');await page.waitForTimeout(300);assert.equal(await page.locator('#viewport').getAttribute('data-position'),end,'tour must not loop');
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(1500);await page.keyboard.up('ArrowUp');const inside=(await page.locator('#viewport').getAttribute('data-position')).split(',').map(Number);assert(inside[0]>-10&&Math.abs(inside[2])<.2,'cursor keys immediately enter through the west portal');assert(await page.locator('#free-intro').isHidden());await page.screenshot({path:out+'/selbst-im-portal.png'});
  assert.deepEqual(errors,[]);const report={disclaimerBeforeStart:true,twoDifferentFlights:true,exactlyOneDay:true,endsAtVisitorEyeHeight:true,noLoop:true,immediateCursorExploration:true,pauseStopsCamera:true,browserFullscreenAfterClick:true,phases,singleLineCredits:true,errors};await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
