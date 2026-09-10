const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('@playwright/test');
const {io}=require('socket.io-client');
const {Vector3,Matrix4}=require('three');
const {createGameServer}=require('../../server/server');
(async()=>{
 const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${game.server.address().port}`;
 const browser=await chromium.launch({...(fs.existsSync(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?{executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{}),headless:true});
 const sockets=[],errors=[],out='docs/gauntlet/confluence';fs.mkdirSync(out,{recursive:true});
 const results=[];
 try{
  const pages=[];for(let i=0;i<2;i++){const c=await browser.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.__qd);pages.push(p);}
  const [a,b]=pages;
  assert.equal(await a.locator('[data-map-id]').count(),1);
  await a.uncheck('#fill-bots');await a.click('#create-room');await a.waitForFunction(()=>window.__qd.getSnapshot().mode==='online');
  const room=(await a.evaluate(()=>window.__qd.getSnapshot())).room;
  await b.fill('#room-code',room);await b.click('#join-room');await b.waitForFunction(()=>window.__qd.getSnapshot().mode==='online');
  const sim=game.rooms.get(room).sim;
  const forest=sim.map.districts.find(d=>d.id==='forest'),ice=sim.map.districts.find(d=>d.id==='ice'),rails=sim.map.districts.find(d=>d.id==='rails');
  const pilot=[...sim.players.values()][0];pilot.x=-10;pilot.z=-10;pilot.angle=0;
  await a.waitForTimeout(300);const before=pilot.z;await a.keyboard.down('w');await a.waitForTimeout(400);await a.keyboard.up('w');assert.ok(Math.abs(pilot.z-before)>2,'keyboard movement');
  await a.mouse.move(700,300);await a.mouse.down();await a.waitForTimeout(500);await a.mouse.up();assert.ok(pilot.shotsFired>0);assert.ok(pilot.energy<90);
  async function receipt(page,name){await page.waitForTimeout(600);await page.screenshot({path:`${out}/${name}.png`});const frames=await page.evaluate(()=>new Promise(resolve=>{let start=performance.now(),last=start,frames=[];function sample(t){frames.push(t-last);last=t;if(t-start>1000)resolve(frames);else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));const s=await page.evaluate(()=>window.__qd.getSnapshot());results.push({name,fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),stage:s.state.mapStage,players:s.state.players.length,drawCalls:s.renderer.calls,triangles:s.renderer.triangles});}
  await receipt(a,'core-online');
  Object.assign(pilot,{x:-6,z:0,vx:0,vz:0});
  await a.waitForTimeout(400);await a.keyboard.down('a');await a.waitForTimeout(450);await a.keyboard.up('a');
  assert.ok(Math.hypot(pilot.x+6,pilot.z)>2 && Math.abs(pilot.x)<9 && Math.abs(pilot.z)<9,'Nexus keyboard crossing');
  await a.waitForFunction(()=>document.querySelector('#round-label').textContent.includes('NEXUS'));
  await receipt(a,'nexus-online');
  await a.keyboard.press('v');await receipt(a,'nexus-stage-0');await a.keyboard.press('v');
  const opponent=[...sim.players.values()][1];
  for(const [key,weapon,targetX,aimX] of [['1','LASER',6,6],['2','GRENADE',6,6],['3','BOUNCE',-4,8]]){
   Object.assign(pilot,{x:0,z:0,vx:0,vz:0,angle:0,health:100,energy:100,nextFire:0,protectedUntil:0});
   Object.assign(opponent,{x:targetX,z:0,vx:0,vz:0,health:100,protectedUntil:0});sim.projectiles.clear();
   await a.keyboard.press(key);await a.waitForTimeout(500);
   const camera=(await a.evaluate(()=>window.__qd.getSnapshot())).camera;
   const target=new Vector3(aimX,0.9,0).applyMatrix4(new Matrix4().fromArray(camera.matrix)).applyMatrix4(new Matrix4().fromArray(camera.projection));
   await a.mouse.move((target.x+1)*720,(1-target.y)*450);await a.mouse.down();await a.waitForTimeout(80);await a.mouse.up();
   await b.waitForFunction(id=>window.__qd.getSnapshot().state.players.find(p=>p.id===id).health<100,opponent.id);
   assert.equal(pilot.angle,0,`${weapon} independent hub aim`);
   assert.ok(opponent.health<= (weapon==='LASER'?76:weapon==='BOUNCE'?66:30),`${weapon} authoritative hub damage`);
  }
  await receipt(a,'nexus-combat');
  await a.keyboard.press('1');
  for(let i=0;i<5;i++){
   const s=io(url,{transports:['websocket'],forceNew:true});sockets.push(s);await new Promise(r=>s.once('connect',r));
   const ack=await new Promise(r=>s.emit('join',{mode:'join',code:room,name:`Verifier ${i}`},r));assert.ok(ack.code);
   if(i%2===0){
    for(const p of pages) await p.waitForFunction(stage=>window.__qd.getSnapshot().state.mapStage===stage,1+i/2,{timeout:12000});
    for(const opened of sim.map.districts.filter(d=>d.stage===1+i/2)){
     const link=sim.map.connectors.find(c=>c.id===opened.id),nx=Math.sign(opened.x),nz=Math.sign(opened.z);
     const start={x:link.x-nx*6,z:link.z-nz*6};Object.assign(pilot,{...start,vx:0,vz:0});await a.waitForTimeout(400);
     const key=nx>0?'a':nx<0?'d':nz>0?'w':'s';
     await a.keyboard.down(key);await a.waitForTimeout(1400);await a.keyboard.up(key);
     assert.ok((pilot.x-start.x)*nx+(pilot.z-start.z)*nz>12,`${opened.id} bridge drift`);
     await receipt(a,`bridge-${opened.id}`);
    }
    const district=sim.map.districts.find(d=>d.id===(i===0?'ice':i===2?'forest':'core'));
    assert.ok(district.open);Object.assign(pilot,{x:district.x,z:district.z+(i===4?-22:0),vx:0,vz:0});
    await receipt(a,`unlock-stage-${1+i/2}`);
    await a.keyboard.press('v');await receipt(a,`overview-stage-${1+i/2}`);await a.keyboard.press('v');
   }
  }
  for(const p of pages)await p.waitForFunction(()=>window.__qd.getSnapshot().state.mapStage===3,{},{timeout:12000});
  Object.assign(pilot,{x:0,z:0,vx:0,vz:0});await receipt(a,'nexus-expanded');
  await a.keyboard.press('v');await receipt(a,'whole-world');
  await a.keyboard.press('v');pilot.x=forest.x-22;pilot.z=forest.z-22;await receipt(a,'forest');
  pilot.x=forest.x;pilot.z=forest.z;pilot.vx=pilot.vz=0;await receipt(a,'forest-centre');
  const forestStart={x:pilot.x,z:pilot.z};await a.keyboard.down('d');await a.waitForTimeout(500);await a.keyboard.up('d');assert.ok(Math.hypot(pilot.x-forestStart.x,pilot.z-forestStart.z)>2,'forest clearing movement');
  pilot.x=ice.x;pilot.z=ice.z;await receipt(a,'ice');
  pilot.x=rails.x;pilot.z=rails.z-22;await receipt(a,'rails');
  const touch=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  touch.on('pageerror',e=>errors.push(e.message));await touch.goto(url);await touch.fill('#room-code',room);await touch.click('#join-room');
  await touch.waitForFunction(()=>window.__qd.getSnapshot().mode==='online');
  const touchId=await touch.evaluate(()=>window.__qd.getSnapshot().playerId),tp=sim.players.get(touchId);
  Object.assign(tp,{x:forest.x,z:forest.z,vx:0,vz:0});await touch.waitForTimeout(500);
  const cdp=await touch.context().newCDPSession(touch),button=await touch.locator('[data-control="KeyD"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2}]});
  await touch.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(Math.hypot(tp.x-forest.x,tp.z-forest.z)>2,'touch movement in forest clearing');await receipt(touch,'forest-mobile');
  Object.assign(tp,{x:0,z:0,vx:0,vz:0});await touch.waitForTimeout(500);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2}]});
  await touch.waitForTimeout(400);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(Math.hypot(tp.x,tp.z)>2,'touch movement in Nexus');await receipt(touch,'nexus-mobile');
  Object.assign(tp,{x:-11,z:9,vx:0,vz:0});await touch.waitForTimeout(500);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2}]});
  await touch.waitForTimeout(1400);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(tp.x < -23,'touch bridge drift into Rails');await receipt(touch,'bridge-mobile');
  await touch.keyboard.press('v');await receipt(touch,'nexus-mobile-overview');
  await touch.close();
  sockets.forEach(s=>s.disconnect());await a.waitForTimeout(500);assert.equal(sim.map.stage,3);
  sim.newRound();
  for(const p of pages)await p.waitForFunction(()=>window.__qd.getSnapshot().state.mapStage===0);
  const hubMobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  hubMobile.on('pageerror',e=>errors.push(e.message));await hubMobile.goto(url);await hubMobile.fill('#room-code',room);await hubMobile.click('#join-room');
  await hubMobile.waitForFunction(()=>window.__qd.getSnapshot().mode==='online');
  await hubMobile.keyboard.press('v');await receipt(hubMobile,'nexus-mobile-stage-0');await hubMobile.close();
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url);await mobile.click('#practice');await mobile.waitForFunction(()=>window.__qd.getSnapshot().state.mapStage===3&&window.__qd.getSnapshot().mode==='practice');await receipt(mobile,'practice-mobile');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${out}/verification.json`,JSON.stringify({method:'Two native headless Chrome clients plus five real sockets; movement, weapon energy, synchronized population expansion, screenshots. Draw counts are frame telemetry, not a load benchmark.',errors,results},null,2));
  console.log(JSON.stringify(results));
 }finally{sockets.forEach(s=>s.disconnect());await browser.close();await game.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
