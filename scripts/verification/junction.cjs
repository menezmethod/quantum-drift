// Deterministic comparative bot probe, not a human-fun or network benchmark.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {Simulation,blocked,RULES}=require('../../shared/simulation');
const {getMap}=require('../../shared/maps');
const results=[];
for(const id of ['foundry','junction'])for(const count of [2,4,8]){
 const map=getMap(id),sim=new Simulation({map,roundTime:600,fragLimit:10000});
 for(let i=0;i<count;i++)sim.addPlayer(`bot-${i}`,`Probe ${i}`,true);
 sim.drainEvents();let invalid=0,kills=0,hits=0,firstContact=null,lastContact=0,longestGap=0;
 const visits=new Map([...sim.players.keys()].map(id=>[id,new Set()]));
 for(let tick=0;tick<120*60;tick++){
  sim.step();
  for(const e of sim.drainEvents()){
   if(e.type==='kill')kills++;
   if(e.type==='hit'&&e.attacker!==e.player){hits++;firstContact??=sim.time;longestGap=Math.max(longestGap,sim.time-lastContact);lastContact=sim.time;}
  }
  for(const p of sim.players.values())if(p.alive){
   if(blocked(p.x,p.z,RULES.radius-1e-6,map))invalid++;
   visits.get(p.id).add(`${Math.floor(p.x/5)},${Math.floor(p.z/5)}`);
  }
 }
 longestGap=Math.max(longestGap,sim.time-lastContact);
 const row={map:id,pilots:count,seconds:120,invalidPositions:invalid,kills,hits,firstContactSeconds:firstContact,longestNoDamageIntervalSeconds:longestGap,visitedCells:[...visits.values()].map(s=>s.size)};
 results.push(row);assert.equal(invalid,0);assert.ok(hits>0);assert.ok(Math.min(...row.visitedCells)>8);
}
const out='docs/gauntlet/junction-review/bot-probe.json';fs.mkdirSync(require('node:path').dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({method:'120 seconds of simulated bot play per population/map; damage-event gaps are not player-perceived encounter gaps. Single deterministic run; no human balance claims.',results},null,2));
console.log(JSON.stringify(results));
