import * as THREE from "three";
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MAP, WEAPONS, angleDiff } from "../../shared/simulation";
import {World} from '../world/World';
import {CameraRig} from '../view/CameraRig';
import {ShipIndicators} from '../view/ShipIndicators';
import {CombatFX} from './CombatFX';
import {coverOccludes} from './visibility';
const Y=.9;
export class ArenaRenderer {
  constructor(canvas){
    this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor('#080d18');
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(55,1,.1,400);this.rig=new CameraRig(this.camera);
    this.world=new World(this.scene,this.renderer);this.fx=new CombatFX(this.scene);
    this.ships=new Map();this.shots=new Map();this.view=0;this.zoom=1;this.cameraReady=false;this.frameTime=0;
    this.ray=new THREE.Raycaster();this.floor=new THREE.Plane(new THREE.Vector3(0,1,0),-Y);
    const overlay=document.createElement('div');overlay.id='ship-indicators';overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:4';document.getElementById('hud').append(overlay);this.indicators=new ShipIndicators(overlay);this.indicatorRoot=overlay;
    this.reticle=new THREE.Mesh(new THREE.RingGeometry(.5,.56,32),new THREE.MeshBasicMaterial({color:'#8defff',depthTest:false,transparent:true,opacity:.85}));this.reticle.rotation.x=-Math.PI/2;this.reticle.renderOrder=5;this.reticle.visible=false;this.scene.add(this.reticle);
    this.grenadeRing=new THREE.Mesh(new THREE.RingGeometry(4.96,5,64),new THREE.MeshBasicMaterial({color:'#ffb677',depthTest:false,transparent:true,opacity:.35}));this.grenadeRing.rotation.x=-Math.PI/2;this.grenadeRing.visible=false;this.scene.add(this.grenadeRing);
    this.shotGeometries={LASER:new THREE.CylinderGeometry(.055,.055,1.5,6).rotateX(Math.PI/2),BOUNCE:new THREE.CylinderGeometry(.10,.10,3,8).rotateX(Math.PI/2),GRENADE:new THREE.IcosahedronGeometry(.27,1)};this.shotMaterials=Object.fromEntries(Object.entries(WEAPONS).map(([key,w])=>[key,new THREE.MeshBasicMaterial({color:w.color})]));
    this.resize();window.addEventListener('resize',()=>this.resize());this.buildArena(MAP);
  }
  resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.rig?.reset();}
  buildArena(map){this.map=map;this.world.build(map);this.renderer.shadowMap.needsUpdate=true;this.fx.clear();this.rig.reset();this.cameraReady=false;}
  setTimeOfDay(time){this.world.setTimeOfDay(time);this.renderer.shadowMap.needsUpdate=true;}
  makeShip(p){
    const group=new THREE.Group();this.scene.add(group);
    const profile=[[.06,-.16],[.56,-.20],[.87,-.09],[.98,.03],[.84,.18],[.5,.25],[.23,.29]].map(([x,y])=>new THREE.Vector2(x,y));
    const hull=new THREE.LatheGeometry(profile,28);
    const finGeometries=[hull];
    for(const side of [-1,1]){const fin=new THREE.BoxGeometry(.21,.14,1.22);fin.translate(side*.68,.03,-.1);finGeometries.push(fin);}
    const body=new THREE.Mesh(mergeGeometries(finGeometries),new THREE.MeshStandardMaterial({color:'#81939d',metalness:.72,roughness:.35}));body.castShadow=false;group.add(body);finGeometries.forEach(g=>g.dispose());
    // Draw only fragments hidden by opaque scenery. Equal-depth visible hull
    // fragments fail this test, preserving normal materials in clear sightlines.
    const silhouette=new THREE.Mesh(body.geometry.clone(),new THREE.MeshBasicMaterial({color:p.color,transparent:true,opacity:.46,depthWrite:false,depthFunc:THREE.GreaterDepth}));silhouette.renderOrder=9;group.add(silhouette);

    const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.035,6,36),new THREE.MeshBasicMaterial({color:p.color}));ring.rotation.x=Math.PI/2;group.add(ring);
    const canopy=new THREE.Mesh(new THREE.SphereGeometry(.36,16,8),new THREE.MeshStandardMaterial({color:'#162639',emissive:p.color,emissiveIntensity:.20,metalness:.8,roughness:.18}));canopy.scale.set(1,.55,1.2);canopy.position.y=.29;group.add(canopy);

    const thruster=new THREE.Mesh(new THREE.ConeGeometry(.24,.65,8),new THREE.MeshBasicMaterial({color:p.color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));thruster.rotation.x=-Math.PI/2;thruster.position.z=-1.05;group.add(thruster);
    const shield=new THREE.Mesh(new THREE.SphereGeometry(1.17,18,12),new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(p.color)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=-p.xyz;gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 tint;varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.5);gl_FragColor=vec4(tint,rim*.65);}' }));group.add(shield);
    const aim=new THREE.Group();const barrel=new THREE.Mesh(new THREE.BoxGeometry(.08,.09,.95),new THREE.MeshBasicMaterial({color:p.color}));barrel.position.set(0,.34,.64);aim.add(barrel);group.add(aim);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1.02,28),new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:.38,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-Y+.08;group.add(shadow);
    const ship={group,thruster,shield,aim,silhouette,x:p.x,z:p.z,angle:p.angle,alive:p.alive};group.position.set(p.x,Y,p.z);this.ships.set(p.id,ship);return ship;
  }
  screenMovement(horizontal,vertical){
    const e=this.camera.matrixWorld.elements;
    const right=Math.hypot(e[0],e[2])||1,up=Math.hypot(e[4],e[6])||1;
    const x=horizontal*e[0]/right+vertical*e[4]/up,z=horizontal*e[2]/right+vertical*e[6]/up;
    const length=Math.max(1,Math.hypot(x,z));return {x:x/length,z:z/length};
  }
  aimAt(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const point = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.floor, point)) return null;
    return { x: point.x, z: point.z };
  }
  event(event){this.fx.event(event);}
  draw(state,playerId,predicted,aim,weapon,dt,lobby=false){
    this.frameTime+=dt;
    const worldOnly=this.showcaseModule==='world';this.world.setShowcase?.(this.showcaseModule||'arena');
    const rendered=[], present=new Set();
    for(const serverPlayer of state.players){
      const p=serverPlayer.id===playerId&&predicted?predicted:serverPlayer;present.add(p.id);
      const ship=this.ships.get(p.id)||this.makeShip(p);const snap=ship.alive!==p.alive||Math.hypot(p.x-ship.x,p.z-ship.z)>8;
      const blend=snap?1:1-Math.exp(-(p.id===playerId?25:20)*dt);ship.x+=(p.x-ship.x)*blend;ship.z+=(p.z-ship.z)*blend;ship.angle+=angleDiff(p.angle,ship.angle)*blend;ship.alive=p.alive;
      ship.group.visible=p.alive&&!worldOnly;ship.group.position.set(ship.x,Y+Math.sin(this.frameTime*3+p.x)*.025,ship.z);ship.group.rotation.y=ship.angle;
      ship.aim.rotation.y=angleDiff(p.id===playerId&&aim?Math.atan2(aim.x-p.x,aim.z-p.z):p.aimAngle,ship.angle);
      ship.thruster.scale.y=.3+Math.hypot(p.vx,p.vz)/10;ship.shield.visible=p.protectedUntil>state.time;
      rendered.push({...p,x:ship.x,z:ship.z,y:Y,renderPosition:ship.group.position});
    }
    for(const[id,ship]of this.ships)if(!present.has(id)){this.scene.remove(ship.group);this.dispose(ship.group);this.ships.delete(id);}
    const ids=new Set();
    for(const p of state.projectiles){ids.add(p.id);let mesh=this.shots.get(p.id);if(!mesh){mesh=new THREE.Mesh(this.shotGeometries[p.weapon],this.shotMaterials[p.weapon]);this.shots.set(p.id,mesh);this.scene.add(mesh);}
      const grenade=p.weapon==='GRENADE';mesh.visible=!worldOnly;mesh.position.set(p.x,grenade?Y+Math.sin(Math.min(1,p.age/WEAPONS.GRENADE.life)*Math.PI)*6:Y+.25,p.z);mesh.scale.setScalar(1);mesh.rotation.y=Math.atan2(p.vx,p.vz);
    }
    for(const[id,mesh]of this.shots)if(!ids.has(id)){this.scene.remove(mesh);this.shots.delete(id);}
    this.reticle.visible=Boolean(aim&&!lobby&&!worldOnly&&predicted?.alive);this.grenadeRing.visible=this.reticle.visible&&weapon==='GRENADE';
    if(this.reticle.visible){let{x,z}=aim;if(weapon==='GRENADE'){const dx=x-predicted.x,dz=z-predicted.z,scale=Math.min(1,WEAPONS.GRENADE.range/(Math.hypot(dx,dz)||1));x=predicted.x+dx*scale;z=predicted.z+dz*scale;}this.reticle.position.set(x,.15,z);this.reticle.material.color.set(WEAPONS[weapon].color);this.grenadeRing.position.set(x,.12,z);}
    const local=rendered.find(p=>p.id===playerId);
    if(!this.cameraReady)this.rig.reset();
    this.rig.update({player:local,aim,map:this.map,dt,lobby:lobby||worldOnly,view:this.view,zoom:this.zoom});this.cameraReady=true;
    for(const ship of this.ships.values())ship.silhouette.visible=ship.alive&&!lobby&&!worldOnly&&coverOccludes(this.camera.position,ship.group.position,this.map.obstacles);
    this.world.update(this.frameTime,dt,this.camera);
    if(!worldOnly)this.fx.update({...state,players:rendered},dt,this.ships);else this.fx.clear();
    this.indicatorRoot.hidden=lobby||worldOnly;
    if(!lobby&&!worldOnly)this.indicators.update({players:rendered,localId:playerId,camera:this.camera,width:innerWidth,height:innerHeight,time:state.time,aim});
    this.renderer.render(this.scene,this.camera);
  }
  dispose(root){root.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}});}
}
