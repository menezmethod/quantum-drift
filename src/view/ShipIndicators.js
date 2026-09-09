import { Vector3 } from 'three';
import './indicators.css';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const intersects = (a, b) => a.left < b.right + 5 && a.right > b.left - 5 && a.top < b.bottom + 5 && a.bottom > b.top - 5;
const HUD_SELECTOR = '[data-ship-indicator-obstacle], .top-bar, .radar, .vitals, .weapons, .flight-tools, .flight-hint, #kill-feed, #notice, .center-message, #touch-controls';

export function hullState(player, time = 0) {
  const max = Number.isFinite(player.maxHealth) && player.maxHealth > 0 ? player.maxHealth : 100;
  const percent = Math.round(clamp(Number.isFinite(player.health) ? player.health / max * 100 : 0, 0, 100));
  return { percent, protected: Number.isFinite(player.protectedUntil) && player.protectedUntil > time };
}

/** Mount in a positioned overlay matching the renderer's CSS viewport. */
export class ShipIndicators {
  constructor(container) {
    this.document = container.ownerDocument;
    this.root = this.document.createElement('div');
    this.root.className = 'qd-ship-indicators';
    this.root.setAttribute('aria-label', 'Pilot hull and protection');
    container.appendChild(this.root);
    this.entries = new Map();
    this.point = new Vector3();
    this.disposed = false;
  }
  create(id) {
    const node = this.document.createElement('div');
    node.className = 'qd-ship-indicator';
    const name = this.document.createElement('div');
    name.className = 'qd-pilot-name';
    const hull = this.document.createElement('div');
    hull.className = 'qd-pilot-hull';
    const track = this.document.createElement('span');
    track.className = 'qd-hull-track';
    const segments = Array.from({ length: 10 }, () => {
      const segment = this.document.createElement('i');
      track.appendChild(segment);
      return segment;
    });
    const value = this.document.createElement('span');
    value.className = 'qd-hull-value';
    hull.append(track, value);
    const shield = this.document.createElement('div');
    shield.className = 'qd-protection';
    shield.textContent = '⬡ PROTECTED';
    node.append(name, hull, shield);
    this.root.appendChild(node);
    const entry = { node, name, value, segments, shield };
    this.entries.set(id, entry);
    return entry;
  }
  update({ players = [], localId, camera, width, height, time = 0, aim } = {}) {
    if (this.disposed) return;
    const valid = camera && width > 0 && height > 0;
    this.root.hidden = !valid;
    if (!valid) return;
    camera.updateMatrixWorld();
    const origin = this.root.getBoundingClientRect();
    const obstacles = Array.from(this.document.querySelectorAll(HUD_SELECTOR)).filter(el => el.getClientRects().length && !el.hidden).map(el => {
      const r = el.getBoundingClientRect();
      return { left: r.left - origin.left, right: r.right - origin.left, top: r.top - origin.top, bottom: r.bottom - origin.top };
    });
    if(aim){
      this.point.set(aim.x,.9,aim.z).project(camera);
      const x=(this.point.x+1)*width/2,y=(1-this.point.y)*height/2;
      obstacles.push({left:x-24,right:x+24,top:y-24,bottom:y+24});
    }
    const present = new Set();
    const occupied = [];
    // Local pilot always has first choice when ships overlap.
    const ordered = [...players].sort((a, b) => Number(b.id === localId) - Number(a.id === localId) || String(a.id).localeCompare(String(b.id)));
    for (const p of ordered) {
      if (!p.alive) continue;
      present.add(p.id);
      const entry = this.entries.get(p.id) || this.create(p.id);
      const { node, name, value, segments, shield } = entry;
      const position = p.renderPosition || p;
      this.point.set(position.x, Number.isFinite(position.y) ? position.y + 1.15 : 2.05, position.z).project(camera);
      node.hidden = !Number.isFinite(this.point.x) || !Number.isFinite(this.point.y) || this.point.z < -1 || this.point.z > 1 || Math.abs(this.point.x) > 1 || Math.abs(this.point.y) > 1;
      if (node.hidden) continue;
      const state = hullState(p, time);
      name.textContent = `${p.id === localId ? 'YOU · ' : ''}${String(p.name || 'Pilot')}`;
      value.textContent = `${state.percent}%`;
      node.dataset.condition = state.percent <= 25 ? 'critical' : state.percent <= 50 ? 'damaged' : 'healthy';
      node.dataset.local = String(p.id === localId);
      shield.hidden = !state.protected;
      node.setAttribute('aria-label', `${name.textContent}, hull ${state.percent} percent${state.protected ? ', protected' : ''}`);
      segments.forEach((segment, i) => segment.style.setProperty('--fill', `${clamp(state.percent - i * 10, 0, 10) * 10}%`));
      const anchorX = (this.point.x + 1) * width / 2;
      const anchorY = (1 - this.point.y) * height / 2;
      const compact=width<600;
      const cardWidth = compact?104:128, cardHeight = state.protected ? (compact?47:53) : (compact?33:37);
      let placement;
      // Keep each label close to its ship; suppress if every slot is obstructed.
      // All slots stay above the projected anchor to preserve the forward reticle.
      for (const [dx, dy] of [[0, 0], [-72, -10], [72, -10], [0, -44], [-96, -44], [96, -44]]) {
        const left = clamp(anchorX - cardWidth / 2 + dx, 8, Math.max(8, width - cardWidth - 8));
        const top = anchorY - cardHeight - 10 + dy;
        const rect = { left, right: left + cardWidth, top, bottom: top + cardHeight };
        if (top < 76 || rect.bottom > height - 20 || obstacles.some(r => intersects(rect, r)) || occupied.some(r => intersects(rect, r))) continue;
        placement = rect;
        break;
      }
      node.hidden = !placement;
      if (!placement) continue;
      occupied.push(placement);
      node.style.transform = `translate3d(${Math.round(placement.left)}px, ${Math.round(placement.top)}px, 0)`;
      const stemX = clamp(anchorX - placement.left, 5, cardWidth - 5);
      const dx = anchorX - placement.left - stemX;
      const dy = anchorY - placement.bottom - 3;
      node.style.setProperty('--anchor', `${stemX}px`);
      node.style.setProperty('--stem-length', `${Math.hypot(dx, dy)}px`);
      node.style.setProperty('--stem-angle', `${Math.atan2(dy, dx)}rad`);
    }
    for (const [id, entry] of this.entries) if (!present.has(id)) {
      entry.node.remove();
      this.entries.delete(id);
    }
  }
  dispose() { this.root.remove(); this.entries.clear(); this.disposed = true; }
}
export default ShipIndicators;
