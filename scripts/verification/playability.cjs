const fs=require('node:fs');
const {Simulation,blocked,RULES}=require('../../shared/simulation');
const {MAPS}=require('../../shared/maps');
const results=[];
for(const map of MAPS){
 const sim=new Simulation({map,roundTime:600,fragLimit:10000});
 for(let i=0;i<8;i++)sim.addPlayer(`bot-${i}`,`Pilot ${i+1}`,true);
 let kills=0,spawns=0,maxProjectiles=0,invalidPositions=0;
 const visits=new Map([...sim.players.keys()].map(id=>[id,new Set()]));
 const start=performance.now();
 for(let tick=0;tick<180*60;tick++){
  sim.step();maxProjectiles=Math.max(maxProjectiles,sim.projectiles.size);
  for(const event of sim.drainEvents()){if(event.type==='kill')kills++;if(event.type==='spawn')spawns++;}
  for(const p of sim.players.values()){
   if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||(p.alive&&blocked(p.x,p.z,RULES.radius-1e-6,map)))invalidPositions++;
   visits.get(p.id).add(`${Math.floor(p.x/5)},${Math.floor(p.z/5)}`);
  }
 }
 const row={map:map.id,simulatedSeconds:180,pilots:8,kills,spawns,maxProjectiles,invalidPositions,uniqueFiveMeterCellsPerPilot:[...visits.values()].map(x=>x.size),simulationWallMs:Math.round(performance.now()-start)};
 results.push(row);
}
const report={capturedAt:new Date().toISOString(),method:'Actual bot navigation, weapons, collision and respawn simulation for 180 seconds per map; no renderer or network. Does not establish human tactical balance.',results};
fs.writeFileSync('docs/gauntlet/evidence/r3-playability.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(results.some(r=>r.kills<20||r.invalidPositions||Math.min(...r.uniqueFiveMeterCellsPerPilot)<8))process.exitCode=1;
