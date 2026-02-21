import { MultiplayerManager } from '../src/multiplayer/MultiplayerManager.js';

class StorageMock {
  constructor(windowRef) {
    this.windowRef = windowRef;
    this.values = new Map();
  }

  get length() {
    return this.values.size;
  }

  key(index) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    const stringValue = String(value);
    const oldValue = this.values.has(key) ? this.values.get(key) : null;
    this.values.set(key, stringValue);
    this.windowRef?.emitStorageEvent(key, oldValue, stringValue);
  }

  removeItem(key) {
    const oldValue = this.values.has(key) ? this.values.get(key) : null;
    this.values.delete(key);
    this.windowRef?.emitStorageEvent(key, oldValue, null);
  }

  clear() {
    for (const key of Array.from(this.values.keys())) {
      this.removeItem(key);
    }
  }
}

class WindowMock {
  constructor() {
    this.listeners = new Map();
    this.localStorage = new StorageMock(this);
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(handler);
  }

  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }

  emitStorageEvent(key, oldValue, newValue) {
    const handlers = this.listeners.get('storage');
    if (!handlers) return;
    const event = {
      type: 'storage',
      key,
      oldValue,
      newValue,
      storageArea: this.localStorage,
      url: 'http://localhost/'
    };
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Storage listener error', error);
      }
    }
  }
}

class PolyfilledBroadcastChannel {
  static channels = new Map();

  constructor(name) {
    this.name = name;
    this.listeners = new Set();
    if (!PolyfilledBroadcastChannel.channels.has(name)) {
      PolyfilledBroadcastChannel.channels.set(name, new Set());
    }
    PolyfilledBroadcastChannel.channels.get(name).add(this);
  }

  addEventListener(type, handler) {
    if (type === 'message') {
      this.listeners.add(handler);
    }
  }

  removeEventListener(type, handler) {
    if (type === 'message') {
      this.listeners.delete(handler);
    }
  }

  postMessage(data) {
    const peers = PolyfilledBroadcastChannel.channels.get(this.name);
    if (!peers) return;
    for (const peer of peers) {
      if (peer === this) continue;
      for (const listener of peer.listeners) {
        listener({ data });
      }
    }
  }

  close() {
    const peers = PolyfilledBroadcastChannel.channels.get(this.name);
    if (!peers) return;
    peers.delete(this);
    if (peers.size === 0) {
      PolyfilledBroadcastChannel.channels.delete(this.name);
    }
  }
}

function setupPolyfills() {
  const windowInstance = new WindowMock();
  globalThis.window = windowInstance;
  globalThis.localStorage = windowInstance.localStorage;
  globalThis.BroadcastChannel = PolyfilledBroadcastChannel;
  if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = { randomUUID: () => `player-${Date.now()}-${Math.floor(Math.random() * 10000)}` };
  }
}

const TEST_CHANNEL = 'quantum-drift-automated-test';

const createStateProvider = (offset, weapon, health) => () => ({
  position: {
    x: offset + Math.sin(Date.now() * 0.002) * 1.5,
    y: 0,
    z: Math.cos(Date.now() * 0.002) * 1.5
  },
  rotation: (Date.now() * 0.0007) % (Math.PI * 2),
  weapon,
  energy: 90,
  health,
  timestamp: Date.now()
});

function createManagers() {
  return [
    new MultiplayerManager({
      id: 'mock-alpha',
      channelName: TEST_CHANNEL,
      broadcastInterval: 120,
      getState: createStateProvider(-2, 'LASER', 85),
      onRemoteUpdate: () => {},
      onStatusChange: (status) => console.log('[alpha] status', status.status)
    }),
    new MultiplayerManager({
      id: 'mock-beta',
      channelName: TEST_CHANNEL,
      broadcastInterval: 120,
      getState: createStateProvider(2, 'BOUNCE', 76),
      onRemoteUpdate: () => {},
      onStatusChange: (status) => console.log('[beta] status', status.status)
    })
  ];
}

async function waitForHandshake(managers, timeout = 10000, interval = 60) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    managers.forEach((manager) => manager.update());
    const allSynced = managers.every((manager) =>
      manager.getRemotePlayers().some((player) => player.id !== manager.id)
    );
    if (allSynced) {
      return Date.now() - start;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for multiplayer handshake');
}

async function main() {
  setupPolyfills();
  const managers = createManagers();
  managers.forEach((manager) => manager.start());

  try {
    const took = await waitForHandshake(managers);
    console.log(`✅ Multiplayer handshake detected after ${took}ms`);
  } finally {
    managers.forEach((manager) => manager.stop());
  }
}

main().catch((error) => {
  console.error('⚠️ Multiplayer check failed:', error);
  process.exit(1);
});
