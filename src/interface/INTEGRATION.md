# Interface integration

Owner: `src/interface/` only. Module exports `Interface` from `Interface.js` and imports `Interface.css`. Instantiate once after existing HTML and button handlers exist. No dependency changes, builds, server restarts, or commits were made by this module builder.

## Exact API

```js
import { Interface } from './interface/Interface';
this.interface = new Interface({
  maps: MAPS, // array or object keyed by ID; entries {id,name,subtitle,theme?}
  onMap: async (mapId) => { /* select/build lobby map, retain selection for practice */ },
  onLeaderboard: async (scope) => {
    // scope === 'overall' or a map ID; overall requests have no map filter.
    // Fetch server-owned history; preserve server ordering.
    return {scope, rows, playerId, profile};
  },
  onPractice: () => this.practice(),
  onOnline: async (scope) => { /* choose scope map if not overall; start online play */ },
  onCamera: (index) => { /* 0 Arena, 1 Chase, 2 Full map, 3 Isometric */ },
  onZoom: (zoom) => { /* numeric range 0.7–1.5 */ },
});
// Call AFTER legacy updateHud, including lobby/connecting updates.
this.interface.update({state: this.state, player: this.predicted,
  mode: this.mode, map: this.map, view: this.renderer.view,
  zoom: this.renderer.zoom});
```

- `setMaps(maps, selectedId?)`: refreshes map cards/tabs, deduplicates map IDs. Labels are always DOM text. `onMap(id)` is invoked once per selection; it may return a promise. Rejection shows retry copy without accepting the new selection. Authoritative map in `update` resynchronizes selection. Parent decides online room map authority; picker copy does not promise online matchmaking uses the selected map.
- `loadLeaderboard(scope = 'overall')`: opens dialog, fetches callback result. New requests and closing the dialog invalidate old responses. Rejection/invalid data shows an error with retry. No fake rows or fallback rankings. Parent may call this method directly.
- `showLeaderboard({scope='overall', rows=[], playerId, profile?})`: public data-fed modal entry point; supersedes in-flight requests. Rows `{id,name,kills,deaths,wins,matches,score}` must already be ordered by score by server. Known `bot:true` rows are excluded defensively; server remains responsible for excluding all bots and showcase data. `playerId` must be the persistent leaderboard ID, not a socket ID. No identity inference by callsign.
- Optional `profile`: **overall career** `{id,name,matches,wins,score,xp,level,last10}` for the browser pilot, independent of selected leaderboard scope. Missing fields display `—`; missing profile says unavailable. UI does not fabricate XP, infer career from a limited leaderboard, write browser history, or claim verified ranked identity. Omit XP if server does not persist it.
- `update({state,player,mode,map,view,zoom,profile,career,error})`: safe with missing arguments. `player` should be the actual `{id,profileId}` player; canonical profileId is matched first, with socket ID fallback. A player ID string also works for practice. `map` may be a map object or ID. During `restartAt`, adds recap beneath original winner/countdown without replacing any ID. `state.recap={round,mapId,winnerId,recordId?,players:[{id,profileId?,name,kills,deaths,damageDealt,shotsFired,shotsHit,score,accuracy,xp}]}`. **Accuracy is percentage 0–100**, not a fraction. If omitted it is calculated as `shotsHit/shotsFired*100`; zero fired yields 0%. State times are seconds on the same simulation clock. Recap is gated on active practice/online mode and restartAt. Legacy host continues to own winner text, `round-panel.hidden`, HUD visibility, and next-round transition; call Interface update after its HUD update. Unavailable metrics display `—`.
- `dispose()`: closes dialog, invalidates async work, removes owned DOM/listeners and scoped body class; existing DOM and original button handlers remain. One live Interface instance per document.

## Required parent hooks / integration request

1. Import/mount above. Supply the four camera indices from the view contract. Invoke update in lobby as well as gameplay, after legacy HUD logic.
2. Native dialogs are `.qd-records:not(.qd-round-review)` (records) and `.qd-round-review` (previous round). On `document` event `qd:interface-modal`, `event.detail.open` is boolean. **Clear held movement/fire on BOTH open and close.** Suppress gameplay input/aim while `document.querySelector('.qd-records[open]')`. Pause offline simulation while open, like the existing flight menu. Online simulation continues. Native modal traps focus; module stops game shortcuts, supports Escape and arrow-key tabs, and restores launch-button focus. This event hook is necessary because the existing Game stores held input separately.
3. Existing `practice`, online/room, help, score, view, sound IDs and handlers are untouched. New onPractice callback is only used by modal's practice button; binding it does not double-fire existing practice button.
4. Keep online ranking persistence in server/rankings. Callback receives a **scope string**, not an options object. Fetch errors should reject; successful empty data should return `rows: []`.
5. Lobby `.arena-caption` is hidden by the module skin because selected map is shown on cards. The native world canvas stays the hero; cards are a bottom strip at desktop dimensions. Compact/mobile windows scroll the lobby, with two card columns on mobile. SVG thumbnails are original environmental diagrams, not accurate navigational maps.

## Verification and handoff

