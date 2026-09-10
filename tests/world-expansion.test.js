const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Simulation,blocked,traceWalls}=require('../shared/simulation');
const {getWorld,MAPS}=require('../shared/maps');
const {regionAt}=require('../shared/maps/world');
const advance=s=>{for(let i=0;i<310;i++)s.step();};
test('single public world; all open districts are connected and closed districts are solid',()=>{
 assert.deepEqual(MAPS.map(m=>m.id),['confluence']);
 for(let stage=0;stage<4;stage++){
  const map=getWorld(stage);
  assert.deepEqual(Object.values(map.activeBounds),[[-14,14,-14,14],[-30,30,-14,80],[-30,80,-30,80],[-80,80,-80,80]][stage]);
  assert.deepEqual(map.districts.filter(d=>d.open).map(d=>d.id),[[],['ice'],['forest','ice'],['core','forest','rails','ice']][stage]);
  const seen=new Set(),queue=[[0,0]];
  for(let i=0;i<queue.length;i++){
   const [x,z]=queue[i],key=`${x},${z}`;
   if(seen.has(key)||blocked(x,z,0.8,map))continue;
   seen.add(key);
   for(const [dx,dz]of [[2,0],[-2,0],[0,2],[0,-2]])if(Math.abs(x+dx)<map.size&&Math.abs(z+dz)<map.size)queue.push([x+dx,z+dz]);
  }
  for(const d of map.districts){
   assert.equal(seen.has(`${d.x+Math.sign(d.x)*22},${d.z+Math.sign(d.z)*22}`),d.open,d.name);
   if(!d.open)assert.ok(blocked(d.x,d.z,0.8,map));
  }
  for(const p of map.spawnPoints)assert.equal(blocked(p.x,p.z,0.8,map),false);
  for(let x=-12;x<=12;x+=2)for(let z=-12;z<=12;z+=2){
   if(blocked(x,z,0.8,map))continue;
   assert.ok(seen.has(`${x},${z}`),'entire Nexus reachable in every stage');
   assert.equal(regionAt(map,{x,z}).id,'nexus');
  }
  assert.equal(traceWalls(-8,0,16,0,0.8,map),null,'east-west hub drift');
  assert.equal(traceWalls(0,-8,0,16,0.8,map),null,'north-south hub drift');
  for(const d of map.districts){
   const links=map.connectors.filter(c=>c.id===d.id);
   assert.equal(links.length,2);
   for(const c of links){
    const nx=Math.sign(d.x),nz=Math.sign(d.z);
    assert.equal(!!traceWalls(c.x-nx*6,c.z-nz*6,nx*12,nz*12,0.8,map),!d.open,`${d.id} paired hub exit`);
   }
   assert.equal(regionAt(map,d)?.id,d.open?d.id:undefined);
  }
 }
 assert.ok(traceWalls(9,11,0,12,0.1,getWorld(0)));
 assert.equal(traceWalls(9,11,0,12,0.1,getWorld(1)),null);
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

test('Nexus cover shelters blasts while the outer drift loop stays clear',()=>{
 for(let stage=0;stage<4;stage++){
  const map=getWorld(stage);
  for(const [x,z,dx,dz] of [[-10,-10,20,0],[10,-10,0,20],[10,10,-20,0],[-10,10,0,-20]])
   assert.equal(traceWalls(x,z,dx,dz,0.8,map),null,'outer hub loop');
  assert.ok(traceWalls(2,-5,6,0,0.15,map),'hub cover stops laser');
  const sim=new Simulation({map,populationExpansion:false}),p=sim.addPlayer('target','Target');
  Object.assign(p,{x:7,z:-5,protectedUntil:0});
  sim.explode({x:3,z:-5,owner:'other',weapon:'GRENADE'});
  assert.equal(p.health,100,'cover blocks blast');
  Object.assign(p,{x:7,z:0});
  sim.explode({x:3,z:0,owner:'other',weapon:'GRENADE'});
  assert.ok(p.health<100,'same range across open axis causes damage');
 }
});

test('radial deck and void partition is exact, guardrails follow it, and expansion never blocks existing flight space',()=>{
 const inside=(p,r)=>Math.abs(p.x-r.x)<r.w/2&&Math.abs(p.z-r.z)<r.d/2;
 for(let stage=0;stage<4;stage++){
  const map=getWorld(stage),voids=map.obstacles.filter(o=>o.void);
  const areas=[map.nexus,...map.districts.filter(d=>d.open),...map.connectors.filter(d=>d.open)];
  for(let x=-map.size+.5;x<map.size;x++)for(let z=-map.size+.5;z<map.size;z++){
   const p={x,z},deckCount=map.deck.filter(r=>inside(p,r)).length,voidCount=voids.filter(r=>inside(p,r)).length;
   assert.equal(deckCount,areas.some(r=>inside(p,r))?1:0,'deck union, no overlaps');
   assert.equal(deckCount+voidCount,1,'exactly one deck or void tile');
   if(stage<3&&!blocked(x,z,.8,map))assert.equal(blocked(x,z,.8,getWorld(stage+1)),false,'expansion preserves existing free disks');
  }
  for(const e of map.boundaries){
   assert.equal(voids.some(r=>inside({x:e.x-e.nx*.1,z:e.z-e.nz*.1},r)),false,'deck inside guardrail');
   assert.equal(voids.some(r=>inside({x:e.x+e.nx*.1,z:e.z+e.nz*.1},r)),true,'void outside guardrail');
  }
 }
});
