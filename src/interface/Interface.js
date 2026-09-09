import './Interface.css';

const $ = (id) => document.getElementById(id);
const number = (value) => Number.isFinite(Number(value)) && value !== null && value !== '' ? Math.max(0, Number(value)) : null;
const count = (value) => number(value) === null ? '—' : Math.round(number(value)).toLocaleString();
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const themes = {
  foundry: { color: '#ffae70', label: 'Industrial forge', mark: '01' },
  canopy: { color: '#b4dc95', label: 'Research garden', mark: '02' },
  glacier: { color: '#a3daee', label: 'Polar relay', mark: '03' },
  junction: { color: '#ffbd78', label: 'Close-quarters junction', mark: '05' },
  classic: { color: '#c8b9ed', label: 'Original arena', mark: '04' },
};

// Original, deterministic environmental diagrams; deliberately not navigation maps.
function thumbnail(id) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 240 112');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const draw = (tag, attributes) => {
    const shape = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => shape.setAttribute(key, value));
    svg.append(shape);
  };
  draw('path', { d: 'M0 92H240M0 20H240M32 0V112M208 0V112', stroke: 'currentColor', opacity: '.12', fill: 'none' });
  if (id === 'junction') {
    draw('path', {d:'M32 56H208 M120 12V100',stroke:'currentColor',opacity:'.3',fill:'none'});
    for (const [x,y,w,h] of [[93,32,22,22],[125,58,22,22],[52,20,12,30],[52,64,12,30],[176,20,12,30],[176,64,12,30],[86,10,30,8],[124,94,30,8]])
      draw('rect',{x,y,width:w,height:h,rx:2,fill:'#263039',stroke:'currentColor'});
  } else if (id === 'foundry') {
    draw('ellipse', { cx: 120, cy: 64, rx: 79, ry: 29, fill: 'none', stroke: 'currentColor', 'stroke-width': 8, opacity: '.2' });
    draw('path', { d: 'M44 60L120 24L196 60L120 99Z M78 60L120 40L162 60L120 80Z', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 });
    for (const x of [66, 158]) {
      draw('path', { d: `M${x} 57v-29l16-8 16 8v29l-16 8Z`, fill: '#263039', stroke: 'currentColor' });
      draw('path', { d: `M${x + 16} 29v28`, stroke: 'currentColor', 'stroke-width': 4 });
    }
    draw('path', { d: 'M104 61l16-8 16 8-16 8Z', fill: 'currentColor' });
  } else if (id === 'canopy') {
    draw('path', { d: 'M39 76L113 19L201 70L128 103Z M72 71L117 39L171 71L126 87Z', fill: 'none', stroke: 'currentColor', opacity: '.6' });
    for (const [x, y, r] of [[73, 48, 19], [166, 46, 22], [109, 72, 13], [143, 82, 10]]) {
      draw('path', { d: `M${x} ${y}v25`, stroke: 'currentColor', opacity: '.5' });
      draw('ellipse', { cx: x, cy: y, rx: r, ry: r * .65, fill: '#243e32', stroke: 'currentColor' });
      draw('path', { d: `M${x - r + 5} ${y}l${r - 5} -${r / 2} ${r - 5} ${r / 2}`, fill: 'none', stroke: 'currentColor', opacity: '.4' });
    }
  } else if (id === 'glacier') {
    draw('path', { d: 'M25 81L61 31L89 57L123 14L154 62L183 35L218 82L126 102Z', fill: '#203641', stroke: 'currentColor', opacity: '.8' });
    draw('path', { d: 'M61 31l7 40 21-14M123 14l-5 63 36-15M183 35l-8 43 43 4', fill: 'none', stroke: 'currentColor', opacity: '.4' });
    draw('path', { d: 'M117 79V38m-10 8 10-8 10 8M101 85l16-8 16 8-16 8Z', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 });
    draw('circle', { cx: 117, cy: 34, r: 5, fill: 'currentColor' });
  } else {
    for (const r of [18, 35, 53]) draw('ellipse', { cx: 120, cy: 60, rx: r * 1.5, ry: r * .65, fill: 'none', stroke: 'currentColor', opacity: '.5' });
    draw('path', { d: 'M120 17v86M40 60h160M110 60l10-28 10 28-10-6Z', fill: '#222d40', stroke: 'currentColor' });
  }
  draw('path', { d: 'M12 30V12h22M206 12h22v18M12 82v18h22M206 100h22V82', fill: 'none', stroke: 'currentColor', opacity: '.45' });
  return svg;
}

