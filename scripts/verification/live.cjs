// Bounded public deployment smoke test; no state injection or completed test rounds.
const {io}=require('socket.io-client');
const assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const url=process.argv[2]||'http://localhost:8080';
 const count=Math.max(2,Math.min(8,Number(process.argv[3])||2));
 const clients=[],states=new Map();let timer;
 try{
  const health=await fetch(url+'/health');assert.equal(health.status,200);
  let code;
  for(let i=0;i<count;i++){
   const s=io(url,{transports:['websocket'],forceNew:true,reconnection:false,timeout:10000});clients.push(s);
   await new Promise((r,j)=>{s.once('connect',r);s.once('connect_error',j)});
   s.on('state',v=>states.set(s.id,v));
   const joined=await new Promise((r,j)=>s.timeout(10000).emit('join',i?{mode:'join',code,name:'Release check '+i}:{mode:'create',bots:false,mapId:'foundry',name:'Release check'},(e,v)=>e?j(e):r(v)));
   assert.ok(!joined.error,joined.error);code=joined.code;
  }
  let seq=0;
  timer=setInterval(()=>{seq++;for(const [i,s]of clients.entries())s.emit('input',{seq,move:{x:Math.sin(seq/20+i),z:Math.cos(seq/20+i)},weapon:'LASER',fire:true,aim:{x:0,z:0}})},50);
  await wait(10000);clearInterval(timer);
  for(const s of clients){assert.ok(s.connected);const st=states.get(s.id);assert.equal(st.players.filter(p=>!p.bot).length,count);const p=st.players.find(p=>p.id===s.id);assert.ok(p.shotsFired>0);assert.ok(p.shotsFired<35,'held fire must be energy limited');}
  console.log(JSON.stringify({url,clients:count,durationSeconds:10,transport:'websocket',replication:true,energyLimited:true,status:'PASS'}));
 }finally{clearInterval(timer);clients.forEach(s=>s.disconnect())}
})().catch(e=>{console.error(e.message);process.exitCode=1});
