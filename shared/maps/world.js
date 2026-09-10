// One 120x120 world, four connected 60x60 districts. Stage only opens territory;
// collision, navigation and rendering consume the same authoritative map variant.
const junction=require('./junction');
const zones=[
 {id:'core',name:'Industrial core',label:'FORGE',x:-30,z:-30,theme:'foundry',color:'#28333e',humans:1},
 {id:'forest',name:'Forest biodome',label:'GARDEN',x:-30,z:30,theme:'canopy',color:'#426350',humans:3},
 {id:'rails',name:'Orbital rail yard',label:'DOCK',x:30,z:-30,theme:'foundry',color:'#353553',humans:5},
 {id:'ice',name:'Frozen relay',label:'RELAY',x:30,z:30,theme:'glacier',color:'#90afbb',humans:7},
];
const box=(x,z,w,d,h=2.6,role='conduit')=>({type:'box',x,z,w,d,h,role,color:'#53616a'});
const forests=[...[-1,1].flatMap(x=>[-1,1].map(z=>box(x*12,z*9,5,7,2.2,'planter'))),...[-1,1].map(x=>({type:'cylinder',x:x*5,z:18,r:2.5,h:3.4,role:'growth-vat',color:'#607d6c'}))];
const rails=[...[-1,1].flatMap(z=>[-1,1].map(x=>box(x*12,z*10,16,3,2.2,'rail-platform'))),box(0,0,5,7,2.8,'relay-housing')];
const ice=[...[-1,1].flatMap(x=>[-1,1].map(z=>box(x*12,z*10,10,3,2.7,'ice-baffle'))),...[-1,1].map(x=>({type:'cylinder',x:x*22,z:0,r:2,h:3.2,role:'relay-pylon',color:'#95b4c4'}))];
const kits=[junction.obstacles,forests,rails,ice];
const cache=new Map();
function getWorld(stage=0){
 stage=Math.max(0,Math.min(3,Math.floor(Number(stage)||0)));
 if(cache.has(stage))return cache.get(stage);
 const districts=zones.map((z,i)=>({...z,w:60,d:60,open:i<=stage}));
 const obstacles=[];
 for(const [i,z] of zones.entries()){
  if(i>stage){obstacles.push({...box(z.x,z.z,60,60,2),closedSector:true,sector:i});continue;}
  for(const o of kits[i])obstacles.push({...o,x:o.x+z.x,z:o.z+z.z,theme:z.theme,sector:i});
 }
 // Two 12-unit crossings per shared border. Continuous dividers keep themes
 // distinct while preventing an uninterrupted full-world firing line.
 for(const c of [-30,30])for(const [offset,length]of [[-26,8],[0,20],[26,8]]){
  obstacles.push({...box(c+offset,0,length,2,3),divider:true});
  obstacles.push({...box(0,c+offset,2,length,3),divider:true});
 }
 const spawnPoints=districts.filter(z=>z.open).flatMap(z=>[-1,1].flatMap(x=>[-1,1].map(s=>({x:z.x+x*22,z:z.z+s*22}))));
 const map={id:'confluence',name:'Confluence',subtitle:'One connected world · industry, forest, orbital rails & ice',theme:'foundry',size:60,stage,districts,obstacles,spawnPoints,props:[],palette:{floor:'#18232b',cover:'#53616a',accent:'#ffad69',background:'#090f18'}};
 cache.set(stage,map);return map;
}
function stageForHumans(count){return count>=7?3:count>=5?2:count>=3?1:0;}
module.exports={getWorld,stageForHumans};
