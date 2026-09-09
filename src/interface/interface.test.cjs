const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

test('interface preserves host controls, safe records, async ordering, recap and lifecycle', async () => {
  const executablePath = process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath && fs.existsSync(executablePath) ? { executablePath } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.setContent(fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'));
    await page.addStyleTag({ content: fs.readFileSync(path.join(__dirname, '../styles/main.css'), 'utf8') });
    await page.addStyleTag({ content: fs.readFileSync(path.join(__dirname, 'Interface.css'), 'utf8') });
    const source = fs.readFileSync(path.join(__dirname, 'Interface.js'), 'utf8').replace("import './Interface.css';", '').replace('export class Interface', 'window.Interface = class Interface');
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      window.originalIds = [...document.querySelectorAll('[id]')].map(element => element.id);
      window.practiceCalls = 0;
      document.getElementById('practice').onclick = () => window.practiceCalls++;
      window.requests = {};
      window.maps = ['foundry', 'canopy', 'glacier', 'classic'].map(id => ({ id, name: id[0].toUpperCase() + id.slice(1), subtitle: 'An arena to explore' }));
      window.ui = new Interface({ maps, onMap: id => window.chosen = id, onLeaderboard: scope => new Promise((resolve, reject) => { window.requests[scope] = { resolve, reject }; }), onPractice: () => window.practiceCalls++, onCamera: value => window.cameraValue = value, onZoom: value => window.zoomValue = value });
    });
    await page.locator('#practice').click();
    assert.equal(await page.evaluate(() => window.practiceCalls), 1);
    await page.locator('[data-map-id="canopy"]').click();
    assert.equal(await page.evaluate(() => window.chosen), 'canopy');
    assert.equal(await page.locator('[data-map-id="canopy"]').getAttribute('aria-pressed'), 'true');
    // Open modal, switch scopes before the first request completes.
    await page.locator('.qd-records-link').click();
    await page.locator('[data-scope="glacier"]').click();
    await page.evaluate(() => requests.glacier.resolve({ scope: 'glacier', rows: [{ id: 'me', name: '<img src=x onerror=alert(1)>', score: 900, wins: 2, matches: 3, kills: 7, deaths: 2 }], playerId: 'me', profile: { name: 'Pilot', matches: 3, wins: 2, score: 900, xp: 480 } }));
    await page.locator('.qd-leaderboard').waitFor();
    await page.evaluate(() => requests.overall.resolve({ scope: 'overall', rows: [{ id: 'stale', name: 'Stale record' }] }));
    assert.equal(await page.locator('.qd-leaderboard img').count(), 0);
    assert.match(await page.locator('.qd-leaderboard').textContent(), /<img src=x onerror=alert\(1\)>/);
    assert.doesNotMatch(await page.locator('.qd-leaderboard').textContent(), /Stale record/);
    assert.equal(await page.locator('.qd-self').count(), 1);
    assert.equal(await page.locator('.qd-board').getAttribute('aria-busy'), null);
    await page.locator('[data-scope="glacier"]').focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('[data-scope="canopy"]').getAttribute('aria-selected'), 'true');
    await page.evaluate(() => requests.canopy.reject(new Error('offline')));
    await page.getByRole('button', { name: 'Retry records' }).waitFor();
    assert.match(await page.locator('.qd-board-status').textContent(), /unavailable/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.qd-records:not(.qd-round-review)').evaluate(element => element.open), false);
    assert.equal(await page.evaluate(() => document.activeElement.className), 'qd-records-link');
    await page.evaluate(() => ui.showLeaderboard({ rows: [], scope: 'overall' }));
    assert.match(await page.locator('.qd-board-status').textContent(), /No recorded rounds/);
    assert.equal(await page.locator('.qd-leaderboard').count(), 0);
    await page.evaluate(() => {
      ui.closeLeaderboard();
      document.getElementById('lobby').hidden = true;
      document.getElementById('hud').hidden = false;
      document.getElementById('round-panel').hidden = false;
      ui.update({ mode: 'practice', player: { id: 'me' }, map: maps[0], state: { time: 20, restartAt: 25, recap: { round: 2, mapId: 'foundry', winnerId: 'me', players: [{ id: 'me', name: 'Pilot', kills: 8, deaths: 2, damageDealt: 850, shotsFired: 40, shotsHit: 15, score: 880, xp: 140 }] } } });
    });
    assert.match(await page.locator('.qd-recap').textContent(), /37.5%/);
    assert.match(await page.locator('.qd-recap').textContent(), /Not added to online records/);
    assert.equal(await page.locator('#next-round').textContent(), 'Next launch in 5s');
    await page.evaluate(() => { document.getElementById('menu').hidden = false; });
    assert.equal(await page.locator('.qd-advanced-camera').evaluate(element => element.open), false);
    assert.deepEqual(await page.locator('#qd-camera option').allTextContents(), ['Arena (recommended)', 'Chase', 'Full map', 'Isometric']);
    await page.getByText('Advanced camera views', { exact: true }).click();
    await page.locator('#qd-camera').selectOption('3');
    assert.equal(await page.evaluate(() => window.cameraValue), 3);
    await page.getByRole('button', { name: 'Arena (recommended)', exact: true }).click();
    assert.equal(await page.evaluate(() => window.cameraValue), 0);
    await page.evaluate(() => { const zoom = document.getElementById('qd-zoom'); zoom.value = '1.4'; zoom.dispatchEvent(new Event('input')); });
    assert.equal(await page.evaluate(() => window.zoomValue), 1.4);
    for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 600 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => { document.getElementById('menu').hidden = true; document.getElementById('hud').hidden = true; document.getElementById('lobby').hidden = false; });
      assert.equal(await page.evaluate(() => document.getElementById('lobby').scrollWidth <= innerWidth), true);
      const overlap = await page.evaluate(() => { const a = document.querySelector('.lobby-panel').getBoundingClientRect(); const b = document.querySelector('.qd-map-picker').getBoundingClientRect(); return a.bottom > b.top; });
      assert.equal(overlap, false, `lobby controls overlap maps at ${viewport.width}`);
    }
    await page.evaluate(() => ui.dispose());
    assert.equal(await page.locator('.qd-records, .qd-map-picker, .qd-recap').count(), 0);
    assert.equal(await page.evaluate(() => originalIds.every(id => document.getElementById(id))), true);
    await page.locator('#practice').click();
    assert.equal(await page.evaluate(() => window.practiceCalls), 2);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('round3 touch recap, canonical identity, online empty action and authoritative history', async () => {
  const executablePath = process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath && fs.existsSync(executablePath) ? { executablePath } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.setContent(fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'));
    for (const file of ['../styles/main.css', 'Interface.css']) await page.addStyleTag({ content: fs.readFileSync(path.join(__dirname, file), 'utf8') });
    await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'Interface.js'), 'utf8').replace("import './Interface.css';", '').replace('export class Interface', 'window.Interface = class Interface') });
    await page.evaluate(() => {
      window.modalEvents = []; document.addEventListener('qd:interface-modal', event => modalEvents.push(event.detail.open));
      window.ui = new Interface({ maps: [{ id: 'foundry', name: 'Foundry' }, { id: 'canopy', name: 'Canopy' }], onOnline: async scope => { window.onlineScope = scope; if (window.failOnline) throw new Error('offline'); }, onLeaderboard: async scope => ({ scope, rows: [], profile: window.career }) });
      window.recap = { round: 4, mapId: 'foundry', winnerId: 'old-socket', players: [{ id: 'old-socket', profileId: 'canonical', name: 'Pilot', score: 800, xp: 250, kills: 5, deaths: 2, shotsFired: 40, shotsHit: 10, damageDealt: 850 }, { id: 'new-socket', profileId: 'other', score: 1 }] };
      window.career = { id: 'canonical', name: 'Pilot', level: 3, xp: 1200, matches: 5, wins: 2, score: 2100, last10: [{ id: 'older-record', mapId: 'canopy', wins: 1, score: 800, xp: 250, kills: 5, deaths: 2, damageDealt: 850, shotsFired: 40, shotsHit: 10, accuracy: 25 }] };
      window.tick = (extra = {}) => ui.update({ mode: 'online', player: { id: 'new-socket', profileId: 'canonical' }, career, state: { recap, restartAt: 25, time: 20 }, ...extra });
      document.getElementById('lobby').hidden = true;
      document.getElementById('hud').hidden = false;
      document.getElementById('round-panel').hidden = false;
      tick();
    });
    assert.match(await page.locator('.qd-recap').textContent(), /Victory/);
    assert.match(await page.locator('.qd-recap-primary').textContent(), /800/);
    assert.match(await page.locator('.qd-recap').textContent(), /25.0%/);
    assert.match(await page.locator('.qd-recap-note').textContent(), /Save not yet confirmed/);
    assert.match(await page.locator('.qd-progression').textContent(), /Level 3/);
    assert.equal(await page.locator('.qd-progression progress').evaluate(element => element.value), 200);
    assert.equal(await page.locator('.qd-progression progress').evaluate(element => element.max), 1250);
    for (const selector of ['.combat-bar', '#touch-controls', '.radar']) assert.equal(await page.locator(selector).evaluate(element => getComputedStyle(element).visibility), 'hidden');
    const bounds = await page.locator('#round-panel').boundingBox();
    assert.ok(bounds.y >= 90 && bounds.y + bounds.height <= 844, 'touch recap stays inside its reserved viewport');
    await page.locator('.qd-recap').getByRole('button', { name: 'Pilot records' }).click();
    await page.locator('.qd-history').waitFor();
    assert.equal(await page.locator('.qd-history li').count(), 1);
    assert.match(await page.locator('.qd-history').textContent(), /Canopy/);
    await page.locator('.qd-history summary').click();
    assert.match(await page.locator('.qd-history details[open]').textContent(), /850/);
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      recap.recordId = 'this-record';
      career.last10.unshift({ ...career.last10[0], id: 'this-record', mapId: 'foundry' });
      tick();
    });
    assert.match(await page.locator('.qd-recap-note').textContent(), /Saved in your pilot history/);
    await page.evaluate(() => tick({ error: 'disk unavailable' }));
    assert.match(await page.locator('.qd-recap-note').textContent(), /Save not confirmed/);
    // Next launch removes intermission HUD treatment, but preserves a review.
    await page.evaluate(() => { tick({ state: { restartAt: null, recap: null } }); document.getElementById('round-panel').hidden = true; document.getElementById('menu').hidden = false; });
    assert.equal(await page.locator('.combat-bar').evaluate(element => getComputedStyle(element).visibility), 'visible');
    await page.getByRole('button', { name: 'Review previous round' }).click();
    assert.equal(await page.locator('.qd-round-review').evaluate(element => element.open), true);
    assert.match(await page.locator('.qd-review-content').textContent(), /800/);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Review previous round');
    assert.equal(await page.evaluate(() => modalEvents.at(-1)), false);
    // Empty state must launch the selected records scope, not the lobby map.
    await page.evaluate(() => { document.getElementById('menu').hidden = true; tick({ mode: 'lobby', state: {} }); ui.showLeaderboard({ scope: 'canopy', rows: [] }); window.failOnline = true; });
    await page.getByRole('button', { name: 'Play online', exact: true }).click();
    assert.match(await page.locator('.qd-board-status').textContent(), /Could not start online/);
    assert.equal(await page.locator('.qd-records:not(.qd-round-review)').evaluate(element => element.open), true);
    await page.evaluate(() => window.failOnline = false);
    await page.getByRole('button', { name: 'Play online', exact: true }).click();
    assert.equal(await page.evaluate(() => window.onlineScope), 'canopy');
    assert.equal(await page.locator('.qd-records:not(.qd-round-review)').evaluate(element => element.open), false);
    // Missing authoritative level must not synthesize level one or progress.
    await page.evaluate(() => ui.showLeaderboard({ rows: [], profile: { xp: 1200, last10: [] } }));
    assert.equal(await page.locator('.qd-career .qd-progression').count(), 0);
    await page.evaluate(() => ui.dispose());
    assert.equal(await page.locator('.qd-round-review').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
