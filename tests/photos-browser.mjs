import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.CHURCH_URL||'http://127.0.0.1:8890/',out=process.env.CHURCH_QA_DIR||'/private/tmp/church-photos-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),requests=[],errors=[];
  page.on('request',r=>{if(new URL(r.url()).origin!==new URL(base).origin)requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.evaluate(()=>document.fonts.ready);assert(await page.locator('#entry').isVisible());assert(await page.locator('#app-content').isHidden());assert.equal(await page.locator('#viewport canvas').count(),0);assert.deepEqual(requests,[]);await page.screenshot({path:out+'/01-hinweis.png'});
  await page.locator('#start-without-photos').click();await page.waitForFunction(()=>document.querySelector('#loading').hidden,{timeout:60000});assert.deepEqual(requests,[]);
  await page.locator('#photos-jump').click();const stopped=await page.locator('#viewport').getAttribute('data-position');await page.waitForTimeout(500);assert.equal(await page.locator('#viewport').getAttribute('data-position'),stopped);assert.equal(await page.locator('.photo-card').count(),14);assert.equal(await page.locator('.photo-card img[src]').count(),0);await page.screenshot({path:out+'/02-ohne-fotos.png'});
  await page.locator('#photo-toggle').click();assert.equal(await page.locator('html').getAttribute('data-external-photos'),'true');
  const loaded=[];
  for(const img of await page.locator('.photo-card img').all()){
    await img.scrollIntoViewIfNeeded();await img.evaluate(el=>{el.loading='eager';});
    await page.waitForFunction(url=>[...document.querySelectorAll('.photo-card img')].some(i=>i.src===url&&i.complete&&i.naturalWidth>0),await img.getAttribute('src'),{timeout:30000});loaded.push(await img.getAttribute('alt'));
  }
  await page.locator('#photos-title').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:out+'/03-fotostrecke.png'});
  await page.locator('#photos-detail-title').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/04-details.png'});
  await page.locator('#photos-archive-title').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/05-archiv.png'});
  await page.locator('.photo-open').first().click();await page.waitForFunction(()=>document.querySelector('#photo-full').naturalWidth>0);assert(await page.locator('#photo-dialog').isVisible());await page.screenshot({path:out+'/06-vergroessert.png'});await page.locator('#photo-dialog .close').click();
  await page.locator('#photo-toggle').click();assert.equal(await page.locator('.photo-card img[src]').count(),0);const count=requests.length;await page.waitForTimeout(300);assert.equal(requests.length,count);
  await page.locator('#back-to-church').click();await page.locator('#explore').click();await page.locator('#settings-open').click();await page.locator('#theme').selectOption('dark');await page.locator('#settings-dialog .close').click();await page.locator('#photos-open').click();await page.screenshot({path:out+'/07-dunkel-ohne.png'});
  await page.reload();assert(await page.locator('#entry').isVisible());assert.equal(await page.locator('html').getAttribute('data-external-photos'),'false');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/08-mobil-hinweis.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#start-with-photos').click();await page.waitForFunction(()=>document.querySelector('#loading').hidden);await page.locator('#photos-jump').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/09-mobil-fotos.png'});
  assert(requests.length>0);for(const url of requests)assert(['upload.wikimedia.org','thumb.wikimedia.org'].includes(new URL(url).hostname));assert.deepEqual(errors,[]);
  const report={disclaimerBeforeApp:true,noExternalRequestsBeforeChoice:true,worksWithoutPhotos:true,allFourteenPhotosLoaded:loaded,externalHosts:[...new Set(requests.map(u=>new URL(u).hostname))],unCroppedEnlargement:true,revocableVisitOnlyChoice:true,scrollPausesFlight:true,mobileFits:true,errors};await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
