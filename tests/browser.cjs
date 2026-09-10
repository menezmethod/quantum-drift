// Exercises the shipped production bundle through keyboard/mouse input in independent browsers.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");
const { createGameServer } = require("../server/server");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn, timeout = 5000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout)
      throw new Error("Timed out waiting for authoritative state");
    await sleep(20);
  }
}
async function main() {
  const game = createGameServer();
  await new Promise((resolve) => game.server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${game.server.address().port}`;
  const chromePath =
    process.env.CHROME_PATH ||
    (process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined);
  const browser = await chromium.launch({
    ...(chromePath && fs.existsSync(chromePath)
      ? { executablePath: chromePath }
      : {}),
    headless: true,
    args: [
      ...(process.env.CHROME_BACKEND === "native" ? [] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
    ],
  });
  const errors = [],
    contexts = [],
    out = path.join(__dirname, "../test-results");
  fs.mkdirSync(out, { recursive: true });
  async function newPage(options = {}) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ...options,
    });
    contexts.push(ctx);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400 && !r.url().endsWith("favicon.ico"))
        errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(url);
    await page.waitForFunction(() => window.__qd);
    return page;
  }
  const snapshot = (page) => page.evaluate(() => window.__qd.getSnapshot());
  try {
    const a = await newPage();
    await a.screenshot({ path: path.join(out, "lobby.png") });
    await a.fill("#pilot-name", "Alpha");
    await a.click('[data-map-id="confluence"]');
    await a.uncheck("#fill-bots");
    await a.click("#create-room");
    await a.waitForFunction(() => window.__qd.getSnapshot().mode === "online");
    const initialA = await snapshot(a),
      room = game.rooms.get(initialA.room),
      idA = initialA.playerId;
    const b = await newPage();
    await b.goto(`${url}?room=${initialA.room}`);
    await b.waitForFunction(() => window.__qd);
    assert.equal(await b.inputValue("#room-code"), initialA.room);
    await b.fill("#pilot-name", "Bravo");
    await b.click("#join-room");
    await b.waitForFunction(() => window.__qd.getSnapshot().mode === "online");
    await a.waitForFunction(
      () => window.__qd.getSnapshot().state.players.length === 2,
    );
    let idB = (await snapshot(b)).playerId;
    assert.equal((await snapshot(b)).state.players.length, 2);
    console.log(
      "PASS: independent browser clients join the same room through an invite",
    );
    await a.keyboard.down("KeyW");
    await sleep(500);
    await a.keyboard.up("KeyW");
    await until(
      () =>
        Math.hypot(
          room.sim.players.get(idA).x - initialA.predicted.x,
          room.sim.players.get(idA).z - initialA.predicted.z,
        ) > 2,
    );
    await b.waitForFunction(
      ({ id, x, z }) => {
        const p = window.__qd
          .getSnapshot()
          .state.players.find((p) => p.id === id);
        return Math.hypot(p.x - x, p.z - z) > 2;
      },
      { id: idA, x: initialA.predicted.x, z: initialA.predicted.z },
    );
    const angle = room.sim.players.get(idA).angle;
    await a.keyboard.down("KeyA");
    await sleep(300);
    await a.keyboard.up("KeyA");
    await until(() => Math.abs(room.sim.players.get(idA).angle - angle) > 0.3);
    // Let the key-release packet arrive before repositioning the test ships.
    await until(() => {
      const input = room.sim.players.get(idA).input;
      return input.turn === 0 && input.thrust === 0 && (!input.move || Math.hypot(input.move.x,input.move.z)===0);
    });
    console.log("PASS: directional movement replicates to the other browser");
    function fixture(weapon, az, bz) {
      const pa = room.sim.players.get(idA),
        pb = room.sim.players.get(idB);
      Object.assign(pa, {
        x: -56,
        z: az - 30,
        angle: 0,
        vx: 0,
        vz: 0,
        aimAngle: 0,
        energy: 100,
        nextFire: 0,
        protectedUntil: 0,
        alive: true,
        health: 100,
      });
      Object.assign(pb, {
        x: -56,
        z: bz - 30,
        vx: 0,
        vz: 0,
        protectedUntil: 0,
        alive: true,
        health: 100,
        lastDamage: room.sim.time,
      });
      room.sim.projectiles.clear();
      return { pa, pb };
    }
    let { pa, pb } = fixture("LASER", -7, 4);
    await sleep(400);
    await a.keyboard.down("Space");
    await until(() => !pb.alive, 4000);
    await a.keyboard.up("Space");
    await b.waitForSelector("#death-panel:not([hidden])");
    assert.equal(pa.kills, 1);
    await a.keyboard.press("Tab");
    await a.waitForSelector("#scoreboard:not([hidden])");
    assert.match(await a.textContent("#scores"), /Alpha \(you\)1/);
    await a.keyboard.press("Escape");
    await until(() => pb.alive, 4500);
    await b.waitForSelector("#death-panel[hidden]", { state: "attached" });
    assert.equal(pb.health, 100);
    console.log(
      "PASS: keyboard-fired lasers cause one kill, visible death, score, and automatic respawn",
    );
    ({ pa, pb } = fixture("GRENADE", -8, 8));
    await a.keyboard.press("Digit2");
    await sleep(250);
    await a.keyboard.down("Space");
    await sleep(100);
    await a.keyboard.up("Space");
    await until(() => pb.health < 100);
    assert.equal(pb.health, 20);
    console.log("PASS: grenade launch and authoritative area damage");
    ({ pa, pb } = fixture("BOUNCE", 27, 22));
    await a.keyboard.press("Digit3");
    await sleep(250);
    await a.keyboard.down("Space");
    await sleep(100);
    await a.keyboard.up("Space");
    await until(() => pb.health < 100);
    assert.equal(pb.health, 66);
    console.log(
      "PASS: ricochet banks off the arena wall and damages the other player",
    );
    await a.keyboard.press("KeyV");
    assert.equal((await snapshot(a)).view, 2);
    await sleep(900);
    ({ pa, pb } = fixture("LASER", 0, 0));
    pb.x = -50;
    await a.keyboard.press("Digit1");
    await sleep(300);
    // Project the authoritative target using the actual camera matrices, so this
    // validates mouse aim independently of preset distance or field of view.
    const { Vector3, Matrix4 } = require('three');
    const camera = (await snapshot(a)).camera;
    const target = new Vector3(pb.x, 0.9, pb.z)
      .applyMatrix4(new Matrix4().fromArray(camera.matrix))
      .applyMatrix4(new Matrix4().fromArray(camera.projection));
    await a.mouse.move((target.x + 1) * 640, (1 - target.y) * 400);
    await a.mouse.down();
    await until(() => pb.health < 100);
    await a.mouse.up();
    assert.equal(pa.angle, 0);
    console.log("PASS: mouse aims and fires independently of ship heading");
    await a.screenshot({ path: path.join(out, "top-down.png") });
    await a.keyboard.press("Escape");
    await a.locator('.qd-advanced-camera summary').click();
    await a.locator('#qd-camera').selectOption('1');
    assert.equal((await snapshot(a)).view, 1);
    await a.locator('#qd-camera').selectOption('3');
    await a.click('#resume');
    assert.equal((await snapshot(a)).view, 3);
    await sleep(300);
    await a.screenshot({ path: path.join(out, "isometric.png") });
    await a.keyboard.press("KeyV");
    assert.equal((await snapshot(a)).view, 2);
    await a.keyboard.press("KeyV");
    assert.equal((await snapshot(a)).view, 0);
    await a.keyboard.press("KeyM");
    assert.ok(
      await a
        .locator(".radar")
        .evaluate((el) => el.classList.contains("collapsed")),
    );
    await a.keyboard.press("KeyM");
    console.log("PASS: all four cameras and radar toggle");
    const oldId = idB;
    await b.context().setOffline(true);
    await until(() => !room.sim.players.has(oldId), 8000);
    await b.context().setOffline(false);
    await b.waitForFunction(
      (oldId) => {
        const s = window.__qd.getSnapshot();
        return s.connected && s.playerId !== oldId;
      },
      oldId,
      { timeout: 15000 },
    );
    idB = (await snapshot(b)).playerId;
    assert.equal(room.humans.size, 2);
    assert.equal(room.sim.players.has(oldId), false);
    console.log(
      "PASS: network loss reconnects to the same room without a ghost player",
    );
    const lag = await newPage();
    // Engine.IO may keep HTTP polling when WebSocket upgrade is delayed.
    // Apply the same network latency to both supported transports.
    await lag.route('**/socket.io/**',async route=>{
      await sleep(60);const response=await route.fetch();await sleep(60);
      await route.fulfill({response});
    });
    await lag.routeWebSocket(/socket\.io/, (client) => {
      const server = client.connectToServer();
      const forward = (route, message) =>
        setTimeout(() => {
          try {
            route.send(message);
          } catch {
            /* Context may close while a packet is in flight. */
          }
        }, 60);
      client.onMessage((message) => forward(server, message));
      server.onMessage((message) => forward(client, message));
    });
    // Reload after interception is installed so the initial socket is delayed too.
    await lag.goto(url);
    await lag.waitForFunction(() => window.__qd);
    await lag.fill("#pilot-name", "Lag test");
    await lag.fill("#room-code", initialA.room);
    await lag.click("#join-room");
    await lag.waitForFunction(
      () => window.__qd.getSnapshot().mode === "online",
    );
    await lag.waitForFunction(
      () =>
        parseInt(document.getElementById("connection").textContent, 10) >= 110,
    );
    const lagStart = await snapshot(lag);
    await lag.keyboard.down("KeyW");
    await sleep(500);
    await lag.keyboard.up("KeyW");
    await sleep(500);
    const lagEnd = await snapshot(lag),
      lagServer = room.sim.players.get(lagEnd.playerId);
    assert.ok(
      Math.hypot(
        lagServer.x - lagStart.predicted.x,
        lagServer.z - lagStart.predicted.z,
      ) > 1,
    );
    assert.ok(
      Math.hypot(
        lagEnd.predicted.x - lagServer.x,
        lagEnd.predicted.z - lagServer.z,
      ) < 0.75,
    );
    await lag.close();
    console.log(
      "PASS: movement prediction reconciles with 120ms simulated round-trip delay",
    );
    await a.keyboard.press("Escape");
    await a.click("#leave-game");
    await a.click("#practice");
    await a.waitForFunction(
      () => window.__qd.getSnapshot().mode === "practice",
    );
    await a.keyboard.press("Escape");
    const paused = (await snapshot(a)).state.tick;
    await sleep(300);
    assert.equal((await snapshot(a)).state.tick, paused);
    await a.click("#resume");
    await a.waitForFunction(
      (tick) => window.__qd.getSnapshot().state.tick > tick,
      paused,
    );
    await a.screenshot({ path: path.join(out, "practice.png") });
    console.log("PASS: leave/reenter and offline practice pause/resume");
    // Browser fetch failure for the cosmetic GLTF must never prevent play.
    const mobile = await newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await mobile.route("**/*.glb", (route) => route.abort());
    await mobile.reload();
    await mobile.waitForFunction(() => window.__qd);
    await mobile.screenshot({ path: path.join(out, "mobile-lobby.png") });
    assert.ok(await mobile.locator("#practice").isVisible());
    await mobile.click("#practice");
    await mobile.waitForFunction(
      () => window.__qd.getSnapshot().mode === "practice",
    );
    assert.ok(await mobile.locator("#touch-controls").isVisible());
    await mobile.screenshot({ path: path.join(out, "mobile-practice.png") });
    assert.equal(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    console.log(
      "PASS: mobile layout, touch controls, and playable missing-model fallback",
    );
    assert.deepEqual(errors, []);
    console.log("PASS: no browser exceptions or broken application requests");
  } finally {
    for (const c of contexts) await c.close();
    await browser.close();
    await game.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
