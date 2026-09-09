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
