const {test}=require('node:test'),assert=require('node:assert/strict');
const {movePlayer,sanitizeInput,RULES}=require('../shared/simulation');
const map={size:100,obstacles:[]};
test('world movement commands ignore heading, normalize diagonals and reject invalid input',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,-2])for(const [x,z]of [[1,0],[-1,0],[0,1],[0,-1],[1,1]]){
  const p={x:0,z:0,vx:0,vz:0,angle,alive:true};const input=sanitizeInput({move:{x,z}});
  for(let i=0;i<60;i++)movePlayer(p,input,1/60,map);
  assert.ok(Math.hypot(p.vx,p.vz)<=RULES.speed+1e-6);
  assert.ok(Math.abs(p.vx*z-p.vz*x)<1e-8);
  assert.ok(p.vx*x+p.vz*z>0);
 }
 assert.equal(sanitizeInput({move:{x:Infinity,z:0}}).move,null);
 assert.deepEqual(sanitizeInput({move:{x:100,z:-100}}).move,{x:1,z:-1});
});

test('ice carries momentum, countersteers predictably, and uses shared authoritative movement',()=>{
 const {getWorld,surfaceAt}=require('../shared/maps/world');
 const {Simulation,STEP,blocked,traceWalls}=require('../shared/simulation');
 assert.deepEqual(getWorld(0).surfaces,[]);
 for(let stage=1;stage<=3;stage++){
  const map=getWorld(stage),ice=map.surfaces[0];
  assert.equal(surfaceAt(map,ice),ice);
  assert.equal(surfaceAt(map,{x:ice.x+ice.rx+.01,z:ice.z}),undefined);
  const run=(z,input)=>{
   const p={alive:true,x:-3,z,vx:13,vz:0,angle:1};
   for(let i=0;i<30;i++)movePlayer(p,sanitizeInput(input),STEP,map);
   return p;
  };
  const coast=run(ice.z,{}),dry=run(26,{}),brake=run(ice.z,{move:{x:-1,z:0}});
  assert.ok(coast.x+3>(dry.x+3)*3,'ice coasts substantially farther');
  assert.ok(brake.vx<0&&coast.vx>0,'countersteer reverses momentum');
  assert.deepEqual(run(ice.z,{aim:{x:80,z:0}}),coast,'aim never changes drift');
  for(const x of [-24,24]){
   assert.equal(traceWalls(x,26,0,48,.8,map),null,'continuous dry outer bypass');
   for(let z=26;z<=74;z++)assert.equal(surfaceAt(map,{x,z}),undefined);
  }
  const sim=new Simulation({map,populationExpansion:false});
  for(let i=0;i<8;i++){
   const p=sim.addPlayer(String(i),'Pilot');
   assert.equal(surfaceAt(map,p),undefined,'spawn stays on dry ground');
   assert.equal(blocked(p.x,p.z,1.2,map),false);
  }
  const p=sim.players.get('0');Object.assign(p,{x:-3,z:ice.z,vx:13,vz:0});
  const predicted={...p},input=sanitizeInput({move:{x:0,z:1},aim:{x:50,z:50}});
  for(let i=0;i<60;i++){
   sim.setInput(p.id,{...input,seq:i+1});sim.step();movePlayer(predicted,input,STEP,map);
   for(const key of ['x','z','vx','vz','angle'])assert.equal(predicted[key],p[key],'prediction matches shared server stepping');
   assert.ok(Math.hypot(p.vx,p.vz)<=RULES.speed+1e-8,'speed cap');
   assert.equal(blocked(p.x,p.z,.8,map),false,'ice does not bypass cover');
  }
 }
});

test('Forge conveyors carry, allow countersteering and dry flanks, and preserve collision, aim and prediction',()=>{
 const {getWorld,surfaceAt}=require('../shared/maps/world');
 const {Simulation,STEP,blocked,traceWalls}=require('../shared/simulation');
 for(let stage=0;stage<3;stage++)assert.ok(getWorld(stage).surfaces.every(s=>s.kind!=='conveyor'));
 const map=getWorld(3),belts=map.surfaces.filter(s=>s.kind==='conveyor');
 assert.equal(belts.length,2);assert.equal(belts[0].pushZ,-belts[1].pushZ);
 for(const s of belts){
  const sign=Math.sign(s.pushZ);
  assert.equal(surfaceAt(map,{x:s.x+s.w/2,z:s.z+s.d/2}),s,'rectangular corners are active');
  assert.equal(surfaceAt(map,{x:s.x+s.w/2+.01,z:s.z}),undefined);
  const run=(move,aim)=>{
   const p={alive:true,x:s.x,z:s.z,vx:0,vz:0,angle:0};
   for(let i=0;i<60;i++){
    movePlayer(p,sanitizeInput({move,aim}),STEP,map);
    assert.ok(Math.hypot(p.vx,p.vz)<=RULES.speed+1e-8);
    assert.equal(blocked(p.x,p.z,RULES.radius,map),false);
   }
   return p;
  };
  const coast=run(),against=run({x:0,z:-sign}),withBelt=run({x:0,z:sign});
  assert.ok((coast.z-s.z)*sign>3,'passive transport');
  assert.ok((against.z-s.z)*sign < -7,'full thrust overcomes belt');
  assert.ok((withBelt.z-s.z)*sign>11,'downstream traverse');
  assert.deepEqual(run(undefined,{x:80,z:80}),coast,'mouse aim cannot redirect belt or hull');
  const exit=run({x:sign,z:0});
  assert.equal(surfaceAt(map,exit),undefined,'lateral exit to dry deck');
  assert.equal(traceWalls(sign*28,-74,0,50,.8,map),null,'clear dry outer flank');
  for(let z=-74;z<=-24;z++)assert.equal(surfaceAt(map,{x:sign*28,z}),undefined);
  const sim=new Simulation({map,populationExpansion:false});
  const p=sim.addPlayer('pilot','Pilot');Object.assign(p,{x:s.x,z:s.z,vx:0,vz:0});
  const predicted={...p};
  for(let i=0;i<120;i++){
   const input=sanitizeInput({move:{x:i<60?0:sign,z:-sign},aim:{x:0,z:0},seq:i+1});
   sim.setInput(p.id,input);sim.step();movePlayer(predicted,input,STEP,map);
   for(const k of ['x','z','vx','vz','angle'])assert.equal(predicted[k],p[k]);
   assert.equal(blocked(p.x,p.z,RULES.radius,map),false);
  }
 }
 const sim=new Simulation({map,populationExpansion:false});
 for(let i=0;i<8;i++)assert.equal(surfaceAt(map,sim.addPlayer(String(i),'Pilot')),undefined,'safe dry spawn');
 for(const p of map.spawnPoints)assert.equal(surfaceAt(map,p),undefined);
});