export class Interface {
  constructor({ maps = [], onMap, onLeaderboard, onPractice, onOnline, onCamera, onZoom } = {}) {
    this.callbacks = { onMap, onLeaderboard, onPractice, onOnline, onCamera, onZoom };
    this.owned = [];
    this.listeners = [];
    this.request = 0;
    this.scope = 'overall';
    this.disposed = false;
    this.skinWasPresent = document.body.classList.contains('qd-interface');
    document.body.classList.add('qd-interface');
    this.mountLobby();
    this.mountLeaderboard();
    this.mountFlightControls();
    this.mountReview();
    this.recap = this.attach($('round-panel'), node('div', 'qd-recap'));
    this.recap.hidden = true;
    this.setMaps(maps);
  }

  attach(parent, child) {
    if (parent) { parent.append(child); this.owned.push(child); }
    return child;
  }

  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.listeners.push(() => target.removeEventListener(type, handler, options));
  }

  button(label, handler, className = 'qd-button') {
    const button = node('button', className, label);
    button.type = 'button';
    // These nodes are owned and removed on dispose; their listeners can be collected with them.
    button.addEventListener('click', handler);
    return button;
  }

  mountLobby() {
    const lobby = $('lobby');
    const panel = lobby?.querySelector('.lobby-panel');
    this.attach(panel, node('p', 'qd-identity', 'Your callsign and pilot history belong to this browser. No account sign-in.'));
    this.attach(panel, this.button('Pilot records ↗', () => this.loadLeaderboard('overall'), 'qd-records-link'));
    this.picker = this.attach(lobby, node('section', 'qd-map-picker'));
    this.picker.setAttribute('aria-label', 'Choose an arena');
    const heading = node('div', 'qd-picker-heading');
    heading.append(node('span', 'qd-eyebrow', 'Flight destinations'));
    this.mapLabel = node('span', 'qd-map-current', 'Choose your arena');
    heading.append(this.mapLabel);
    this.cards = node('div', 'qd-map-cards');
    this.mapStatus = node('p', 'qd-map-status');
    this.mapStatus.setAttribute('role', 'status');
    this.picker.append(heading, this.cards, this.mapStatus);
  }

  mountFlightControls() {
    const menu = $('menu')?.querySelector('.dialog');
    this.arenaButton = this.attach(menu, this.button('Arena (recommended)', () => this.callbacks.onCamera?.(0)));
    this.arenaButton.disabled = typeof this.callbacks.onCamera !== 'function';
    this.arenaButton.setAttribute('aria-pressed', 'true');
    this.advancedCamera = this.attach(menu, node('details', 'qd-advanced-camera'));
    this.advancedCamera.append(node('summary', '', 'Advanced camera views'));
    this.controls = node('div', 'qd-camera-controls');
    this.advancedCamera.append(this.controls);
    const cameraLabel = node('label', '', 'Flight camera');
    this.camera = node('select');
    this.camera.id = 'qd-camera';
    cameraLabel.htmlFor = this.camera.id;
    ['Arena (recommended)', 'Chase', 'Full map', 'Isometric'].forEach((name, index) => {
      const option = node('option', '', name); option.value = index; this.camera.append(option);
    });
    this.camera.disabled = typeof this.callbacks.onCamera !== 'function';
    this.listen(this.camera, 'change', () => this.callbacks.onCamera?.(Number(this.camera.value)));
    const zoomLabel = node('label', '', 'Camera zoom');
    this.zoom = node('input');
    this.zoom.id = 'qd-zoom'; this.zoom.type = 'range'; this.zoom.min = '.7'; this.zoom.max = '1.5'; this.zoom.step = '.05'; this.zoom.value = '1';
    zoomLabel.htmlFor = this.zoom.id;
    this.zoom.disabled = typeof this.callbacks.onZoom !== 'function';
    this.listen(this.zoom, 'input', () => this.callbacks.onZoom?.(Number(this.zoom.value)));
    this.controls.append(cameraLabel, this.camera, zoomLabel, this.zoom);
    this.attach(menu, this.button('Pilot records', () => this.loadLeaderboard('overall')));
    this.reviewButton = this.attach(menu, this.button('Review previous round', () => this.showPreviousRound()));
    this.reviewButton.hidden = true;
  }

  setMaps(maps = [], selectedId = this.selectedId) {
    this.maps = (Array.isArray(maps) ? maps : Object.values(maps || {})).filter((map) => map && typeof map.id === 'string');
    this.maps = this.maps.filter((map, index, all) => all.findIndex((other) => other.id === map.id) === index);
    this.selectedId = this.maps.some((map) => map.id === selectedId) ? selectedId : this.maps[0]?.id;
    this.cards.replaceChildren();
    for (const map of this.maps) {
      const theme = themes[map.id] || themes.classic;
      const card = this.button('', () => this.chooseMap(map.id), 'qd-map-card');
      card.dataset.mapId = map.id;
      card.style.setProperty('--map-accent', theme.color);
      card.disabled = typeof this.callbacks.onMap !== 'function';
      const art = node('div', 'qd-map-art'); art.append(thumbnail(map.id));
      const meta = node('div', 'qd-map-meta');
      meta.append(node('span', 'qd-map-number', theme.mark), node('span', 'qd-map-type', theme.label));
      const title = node('strong', 'qd-map-name', map.name || map.id);
      const subtitle = node('span', 'qd-map-subtitle', map.subtitle || theme.label);
      const selection = node('span', 'qd-map-selection');
      card.append(meta, art, title, subtitle, selection);
      this.cards.append(card);
    }
    this.picker.hidden = !this.maps.length;
    this.syncSelection();
    this.renderTabs();
  }

  async chooseMap(id) {
    if (this.selecting || !this.callbacks.onMap) return;
    this.selecting = true;
    this.mapStatus.textContent = 'Loading arena…';
    this.cards.setAttribute('aria-busy', 'true');
    try {
      await this.callbacks.onMap(id);
      if (this.disposed) return;
      this.selectedId = id;
      this.syncSelection();
      this.mapStatus.textContent = 'Arena selected. Practice here or find an online match.';
    } catch {
      if (!this.disposed) this.mapStatus.textContent = 'Arena could not load. Choose it again to retry.';
    } finally {
      this.selecting = false;
      this.cards.removeAttribute('aria-busy');
    }
  }

  syncSelection() {
    for (const card of this.cards.children) {
      const selected = card.dataset.mapId === this.selectedId;
      card.setAttribute('aria-pressed', String(selected));
      card.querySelector('.qd-map-selection').textContent = selected ? 'Selected / Ready to fly' : 'Explore arena ↗';
    }
    this.mapLabel.textContent = this.maps.find((map) => map.id === this.selectedId)?.name || 'Choose your arena';
  }

  mountLeaderboard() {
    this.modal = this.attach(document.body, node('dialog', 'qd-records'));
    this.modal.setAttribute('aria-labelledby', 'qd-records-title');
    const head = node('header', 'qd-records-head');
    const title = node('div');
    title.append(node('span', 'qd-eyebrow', 'Quantum Drift / Pilot records'));
    const h2 = node('h2', '', 'The flight ledger'); h2.id = 'qd-records-title'; title.append(h2);
    this.closeButton = this.button('Close ×', () => this.closeLeaderboard());
    head.append(title, this.closeButton);
    this.tabs = node('div', 'qd-record-tabs');
    this.tabs.setAttribute('role', 'tablist'); this.tabs.setAttribute('aria-label', 'Leaderboard scope');
    this.board = node('section', 'qd-board'); this.board.id = 'qd-board'; this.board.setAttribute('role', 'tabpanel');
    this.boardStatus = node('p', 'qd-board-status'); this.boardStatus.setAttribute('role', 'status');
    this.tableWrap = node('div', 'qd-table-scroll');
    this.career = node('section', 'qd-career'); this.career.setAttribute('aria-label', 'Your browser pilot career');
    this.board.append(this.boardStatus, this.tableWrap);
    const footer = node('footer', 'qd-records-footer');
    footer.append(node('p', '', 'History is linked to this browser’s pilot token. Clearing browser data may disconnect your history. Callsigns are not verified identities. Practice does not add online records.'));
    this.retry = this.button('Retry records', () => this.loadLeaderboard(this.scope)); this.retry.hidden = true;
    footer.append(this.retry);
    this.practiceButton = this.button('Practice with bots', () => { this.closeLeaderboard(); this.callbacks.onPractice?.(); });
    this.practiceButton.hidden = true;
    this.onlineButton = this.button('Play online', () => this.startOnline(), 'qd-button primary');
    this.onlineButton.hidden = true;
    footer.append(this.onlineButton, this.practiceButton);
    this.recordsFooter = footer;
    this.modal.append(head, this.tabs, this.career, this.board, footer);
    this.listen(this.modal, 'cancel', (event) => { event.preventDefault(); this.closeLeaderboard(); });
    this.listen(this.modal, 'click', (event) => { if (event.target === this.modal) { const r = this.modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) this.closeLeaderboard(); } });
    // Stop game shortcuts while the native modal owns focus; allow native Tab handling.
    this.listen(window, 'keydown', (event) => {
      if (!this.modal.open && !this.reviewModal?.open) return;
      if (event.target.getAttribute?.('role') === 'tab' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.stopImmediatePropagation();
      if (event.key === 'Escape') { event.preventDefault(); this.reviewModal?.open ? this.closeReview() : this.closeLeaderboard(); }
    }, true);
    this.listen(window, 'keyup', (event) => { if (this.modal.open || this.reviewModal?.open) event.stopImmediatePropagation(); }, true);
  }

  renderTabs() {
    if (!this.tabs) return;
    this.tabs.replaceChildren();
    const scopes = [{ id: 'overall', name: 'Overall' }, ...this.maps];
    scopes.forEach((map, index) => {
      const button = this.button(map.name || map.id, () => this.loadLeaderboard(map.id), 'qd-record-tab');
      button.id = `qd-record-tab-${index}`;
      button.dataset.scope = map.id;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'qd-board');
      button.addEventListener('keydown', (event) => {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? scopes.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + scopes.length) % scopes.length;
        this.tabs.children[next].focus(); this.loadLeaderboard(scopes[next].id);
      });
      this.tabs.append(button);
    });
    this.syncTabs();
  }

  syncTabs() {
    for (const button of this.tabs.children) {
      const selected = button.dataset.scope === this.scope;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
      if (selected) this.board.setAttribute('aria-labelledby', button.id);
    }
  }

  openLeaderboard() {
    if (this.modal.open || this.disposed) return;
    this.returnFocus = document.activeElement;
    this.modal.showModal();
    this.closeButton.focus();
    // Integrator listens to clear held input and pause offline simulation.
    document.dispatchEvent(new CustomEvent('qd:interface-modal', { detail: { open: true } }));
  }

  closeLeaderboard() {
    if (!this.modal.open) return;
    this.request++;
    this.modal.close();
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    document.dispatchEvent(new CustomEvent('qd:interface-modal', { detail: { open: false } }));
  }

  async loadLeaderboard(scope = 'overall') {
    this.openLeaderboard();
    this.emptyRecords = false; this.onlineButton.hidden = true;
    this.scope = scope; this.syncTabs();
    const request = ++this.request;
    this.board.setAttribute('aria-busy', 'true');
    this.boardStatus.textContent = 'Loading pilot records…';
    this.tableWrap.replaceChildren(); this.career.replaceChildren();
    this.retry.hidden = true; this.practiceButton.hidden = true;
    try {
      if (!this.callbacks.onLeaderboard) throw new Error('unavailable');
      const result = await this.callbacks.onLeaderboard(scope);
      if (this.disposed || request !== this.request) return;
      if (!result || !Array.isArray(result.rows)) throw new Error('invalid records');
      this.showLeaderboard({ ...result, scope });
    } catch {
      if (this.disposed || request !== this.request) return;
      this.boardStatus.textContent = 'Pilot records are unavailable. Check your connection and retry.';
      this.retry.hidden = false;
    } finally {
      if (request === this.request) this.board.removeAttribute('aria-busy');
    }
  }

  showLeaderboard({ scope = 'overall', rows = [], playerId, profile } = {}) {
    if (this.disposed) return;
    this.request++; // Directly supplied data also supersedes a pending request.
    this.openLeaderboard(); this.scope = scope; this.syncTabs();
    this.board.removeAttribute('aria-busy'); this.retry.hidden = true;
    const records = Array.isArray(rows) ? rows.filter((row) => row && !row.bot) : [];
    this.boardStatus.textContent = records.length ? `${scope === 'overall' ? 'All arenas' : this.maps.find((map) => map.id === scope)?.name || scope} · Completed online rounds · Ordered by score` : 'No recorded rounds here yet. Finish an online round to begin your history.';
    this.tableWrap.replaceChildren();
    if (records.length) {
      const table = node('table', 'qd-leaderboard');
      const caption = node('caption', 'qd-sr-only', 'Persistent pilot records'); table.append(caption);
      const head = node('thead'); const headers = node('tr');
      ['Place', 'Pilot', 'Score', 'Wins', 'Rounds', 'Kills', 'Deaths'].forEach((label) => { const th = node('th', '', label); th.scope = 'col'; headers.append(th); });
      head.append(headers); table.append(head);
      const body = node('tbody');
      records.forEach((record, index) => {
        const row = node('tr', record.id === playerId ? 'qd-self' : '');
        const values = [String(index + 1).padStart(2, '0'), (record.name || 'Pilot') + (record.id === playerId ? ' · You' : ''), count(record.score), count(record.wins), count(record.matches), count(record.kills), count(record.deaths)];
        values.forEach((value, column) => { const cell = node(column === 1 ? 'th' : 'td', '', value); if (column === 1) cell.scope = 'row'; row.append(cell); });
        body.append(row);
      });
      table.append(body); this.tableWrap.append(table);
    }
    this.renderCareer(profile);
    this.emptyRecords = !records.length;
    this.syncRecordActions();
  }

  renderCareer(profile) {
    this.career.replaceChildren(node('h3', '', 'Your browser pilot'));
    if (profile && typeof profile === 'object') {
      this.career.append(node('p', 'qd-career-name', profile.name || 'Pilot'));
      this.career.append(this.metrics([['Rounds', profile.matches], ['Wins', profile.wins], ['Score', profile.score], ['Career XP', profile.xp]]));
      this.renderProgress(this.career, profile);
      this.renderHistory(profile);
    } else this.career.append(node('p', '', 'Career totals are not available for this browser yet.'));

  }

  syncRecordActions() {
    const lobby = (this.mode || 'lobby') === 'lobby';
    this.onlineButton.hidden = !this.emptyRecords || !lobby || typeof this.callbacks.onOnline !== 'function';
    this.practiceButton.hidden = !lobby || typeof this.callbacks.onPractice !== 'function';
    this.practiceButton.title = 'Practice does not add online records';
  }

  async startOnline() {
    if (!this.callbacks.onOnline || this.joining) return;
    this.joining = true; this.onlineButton.disabled = true;
    const scope = this.scope;
    try {
      await this.callbacks.onOnline(scope);
      if (!this.disposed) this.closeLeaderboard();
    } catch {
      if (!this.disposed) this.boardStatus.textContent = 'Could not start online play. Check your connection and try Play online again.';
    } finally {
      this.joining = false; this.onlineButton.disabled = false;
    }
  }

  renderProgress(target, profile) {
    const level = number(profile?.level), xp = number(profile?.xp);
    if (level === null || level < 1 || !Number.isInteger(level) || xp === null) return;
    // These thresholds are the server RankingStore progression rule; never infer
    // a level or award XP here. Inconsistent/missing server data hides the meter.
    const floor = 250 * (level - 1) ** 2, ceiling = 250 * level ** 2;
    const block = node('div', 'qd-progression');
    block.append(node('strong', '', `Level ${count(level)}`));
    if (xp >= floor && xp < ceiling) {
      const progress = node('progress'); progress.max = ceiling - floor; progress.value = xp - floor;
      progress.setAttribute('aria-label', `Progress to level ${level + 1}`);
      block.append(progress, node('span', '', `${count(ceiling - xp)} XP to level ${level + 1}`));
    }
    target.append(block);
  }

  renderHistory(profile) {
    const history = node('section', 'qd-history');
    history.append(node('h3', '', 'Recent online rounds'));
    const rounds = Array.isArray(profile.last10) ? profile.last10.filter(entry => entry && typeof entry === 'object').slice(0, 10) : [];
    if (!rounds.length) history.append(node('p', '', 'No recent round history available. Practice does not add online records.'));
    else {
      const list = node('ol');
      for (const round of rounds) {
        const item = node('li');
        const details = node('details');
        const summary = node('summary');
        summary.append(node('strong', '', this.maps.find(map => map.id === round.mapId)?.name || round.mapId || 'Arena'),
          node('span', '', `${number(round.wins) === null ? 'Completed' : round.wins > 0 ? 'Victory' : 'Completed'} · ${count(round.score)} score · ${count(round.xp)} XP`));
        details.append(summary, this.metrics([['Kills', round.kills], ['Deaths', round.deaths], ['Damage', round.damageDealt], ['Shots fired', round.shotsFired], ['Shots hit', round.shotsHit], ['Accuracy', null, number(round.accuracy) === null ? '—' : `${Math.min(100, number(round.accuracy))}%`]]));
        item.append(details); list.append(item);
      }
      history.append(list);
    }
    this.career.append(history);
  }

  mountReview() {
    this.reviewModal = this.attach(document.body, node('dialog', 'qd-records qd-round-review'));
    this.reviewModal.setAttribute('aria-labelledby', 'qd-review-title');
    const head = node('header', 'qd-records-head');
    const title = node('h2', '', 'Previous round'); title.id = 'qd-review-title';
    this.reviewClose = this.button('Close ×', () => this.closeReview());
    head.append(title, this.reviewClose);
    this.reviewContent = node('div', 'qd-review-content');
    this.reviewModal.append(head, this.reviewContent);
    this.listen(this.reviewModal, 'cancel', event => { event.preventDefault(); this.closeReview(); });
  }

  showPreviousRound() {
    if (!this.previousRound || this.disposed) return;
    this.closeLeaderboard();
    this.reviewReturnFocus = document.activeElement;
    this.renderRecap(this.reviewContent, this.previousRound);
    if (!this.reviewModal.open) this.reviewModal.showModal();
    this.reviewClose.focus();
    document.dispatchEvent(new CustomEvent('qd:interface-modal', { detail: { open: true } }));
  }

  closeReview() {
    if (!this.reviewModal?.open) return;
    this.reviewModal.close();
    if (this.reviewReturnFocus?.isConnected) this.reviewReturnFocus.focus();
    document.dispatchEvent(new CustomEvent('qd:interface-modal', { detail: { open: false } }));
  }

  saveStatus({ recap, mode, local }) {
    if (mode === 'practice') return 'Practice round · Not added to online records';
    if (this.careerError) return 'Online round · Save not confirmed. Pilot records are unavailable.';
    const recordId = recap.recordId || recap.id;
    const samePilot = local?.profileId && this.profile?.id === local.profileId;
    const saved = samePilot && recordId && this.profile?.last10?.some(round => round.id === recordId);
    return saved ? 'Online round · Saved in your pilot history' : 'Online round · Save not yet confirmed. Check Pilot records.';
  }

  renderRecap(target, data) {
    const { recap, local, mode } = data;
    target.replaceChildren();
    const result = local ? (recap.winnerId === local.id || recap.winnerId === local.profileId ? 'Victory' : 'Round complete') : 'Round complete';
    target.append(node('p', 'qd-recap-result', result));
    target.append(node('p', 'qd-recap-context', `${this.maps.find(entry => entry.id === recap.mapId)?.name || recap.mapId || 'Arena'} / Round ${recap.round ?? '—'} / ${mode === 'practice' ? 'Practice' : 'Online'}`));
    if (local) {
      const fired = number(local.shotsFired), hits = number(local.shotsHit);
      const accuracy = number(local.accuracy) ?? (fired === null || hits === null ? null : fired ? hits / fired * 100 : 0);
      const main = this.metrics([['Score', local.score], ['Round XP', local.xp]]); main.classList.add('qd-recap-primary');
      target.append(main, this.metrics([['Kills', local.kills], ['Deaths', local.deaths], ['Damage', local.damageDealt], ['Shots fired', local.shotsFired], ['Shots hit', local.shotsHit], ['Accuracy', null, accuracy === null ? '—' : `${Math.min(100, accuracy).toFixed(1)}%`]]));
    } else target.append(node('p', '', 'No pilot statistics for this round.'));
    const status = node('p', 'qd-recap-note', this.saveStatus(data)); status.setAttribute('role', 'status');
    target.append(status);
    if (mode === 'online' && this.profile?.id === local?.profileId) this.renderProgress(target, this.profile);
    target.append(this.button('Pilot records ↗', () => { this.closeReview(); this.loadLeaderboard(recap.mapId || 'overall'); }));
  }

  metrics(values) {
    const list = node('dl', 'qd-metrics');
    values.forEach(([label, value, formatted]) => { const metric = node('div'); metric.append(node('dt', '', label), node('dd', '', formatted ?? count(value))); list.append(metric); });
    return list;
  }

  update({ state = {}, player, mode = 'lobby', map, view = 0, zoom = 1, profile, career, error } = {}) {
    if (this.disposed) return;
    this.mode = mode;
    this.profile = profile ?? career ?? null;
    this.careerError = error;
    const mapId = typeof map === 'string' ? map : map?.id;
    if (mapId && mapId !== this.selectedId && !this.selecting) { this.selectedId = mapId; this.syncSelection(); }
    this.arenaButton.setAttribute('aria-pressed', String(Number(view) === 0));
    if (document.activeElement !== this.camera) this.camera.value = String(view);
    if (document.activeElement !== this.zoom) this.zoom.value = String(Math.min(1.5, Math.max(.7, Number(zoom) || 1)));
    this.syncRecordActions();
    const recap = state.recap;
    const visible = !!state.restartAt && !!recap && Array.isArray(recap.players) && !['lobby', 'connecting'].includes(mode);
    this.recap.hidden = !visible;
    if (this.reviewModal.open && this.previousRound) {
      const note = this.reviewContent.querySelector('.qd-recap-note');
      if (note) note.textContent = this.saveStatus(this.previousRound);
    }
    if (!visible) { this.lastRecap = null; return; }
    const local = (player?.profileId ? recap.players.find(entry => entry.profileId === player.profileId) : null)
      || recap.players.find(entry => entry.id === (typeof player === 'string' ? player : player?.id));
    const data = { recap, local, mode };
    const signature = JSON.stringify([recap.round, recap.mapId, recap.winnerId, local, this.saveStatus(data), this.profile?.level, this.profile?.xp]);
    if (signature !== this.lastRecap) {
      this.lastRecap = signature;
      this.previousRound = JSON.parse(JSON.stringify(data));
      this.reviewButton.hidden = false;
      this.renderRecap(this.recap, data);
    }
    const remaining = Math.max(0, Math.ceil((Number(state.restartAt) || 0) - (Number(state.time) || 0)));
    if ($('next-round')) $('next-round').textContent = remaining ? `Next launch in ${remaining}s` : 'Preparing next round…';
  }

  dispose() {
    if (this.disposed) return;
    this.closeReview(); this.closeLeaderboard(); this.disposed = true; this.request++;
    this.listeners.forEach((remove) => remove());
    this.owned.forEach((element) => element.remove());
    if (!this.skinWasPresent) document.body.classList.remove('qd-interface');
  }
}
