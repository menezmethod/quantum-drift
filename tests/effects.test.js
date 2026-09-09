const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
async function moduleUnderTest() {
  const three = pathToFileURL(require.resolve('three').replace('three.cjs','three.module.js')).href;
  const source = fs.readFileSync(require.resolve('../src/core/CombatFX.js'),'utf8')
    .replace("from 'three'",`from '${three}'`)
    .replace("import {WEAPONS} from '../../shared/simulation';",`const WEAPONS=${JSON.stringify(require('../shared/simulation').WEAPONS)};`);
  return { ...(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))), THREE:await import(three)};
}
test('projectile trails preserve emission density across frame rates and clean up',async()=>{
  const {CombatFX,THREE}=await moduleUnderTest();
  function emitted(hz){
    const fx=new CombatFX(new THREE.Scene());let count=0;const particle=fx.particle.bind(fx);
    fx.particle=(...args)=>{count++;particle(...args);};
    for(let i=0;i<hz*2;i++)fx.update({players:[],projectiles:[{id:'laser',weapon:'LASER',x:i/hz*20,z:0,vx:20,vz:0}]},1/hz,new Map());
    assert.ok(fx.particles.length<=fx.max);
    fx.update({players:[],projectiles:[]},1,new Map());assert.equal(fx.trails.size,0);fx.dispose();return count;
  }
  const counts=[30,60,120].map(emitted);
  assert.ok(Math.max(...counts)-Math.min(...counts)<=2,JSON.stringify(counts));
});
test('grenade warning follows authoritative fuse and releases geometry on removal',async()=>{
  const {CombatFX,THREE}=await moduleUnderTest();const scene=new THREE.Scene(),fx=new CombatFX(scene);
  fx.update({players:[],projectiles:[{id:'g',weapon:'GRENADE',targetX:4,targetZ:5,age:.425}]},.016,new Map());
  const ring=fx.targets.get('g');assert.equal(ring.material.uniforms.progress.value,.5);assert.equal(ring.position.x,4);
  let disposed=0;ring.geometry.addEventListener('dispose',()=>disposed++);
  fx.update({players:[],projectiles:[]},.016,new Map());assert.equal(disposed,1);assert.equal(fx.targets.size,0);fx.dispose();assert.equal(scene.children.length,0);
});