Inspected before implementation: `docs/gauntlet/evidence/baseline-isometric-dusk.png` and read CONTRACT/DIAGNOSIS. No integrated after capture has been inspected. **No visual improvement claim or self-score.** Parent should capture lobby, menu controls, real/empty/error records and a completed-round recap after integration, including narrow viewport. Do not interpret fixture statistics as real rankings.

Run module tests (no server/build):

```sh
node --input-type=module --check < src/interface/Interface.js
node --test src/interface/interface.test.cjs
```

Test uses installed Playwright and Chrome (`CHROME_PATH` supported), mounts the real host HTML plus module source/CSS into an isolated page, and checks existing practice handler, map callback/selection, stale async response protection, XSS-safe names, self row, tab keyboard navigation, loading/error/empty states, Escape/focus return, recap damage/shots/accuracy/XP content, camera/zoom callbacks, responsive lobby overlap/overflow and disposal preserving original IDs. It does not launch a web server or build the application.

Changed paths:
- `src/interface/Interface.js`
- `src/interface/Interface.css`
- `src/interface/interface.test.cjs`
- `src/interface/INTEGRATION.md`


## Round 3 handoff — UX-02/03/04 and SYS-04

Read `docs/gauntlet/critics/r1-ux.md` and `r1-systems.md`. Inspected existing screenshots `docs/gauntlet/critics/r1-ux-touch-mobile-recap.png` and `r1-ux-live-empty-leaderboard.png` before changes. No integrated after-capture claim or self-score.

- Touch/coarse-pointer or <=760px intermission hides combat bar/vitals, touch controls, radar and transient feedback **only while the host round panel and owned recap are visible**. Top bar/menu remains accessible. Recap occupies the viewport below the top bar, scrolls if necessary; normal HUD returns with the next round. All rules are scoped to the Interface skin.
- Empty online records now offer primary **Play online**, only from lobby and only when `onOnline` exists. Parent must wire `onOnline(scope)`; scope is the active records tab (`overall` or exact map ID), not lobby selection. Parent selects arena if applicable and initiates online flow. Callback may return a promise; rejection retains the modal with actionable error, success closes it. Practice is secondary and explicitly excluded from records. No automatic fallback to practice.
- Recap leads with result and score/XP, includes a direct records button for that map, and retains an in-memory copy for **Review previous round** in Flight menu. `showPreviousRound()` and `closeReview()` are public optional methods. Retention lasts for this Interface instance, is not stored as career data, and survives next-round reset. The review dialog emits the same `qd:interface-modal` events and supports Escape/focus restoration. Parent's existing event boolean pauses gameplay; any DOM-based modal check must include **both** dialogs with `.qd-records[open]`.
- `update` consumes `profile` or fallback `career`, plus `error`, which parent already passes. Match recap rows by actual `player.profileId` first and then `player.id`, preserving practice behavior and reconnect identity. No score/career credit is written by UI.
- Career now renders up to ten actual `profile.last10` entries, in supplied newest-first order. Shape matches current RankingStore: `{id,mapId,wins,score,xp,kills,deaths,damageDealt,shotsFired,shotsHit,accuracy,endedAt?}`. Each accessible disclosure exposes its combat statistics. No timestamps are guessed and no history rows are synthesized.
- Level comes only from authoritative `profile.level`; progress uses the current RankingStore XP thresholds `250*(level-1)^2` to `250*level^2` and authoritative `profile.xp`. Missing level/XP omits progression; inconsistent XP hides the meter. No locally awarded XP or inferred level. If server progression formula changes, update this presentation calculation too.
- **Save confirmation hook:** existing simulation recap has no persistent record ID. Default online copy says “Save not yet confirmed. Check Pilot records.” To show confirmed save, parent can supply exact `state.recap.recordId` (or `id`) equal to the server record ID in `profile.last10`, with matching `profile.id === local.profileId`. Until this exact match exists, no saved claim is made. `error` takes precedence and reports unconfirmed save/unavailable records. Do not match by score/XP/map or round number; these are not unique. Practice always remains excluded.

Validation: syntax check passes; `node --test src/interface/interface.test.cjs` passes **2 tests**, zero captured page errors. Added targeted checks cover true touch 390×844 recap bounds/hidden HUD and restoration, canonical ID precedence over a conflicting socket ID, retained previous-round review/focus return, map-specific online callback and rejection retry, actual last10 detail rows, authoritative level/progress, absent-level omission, and unconfirmed/confirmed/error save states. Original async/error/empty/XSS/controls/lifecycle regression remains passing. Tests mount source in isolated browser pages with fixture data; they are not integrated gameplay screenshots or persisted production records.


## Camera simplification handoff

Flight menu now offers one immediate **Arena (recommended)** action (`onCamera(0)`). Camera selection and zoom are inside a native, initially collapsed **Advanced camera views** disclosure. Existing IDs/ranges remain unchanged: `qd-camera` values `0` Arena (recommended), `1` Chase, `2` Full map, `3` Isometric; `qd-zoom` 0.7–1.5. Selecting Arena does not reset zoom. Parent owns camera geometry and the V Arena/Full map toggle. Browser flows targeting legacy views must open `.qd-advanced-camera` via its summary before selecting `#qd-camera`. Module tests assert collapsed default, exact option labels, advanced selection and Arena callback.
