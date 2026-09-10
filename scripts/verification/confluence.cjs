const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('@playwright/test');
const {io}=require('socket.io-client');
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
  const pilot=[...sim.players.values()][0];pilot.x=-52;pilot.z=-52;pilot.angle=0;
  await a.waitForTimeout(300);const before=pilot.z;await a.keyboard.down('w');await a.waitForTimeout(400);await a.keyboard.up('w');assert.ok(Math.abs(pilot.z-before)>2,'keyboard movement');
  await a.mouse.move(700,300);await a.mouse.down();await a.waitForTimeout(500);await a.mouse.up();assert.ok(pilot.shotsFired>0);assert.ok(pilot.energy<90);
  async function receipt(page,name){await page.waitForTimeout(600);await page.screenshot({path:`${out}/${name}.png`});const frames=await page.evaluate(()=>new Promise(resolve=>{let start=performance.now(),last=start,frames=[];function sample(t){frames.push(t-last);last=t;if(t-start>1000)resolve(frames);else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));const s=await page.evaluate(()=>window.__qd.getSnapshot());results.push({name,fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),stage:s.state.mapStage,players:s.state.players.length,drawCalls:s.renderer.calls,triangles:s.renderer.triangles});}
  await receipt(a,'core-online');
  for(let i=0;i<5;i++){
   const s=io(url,{transports:['websocket'],forceNew:true});sockets.push(s);await new Promise(r=>s.once('connect',r));
   const ack=await new Promise(r=>s.emit('join',{mode:'join',code:room,name:`Verifier ${i}`},r));assert.ok(ack.code);
   if(i%2===0) for(const p of pages) await p.waitForFunction(stage=>window.__qd.getSnapshot().state.mapStage===stage,1+i/2,{timeout:12000});
  }
  for(const p of pages)await p.waitForFunction(()=>window.__qd.getSnapshot().state.mapStage===3,{},{timeout:12000});
  await a.keyboard.press('v');await receipt(a,'whole-world');
  await a.keyboard.press('v');pilot.x=-52;pilot.z=8;await receipt(a,'forest');
  pilot.x=-30;pilot.z=30;pilot.vx=pilot.vz=0;await receipt(a,'forest-centre');
  const forestStart={x:pilot.x,z:pilot.z};await a.keyboard.down('d');await a.waitForTimeout(500);await a.keyboard.up('d');assert.ok(Math.hypot(pilot.x-forestStart.x,pilot.z-forestStart.z)>2,'forest clearing movement');
  pilot.x=8;pilot.z=8;await receipt(a,'ice');
  pilot.x=8;pilot.z=-52;await receipt(a,'rails');
  const touch=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  touch.on('pageerror',e=>errors.push(e.message));await touch.goto(url);await touch.fill('#room-code',room);await touch.click('#join-room');
  await touch.waitForFunction(()=>window.__qd.getSnapshot().mode==='online');
  const touchId=await touch.evaluate(()=>window.__qd.getSnapshot().playerId),tp=sim.players.get(touchId);
  Object.assign(tp,{x:-30,z:30,vx:0,vz:0});await touch.waitForTimeout(500);
  const cdp=await touch.context().newCDPSession(touch),button=await touch.locator('[data-control="KeyD"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2}]});
  await touch.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(Math.hypot(tp.x+30,tp.z-30)>2,'touch movement in forest clearing');await receipt(touch,'forest-mobile');
  await touch.close();
  sockets.forEach(s=>s.disconnect());await a.waitForTimeout(500);assert.equal(sim.map.stage,3);
  sim.newRound();
  for(const p of pages)await p.waitForFunction(()=>window.__qd.getSnapshot().state.mapStage===0);
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url);await mobile.click('#practice');await mobile.waitForFunction(()=>window.__qd.getSnapshot().state.mapStage===3&&window.__qd.getSnapshot().mode==='practice');await receipt(mobile,'practice-mobile');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${out}/verification.json`,JSON.stringify({method:'Two native headless Chrome clients plus five real sockets; movement, weapon energy, synchronized population expansion, screenshots. Draw counts are frame telemetry, not a load benchmark.',errors,results},null,2));
  console.log(JSON.stringify(results));
 }finally{sockets.forEach(s=>s.disconnect());await browser.close();await game.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
