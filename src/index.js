import "./styles/main.css";
import { io } from "socket.io-client";
import { stickVector, reanchor } from "./input/stick";
import { ArenaRenderer } from "./core/ArenaRenderer";
import {Interface} from "./interface/Interface";
import {MusicBus, BED_FOR_DISTRICT} from "./audio/MusicBus";
import {MAPS,getMap,getWorld} from "../shared/maps";
import {
  Simulation,
  MAP,
  RULES,
  WEAPONS,
  STEP,
  movePlayer,
  angleDiff,
  blocked,
} from "../shared/simulation";

const $ = (id) => document.getElementById(id);
const storage = {
  get(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};
class Game {
  constructor() {
    this.mode = "lobby";
    this.selectedMap = "confluence";
    this.profileToken=storage.get("qd-profile", "");
    if(!this.profileToken){this.profileToken=Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,"0")).join("");storage.set("qd-profile",this.profileToken);}
    this.keys = new Set();
    this.weapon = "LASER";
    this.seq = 0;
    this.pending = [];
    this.mouse = null;
    this.firing = false;
    this.aim = null;
    this.stick = { x: 0, z: 0, active: false };
    this.ping = 0;
    this.connected = false;
    this.soundOn = storage.get("qd-sound", "on") === "on";
    this.music = null;
    this._audioState = { bed: null, dead: false, roundOver: false };
    this.renderer = new ArenaRenderer($("arena"));
    this.demo = this.makePractice(true);
    this.state = this.demo.snapshot();
    this.map = this.demo.map;
    this.renderer.buildArena(this.map);
    this.lastFrame = performance.now();
    this.accumulator = 0;
    this.lastHud = 0;
    this.lastPing = 0;
    this.hitUntil = 0;
    this.damageUntil = 0;
    this.noticeUntil = 0;
    $("pilot-name").value = storage.get("qd-name", "Pilot");
    const invite = new URLSearchParams(location.search).get("room");
    if (invite) {
      $("room-code").value = invite.toUpperCase();
      $("lobby-status").textContent =
        "Room invite ready. Enter your callsign and choose Join.";
    }
    this.bind();
    this.interface=new Interface({maps:MAPS,onMap:id=>this.chooseMap(id),onLeaderboard:scope=>this.loadLeaderboard(scope),onPractice:()=>this.practice(),onOnline:scope=>{if(scope&&scope!=='overall')this.chooseMap(scope);this.online('quick');},onCamera:view=>this.setView(view),onZoom:zoom=>{this.renderer.zoom=Number(zoom);}});
    this.interface.setMaps(MAPS,this.selectedMap);
    this.updateSound();
    this.loadCareer();
    // Read-only diagnostics for support and end-to-end verification.
    window.__qd = Object.freeze({
      ...(new URLSearchParams(location.search).has("showcase") ? {showcase: config => this.stageShowcase(config)} : {}),
      getSnapshot: () =>
        JSON.parse(
          JSON.stringify({
            mode: this.mode,
            playerId: this.playerId,
            room: this.room,
            connected: this.connected,
            view: this.renderer.view,
            weapon: this.weapon,
            state: this.state,
            predicted: this.predicted,
            renderer: this.renderer.renderer.info.render,
            showcase: this.showcaseConfig || null,
            camera: {position:this.renderer.camera.position.toArray(),fov:this.renderer.camera.fov,aspect:this.renderer.camera.aspect,matrix:this.renderer.camera.matrixWorldInverse.toArray(),projection:this.renderer.camera.projectionMatrix.toArray()},
            mapId:this.map.id,profileId:this.profileId,career:this.career||null,
          }),
        ),
    });
    requestAnimationFrame((time) => this.frame(time));
  }
  chooseMap(id){
    if(this.mode==='online')return;
    this.selectedMap=getMap(id).id;storage.set('qd-map',this.selectedMap);this.interface?.setMaps(MAPS,this.selectedMap);
    if(this.mode==='lobby'){this.demo=this.makePractice(true);this.state=this.demo.snapshot();this.applyMap(this.demo.map);}
  }
  applyMap(map){this.map=map;this.renderer.buildArena(map);this.renderer.cameraReady=false;}
  async loadCareer(){
    try{const response=await fetch('/api/profile',{headers:{'x-pilot-token':this.profileToken}});if(!response.ok)throw new Error('Flight records unavailable');const data=await response.json();this.career=data.profile;this.profileId=data.playerId;this.careerError=data.error;return data;}
    catch(error){this.careerError=error.message;return {profile:null,error:error.message};}
  }
  async loadLeaderboard(scope='overall'){
    const id=typeof scope==='object'?scope.mapId||scope.scope:scope;
    const response=await fetch('/api/leaderboard'+(id&&id!=='overall'?'?mapId='+encodeURIComponent(id):''));
    if(!response.ok)throw new Error('Flight records are temporarily unavailable.');
    const data=await response.json();await this.loadCareer();if(data.error)throw new Error(data.error);
    return {...data,playerId:this.profileId,profile:this.career};
  }
  stageShowcase(config={}){
    this.selectedMap=getMap(config.map||'foundry').id;this.sim=this.makePractice();this.sim.time=92;
    const positions=[[-7,-6],[7,5],[-3,7],[8,-6]];
    [...this.sim.players.values()].forEach((p,i)=>{const pos=positions[i];if(!blocked(pos[0],pos[1],.9,this.sim.map))Object.assign(p,{x:pos[0],z:pos[1]});Object.assign(p,{health:[82,43,100,17][i],energy:76,protectedUntil:i===2?100:0,angle:i*1.2,aimAngle:i*1.2,kills:[7,4,2,1][i],deaths:[2,3,1,4][i],damageDealt:[945,620,430,280][i],shotsFired:54,shotsHit:28,vx:config.state==='drift'?9:0,vz:config.state==='drift'?7:0});});
    if(config.state==='occluded'){const p=this.sim.players.get('local');if(!blocked(0,5.3,.9,this.sim.map))Object.assign(p,{x:0,z:5.3});}
    if(config.state==='respawn'){const p=this.sim.players.get('local');p.alive=false;p.health=0;p.respawnAt=95;}
    if(config.state==='recap')this.sim.endRound();
    if(config.module==='effects'||config.state==='combat'){
      this.sim.projectiles.set('stage-laser',{id:'stage-laser',owner:'local',weapon:'LASER',x:-3,z:-6,vx:58,vz:0,age:.2});
      this.sim.projectiles.set('stage-bounce',{id:'stage-bounce',owner:'bot-0',weapon:'BOUNCE',x:8,z:3,vx:-27,vz:27,age:.4});
      this.sim.projectiles.set('stage-grenade',{id:'stage-grenade',owner:'bot-1',weapon:'GRENADE',x:0,z:-9,targetX:0,targetZ:-9,vx:0,vz:0,age:.4});
    }
    this.begin('practice','local',this.sim.snapshot(),this.sim.map);
    this.setView({tactical:0,chase:1,overview:2,'top-down':2,isometric:3}[config.camera]??0);
    this.renderer.setTimeOfDay(config.time||'dusk');this.renderer.showcaseModule=config.module||'arena';this.renderer.zoom=Number(config.zoom||1);this.showcaseConfig=config;
    document.body.dataset.showcase=config.module||'arena';
    if(config.module==='world')$('hud').hidden=true;
    if(config.state==='lobby'){this.mode='lobby';$('lobby').hidden=false;$('hud').hidden=true;}
    $('room-label').textContent='Showcase / '+(config.module||'arena');return true;
  }
  makePractice(demo = false) {
    const sim = new Simulation({map:getWorld(3),populationExpansion:false});
    if (!demo) sim.addPlayer("local", $("pilot-name").value);
    for (let i = 0; i < (demo ? 4 : 3); i++)
      sim.addPlayer(`bot-${i}`, ["Vector", "Nova", "Echo", "Flux"][i], true);
    sim.drainEvents();
    return sim;
  }
  bind() {
    document.addEventListener("qd:interface-modal", e=>{this.interfaceModal=!!e.detail.open;this.clearInput();});
    $("practice").onclick = () => this.practice();
    $("quick-play").onclick = () => this.online("quick");
    $("create-room").onclick = () => this.online("create");
    $("join-room").onclick = () => this.online("join");
    $("room-code").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.online("join");
    });
    $("menu-button").onclick = () => this.menu(true);
    $("resume").onclick = () => this.menu(false);
    $("leave-game").onclick = () => this.leave();
    $("help-button").onclick = $("lobby-help").onclick = () => {
      this.panel("help",true);
      this.clearInput();
    };
    $("close-help").onclick = () => {
      this.panel("help",false);
      this.clearInput();
    };
    $("score-button").onclick = () => this.scores(!$("scoreboard").hidden);
    $("close-scores").onclick = () => this.scores(true);
    $("view-button").onclick = () => this.cycleView();
    $("sound-button").onclick = () => {
      this.soundOn = !this.soundOn;
      this.updateSound();
      this.unlockAudio();
    };
    $("share-room").onclick = () => this.share();
    document.querySelectorAll("[data-weapon]").forEach((button) => {
      button.onclick = () => this.selectWeapon(button.dataset.weapon);
    });
    window.addEventListener("keydown", (e) => this.key(e, true));
    window.addEventListener("keyup", (e) => this.key(e, false));
    window.addEventListener("blur", () => this.clearInput());
    document.addEventListener("visibilitychange", () => this.clearInput());
    $("arena").addEventListener("pointermove", (e) => {
      this.mouse = { x: e.clientX, y: e.clientY };
    });
    $("arena").addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !this.active()) return;
      this.unlockAudio();
      this.mouse = { x: e.clientX, y: e.clientY };
      this.firing = true;
      this.firePointerId = e.pointerId;
      $("arena").setPointerCapture(e.pointerId);
    });
    // Scoped to the pointer that started firing: with a movement thumb also
    // down, lifting it must not stop fire from the other thumb.
    window.addEventListener("pointerup", (e) => {
      if (e.pointerId === this.firePointerId) this.firing = false;
    });
    window.addEventListener("pointercancel", () => this.clearInput());
    $("arena").addEventListener("contextmenu", (e) => e.preventDefault());
    document.querySelectorAll("[data-control]").forEach((button) => {
      button.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.unlockAudio();
        button.setPointerCapture(e.pointerId);
        this.keys.add(button.dataset.control);
      });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(type, () =>
          this.keys.delete(button.dataset.control),
        );
    });
    this.bindTouchStick();
    // A touch-capable device gets on-screen controls -- `pointer: coarse`
    // alone misses an iPad with a Magic Keyboard/trackpad (it reports
    // `fine`), so gate on `maxTouchPoints` and any real touch, not the media
    // query. A discrete real-mouse pointerdown hides it again for that same
    // hybrid case; a continuous pointermove is deliberately not the signal,
    // since Playwright/assistive tooling can synthesize mouse-flavored
    // events over a real touch device.
    const setTouchActive = (on) => {
      document.body.classList.toggle("touch-active", on);
      if (on) this.relocateFlightTools();
    };
    if (navigator.maxTouchPoints > 0) setTouchActive(true);
    window.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") setTouchActive(true);
      else if (e.pointerType === "mouse") setTouchActive(false);
    }, true);
  }
  // Weapon pills and Arena/Scores/Sound both live in .combat-bar with the
  // Fire button competing for the same bottom-right thumb zone. On touch,
  // Arena/Scores/Sound move into the Flight menu (already one tap away via
  // Menu) instead of sitting permanently on the play screen -- same nodes,
  // same onclick handlers, just relocated. Idempotent: append() on an
  // already-placed node is a harmless no-op move.
  relocateFlightTools() {
    $("menu").querySelector(".dialog").append(document.querySelector(".flight-tools"));
  }
  bindTouchStick() {
    const zone = $("touch-move-zone"),
      stick = $("touch-joystick"),
      knob = stick.querySelector(".stick-knob"),
      radius = 52;
    let pointerId = null,
      origin = null;
    const place = (o) => {
      stick.style.left = `${o.x}px`;
      stick.style.top = `${o.y}px`;
    };
    zone.addEventListener("pointerdown", (e) => {
      this.unlockAudio();
      pointerId = e.pointerId;
      origin = { x: e.clientX, y: e.clientY };
      place(origin);
      stick.hidden = false;
      zone.setPointerCapture(e.pointerId);
    });
    zone.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointerId) return;
      const point = { x: e.clientX, y: e.clientY };
      origin = reanchor(origin, point, radius);
      place(origin);
      this.stick = stickVector(origin, point, radius);
      knob.style.transform = this.stick.active
        ? `translate(${this.stick.x * 22}px, ${-this.stick.z * 22}px)`
        : "";
    });
    const release = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      origin = null;
      stick.hidden = true;
      knob.style.transform = "";
      this.stick = { x: 0, z: 0, active: false };
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      zone.addEventListener(type, release);
  }
  vibrate(pattern) {
    try { navigator.vibrate?.(pattern); } catch {}
  }
  active() {
    return (
      ["practice", "online"].includes(this.mode) &&
      $("menu").hidden &&
      $("help").hidden &&
      $("scoreboard").hidden &&
      !document.hidden && !this.interfaceModal &&
      (this.mode !== "online" || this.connected)
    );
  }
  clearInput() {
    this.keys.clear();
    this.firing = false;
    this.stick = { x: 0, z: 0, active: false };
    const stick = $("touch-joystick");
    if (stick) stick.hidden = true;
  }
  key(e, down) {
    const modal=['help','scoreboard','menu'].map($).find(el=>!el.hidden);
    if(modal){
      this.clearInput();
      if(down&&e.code==='Escape'){
        e.preventDefault();
        if(modal.id==='menu')this.menu(false);else if(modal.id==='scoreboard')this.scores(true);else this.panel('help',false);
      }else if(down&&e.code==='Tab'){
        e.preventDefault();
        const targets=[...modal.querySelectorAll('button,input,select,summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
        const index=targets.indexOf(document.activeElement),next=(index+(e.shiftKey?-1:1)+targets.length)%targets.length;
        targets[next]?.focus();
      }
      return;
    }
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if(e.target instanceof HTMLButtonElement && !this.active() && e.code==="Space")return;
    const recognized = [
      "KeyW",
      "KeyS",
      "KeyA",
      "KeyD",
      "KeyQ",
      "KeyE",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "Tab",
      "Escape",
      "KeyV",
      "KeyM",
      "KeyC",
      "KeyX",
      "Digit1",
      "Digit2",
      "Digit3",
    ];
    if (!recognized.includes(e.code)) return;
    e.preventDefault();
    if (!down) {
      this.keys.delete(e.code);
      return;
    }
    if (e.repeat) return;
    if (e.code === "Escape") {
      if (!$("help").hidden) $("help").hidden = true;
      else if (!$("scoreboard").hidden) this.scores(true);
      else if (["practice", "online"].includes(this.mode))
        this.menu($("menu").hidden);
      this.clearInput();
      return;
    }
    if (!["practice", "online"].includes(this.mode)) return;
    if (e.code === "Tab") {
      this.scores(!$("scoreboard").hidden);
      return;
    }
    if (e.code === "KeyC") {
      this.panel("help",true);
      this.clearInput();
      return;
    }
    if (!this.active()) return;
    this.keys.add(e.code);
    this.unlockAudio();
    if (e.code === "KeyV") this.cycleView();
    if (e.code === "KeyM")
      document.querySelector(".radar").classList.toggle("collapsed");
    if (e.code.startsWith("Digit"))
      this.selectWeapon(
        ["LASER", "GRENADE", "BOUNCE"][Number(e.code.slice(-1)) - 1],
      );
    if (e.code === "KeyX")
      this.selectWeapon(
        ["LASER", "GRENADE", "BOUNCE"][
          (["LASER", "GRENADE", "BOUNCE"].indexOf(this.weapon) + 1) % 3
        ],
      );
  }
  selectWeapon(weapon) {
    this.weapon = weapon;
    document.querySelectorAll("[data-weapon]").forEach((b) => {
      b.classList.toggle("selected", b.dataset.weapon === weapon);
      b.setAttribute("aria-pressed", String(b.dataset.weapon === weapon));
    });
  }
  cycleView() {
    this.setView(this.renderer.view===2?0:2);
  }
  setView(view){
    this.renderer.view=Math.max(0,Math.min(3,Number(view)||0));
    $("view-button").replaceChildren(
      document.createTextNode(
        ["Arena", "Chase", "Full map", "Isometric"][this.renderer.view] + " ",
      ),
    );
    const key = document.createElement("kbd");
    key.textContent = "V";
    $("view-button").append(key);
  }
  input() {
    const k = this.keys,
      on = (...codes) => (codes.some((code) => k.has(code)) ? 1 : 0);
    const horizontal=this.stick.active?this.stick.x:on('KeyD','ArrowRight','KeyE')-on('KeyA','ArrowLeft','KeyQ');
    const vertical=this.stick.active?this.stick.z:on('KeyW','ArrowUp')-on('KeyS','ArrowDown');
    const move=this.renderer.screenMovement(horizontal,vertical);
    return {
      seq: ++this.seq,
      move: this.active()?move:{x:0,z:0},
      thrust:0,turn:0,strafe:0,
      fire: this.active() && (this.firing || k.has("Space")),
      weapon: this.weapon,
      aim: this.aim,
    };
  }
  begin(mode, playerId, state, map = MAP) {
    this.mode = mode;
    this.playerId = playerId;
    this.state = state;
    this.map = map;
    this.seq = 0;
    this.pending = [];
    this.previousState = null;
    this.predicted = { ...state.players.find((p) => p.id === playerId) };
    this.accumulator = 0;
    this.renderer.buildArena(map);
    this.renderer.cameraReady = false;
    this.clearInput();
    this.mouse = null;
    this.aim = null;
    this.selectWeapon("LASER");
    this.setView(0);this.renderer.zoom=1;
    $("lobby").hidden = true;
    $("hud").hidden = false;
    $("menu").hidden = $("help").hidden = $("scoreboard").hidden = true;
    $("kill-feed").replaceChildren();
    $("notice").textContent = "";
    $("room-label").textContent =
      mode === "practice"
        ? "Practice arena"
        : this.room.startsWith("PUBLIC")
          ? "Public arena"
          : `Room ${this.room}`;
    $("share-room").hidden = mode !== "online";
    $("connection").textContent =
      mode === "practice" ? "Offline practice" : "Connected";
    storage.set("qd-name", $("pilot-name").value);
    this.setBusy(false);
    this._audioState.dead = false;
    this._audioState.roundOver = false;
    this.unlockAudio();
    this.syncMusicToMode();
  }
  practice() {
    this.socket?.disconnect();
    this.connected = false;
    this.room = null;
    this.showcaseConfig=null;this.renderer.showcaseModule=null;delete document.body.dataset.showcase;
    this.sim = this.makePractice();
    this.begin("practice", "local", this.sim.snapshot(),this.sim.map);
  }
  setBusy(busy) {
    for (const id of ["quick-play", "practice", "create-room", "join-room"])
      $(id).disabled = busy;
  }
  online(mode) {
    if (this.mode === "connecting") return;
    if (mode === "join" && !$("room-code").value.trim()) {
      $("lobby-status").textContent = "Enter your friend’s room code first.";
      $("room-code").focus();
      return;
    }
    this.unlockAudio();
    this.mode = "connecting";
    this.setBusy(true);
    $("lobby-status").textContent = "Connecting to the arena…";
    this.joinRequest = {
      mode,
      name: $("pilot-name").value,
      code: $("room-code").value.trim().toUpperCase(),
      bots: $("fill-bots").checked,
      mapId:this.selectedMap,profileToken:this.profileToken,rotate:true,
    };
    if (!this.socket) this.setupSocket();
    if (this.socket.connected) this.joinOnline();
    else this.socket.connect();
  }
  setupSocket() {
    this.socket = io({
      autoConnect: false,
      timeout: 6000,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      reconnectionAttempts: 8,
    });
    this.socket.on("connect", () => this.joinOnline());
    this.socket.on("connect_error", () => {
      if (this.mode === "connecting")
        this.failJoin(
          "Cannot reach the game server. Start it with npm start, or play practice.",
        );
      else if (this.mode === "online")
        this.notice("Connection lost. Retrying… Open Menu to leave.", 30);
    });
    this.socket.io.on("reconnect_failed", () => {
      if (this.mode === "online") {
        this.menu(true);
        $("menu-status").textContent =
          "Connection could not be restored. Leave the arena and join again.";
      }
    });
    this.socket.on("disconnect", () => {
      this.connected = false;
      this.clearInput();
      this.pending = [];
      if (this.mode === "online") {
        $("connection").textContent = "Reconnecting…";
        this.notice("Connection lost. Rejoining the room…", 30);
      }
    });
    this.socket.on("map",map=>this.applyMap(map));
    this.socket.on("careerUpdated",()=>this.loadCareer());
    this.socket.on("rankingsError",message=>this.notice(message,8));
    this.socket.on("state", (state) => {
      if (this.mode !== "online" || !this.connected) return;
      this.receive(state);
    });
    this.socket.on("events", (events) => {
      if (this.mode === "online" && this.connected)
        for (const e of events) this.event(e);
    });
  }
  joinOnline() {
    if (!["connecting", "online"].includes(this.mode)) return;
    const reconnect = this.mode === "online";
    const request = reconnect
      ? { mode: "join", code: this.room, name: $("pilot-name").value,profileToken:this.profileToken }
      : this.joinRequest;
    this.socket.timeout(6000).emit("join", request, (error, response) => {
      if (!["connecting", "online"].includes(this.mode)) return;
      if (error || response?.error) {
        this.failJoin(
          response?.error ||
            "The server did not answer. Try again or play practice.",
        );
        return;
      }
      this.connected = true;
      this.room = response.code;
      this.begin("online", response.playerId, response.state, response.map);
      this.receivedAt = performance.now();
      if (reconnect) this.notice("Reconnected. You’re back in the arena.", 3);
    });
  }
  failJoin(message) {
    this.mode = "lobby";
    this.socket?.disconnect();
    this.connected = false;
    this.setBusy(false);
    $("lobby").hidden = false;
    $("hud").hidden = $("menu").hidden = true;
    $("lobby-status").textContent = message;
    this.syncMusicToMode();
  }
  receive(state) {
    if(state.mapId && (state.mapId!==this.map.id||state.mapStage!==this.map.stage))this.applyMap(state.mapId==='confluence'?getWorld(state.mapStage):getMap(state.mapId));
    this.previousState = this.state;
    this.state = state;
    this.receivedAt = performance.now();
    const p = state.players.find((p) => p.id === this.playerId);
    if (!p) return;
    this.pending = this.pending.filter((input) => input.seq > p.ack);
    this.predicted = { ...p };
    if (!state.restartAt && p.alive)
      for (const input of this.pending)
        movePlayer(this.predicted, input, STEP, this.map);
  }
  interpolated(now) {
    if (this.mode !== "online" || !this.previousState) return this.state;
    const blend = Math.min(1, (now - this.receivedAt) / 50),
      old = new Map(this.previousState.players.map((p) => [p.id, p]));
    return {
      ...this.state,
      players: this.state.players.map((p) => {
        const prev = old.get(p.id);
        if (
          !prev ||
          prev.alive !== p.alive ||
          Math.hypot(p.x - prev.x, p.z - prev.z) > 8
        )
          return p;
        return {
          ...p,
          x: prev.x + (p.x - prev.x) * blend,
          z: prev.z + (p.z - prev.z) * blend,
          angle: prev.angle + angleDiff(p.angle, prev.angle) * blend,
        };
      }),
      projectiles: this.state.projectiles.map((p) => {
        const prev = this.previousState.projectiles.find((q) => q.id === p.id);
        return prev
          ? {
              ...p,
              x: prev.x + (p.x - prev.x) * blend,
              z: prev.z + (p.z - prev.z) * blend,
              age: prev.age + (p.age - prev.age) * blend,
            }
          : p;
      }),
    };
  }
  panel(id,open){
    const panel=$(id);this.panelFocus ||= new Map();
    if(open){
      this.panelFocus.set(id,document.activeElement);panel.hidden=false;
      panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',panel.querySelector('h2')?.textContent||id);
      panel.querySelector('button,input,select')?.focus({preventScroll:true});
    }else{
      panel.hidden=true;const previous=this.panelFocus.get(id);
      if(previous?.isConnected&&previous.getClientRects().length)previous.focus({preventScroll:true});
      this.panelFocus.delete(id);
    }
    this.clearInput();
  }
  menu(open) {
    this.panel('menu',open);
    $("pause-message").textContent =
      this.mode === "practice"
        ? "Practice is paused."
        : "Online matches keep running.";
    $("menu-status").textContent = "";
    this.clearInput();
  }
  scores(close) {
    this.panel("scoreboard",!close);
    this.clearInput();
    this.renderScores();
  }
  leave() {
    this.showcaseConfig=null;this.renderer.showcaseModule=null;delete document.body.dataset.showcase;
    this.mode = "lobby";
    this.demo=this.makePractice(true);this.state=this.demo.snapshot();this.applyMap(this.demo.map);
    this.socket?.disconnect();
    this.connected = false;
    this.pending = [];
    this.playerId = null;
    this.predicted = null;
    this.clearInput();
    $("lobby").hidden = false;
    $("hud").hidden =
      $("menu").hidden =
      $("help").hidden =
      $("scoreboard").hidden =
        true;
    $("lobby-status").textContent =
      "Free-for-all · 20 eliminations · 5 minutes";
    this.setBusy(false);
    this.renderer.cameraReady = false;
    this._audioState.dead = false;
    this._audioState.roundOver = false;
    this.music?.unduck(0.3);
    this.syncMusicToMode();
  }
  async share() {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("room", this.room);
    try {
      await navigator.clipboard.writeText(url.toString());
      this.notice("Invite link copied. Send it to your wingmates.", 4);
    } catch {
      this.menu(true);
      $("menu-status").textContent = `Invite: ${url}`;
    }
  }
  notice(text, seconds = 2) {
    $("notice").textContent = text;
    this.noticeUntil = performance.now() + seconds * 1000;
  }
  event(e) {
    if(e.type==='mapChanged'&&e.announcement){
      this.notice(e.announcement,6);
      this.music?.oneShot('sting-district-unlock',{gain:0.9,duckDb:-6,duckSeconds:4});
    }
    this.renderer.event(e);
    if (e.type === "fire")
      this.playSound(e.weapon, e.player === this.playerId ? 1 : 0.18);
    if (e.type === "hit" && e.attacker === this.playerId) {
      this.hitUntil = performance.now() + 130;
      this.vibrate(15);
    }
    if (e.type === "hit" && e.player === this.playerId) {
      this.damageUntil = performance.now() + 220;
      this.vibrate(30);
    }
    if (e.type === "kill") {
      const entry = document.createElement("p");
      entry.textContent = `${e.killer}  ›  ${e.victim}  /  ${WEAPONS[e.weapon].name}`;
      if (e.attacker === this.playerId) { entry.className = "your-kill"; this.vibrate([20, 40, 20]); }
      $("kill-feed").prepend(entry);
      while ($("kill-feed").children.length > 4)
        $("kill-feed").lastChild.remove();
      setTimeout(() => entry.remove(), 6000);
      if (e.player === this.playerId) {
        this.clearInput();
        this.music?.oneShot("ship-destroyed", { gain: 0.7 });
        this.music?.duck(-9, 3);
        this._audioState.dead = true;
      }
    }
    if (e.type === "explosion") this.playSound("EXPLOSION", 0.5);
  }
  unlockAudio() {
    if (!this.soundOn) return;
    try {
      if (!this.audio)
        this.audio = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audio.state === "suspended") this.audio.resume().catch(() => {});
      if (!this.music) {
        this.music = new MusicBus(this.audio);
        this.syncMusicToMode();
      }
    } catch {}
  }
  // Pick the bed for the current mode; playBed() de-dupes so this is idempotent.
  syncMusicToMode() {
    if (!this.music) return;
    let bed;
    if (this.mode === "practice") bed = "standby";
    else if (this.mode === "online") {
      this.music.prefetch([
        "foundry", "biodome", "rail-yard", "cold-relay",
        "sting-district-unlock", "sting-recap", "sting-victory",
        "respawn", "ship-destroyed",
      ]);
      bed = this.currentDistrictBed() || "foundry";
    } else bed = "signal-hub";
    this.music.playBed(bed, { fade: this.mode === "online" ? 2 : 1.5 });
    this._audioState.bed = bed;
  }
  currentDistrictBed() {
    const p = this.state?.players?.find?.((q) => q.id === this.playerId);
    const d = p && this.map?.districts?.find?.(
      (x) => Math.abs(p.x - x.x) < 30 && Math.abs(p.z - x.z) < 30,
    );
    return d && BED_FOR_DISTRICT[d.id];
  }
  updateSound() {
    $("sound-button").textContent = this.soundOn ? "Sound on" : "Sound off";
    $("sound-button").setAttribute("aria-pressed", String(this.soundOn));
    storage.set("qd-sound", this.soundOn ? "on" : "off");
    this.music?.setMuted(!this.soundOn);
  }
  playSound(weapon, volume) {
    if (!this.soundOn) return;
    const now = this.audio?.currentTime ?? 0;
    if (this.lastSound && now - this.lastSound < 0.04) return;
    this.lastSound = now;
    const SAMPLE = { LASER: "laser", BOUNCE: "ricochet", GRENADE: "grenade-launch", EXPLOSION: "explosion" };
    if (this.music && SAMPLE[weapon]) {
      this.music.sfx(SAMPLE[weapon], Math.min(1, volume));
      return;
    }
    if (!this.audio || this.audio.state !== "running") return;
    const low = weapon === "GRENADE" || weapon === "EXPLOSION";
    const oscillator = this.audio.createOscillator(),
      gain = this.audio.createGain();
    oscillator.type = low ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(
      low ? 130 : weapon === "BOUNCE" ? 650 : 1000,
      now,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      low ? 35 : 180,
      now + 0.14,
    );
    gain.gain.setValueAtTime(volume * 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    oscillator.connect(gain);
    gain.connect(this.audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.16);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  frame(now) {
    const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
    if(this.showcaseConfig?.module==="effects"&&Math.floor(now/700)!==this.lastShowcaseFx){this.lastShowcaseFx=Math.floor(now/700);this.renderer.event({type:"explosion",x:0,z:-9,radius:5});}
    this.lastFrame = now;
    if (this.mouse && this.active())
      this.aim = this.renderer.aimAt(this.mouse.x, this.mouse.y);
    else if (!this.mouse) this.aim = null;
    this.accumulator += dt;
    while (this.accumulator >= STEP) {
      if (this.mode === "lobby" || this.mode === "connecting") {
        this.demo.step();
        this.demo.drainEvents();
        this.state = this.demo.snapshot();
      } else if (
        this.mode === "practice" &&
        !this.showcaseConfig && !this.interfaceModal &&
        $("menu").hidden &&
        $("help").hidden &&
        !document.hidden
      ) {
        this.sim.setInput(this.playerId, this.input());
        this.sim.step();
        this.state = this.sim.snapshot();
        if(this.state.mapId!==this.map.id||this.state.mapStage!==this.map.stage)this.applyMap(this.sim.map);
        this.predicted = {
          ...this.state.players.find((p) => p.id === this.playerId),
        };
        for (const e of this.sim.drainEvents()) this.event(e);
      } else if (this.mode === "online" && this.connected) {
        const input = this.input();
        this.socket.volatile.emit("input", input);
        if (this.predicted && !this.state.restartAt)
          movePlayer(this.predicted, input, STEP, this.map);
        this.pending.push(input);
        if (this.pending.length > 120) this.pending.shift();
      }
      this.accumulator -= STEP;
    }
    this.renderer.draw(
      this.interpolated(now),
      this.playerId,
      this.predicted,
      this.aim,
      this.weapon,
      dt,
      ["lobby", "connecting"].includes(this.mode),
    );
    if (now - this.lastHud > 80) {
      this.updateHud(now);
      this.interface.update({state:this.state,player:this.state.players.find(p=>p.id===this.playerId),mode:this.mode,map:this.map,view:this.renderer.view,zoom:this.renderer.zoom,profile:this.career,career:this.career,error:this.careerError});
      this.lastHud = now;
    }
    if (this.connected && now - this.lastPing > 2000) {
      this.lastPing = now;
      this.socket.timeout(3000).emit("pingCheck", (error) => {
        if (!error) this.ping = Math.round(performance.now() - now);
      });
    }
    requestAnimationFrame((time) => this.frame(time));
  }
  updateHud(now) {
    if (!["practice", "online"].includes(this.mode)) return;
    const state = this.state,
      p = state.players.find((p) => p.id === this.playerId);
    if (!p) return;
    const remain = Math.max(0, Math.ceil(state.roundEndsAt - state.time));
    $("clock").textContent =
      `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`;
    $("round-label").textContent =
      `Round ${state.round} · ${this.map.districts?.find(d=>Math.abs(p.x-d.x)<30&&Math.abs(p.z-d.z)<30)?.label || "Confluence"} · ${(this.map.stage??3)+1}/4 open`;
    $("health-value").textContent = Math.ceil(p.health);
    $("energy-value").textContent = Math.floor(p.energy);
    $("health-bar").style.width = `${p.health}%`;
    $("energy-bar").style.width = `${p.energy}%`;
    document.querySelector(".vitals").classList.toggle("low", p.health < 30);
    for (const button of document.querySelectorAll("[data-weapon]"))
      button.classList.toggle(
        "depleted",
        p.energy < WEAPONS[button.dataset.weapon].cost,
      );
    $("connection").textContent =
      this.mode === "practice"
        ? "Offline practice"
        : this.connected
          ? `${this.ping} ms · Connected`
          : "Reconnecting…";
    $("pilot-count").textContent =
      `${state.players.filter((q) => !q.bot).length} human${state.players.filter((q) => !q.bot).length === 1 ? "" : "s"} / ${state.players.length} pilots`;
    $("death-panel").hidden = p.alive || !!state.restartAt;
    $("respawn-time").textContent = Math.max(
      1,
      Math.ceil(p.respawnAt - state.time),
    );
    $("round-panel").hidden = !state.restartAt;
    $("winner").textContent = `${state.winner || ""} wins`;
    $("next-round").textContent =
      `Next round in ${Math.max(0, Math.ceil(state.restartAt - state.time))} seconds`;
    $("hit-marker").hidden = now > this.hitUntil;
    $("damage-flash").style.opacity = now < this.damageUntil ? "1" : "0";
    if (this.noticeUntil < now) $("notice").textContent = "";
    if (
      p.alive &&
      this.active() &&
      (this.firing || this.keys.has("Space")) &&
      p.energy < WEAPONS[this.weapon].cost
    )
      this.notice("Recharging energy…", 0.3);
    if (!$("scoreboard").hidden) this.renderScores();
    this.radar(p);
    this.updateMusic(state, p);
  }
  // Adaptive score: district-driven bed, round-end stings, respawn chime.
  updateMusic(state, p) {
    if (!this.music) return;
    const over = !!state.restartAt;
    if (this.mode === "online" && !over) {
      const bed = this.currentDistrictBed();
      if (bed && bed !== this._audioState.bed) {
        this.music.playBed(bed, { fade: 2 });
        this._audioState.bed = bed;
      }
    }
    if (over && !this._audioState.roundOver) {
      const mine = state.winner && state.winner === $("pilot-name").value;
      this.music.oneShot(mine ? "sting-victory" : "sting-recap", { gain: 1, duckDb: -12, duckSeconds: 5 });
    } else if (!over && this._audioState.roundOver) {
      this.music.unduck(0.6);
      this._audioState.bed = null; // force a fresh district resolve next tick
    }
    this._audioState.roundOver = over;
    if (p && !p.alive) {
      this._audioState.dead = true;
    } else if (p && this._audioState.dead) {
      this._audioState.dead = false;
      this.music.oneShot("respawn", { gain: 0.6 });
      this.music.unduck(0.4);
    }
  }
  renderScores() {
    const rows = [...this.state.players]
      .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)
      .map((p) => {
        const row = document.createElement("tr");
        if (p.id === this.playerId) row.className = "self";
        for (const text of [
          p.name + (p.bot ? " (bot)" : p.id === this.playerId ? " (you)" : ""),
          p.kills,
          p.deaths,
        ]) {
          const td = document.createElement("td");
          td.textContent = text;
          row.append(td);
        }
        return row;
      });
    $("scores").replaceChildren(...rows);
  }
  radar(local) {
    const canvas = $("radar"),
      ctx = canvas.getContext("2d"),
      size = canvas.width,
      scale = (size - 16) / (this.map.size * 2),
      point = (p) => [size / 2 + p.x * scale, size / 2 - p.z * scale];
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "#426276";
    ctx.strokeRect(8, 8, size - 16, size - 16);
    for (const o of this.map.obstacles) {
      const [x, z] = point(o);
      ctx.fillStyle = o.color + "99";
      if (o.type === "box")
        ctx.fillRect(
          x - (o.w / 2) * scale,
          z - (o.d / 2) * scale,
          o.w * scale,
          o.d * scale,
        );
      else {
        ctx.beginPath();
        ctx.arc(x, z, o.r * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const p of this.state.players) {
      if (!p.alive) continue;
      const [x, z] = point(p);
      ctx.fillStyle = p.id === local.id ? "#fff" : p.color;
      ctx.beginPath();
      ctx.arc(x, z, p.id === local.id ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      if (p.id === local.id) {
        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(x, z);
        ctx.lineTo(x + Math.sin(p.angle) * 10, z - Math.cos(p.angle) * 10);
        ctx.stroke();
      }
    }
  }
}
try {
  new Game();
} catch (error) {
  console.error(error);
  $("lobby-status").textContent =
    "The 3D renderer could not start. Enable graphics acceleration and reload in a WebGL-capable browser.";
}
