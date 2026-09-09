const {chromium}=require('@playwright/test'),{io}=require('socket.io-client');
const {createGameServer}=require('../../server/server');
const {Vector3,Matrix4}=require('three');
const assert=require('node:assert/strict'),fs=require('node:fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${game.server.address().port}`;
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});let peer;
 const errors=[],results=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.__qd);await page.locator('[data-map-id="classic"]').click();await page.uncheck('#fill-bots');await page.click('#create-room');await page.waitForFunction(()=>window.__qd.getSnapshot().mode==='online');
  const snap=()=>page.evaluate(()=>window.__qd.getSnapshot());const initial=await snap();const room=game.rooms.get(initial.room),p=room.sim.players.get(initial.playerId);
  peer=io(url,{transports:['websocket']});await new Promise(r=>peer.once('connect',r));await new Promise(r=>peer.emit('join',{mode:'join',code:initial.room,name:'Observer'},r));
  let remote;peer.on('state',s=>remote=s);
  for(const [key,axis,sign]of [['KeyW','y',1],['KeyS','y',-1],['KeyA','x',-1],['KeyD','x',1]]){
   Object.assign(p,{x:0,z:0,vx:0,vz:0,angle:2.1,health:100,alive:true});await sleep(400);
   await page.mouse.move(1100,350);await sleep(150);const before=await snap(),start={x:p.x,z:p.z};
   await page.keyboard.down(key);await sleep(350);await page.keyboard.up(key);await sleep(120);
   const camera=before.camera;const project=v=>new Vector3(v.x,.9,v.z).applyMatrix4(new Matrix4().fromArray(camera.matrix)).applyMatrix4(new Matrix4().fromArray(camera.projection));
   const a=project(start),b=project(p),delta=b[axis]-a[axis];assert.ok(delta*sign>.03,`${key} moved wrong: ${delta}`);
   const seen=remote.players.find(v=>v.id===p.id);assert.ok(Math.hypot(seen.x-p.x,seen.z-p.z)<1);results.push({key,projectedDelta:delta,replicated:true});
  }
  await page.screenshot({path:'docs/gauntlet/evidence/r5-screen-movement.png'});assert.deepEqual(errors,[]);
  fs.writeFileSync('docs/gauntlet/evidence/r5-screen-movement.json',JSON.stringify({capturedAt:new Date().toISOString(),method:'Real production browser keyboard input through Socket.IO; arbitrary initial ship heading and independent mouse aim; peer snapshot verification',results,errors},null,2));console.log('PASS: W/S/A/D follow screen directions independent of heading and replicate to peer');
 }finally{peer?.disconnect();await browser.close();await game.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
