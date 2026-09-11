// Four 60x60 district platforms around an always-on Nexus. Stage opens territory;
// collision, navigation and rendering consume the same authoritative map variant.
const zones=[
 {id:'core',name:'Forge district',label:'FORGE',x:0,z:-50,theme:'foundry',color:'#28333e',humans:7,stage:3},
 {id:'forest',name:'Forest biodome',label:'GARDEN',x:50,z:0,theme:'canopy',color:'#426350',humans:5,stage:2},
 {id:'rails',name:'Orbital rail yard',label:'DOCK',x:-50,z:0,theme:'foundry',color:'#353553',humans:7,stage:3},
 {id:'ice',name:'Frozen relay',label:'RELAY',x:0,z:50,theme:'glacier',color:'#90afbb',humans:3,stage:1},
];
const box=(x,z,w,d,h=2.6,role='conduit')=>({type:'box',x,z,w,d,h,role,color:'#53616a'});
// Parallel conveyors flank factory blocks with four-unit shortcuts.
const core=[
 box(-18,-4,4,28,2.2,'conduit'),box(18,-4,4,28,2.2,'conduit'),
 box(-7,-10,10,10,2.6,'heat-exchanger'),box(7,-10,10,10,2.6,'heat-exchanger'),
 box(-7,4,10,10,3.2,'forge'),box(7,4,10,10,2.6,'heat-exchanger'),
 box(-8,17,8,6,2.6,'heat-exchanger'),box(7,17,8,6,2.6,'heat-exchanger'),
];
// Small, offset clumps leave a fourteen-unit-radius central clearing.
const forests=[
 {type:'cylinder',x:-16,z:-7,r:2.5,h:3.4,role:'growth-vat',color:'#607d6c'},
 {type:'cylinder',x:5,z:-17,r:3,h:3.4,role:'growth-vat',color:'#607d6c'},
 {type:'cylinder',x:17,z:8,r:2,h:3.4,role:'growth-vat',color:'#607d6c'},
 box(-9,16,4,5,2.2,'planter'),box(14,-12,4,4,2.2,'planter'),
];
// Eight-unit lanes run along Z; the transverse hub sits beyond their ends.
const rails=[
 ...[-18,-6,6,18].map(x=>box(x,-6,4,24,2.2,'rail-platform')),
 box(0,15,16,6,2.8,'relay-housing'),
];
// Offset baffles preserve both long diagonals through the open relay court.
const ice=[
 box(-14,0,12,6,2.7,'ice-baffle'),box(0,15,10,8,2.7,'ice-baffle'),
 box(14,-2,10,6,2.7,'ice-baffle'),
 {type:'cylinder',x:-4,z:-17,r:2,h:3.2,role:'relay-pylon',color:'#95b4c4'},
 {type:'cylinder',x:16,z:9,r:2,h:3.2,role:'relay-pylon',color:'#95b4c4'},
];
const kits=[core,forests,rails,ice];
const nexus={id:'nexus',name:'Nexus Core',label:'NEXUS',theme:'foundry',x:0,z:0,w:28,d:28,color:'#467a91',open:true};
// Partition the rectangle union once: disjoint deck tiles and its solid void
// complement share exact edges. Merge equal horizontal runs across rows.
function partition(areas,size){
 const xs=[...new Set([-size,size,...areas.flatMap(a=>[a.x-a.w/2,a.x+a.w/2])])].sort((a,b)=>a-b);
 const zs=[...new Set([-size,size,...areas.flatMap(a=>[a.z-a.d/2,a.z+a.d/2])])].sort((a,b)=>a-b);
 const grid=zs.slice(1).map((_,j)=>xs.slice(1).map((_,i)=>areas.findIndex(a=>Math.abs((xs[i]+xs[i+1])/2-a.x)<a.w/2&&Math.abs((zs[j]+zs[j+1])/2-a.z)<a.d/2)));
 const deck=[],voids=[],boundaries=[];
 let previous=new Map();
 for(let j=0;j<grid.length;j++){
  const current=new Map(),depth=zs[j+1]-zs[j];
  for(let i=0;i<grid[j].length;){
   const owner=grid[j][i],start=i;
   while(i<grid[j].length&&grid[j][i]===owner)i++;
   const key=`${owner}:${start}:${i}`;
   let rect=previous.get(key);
   if(rect){rect.d+=depth;rect.z+=depth/2;}
   else{
    rect={...box((xs[start]+xs[i])/2,(zs[j]+zs[j+1])/2,xs[i]-xs[start],depth,1.6),...(owner<0?{void:true}:{theme:areas[owner].theme,color:areas[owner].color,surface:areas[owner].id})};
    (owner<0?voids:deck).push(rect);
   }
   current.set(key,rect);
  }
  previous=current;
  for(let i=0;i<grid[j].length;i++)if(grid[j][i]>=0){
   for(const [nx,nz] of [[1,0],[-1,0],[0,1],[0,-1]])if((grid[j+nz]?.[i+nx]??-1)<0)
    boundaries.push({x:nx?xs[i+(nx>0?1:0)]:(xs[i]+xs[i+1])/2,z:nz?zs[j+(nz>0?1:0)]:(zs[j]+zs[j+1])/2,nx,nz,length:nx?depth:xs[i+1]-xs[i]});
  }
 }
 return {deck,voids,boundaries};
}
const cache=new Map();
function getWorld(stage=0){
 stage=Math.max(0,Math.min(3,Math.floor(Number(stage)||0)));
 if(cache.has(stage))return cache.get(stage);
 const size=84,districts=zones.map(z=>({...z,w:60,d:60,open:z.stage<=stage}));
 const connectors=districts.flatMap(d=>[-1,1].map(side=>({...d,name:d.name+' approach',x:d.x?Math.sign(d.x)*17:side*9,z:d.z?Math.sign(d.z)*17:side*9,w:d.x?6:8,d:d.z?6:8})));
 const areas=[nexus,...districts.filter(d=>d.open),...connectors.filter(d=>d.open)];
 const {deck,voids,boundaries}=partition(areas,size);
 const obstacles=[...voids,...[-1,1].map(sign=>({...box(sign*5,-sign*5,2,4,2.2,'relay-housing'),nexusCover:true}))];
 for(const [i,d] of districts.entries())if(d.open)
  for(const o of kits[i])obstacles.push({...o,x:o.x+d.x,z:o.z+d.z,theme:d.theme,sector:i});
 const spawnPoints=districts.filter(d=>d.open).flatMap(d=>[-1,1].flatMap(x=>[-1,1].map(z=>({x:d.x+x*22,z:d.z+z*22}))));
 spawnPoints.push(...[-1,1].flatMap(x=>[-1,1].map(z=>({x:x*10,z:z*10}))));
 const activeBounds={minX:Math.min(...areas.map(d=>d.x-d.w/2)),maxX:Math.max(...areas.map(d=>d.x+d.w/2)),minZ:Math.min(...areas.map(d=>d.z-d.d/2)),maxZ:Math.max(...areas.map(d=>d.z+d.d/2))};
 const iceDistrict=districts.find(d=>d.id==='ice');
 const surfaces=iceDistrict.open?[{kind:'ice',x:iceDistrict.x,z:iceDistrict.z-2,rx:7.5,rz:11,traction:0.23}]:[];
 const forge=districts.find(d=>d.id==='core');
 if(forge.open)for(const side of [-1,1])surfaces.push({kind:'conveyor',x:forge.x+side*24,z:forge.z-4,w:4,d:32,pushZ:side*4.5});
 const map={nexus,activeBounds,deck,boundaries,connectors,surfaces,id:'confluence',name:'Confluence',subtitle:'Nexus station · four expanding combat platforms',theme:'foundry',size,stage,districts,obstacles,spawnPoints,props:[],palette:{floor:'#18232b',cover:'#53616a',accent:'#ffad69',background:'#090f18'}};
 cache.set(stage,map);return map;
}
function stageForHumans(count){return count>=7?3:count>=5?2:count>=3?1:0;}
function regionAt(map,p){
 return [map.nexus,...(map.districts||[]),...(map.connectors||[])].find(d=>d&&d.open!==false&&Math.abs(p.x-d.x)<=d.w/2&&Math.abs(p.z-d.z)<=d.d/2);
}
function surfaceAt(map,p){
 return map.surfaces?.find(s=>s.w
  ? Math.abs(p.x-s.x)<=s.w/2&&Math.abs(p.z-s.z)<=s.d/2
  : ((p.x-s.x)/s.rx)**2+((p.z-s.z)/s.rz)**2<=1);
}
module.exports={getWorld,stageForHumans,regionAt,surfaceAt};
