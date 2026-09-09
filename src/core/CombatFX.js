import * as THREE from 'three';
import {WEAPONS} from '../../shared/simulation';

// Additive instanced streaks keep effects bounded regardless of match length.
export class CombatFX {
  constructor(scene) {
    this.scene=scene; this.time=0; this.particles=[]; this.max=240; this.obj=new THREE.Object3D();
    this.geometry=new THREE.SphereGeometry(1,6,4);
    this.material=new THREE.MeshBasicMaterial({vertexColors:false,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false});
    this.mesh=new THREE.InstancedMesh(this.geometry,this.material,this.max);this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.count=0;scene.add(this.mesh);
    this.rings=[];this.ringGeometry=new THREE.RingGeometry(.93,1,64);this.wakes=new Map();this.targets=new Map();this.trails=new Map();
  }
  particle(x,y,z,vx,vy,vz,color,life,size=.09){
    if(this.particles.length>=this.max)this.particles.shift();
    this.particles.push({x,y,z,vx,vy,vz,color:new THREE.Color(color),age:0,life,size,stretch:Math.min(4,1+Math.hypot(vx,vz)*.14)});
  }
  ring(x,z,color,size,life=.5){
    const mesh=new THREE.Mesh(this.ringGeometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.14,z);this.scene.add(mesh);this.rings.push({mesh,size,life,age:0});
    if(this.rings.length>32){const r=this.rings.shift();this.scene.remove(r.mesh);r.mesh.material.dispose();}
  }
  event(e){
    const color=WEAPONS[e.weapon]?.color||'#8bedff';
    if(e.type==='fire'){
      this.ring(e.x,e.z,color,.8,.14);
      return;
    }
    const large=e.type==='explosion'||e.type==='kill';
    if(!['explosion','kill','hit','impact','bounce','spawn'].includes(e.type))return;
    this.ring(e.x,e.z,large?'#ffb76b':color,e.radius||(large?3.6:1.5),large?.65:.32);
    if(large){
      this.particle(e.x,1,e.z,0,1,0,'#fff8de',.17,1.45);
      this.ring(e.x,e.z,'#fff3d1',e.radius||3.6,.24);
      this.particle(e.x,.4,e.z,0,.2,0,'#ff761f',.28,.85);
    }
    if(e.type==='bounce'&&Number.isFinite(e.nx)){
      for(let i=-2;i<=2;i++)this.particle(e.x,1,e.z,e.nx*7+e.nz*i,0,e.nz*7-e.nx*i,'#daff93',.22,.10);
    }
    const count=large?34:e.type==='hit'?12:7;
    for(let i=0;i<count;i++){
      const angle=i*2.39996, speed=large?3+(i%7):1.4+(i%3);
      this.particle(e.x,.8,e.z,Math.cos(angle)*speed,large?1+(i%5)*.6:.6,Math.sin(angle)*speed,large?(i%3?'#ffc078':'#fff3d1'):color,large?.4+(i%5)*.07:.22,.07+(i%3)*.03);
    }
  }
  update(state,dt,ships,showcase=false){
    this.time+=dt;
    const ids=new Set();
    for(const p of state.players){
      if(!p.alive)continue;ids.add(p.id);const ship=ships.get(p.id);if(!ship)continue;
      const speed=Math.hypot(p.vx,p.vz); const last=this.wakes.get(p.id)||0;
      if(speed>2 && this.time-last>.024){
        this.wakes.set(p.id,this.time);
        for(const side of [-1,1])this.particle(ship.x-Math.sin(ship.angle)*.85+Math.cos(ship.angle)*side*.44,.55,ship.z-Math.cos(ship.angle)*.85-Math.sin(ship.angle)*side*.44,-p.vx*.18,0,-p.vz*.18,p.color,.3,.10);
      }
    }
    for(const id of this.wakes.keys())if(!ids.has(id))this.wakes.delete(id);
    const targetIds=new Set(), trailIds=new Set();
    for(const shot of state.projectiles){
      if(shot.weapon==='GRENADE'){
        targetIds.add(shot.id);let ring=this.targets.get(shot.id);
        if(!ring){
          const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
            uniforms:{progress:{value:0}},
            vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
            fragmentShader:`varying vec2 vUv;uniform float progress;void main(){
              vec2 p=(vUv-.5)*2.;float r=length(p);if(r>1.)discard;
              float angle=mod(atan(p.y,p.x)+6.283185,6.283185)/6.283185;
              float edge=smoothstep(.84,.86,r)*(1.-smoothstep(.96,.98,r));
              float track=smoothstep(.88,.90,r)*(1.-smoothstep(.93,.95,r));
              float arc=step(angle,progress)*track;
              float ticks=step(.80,fract(angle*16.))*step(.82,r)*step(r,.98);
              vec3 amber=mix(vec3(1.,.64,.22),vec3(1.,.2,.08),progress);
              vec3 color=mix(vec3(.025,.035,.05),amber,max(arc,ticks));
              float fill=(1.-smoothstep(.65,.85,r))*.045*progress;
              gl_FragColor=vec4(color,max(edge*.82,fill));
            }`});
          ring=new THREE.Mesh(new THREE.PlaneGeometry(10,10),material);ring.rotation.x=-Math.PI/2;this.targets.set(shot.id,ring);this.scene.add(ring);
        }
        ring.position.set(shot.targetX,.10,shot.targetZ);
        ring.material.uniforms.progress.value=Math.min(1,shot.age/WEAPONS.GRENADE.life);
      } else {
        trailIds.add(shot.id);
        const last=this.trails.get(shot.id);
        const interval=.025;
        if(!last || this.time-last.time>=interval){
          const elapsed=last?this.time-last.time:interval;
          const count=Math.min(4,Math.max(1,Math.floor(elapsed/interval)));
          for(let i=0;i<count;i++){
            const back=i*interval;
            this.particle(shot.x-shot.vx*back,1.1,shot.z-shot.vz*back,-shot.vx*.12,0,-shot.vz*.12,WEAPONS[shot.weapon].color,.16,.075);
          }
          this.trails.set(shot.id,{time:this.time-(elapsed%interval)});
        }
      }
    }
    for(const id of this.trails.keys())if(!trailIds.has(id))this.trails.delete(id);
    for(const[id,ring]of this.targets)if(!targetIds.has(id)){this.scene.remove(ring);ring.material.dispose();ring.geometry.dispose();this.targets.delete(id);}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.age+=dt;if(p.age>=p.life){this.particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=dt*2;}
    this.mesh.count=this.particles.length;
    this.particles.forEach((p,i)=>{const alpha=1-p.age/p.life;this.obj.position.set(p.x,p.y,p.z);this.obj.rotation.set(0,Math.atan2(p.vx,p.vz),0);this.obj.scale.set(p.size*alpha,p.size*alpha,p.size*alpha*p.stretch);this.obj.updateMatrix();this.mesh.setMatrixAt(i,this.obj.matrix);this.mesh.setColorAt(i,p.color.clone().multiplyScalar(alpha*2));});
    this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
    for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.age+=dt;r.mesh.scale.setScalar(.2+r.size*r.age/r.life);r.mesh.material.opacity=Math.max(0,1-r.age/r.life);if(r.age>=r.life){this.scene.remove(r.mesh);r.mesh.material.dispose();this.rings.splice(i,1);}}
  }
  clear(){this.particles.length=0;this.mesh.count=0;this.wakes.clear();this.trails.clear();for(const r of this.rings){this.scene.remove(r.mesh);r.mesh.material.dispose();}this.rings.length=0;for(const r of this.targets.values()){this.scene.remove(r);r.material.dispose();r.geometry.dispose();}this.targets.clear();}
  dispose(){this.clear();this.scene.remove(this.mesh);this.geometry.dispose();this.ringGeometry.dispose();this.material.dispose();}
}
