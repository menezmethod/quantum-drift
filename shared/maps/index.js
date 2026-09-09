// Pure data shared by authoritative physics and browser rendering. No simulation
// imports: the simulation can safely import this registry without a require cycle.
const classic = require('./classic');
const junction = require('./junction');
const box = (x, z, w, d, h, color, role) => ({ type: 'box', x, z, w, d, h, color, role });
const cylinder = (x, z, r, h, color, role) => ({ type: 'cylinder', x, z, r, h, color, role });
const district = (id, name, x, z, w, d, color) => ({ id, name, x, z, w, d, color });
const spawns = (edge, side) => [
  { x: -edge, z: -edge }, { x: edge, z: edge },
  { x: -edge, z: edge }, { x: edge, z: -edge },
  { x: 0, z: -side }, { x: 0, z: side },
  { x: -side, z: 0 }, { x: side, z: 0 },
];

const foundry = {
  id: 'foundry', name: 'Foundry', subtitle: 'Orbital forge · ring routes & close cover',
  theme: 'foundry', size: 30,
  palette: { floor: '#18232b', cover: '#53616a', accent: '#ff9b4a', background: '#090f18' },
  obstacles: [
    box(0, 0, 8, 8, 4.5, '#66594e', 'forge'),
    ...[-1, 1].flatMap(z => [-1, 1].map(x => box(x * 8, z * 12, 8, 4, 2.6, '#53616a', 'heat-exchanger'))),
    ...[-1, 1].flatMap(x => [-1, 1].map(z => box(x * 20, z * 7, 4, 8, 3.2, '#53616a', 'conduit'))),
  ],
  districts: [
    district('forge-ring', 'Forge ring', 0, 0, 32, 18, '#303334'),
    district('north-gantry', 'North gantry', 0, -22, 40, 6, '#34302a'),
    district('south-gantry', 'South gantry', 0, 22, 40, 6, '#34302a'),
  ],
  props: [
    { kind: 'furnace-stack', x: -35, z: -18, w: 5, d: 7, h: 15 },
    { kind: 'furnace-stack', x: 35, z: 18, w: 5, d: 7, h: 15 },
  ],
  spawnPoints: spawns(24, 24),
};

const canopy = {
  id: 'canopy', name: 'Canopy', subtitle: 'Research garden · open court & sheltered flanks',
  theme: 'canopy', size: 30,
  palette: { floor: '#1b302d', cover: '#607d6c', accent: '#c1de86', background: '#0b191b' },
  obstacles: [
    ...[-1, 1].flatMap(x => [-1, 1].map(z => box(x * 12, z * 7, 4, 6, 2.2, '#607d6c', 'planter'))),
    ...[-1, 1].flatMap(z => [-1, 1].map(x => cylinder(x * 6, z * 18, 2.5, 3.4, '#78917a', 'growth-vat'))),
    cylinder(-22, 0, 2.5, 3, '#607d6c', 'root-vat'),
    cylinder(22, 0, 2.5, 3, '#607d6c', 'root-vat'),
  ],
  districts: [
    district('court', 'Specimen court', 0, 0, 16, 24, '#354637'),
    district('west-garden', 'West garden', -18, 0, 5, 34, '#273c32'),
    district('east-garden', 'East garden', 18, 0, 5, 34, '#273c32'),
  ],
  props: [
    { kind: 'research-dome', x: -37, z: 12, w: 10, d: 12, h: 9 },
    { kind: 'research-dome', x: 37, z: -12, w: 10, d: 12, h: 9 },
  ],
  spawnPoints: spawns(24, 27),
};

const glacier = {
  id: 'glacier', name: 'Glacier', subtitle: 'Polar relay · long sightlines & crossfire',
  theme: 'glacier', size: 32,
  palette: { floor: '#293b4c', cover: '#95b4c4', accent: '#7edbea', background: '#0c1728' },
  obstacles: [
    ...[-1, 1].flatMap(x => [-1, 1].map(z => box(x * 11, z * 10, 10, 3, 2.7, '#95b4c4', 'ice-baffle'))),
    ...[-1, 1].flatMap(x => [-1, 1].map(z => box(x * 20, z * 19, 4, 5, 3.8, '#708c9e', 'relay-housing'))),
    cylinder(-23, 0, 2, 4, '#708c9e', 'relay-pylon'),
    cylinder(23, 0, 2, 4, '#708c9e', 'relay-pylon'),
  ],
  districts: [
    district('relay-axis', 'Relay axis', 0, 0, 8, 56, '#354d60'),
    district('crossing', 'Whiteout crossing', 0, 0, 40, 10, '#40576a'),
    district('north-apron', 'North apron', 0, -26, 48, 5, '#354d60'),
    district('south-apron', 'South apron', 0, 26, 48, 5, '#354d60'),
  ],
  props: [
    { kind: 'relay-dish', x: 0, z: -40, w: 12, d: 10, h: 14 },
    { kind: 'relay-dish', x: 0, z: 40, w: 12, d: 10, h: 14 },
  ],
  spawnPoints: spawns(26, 28),
};

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const mapsById = freeze({ foundry, canopy, glacier, classic, junction });
const MAPS = Object.freeze([foundry, canopy, glacier, classic, junction]);
const MAP_ROTATION = Object.freeze(['foundry', 'canopy', 'glacier', 'classic']);

// Old replay/map IDs continue to resolve. Unknown network input has a stable
// fallback; inherited Object keys must never resolve to non-map objects.
function getMap(id) {
  if (id === 'quantum-arena-v1') return classic;
  return typeof id === 'string' && Object.hasOwn(mapsById, id) ? mapsById[id] : foundry;
}

module.exports = { MAPS, getMap, MAP_ROTATION };
