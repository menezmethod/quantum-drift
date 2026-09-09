const {test}=require('node:test'),assert=require('node:assert/strict');
const {io}=require('socket.io-client'),{createGameServer}=require('../server/server');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const join=(s,r)=>new Promise(resolve=>s.emit('join',r,resolve));
async function harness(t,options={}){
 const game=createGameServer({tick:false,...options});await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const clients=[];
 t.after(async()=>{clients.forEach(s=>s.disconnect());await game.close();});
 const connect=async()=>{const s=io(`http://127.0.0.1:${game.server.address().port}`,{transports:['websocket'],forceNew:true,reconnection:false});clients.push(s);await new Promise(r=>s.once('connect',r));return s;};
 return {game,connect};
}
const token='reconnect-pilot-token-123456';
test('real socket reconnect preserves damaged resources and death timers without extra spawn',async t=>{
 const {game,connect}=await harness(t);let a=await connect();const first=await join(a,{mode:'create',bots:false,profileToken:token});const b=await connect();await join(b,{mode:'join',code:first.code});const room=game.rooms.get(first.code);
 for(const alive of [true,false]){
  const p=room.sim.players.get(a.id);Object.assign(p,{alive,health:alive?23:0,energy:7,kills:4,deaths:2,respawnAt:3,nextFire:1.4,protectedUntil:0,lastDamage:0,x:5,z:5,weapon:'BOUNCE'});
  const removed=new Promise(r=>room && game.io.sockets.sockets.get(a.id).once('disconnect',r));a.disconnect();await removed;
  room.sim.drainEvents();a=await connect();const result=await join(a,{mode:'join',code:first.code,profileToken:token});assert.ok(!result.error);
  const restored=room.sim.players.get(a.id);for(const key of ['alive','health','energy','kills','deaths','respawnAt','nextFire','protectedUntil','lastDamage','x','z','weapon'])assert.equal(restored[key],p[key],key);
  assert.equal(room.sim.departed.size,0);assert.ok(!room.sim.drainEvents().some(e=>e.type==='spawn'&&e.player===a.id));
 }
});
test('same connected socket cannot transfer round statistics to another profile',async t=>{
 const {game,connect}=await harness(t);const a=await connect();const first=await join(a,{mode:'create',bots:false,profileToken:token});const room=game.rooms.get(first.code),p=room.sim.players.get(a.id);p.kills=4;await sleep(410);
 const result=await join(a,{mode:'join',code:first.code,profileToken:'different-valid-pilot-token-222'});assert.match(result.error,/identity/);assert.equal(p.profileId,first.profileId);assert.equal(p.kills,4);assert.equal(room.humans.size,1);
 const b=await connect();await join(b,{mode:'join',code:first.code});
 a.emit('leave');await sleep(410);
 const afterLeave=await join(a,{mode:'join',code:first.code,profileToken:'different-valid-pilot-token-222'});assert.match(afterLeave.error,/identity/);
 room.sim.endRound();await game.rankings.recordRound({id:'leave-identity-regression',mapId:room.sim.map.id,players:room.sim.recap.players,winnerId:room.sim.recap.winnerId});
 assert.equal(game.rankings.getProfile(first.profileId).kills,4);assert.equal(game.rankings.getLeaderboard().length,2);
});
test('sole human transport loss keeps room for bounded recovery and explicit leave removes it',async t=>{
 const {game,connect}=await harness(t,{reconnectGraceMs:250});let a=await connect();const first=await join(a,{mode:'create',profileToken:token});const room=game.rooms.get(first.code);room.sim.players.get(a.id).kills=3;
 const gone=new Promise(r=>game.io.sockets.sockets.get(a.id).once('disconnect',r));a.io.engine.close();await gone;
 assert.ok(game.rooms.has(first.code));a=await connect();const rejoin=await join(a,{mode:'join',code:first.code,profileToken:token});assert.ok(!rejoin.error);assert.equal(room.sim.players.get(a.id).kills,3);await sleep(270);assert.ok(game.rooms.has(first.code));
 const goneAgain=new Promise(r=>game.io.sockets.sockets.get(a.id).once('disconnect',r));a.io.engine.close();await goneAgain;await sleep(270);assert.ok(!game.rooms.has(first.code));
 const c=await connect();const second=await join(c,{mode:'create',bots:false});const left=new Promise(r=>game.io.sockets.sockets.get(c.id).once('disconnect',r));c.disconnect();await left;assert.ok(!game.rooms.has(second.code));
});
