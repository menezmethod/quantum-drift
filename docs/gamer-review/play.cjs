const {chromium}=require('@playwright/test');
const fs=require('fs'),path=require('path');
const {Vector3,Matrix4}=require('three');
const {getMap}=require('../../shared/maps');
const {blocked}=require('../../shared/simulation');
const out=__dirname;
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-timer-throttling']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const report={started:new Date().toISOString(),errors:[],captures:[],samples:[],networkBlocked:[]};
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/api/**',r=>{report.networkBlocked.push(r.request().url());return r.fulfill({status:503,contentType:'application/json',body:'{"error":"Records excluded from offline review"}'});});
 const snap=()=>page.evaluate(()=>window.__qd.getSnapshot());
 async function capture(name){const s=await snap();await page.screenshot({path:path.join(out,name+'.png')});report.captures.push({name,state:s});fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(report,null,2));console.log('capture '+name);}
 function screen(s,p){const v=new Vector3(p.x,1.05,p.z).applyMatrix4(new Matrix4().fromArray(s.camera.matrix)).applyMatrix4(new Matrix4().fromArray(s.camera.projection));return {x:Math.max(20,Math.min(1420,(v.x+1)*720)),y:Math.max(110,Math.min(760,(1-v.y)*450))};}
 await page.goto('http://localhost:8080',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__qd);
 report.gpu=await page.evaluate(()=>{const gl=document.querySelector('#arena').getContext('webgl2');const e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL)});
 if(/swiftshader|llvmpipe/i.test(report.gpu))throw Error('Not native GPU: '+report.gpu);
 console.log('GPU '+report.gpu);await capture('01-menu');
 for(const map of ['foundry','canopy']){
  if(map!=='foundry'){await page.keyboard.press('Escape');await page.locator('#leave-game').click();}
  await page.locator('[data-map-id="'+map+'"]').click();await page.locator('#practice').click();
  await page.waitForTimeout(700);await capture(map+'-start');
  // Real input only. Read-only diagnostics guide mouse targeting, no state staging.
  for(const [digit,weapon] of [['1','LASER'],['2','GRENADE'],['3','BOUNCE']]){
   await page.keyboard.press(digit);
   const start=await snap();
   for(let i=0;i<36;i++){
    const s=await snap(),me=s.state.players.find(p=>p.id===s.playerId);
    const enemy=s.state.players.filter(p=>p.id!==s.playerId&&p.alive).sort((a,b)=>Math.hypot(a.x-me.x,a.z-me.z)-Math.hypot(b.x-me.x,b.z-me.z))[0];
    if(enemy){const aim=screen(s,enemy);await page.mouse.move(aim.x,aim.y);}
    const key=['w','d','s','a'][Math.floor(i/9)%4];if(i%9===0){if(i)await page.keyboard.up(['w','d','s','a'][Math.floor(i/9)-1]);await page.keyboard.down(key);}
    await page.mouse.down();await page.waitForTimeout(300);
    const next=await snap(),p=next.state.players.find(p=>p.id===next.playerId);
    report.samples.push({map,weapon,t:next.state.time,x:p.x,z:p.z,alive:p.alive,energy:p.energy,health:p.health,shots:p.shotsFired,hits:p.shotsHit,kills:p.kills,blocked:blocked(p.x,p.z,.799,getMap(map)),projectiles:next.state.projectiles.filter(p=>p.owner===next.playerId)});
    if(i===12||i===27)await capture(map+'-'+weapon.toLowerCase()+'-'+i);
   }
   await page.mouse.up();for(const k of ['w','a','s','d'])await page.keyboard.up(k);
   const end=await snap();console.log(JSON.stringify({map,weapon,start:start.state.players.find(p=>p.id===start.playerId),end:end.state.players.find(p=>p.id===end.playerId)}));
  }
  await page.keyboard.press('Escape');await capture(map+'-paused');await page.keyboard.press('Escape');
 }
 await page.keyboard.press('Escape');await capture('final-menu');
 fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
