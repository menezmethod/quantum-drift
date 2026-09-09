const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
async function capture(options = {}) {
  const config = { url: 'http://localhost:8080', module: 'arena', camera: 'isometric', time: 'dusk', map: 'classic', zoom: 1, width: 1440, height: 900, duration: 2200, ...options };
  const out = path.resolve(config.out || `docs/gauntlet/evidence/${config.module}-${config.map}-${config.camera}-${config.time}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ ...(fs.existsSync(chrome) ? {executablePath:chrome} : {}), headless:true, args:[...(config.backend==='native'?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader']),'--disable-background-timer-throttling'] });
  const page = await browser.newPage({viewport:{width:Number(config.width),height:Number(config.height)},deviceScaleFactor:1,isMobile:Number(config.width)<600,hasTouch:Number(config.width)<600});
  const consoleErrors = [], pageErrors = [], failedRequests = [];
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});page.on('pageerror',e=>pageErrors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
  try {
    const url = new URL(config.url);url.searchParams.set('showcase',config.module);
    await page.goto(url.toString(),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__qd?.showcase);
    await page.evaluate(c=>window.__qd.showcase(c),config);
    await page.waitForTimeout(1200);
    const samples = await page.evaluate(async duration=>{const frames=[];const start=performance.now();let last=start;await new Promise(resolve=>{function frame(t){frames.push(t-last);last=t;if(t-start>=duration)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)});return frames;},Number(config.duration));
    await page.screenshot({path:out+'.png'});
    const state=await page.evaluate(()=>window.__qd.getSnapshot());
    const gpu=await page.evaluate(()=>{const gl=document.getElementById('arena').getContext('webgl2');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});
    const sorted=[...samples].sort((a,b)=>a-b);const report={config,capturedAt:new Date().toISOString(),screenshot:out+'.png',consoleErrors,pageErrors,failedRequests,bundle:await page.evaluate(()=>[...document.scripts].map(s=>s.src).filter(Boolean)),performance:{fps:1000/(samples.reduce((a,b)=>a+b,0)/samples.length),p95FrameMs:sorted[Math.floor(sorted.length*.95)],drawCalls:state.renderer.calls,triangles:state.renderer.triangles,renderer:config.backend==='native'?`headless Chrome / ${gpu}`:'headless Chrome / software SwiftShader (not native GPU benchmark)',gpu},state};
    fs.writeFileSync(out+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify({png:out+'.png',json:out+'.json',errors:consoleErrors.length+pageErrors.length,...report.performance}));return report;
  } finally {await browser.close();}
}
if(require.main===module){const options={};for(let i=2;i<process.argv.length;i+=2)options[process.argv[i].replace(/^--/,'')]=process.argv[i+1];capture(options).catch(e=>{console.error(e);process.exitCode=1})}
module.exports={capture};
