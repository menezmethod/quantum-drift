// Compact connected pockets. Reuses the Foundry kit; all geometry is axis-aligned
// and matches the shared collision model. Portals/pickups are intentionally absent.
const box=(x,z,w,d,h,role)=>({type:'box',x,z,w,d,h,color:'#53616a',role});
module.exports={
  id:'junction', name:'Junction', subtitle:'Close quarters · offset cover & quick flanks',
  theme:'foundry', size:30,
  palette:{floor:'#18232b',cover:'#53616a',accent:'#ff9b4a',background:'#090f18'},
  obstacles:[
    box(-5,-5,6,6,2.6,'heat-exchanger'),
    box(5,5,6,6,2.6,'heat-exchanger'),
    ...[-1,1].flatMap(x=>[-1,1].map(z=>box(x*18,z*9,4,10,2.6,'conduit'))),
    box(-6,-20,10,4,2.2,'heat-exchanger'),
    box(6,20,10,4,2.2,'heat-exchanger'),
    {type:'cylinder',x:14,z:-22,r:2,h:3,color:'#66594e',role:'relay-pylon'},
    {type:'cylinder',x:-14,z:22,r:2,h:3,color:'#66594e',role:'relay-pylon'},
  ],
  districts:[
    {id:'crossing',name:'Crossing',x:0,z:0,w:14,d:24,color:'#303334'},
    {id:'west-pocket',name:'West pocket',x:-19,z:0,w:12,d:30,color:'#34302a'},
    {id:'east-pocket',name:'East pocket',x:19,z:0,w:12,d:30,color:'#34302a'},
  ],
  props:[
    {kind:'furnace-stack',x:-35,z:0,w:5,d:7,h:12},
    {kind:'furnace-stack',x:35,z:0,w:5,d:7,h:12},
  ],
  spawnPoints:[{x:-24,z:-24},{x:24,z:24},{x:-24,z:24},{x:24,z:-24},
    {x:0,z:-27},{x:0,z:27},{x:-27,z:0},{x:27,z:0}],
};
