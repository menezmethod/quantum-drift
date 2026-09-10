// One 120x120 world, four connected 60x60 districts. Stage only opens territory;
// collision, navigation and rendering consume the same authoritative map variant.
const zones=[
 {id:'core',name:'Forge district',label:'FORGE',x:-30,z:-30,theme:'foundry',color:'#28333e',humans:7,stage:3},
 {id:'forest',name:'Forest biodome',label:'GARDEN',x:-30,z:30,theme:'canopy',color:'#426350',humans:5,stage:2},
 {id:'rails',name:'Orbital rail yard',label:'DOCK',x:30,z:-30,theme:'foundry',color:'#353553',humans:7,stage:3},
 {id:'ice',name:'Frozen relay',label:'RELAY',x:30,z:30,theme:'glacier',color:'#90afbb',humans:3,stage:1},
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
const nexus={id:'nexus',name:'Nexus Core',label:'NEXUS',x:0,z:0,w:28,d:28,color:'#467a91',open:true};
const cache=new Map();
function getWorld(stage=0){
 stage=Math.max(0,Math.min(3,Math.floor(Number(stage)||0)));
 if(cache.has(stage))return cache.get(stage);
 const districts=zones.map((z,i)=>({...z,w:60,d:60,open:z.stage<=stage}));
 const obstacles=[...[-1,1].map(sign=>({...box(sign*5,-sign*5,2,4,2.2,'relay-housing'),nexusCover:true}))];
 for(const [i,z] of zones.entries()){
  if(z.stage>stage){
   // Two rectangles leave the inner corner open to the always-on Nexus.
   const sx=Math.sign(z.x),sz=Math.sign(z.z),half=nexus.w/2;
   for(const o of [box(sx*(30+half/2),z.z,60-half,60,2),box(sx*half/2,sz*(30+half/2),half,60-half,2)])
    obstacles.push({...o,closedSector:true,sector:i});
   continue;
  }
  for(const o of kits[i])obstacles.push({...o,x:o.x+z.x,z:o.z+z.z,theme:z.theme,sector:i});
 }
 // Two 12-unit crossings per shared border. Continuous dividers keep themes
 // distinct while preventing an uninterrupted full-world firing line.
 for(const c of [-30,30])for(const [offset,length]of [[-26,8],[0,20],[26,8]]){
  if(Math.abs(c+offset)<nexus.w/2)continue;
  obstacles.push({...box(c+offset,0,length,2,3),divider:true});
  obstacles.push({...box(0,c+offset,2,length,3),divider:true});
 }
 const spawnPoints=districts.filter(z=>z.open).flatMap(z=>[-1,1].flatMap(x=>[-1,1].map(s=>({x:z.x+x*22,z:z.z+s*22})))).filter(p=>Math.abs(p.x)>nexus.w/2||Math.abs(p.z)>nexus.d/2);
 spawnPoints.push(...[-1,1].flatMap(x=>[-1,1].map(z=>({x:x*10,z:z*10}))));
 const map={nexus,id:'confluence',name:'Confluence',subtitle:'One connected world · industry, forest, orbital rails & ice',theme:'foundry',size:60,stage,districts,obstacles,spawnPoints,props:[],palette:{floor:'#18232b',cover:'#53616a',accent:'#ffad69',background:'#090f18'}};
 cache.set(stage,map);return map;
}
function stageForHumans(count){return count>=7?3:count>=5?2:count>=3?1:0;}
function regionAt(map,p){
 return [map.nexus,...(map.districts||[])].find(d=>d&&d.open!==false&&Math.abs(p.x-d.x)<=d.w/2&&Math.abs(p.z-d.z)<=d.d/2);
}
module.exports={getWorld,stageForHumans,regionAt};
