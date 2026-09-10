const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Simulation,blocked,traceWalls}=require('../shared/simulation');
const {getWorld,MAPS}=require('../shared/maps');
const {regionAt}=require('../shared/maps/world');
const advance=s=>{for(let i=0;i<310;i++)s.step();};
test('single public world; all open districts are connected and closed districts are solid',()=>{
 assert.deepEqual(MAPS.map(m=>m.id),['confluence']);
 for(let stage=0;stage<4;stage++){
  const map=getWorld(stage),seen=new Set(),queue=[[-52,-52]];
  for(let i=0;i<queue.length;i++){
   const [x,z]=queue[i],key=`${x},${z}`;
   if(seen.has(key)||blocked(x,z,0.8,map))continue;
   seen.add(key);
   for(const [dx,dz]of [[2,0],[-2,0],[0,2],[0,-2]])if(Math.abs(x+dx)<60&&Math.abs(z+dz)<60)queue.push([x+dx,z+dz]);
  }
  for(const d of map.districts){
   assert.equal(seen.has(`${d.x+Math.sign(d.x)*22},${d.z+Math.sign(d.z)*22}`),d.open,d.name);
   if(!d.open)assert.ok(blocked(d.x,d.z,0.8,map));
  }
  for(const p of map.spawnPoints)assert.equal(blocked(p.x,p.z,0.8,map),false);
  for(let x=-8;x<=8;x+=2)for(let z=-8;z<=8;z+=2){
   assert.ok(seen.has(`${x},${z}`),'entire Nexus reachable in every stage');
   assert.equal(regionAt(map,{x,z}).id,'nexus');
  }
  assert.equal(traceWalls(-8,0,16,0,0.8,map),null,'east-west hub drift');
  assert.equal(traceWalls(0,-8,0,16,0.8,map),null,'north-south hub drift');
  for(const d of map.districts){
   const sx=Math.sign(d.x),sz=Math.sign(d.z);
   // Two separate exits from the hub into each district's inner apron.
   for(const [x,z,dx,dz] of [[sx*6,sz*6,sx*10,0],[sx*6,sz*6,0,sz*10]])
    assert.equal(!!traceWalls(x,z,dx,dz,0.8,map),!d.open,`${d.id} hub exit`);
   assert.equal(regionAt(map,d)?.id,d.open?d.id:undefined);
  }
 }
 assert.ok(traceWalls(-45,-3,0,6,0.1,getWorld(0)));
 assert.equal(traceWalls(-45,-3,0,6,0.1,getWorld(1)),null);
});
test('humans open territory after delay; bots and brief joins do not; closing waits for safe round reset',()=>{
 const s=new Simulation({map:getWorld(0)});
 s.addPlayer('a','A');for(let i=0;i<7;i++)s.addPlayer(`b${i}`,'Bot',true);
 advance(s);assert.equal(s.map.stage,0);
 s.addPlayer('c','C');s.addPlayer('d','D');s.step();s.players.delete('d');advance(s);assert.equal(s.map.stage,0);
 s.addPlayer('d','D');advance(s);assert.equal(s.map.stage,1);
 for(let i=0;i<2;i++)s.addPlayer(`e${i}`,'E');advance(s);assert.equal(s.map.stage,2);
 for(let i=0;i<2;i++)s.addPlayer(`f${i}`,'F');advance(s);assert.equal(s.snapshot().mapStage,3);
 for(const [id,p]of s.players)if(!p.bot&&id!=='a')s.players.delete(id);
 advance(s);assert.equal(s.map.stage,3);
 s.newRound();assert.equal(s.map.stage,0);
 for(const p of s.players.values())assert.equal(blocked(p.x,p.z,0.8,s.map),false);
});
test('practice keeps all districts open across rounds',()=>{
 const s=new Simulation({map:getWorld(3),populationExpansion:false});s.addPlayer('a','A');advance(s);s.newRound();assert.equal(s.map.stage,3);
});
