const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {io}=require('socket.io-client');const {createGameServer:createServer}=require('../server/server');
const createGameServer=options=>createServer({allowLegacyMaps:true,...options});const {Simulation,STEP}=require('../shared/simulation');const {getMap,MAP_ROTATION}=require('../shared/maps');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=4000){const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error('Timed out');await delay(20);}}
async function connect(url){const s=io(url,{transports:['websocket'],reconnection:false});await new Promise((r,j)=>{s.once('connect',r);s.once('connect_error',j);});return s;}
const join=(s,data)=>new Promise((r,j)=>s.timeout(2000).emit('join',data,(e,v)=>e?j(e):r(v)));
test('completed online match persists a canonical pilot across server restart, with per-map filtering and no bot records',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'qd-integration-'));const file=path.join(dir,'records.json');let game=createGameServer({rankingsFile:file});let clients=[];t.after(async()=>{clients.forEach(s=>s.disconnect());await game.close();await fs.rm(dir,{recursive:true,force:true});});
 await new Promise(r=>game.server.listen(0,'127.0.0.1',r));let url=`http://127.0.0.1:${game.server.address().port}`;
 const a=await connect(url),b=await connect(url);clients.push(a,b);
 const first=await join(a,{mode:'create',name:'Aurora',bots:false,mapId:'canopy',profileToken:'a'.repeat(48),rotate:true});await join(b,{mode:'join',code:first.code,name:'Echo',profileToken:'b'.repeat(48)});
 const room=game.rooms.get(first.code),pa=room.sim.players.get(a.id),pb=room.sim.players.get(b.id);room.sim.fragLimit=1;
 Object.assign(pa,{x:0,z:-4,angle:0,protectedUntil:0});Object.assign(pb,{x:0,z:4,health:24,protectedUntil:0});
 let seq=0;const fire=setInterval(()=>a.emit('input',{seq:++seq,fire:true,weapon:'LASER',aim:{x:0,z:4}}),16);
 try{await until(()=>!!room.sim.recap);}finally{clearInterval(fire);a.emit('input',{seq:++seq,fire:false});}
 await until(()=>game.rankings.getLeaderboard().length===2);const before=game.rankings.getProfile(first.profileId);assert.equal(before.wins,1);assert.equal(before.kills,1);assert.equal(before.matches,1);assert.ok(before.shotsHit<=before.shotsFired);assert.equal(before.maps.canopy.matches,1);
 const recap=room.sim.recap;assert.ok(recap.players.every(p=>Number.isFinite(p.score)&&Number.isFinite(p.xp)));assert.equal(recap.winnerId,a.id);
 room.sim.time=room.sim.restartAt+STEP;await until(()=>room.sim.map.id==='glacier');assert.equal(room.sim.players.get(a.id).kills,0);
 clients.forEach(s=>s.disconnect());clients=[];await game.close();game=createGameServer({rankingsFile:file});await new Promise(r=>game.server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${game.server.address().port}`;
 const profile=await(await fetch(url+'/api/profile',{headers:{'x-pilot-token':'a'.repeat(48)}})).json();assert.equal(profile.playerId,first.profileId);assert.equal(profile.profile.score,before.score);assert.equal(profile.profile.last10.length,1);
 const filtered=await(await fetch(url+'/api/leaderboard?mapId=canopy')).json();assert.equal(filtered.rows.length,2);const other=await(await fetch(url+'/api/leaderboard?mapId=foundry')).json();assert.equal(other.rows.length,0);
 assert.ok(!JSON.stringify(profile).includes('a'.repeat(48)));
});
test('new map rotation resets round counters and preserves clear safe spawns through every arena',()=>{
 const sim=new Simulation({map:getMap('foundry'),mapRotation:MAP_ROTATION.map(getMap)});for(let i=0;i<8;i++)sim.addPlayer('bot'+i,'Bot '+i,true);
 const {blocked,RULES}=require('../shared/simulation');
 for(let round=0;round<8;round++){sim.endRound();sim.time=sim.restartAt+STEP;sim.step();for(const p of sim.players.values()){assert.ok(!blocked(p.x,p.z,RULES.radius,sim.map));assert.equal(p.kills,0);assert.equal(p.shotsFired,0);}}
});
test('grenade splash counts each successful projectile once and suicide does not create negative persistent counters',()=>{
 const sim=new Simulation({map:{id:'test',size:25,obstacles:[]}});const a=sim.addPlayer('a','A'),b=sim.addPlayer('b','B'),c=sim.addPlayer('c','C');
 Object.assign(a,{x:0,z:-10,protectedUntil:0,shotsFired:1});Object.assign(b,{x:0,z:0,protectedUntil:0});Object.assign(c,{x:1,z:0,protectedUntil:0});
 sim.explode({x:0,z:0,weapon:'GRENADE',owner:'a'});assert.equal(a.shotsHit,1);assert.ok(a.damageDealt>80);
 sim.damage(a,100,{owner:'a',weapon:'GRENADE'});sim.endRound();assert.equal(sim.recap.players.find(p=>p.id==='a').kills,0);
});
