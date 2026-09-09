const {chromium}=require('@playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080/?showcase=health');await page.waitForFunction(()=>window.__qd?.showcase);
  await page.evaluate(()=>window.__qd.showcase({map:'foundry',camera:'tactical',time:'dusk',module:'health',state:'damaged'}));
  await page.waitForTimeout(500);const before=await page.evaluate(()=>window.__qd.getSnapshot().camera);
  for(const [x,y]of [[250,300],[1200,700],[700,200]]){await page.mouse.move(x,y);await page.waitForTimeout(250);const after=await page.evaluate(()=>window.__qd.getSnapshot().camera);assert.deepEqual(after.position,before.position);assert.deepEqual(after.matrix,before.matrix);assert.equal(after.fov,before.fov);}
  await page.screenshot({path:'docs/gauntlet/evidence/r4-arena-camera.png'});
  await page.keyboard.press('KeyV');assert.equal(await page.evaluate(()=>window.__qd.getSnapshot().view),2);await page.keyboard.press('KeyV');assert.equal(await page.evaluate(()=>window.__qd.getSnapshot().view),0);
  await page.keyboard.press('Escape');await page.locator('#resume').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('#scoreboard').isHidden(),true);assert.notEqual(await page.evaluate(()=>document.activeElement.id),'resume');
  await page.screenshot({path:'docs/gauntlet/evidence/r4-camera-menu.png'});
  await page.keyboard.press('Escape');
  await page.close();
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto('http://localhost:8080/?showcase=health');await mobile.waitForFunction(()=>window.__qd?.showcase);
  await mobile.evaluate(()=>window.__qd.showcase({map:'canopy',camera:'tactical',time:'day',module:'health',state:'damaged'}));await mobile.waitForTimeout(500);await mobile.screenshot({path:'docs/gauntlet/evidence/r4-touch-camera.png'});
  await mobile.evaluate(()=>window.__qd.showcase({map:'foundry',camera:'tactical',time:'dusk',module:'ui',state:'recap'}));await mobile.waitForTimeout(500);assert.ok(await mobile.locator('.vitals').isHidden());assert.ok(await mobile.locator('#touch-controls').isHidden());await mobile.screenshot({path:'docs/gauntlet/evidence/r4-touch-recap.png'});
  assert.deepEqual(errors,[]);fs.writeFileSync('docs/gauntlet/evidence/r4-camera-verification.json',JSON.stringify({capturedAt:new Date().toISOString(),checks:['fixed camera under cursor movement','V toggles only Arena/Full map','menu Tab moves focus without opening standings','true touch camera capture','touch recap suppresses combat HUD'],errors},null,2));console.log('PASS: fixed arena camera, simple toggle, menu focus and touch recap');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
