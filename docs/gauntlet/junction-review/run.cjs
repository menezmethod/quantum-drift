const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('@playwright/test');
const {createGameServer}=require('../../../server/server');
const out=__dirname, sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${game.server.address().port}`;let browser;const report={url,errors:[],maps:{}};
try{browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const snap=p=>p.evaluate(()=>window.__qd.getSnapshot());
async function page(){const c=await browser.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.__qd);return p;}
for(const map of ['foundry','junction']){const a=await page();await a.locator(`[data-map-id="${map}"]`).click();await a.fill('#pilot-name','Critic A');await a.check('#fill-bots');await a.click('#create-room');await a.waitForFunction(()=>window.__qd.getSnapshot().mode==='online');let s=await snap(a);const result=report.maps[map]={initial:s};
if(map==='junction'){const b=await page();await b.fill('#room-code',s.room);await b.fill('#pilot-name','Critic B');await b.click('#join-room');await b.waitForFunction(()=>window.__qd.getSnapshot().mode==='online');await sleep(400);result.peerInitial=await snap(b);result.peer=b;}
// Cycle through real camera control to overview.
for(let i=0;i<4 && (await snap(a)).view!==2;i++)await a.keyboard.press('KeyV');await sleep(500);await a.screenshot({path:path.join(out,map+'-overview.png')});
await a.keyboard.press('KeyV');await sleep(300);
result.samples=[];const frames=a.evaluate(()=>new Promise(resolve=>{const ds=[];let last=performance.now(),start=last;function frame(t){ds.push(t-last);last=t;if(t-start>6500)resolve(ds);else requestAnimationFrame(frame)}requestAnimationFrame(frame)}));
await a.mouse.move(720,380);await a.mouse.down();
for(const [key,ms] of [['KeyW',1100],['KeyD',1000],['KeyS',900],['KeyA',800]]){await a.keyboard.down(key);await sleep(ms);await a.keyboard.up(key);result.samples.push(await snap(a));}
await a.keyboard.press('Digit2');await a.mouse.move(830,440);await a.keyboard.down('KeyW');await sleep(650);await a.screenshot({path:path.join(out,map+'-action.png')});await a.keyboard.up('KeyW');await a.mouse.up();
const ds=await frames;const sorted=[...ds].sort((a,b)=>a-b);result.fps={frames:ds.length,mean:1000/(ds.reduce((a,b)=>a+b,0)/ds.length),p95Ms:sorted[Math.floor(sorted.length*.95)]};result.gpu=await a.evaluate(()=>{const gl=document.querySelector('#arena').getContext('webgl2');const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable'});result.final=await snap(a);
if(result.peer){const b=result.peer;delete result.peer;result.peerFinal=await snap(b);await b.screenshot({path:path.join(out,'junction-peer.png')});await b.context().close();}
await a.context().close();console.log(map,JSON.stringify(result.fps),result.gpu);}
}catch(e){report.failure=e.stack;console.error(e)}finally{fs.writeFileSync(path.join(out,'telemetry.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await game.close();}
})();
