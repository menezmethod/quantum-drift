const express = require("express");
const http = require("node:http");
const path = require("node:path");
const { randomBytes, createHash } = require("node:crypto");
const { Server } = require("socket.io");
const { Simulation, MAP, STEP } = require("../shared/simulation");
const { MAPS, getMap, MAP_ROTATION } = require("../shared/maps");
const { RankingStore } = require("./rankings");

function createGameServer({
  staticDir = path.join(__dirname, "../dist"),
  tick = true,
  rankingsFile = null,
  reconnectGraceMs = 30000,
  maxRooms = Math.max(1, Math.min(100, Number(process.env.MAX_ROOMS) || 8)),
  maxConnections = Math.max(8, Math.min(1000, Number(process.env.MAX_CONNECTIONS) || 96)),
} = {}) {
  const app = express(),
    server = http.createServer(app);
  const io = new Server(server, {
    maxHttpBufferSize: 8192,
    ...(process.env.CLIENT_URL
      ? { cors: { origin: process.env.CLIENT_URL.split(",") } }
      : {}),
  });
  io.use((socket, next) => next(io.engine.clientsCount > maxConnections ? new Error("Server is full. Please try again shortly.") : undefined));
  const rooms = new Map();
  const rankings = new RankingStore({filePath:rankingsFile});
  const pendingSaves = new Set();
  let rankingError = null;
  const profileKey = token => typeof token === "string" && /^[a-zA-Z0-9_-]{20,128}$/.test(token) ? createHash("sha256").update(token).digest("hex") : null;
  app.get("/api/leaderboard", async (req,res) => {
    try { res.json({rows:await rankings.getLeaderboard({mapId:req.query.mapId || undefined,limit:50}),scope:req.query.mapId || "overall",error:rankingError}); } catch { res.status(503).json({error:"Flight records are temporarily unavailable."}); }
  });
  app.get("/api/profile", async (req,res) => {
    const id=profileKey(req.get("x-pilot-token"));
    if(!id) return res.status(400).json({error:"A pilot identity is required."});
    try {res.json({playerId:id,profile:await rankings.getProfile(id),error:rankingError});} catch {res.status(503).json({error:"Flight records are temporarily unavailable."});}
  });
  app.use(express.static(staticDir));
  app.get("/health", (_, res) =>
    res.json({
      status: "ok",
      rankings:rankingError?"degraded":"ok",
      rooms: rooms.size,
      players: [...rooms.values()].reduce((n, r) => n + r.humans.size, 0),
    }),
  );
  const makeRoom = (code, bots, mapId = "classic", rotate = false) => {
    const room = { code, bots, sim: new Simulation({map:getMap(mapId),mapRotation:rotate?MAP_ROTATION.map(getMap):[]}), humans: new Set(),matchId:randomBytes(12).toString("hex") };
    rooms.set(code, room);
    return room;
  };
  function fillBots(room) {
    const desired = room.bots ? Math.max(0, 4 - room.humans.size) : 0;
    const bots = [...room.sim.players.values()].filter((p) => p.bot);
    while (bots.length > desired) room.sim.removePlayer(bots.pop().id);
    const names = ["Vector", "Nova", "Echo", "Flux"];
    for (let i = 0; bots.length < desired; i++) {
      const id = `bot-${i}`;
      if (room.sim.players.has(id)) continue;
      bots.push(room.sim.addPlayer(id, names[i % names.length], true));
    }
  }
  function leave(socket, transportLoss = false) {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    room.humans.delete(socket.id);
    room.sim.removePlayer(socket.id);
    socket.leave(room.code);
    socket.data.room = null;
    if (!room.humans.size) {
      if(transportLoss){
        clearTimeout(room.expiry);
        room.expiry=setTimeout(()=>{if(!room.humans.size)rooms.delete(room.code);},reconnectGraceMs);
        room.expiry.unref?.();
      }else{clearTimeout(room.expiry);rooms.delete(room.code);}
    } else fillBots(room);
  }
  io.on("connection", (socket) => {
    let windowStart = Date.now(),
      packets = 0,
      lastJoin = 0;
    socket.on("join", (request, ack) => {
      if (typeof ack !== "function") return;
      const now = Date.now();
      if (now - lastJoin < 400)
        return ack({ error: "Please wait a moment before joining again." });
      lastJoin = now;
      if (!request || typeof request !== "object")
        return ack({ error: "Invalid room request." });
      const profileId = profileKey(request.profileToken) || createHash("sha256").update(socket.id).digest("hex");
      if(socket.data.profileId && socket.data.profileId!==profileId)return ack({error:"Reconnect before changing pilot identity."});
      const mode = request.mode;
      const requestedMap = typeof request.mapId === "string" && MAPS.some(map=>map.id===request.mapId) ? request.mapId : "classic";
      let room;
      if (mode === "quick") {
        room = [...rooms.values()].find(
          (r) => r.code.startsWith("PUBLIC") && r.humans.size < 8 && r.sim.map.id === getMap(requestedMap).id,
        );
        if (!room) {
          if (rooms.size >= maxRooms)
            return ack({
              error: "All arenas are busy. Please try again shortly.",
            });
          room = makeRoom(
            `PUBLIC-${randomBytes(3).toString("hex").toUpperCase()}`,
            true, requestedMap, request.rotate === true,
          );
        }
      } else if (mode === "create") {
        if (rooms.size >= maxRooms)
          return ack({
            error: "All arenas are busy. Please try again shortly.",
          });
        let code;
        do {
          code = randomBytes(3).toString("hex").toUpperCase();
        } while (rooms.has(code));
        room = makeRoom(code, request.bots !== false, requestedMap, request.rotate === true);
      } else if (mode === "join") {
        const code =
          typeof request.code === "string"
            ? request.code.trim().toUpperCase()
            : "";
        room = rooms.get(code);
        if (!room)
          return ack({
            error: "Room not found. Check the code or create a new room.",
          });
      } else
        return ack({ error: "Choose quick play, create room, or join room." });
      if (room.humans.size >= 8 && !room.humans.has(socket.id))
        return ack({ error: "This room is full (8 pilots)." });
      if ([...room.sim.players.values()].some(p=>p.profileId===profileId && p.id!==socket.id)) return ack({error:"This pilot is already flying in this room. Use a different browser profile for another pilot."});
      if (socket.data.room !== room.code) leave(socket);
      socket.join(room.code);
      socket.data.room = room.code;
      socket.data.profileId = profileId;
      clearTimeout(room.expiry);room.expiry=null;
      room.humans.add(socket.id);
      // Remove a filling bot before choosing a color and a safe player spawn.
      fillBots(room);
      const prior=[...room.sim.departed.values()].find(p=>p.profileId===profileId);
      const player = room.sim.addPlayer(socket.id, request.name, false, !room.sim.restartAt?prior:null);
      player.profileId=profileId;
      if(prior && !room.sim.restartAt)room.sim.departed.delete(prior.id);
      fillBots(room);
      ack({
        playerId: socket.id,
        profileId,
        code: room.code,
        map: room.sim.map,
        state: room.sim.snapshot(),
      });
    });
    socket.on("input", (input) => {
      const now = Date.now();
      if (now - windowStart > 1000) {
        windowStart = now;
        packets = 0;
      }
      if (++packets > 120) return;
      const room = rooms.get(socket.data.room);
      if (room) room.sim.setInput(socket.id, input);
    });
    socket.on("pingCheck", (ack) => {
      if (typeof ack === "function") ack();
    });
    socket.on("leave", () => leave(socket));
    socket.on("disconnect", reason => leave(socket, reason !== "client namespace disconnect" && reason !== "server namespace disconnect"));
  });
  let previous = performance.now(),
    accumulator = 0;
  function advance() {
    const now = performance.now();
    accumulator += Math.min((now - previous) / 1000, 0.25);
    previous = now;
    while (accumulator >= STEP) {
      for (const room of rooms.values()) {
        if(!room.humans.size)continue;
        room.sim.step();
        const events = room.sim.drainEvents();
        for (const event of events) {
          if (event.type === "mapChanged") io.to(room.code).emit("map", event.map);
          if (event.type === "roundEnd") {
            event.recap.recordId=room.matchId+":"+room.sim.round;
            const record={id:event.recap.recordId,mapId:room.sim.map.id,players:event.recap.players,winnerId:event.recap.winnerId};
            const save=Promise.resolve().then(()=>rankings.recordRound(record)).then(()=>{rankingError=null;io.to(room.code).emit("careerUpdated");}).catch(error=>{rankingError="Last round records could not be saved.";console.error("Ranking save failed:",error.message);io.to(room.code).emit("rankingsError",rankingError);}).finally(()=>pendingSaves.delete(save));
            pendingSaves.add(save);
          }
        }
        if (events.length) io.to(room.code).emit("events", events);
        if (room.sim.tick % 3 === 0)
          io.to(room.code).emit("state", room.sim.snapshot());
      }
      accumulator -= STEP;
    }
  }
  const interval = tick ? setInterval(advance, 1000 / 60) : null;
  async function close() {
    clearInterval(interval);
    for(const room of rooms.values())clearTimeout(room.expiry);
    await new Promise((resolve) => io.close(resolve));
    await Promise.all([...pendingSaves]);
    await rankings.close();
  }
  return { app, server, io, rooms, rankings, close };
}
if (require.main === module) {
  const game = createGameServer({rankingsFile:process.env.RANKINGS_FILE || path.join(__dirname,"data/rankings.json")}),
    port = Number(process.env.PORT || 8080);
  game.server.listen(port, "0.0.0.0", () => {
    console.log(`Quantum Drift is ready: http://localhost:${port}`);
    const interfaces = require("node:os").networkInterfaces();
    for (const entries of Object.values(interfaces))
      for (const net of entries || [])
        if (net.family === "IPv4" && !net.internal)
          console.log(`LAN play: http://${net.address}:${port}`);
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => game.close().then(() => process.exit(0)));
}
module.exports = { createGameServer };
