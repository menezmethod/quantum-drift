const {test}=require('node:test');
const assert=require('node:assert/strict');
const {getWorld}=require('../shared/maps/world');

function clearance(o,x,z){
 return o.type==='box'
  ? Math.hypot(Math.max(0,Math.abs(x-o.x)-o.w/2),Math.max(0,Math.abs(z-o.z)-o.d/2))
  : Math.hypot(x-o.x,z-o.z)-o.r;
}
function gap(a,b){
 if(a.type!=='box'&&b.type==='box')return gap(b,a);
 if(a.type==='box'&&b.type==='box')return Math.hypot(
  Math.max(0,Math.abs(a.x-b.x)-(a.w+b.w)/2),
  Math.max(0,Math.abs(a.z-b.z)-(a.d+b.d)/2));
 return a.type==='box'?clearance(a,b.x,b.z)-b.r:Math.hypot(a.x-b.x,a.z-b.z)-a.r-b.r;
}
const roles=['forge','heat-exchanger','conduit','planter','growth-vat','rail-platform','relay-housing','ice-baffle','relay-pylon'];
for(let stage=0;stage<=3;stage++)test(`Confluence stage ${stage}: safe district geometry and crossings`,()=>{
 const map=getWorld(stage),kits=new Map();
 for(const o of map.obstacles){
  assert.ok(['box','cylinder'].includes(o.type));
  for(const key of ['x','z','h',...(o.type==='box'?['w','d']:['r'])])assert.ok(Number.isFinite(o[key]),key);
  assert.ok(o.h>0);
  assert.match(o.color,/^#[0-9a-f]{6}$/i);
  const rx=o.type==='box'?o.w/2:o.r,rz=o.type==='box'?o.d/2:o.r;
  assert.ok(rx>0&&rz>0);
  if(o.divider||o.closedSector||o.void||o.nexusCover)continue;
  assert.ok(roles.includes(o.role));
  const district=map.districts[o.sector],cx=district.x,cz=district.z,key=district.id;
  assert.ok(Math.abs(o.x-cx)+rx<=24&&Math.abs(o.z-cz)+rz<=24,'local extent cap');
  assert.ok(24-Math.abs(o.x-cx)-rx>=4&&24-Math.abs(o.z-cz)-rz>=4,'boundary clearance');
  if(!kits.has(key))kits.set(key,[]);
  kits.get(key).push(o);
 }
 assert.equal(kits.size,map.districts.filter(d=>d.open).length);
 for(const kit of kits.values())for(let i=0;i<kit.length;i++)for(const other of kit.slice(i+1)){
  assert.ok(gap(kit[i],other)>=4,`obstacles too close: ${JSON.stringify([kit[i],other])}`);
 }
 for(const p of map.spawnPoints)for(const o of map.obstacles)assert.ok(clearance(o,p.x,p.z)>=3,'spawn disk');
 for(const {open,x,z} of map.connectors)if(open){
  for(const o of map.obstacles)assert.ok(clearance(o,x,z)>=2,`crossing ${x},${z}`);
 }
 const forest=kits.get('forest');
 if(forest)for(const o of forest)assert.ok(clearance(o,map.districts[1].x,map.districts[1].z)>=14,'forest clearing');
 if(stage===3){
  const area=kit=>kit.reduce((sum,o)=>sum+(o.type==='box'?o.w*o.d:Math.PI*o.r**2),0);
  const core=kits.get('core');
  assert.ok(area(forest)<area(core)/2,'forest has substantially less cover than industry');
  for(const [key,kit] of kits){
   if(key!=='forest')assert.ok(area(forest)<area(kit),'forest is sparsest');
   if(key!=='core')assert.ok(area(core)>area(kit),'industry is densest');
  }
  const platforms=kits.get('rails').filter(o=>o.role==='rail-platform');
  assert.ok(platforms.length>=3&&platforms.length<=4);
  for(const o of platforms)assert.ok(o.d>=o.w*4,'long Z platforms');
  for(let i=0;i<platforms.length;i++)for(const o of platforms.slice(i+1)){
   assert.ok(Math.abs(o.x-platforms[i].x)-(o.w+platforms[i].w)/2>=6,'wide rail lanes');
  }
  for(let t=-24;t<=24;t+=0.5)for(const sign of [-1,1])for(const o of kits.get('ice')){
   assert.ok(clearance(o,map.districts[3].x+t,map.districts[3].z+sign*t)>=2,'open ice diagonals');
  }
 }
});
