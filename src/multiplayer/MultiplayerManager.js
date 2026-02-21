const DEFAULT_CHANNEL = 'quantum-drift-broadcast';

export class MultiplayerManager {
  constructor(options = {}) {
    this.channelName = options.channelName || DEFAULT_CHANNEL;
    this.storageKey = `${this.channelName}-state`;
    this.getState = options.getState || (() => null);
    this.onRemoteUpdate = options.onRemoteUpdate || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.broadcastInterval = options.broadcastInterval || 500;
    this.stateTTL = options.stateTTL || 8000;
    this.id = options.id || this.generateId();
    this.lastBroadcast = 0;
    this.remotePlayers = new Map();
    this.isRunning = false;
    this.connectionStatus = 'initializing';
    this.channel = null;
    this.storageAvailable = this.checkStorageAvailability();
    this.lastUpdate = null;

    this.handleChannelMessage = this.handleChannelMessage.bind(this);
    this.handleStorageEvent = this.handleStorageEvent.bind(this);
  }

  generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `player-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.addEventListener('message', this.handleChannelMessage);
        this.connectionStatus = 'connected';
      } catch (error) {
        console.warn('MultiplayerManager: BroadcastChannel unavailable, falling back to local storage.', error);
        this.channel = null;
        this.connectionStatus = this.storageAvailable ? 'local' : 'unsupported';
      }
    } else {
      this.channel = null;
      this.connectionStatus = this.storageAvailable ? 'local' : 'unsupported';
    }

    if (this.storageAvailable) {
      window.addEventListener('storage', this.handleStorageEvent);
    }

    this.broadcastState();
    this.notifyStatus();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.channel) {
      this.channel.removeEventListener('message', this.handleChannelMessage);
      this.channel.close();
      this.channel = null;
    }

    if (this.storageAvailable) {
      window.removeEventListener('storage', this.handleStorageEvent);
    }

    this.connectionStatus = 'disconnected';
    this.notifyStatus();
  }

  update() {
    if (!this.isRunning) return;

    const now = Date.now();
    if (now - this.lastBroadcast >= this.broadcastInterval) {
      this.broadcastState();
      this.lastBroadcast = now;
    }

    this.cleanupStale(now);
  }

  broadcastState() {
    const rawState = this.getState();
    if (!rawState) return;

    const payload = {
      id: this.id,
      ...this.sanitizeState(rawState)
    };

    if (this.channel) {
      this.channel.postMessage(payload);
    }

    if (this.storageAvailable) {
      try {
        window.localStorage.setItem(this.storageKey, JSON.stringify(payload));
      } catch (error) {
        console.warn('MultiplayerManager: unable to write to localStorage.', error);
      }
    }
  }

  handleChannelMessage(event) {
    this.handleRemoteData(event.data);
  }

  handleStorageEvent(event) {
    if (!event || event.key !== this.storageKey || !event.newValue) return;

    try {
      const data = JSON.parse(event.newValue);
      this.handleRemoteData(data);
    } catch (error) {
      console.warn('MultiplayerManager: failed to parse storage event', error);
    }
  }

  handleRemoteData(data) {
    if (!data || data.id === this.id) return;

    const timestamp = Date.now();
    this.remotePlayers.set(data.id, {
      ...this.sanitizeState(data),
      id: data.id,
      lastSeen: timestamp
    });

    this.lastUpdate = timestamp;
    this.emitRemoteUpdate();
  }

  sanitizeState(state = {}) {
    const position = state.position || { x: 0, y: 0, z: 0 };
    return {
      position: {
        x: Number(position.x) || 0,
        y: Number(position.y) || 0,
        z: Number(position.z) || 0
      },
      rotation: Number(state.rotation) || 0,
      weapon: typeof state.weapon === 'string' ? state.weapon : 'LASER',
      energy: typeof state.energy === 'number' ? state.energy : null,
      health: typeof state.health === 'number' ? state.health : null,
      timestamp: Number(state.timestamp) || Date.now()
    };
  }

  cleanupStale(now = Date.now()) {
    let removed = false;
    for (const [id, record] of this.remotePlayers) {
      if (now - record.lastSeen > this.stateTTL) {
        this.remotePlayers.delete(id);
        removed = true;
      }
    }

    if (removed) {
      this.lastUpdate = now;
      this.emitRemoteUpdate();
    }
  }

  emitRemoteUpdate() {
    const players = this.getRemotePlayers();
    this.onRemoteUpdate(players);
    this.notifyStatus();
  }

  notifyStatus() {
    const players = this.getRemotePlayers();
    this.onStatusChange({
      status: this.connectionStatus,
      remoteCount: players.length,
      remotePlayers: players,
      lastUpdate: this.lastUpdate
    });
  }

  getRemotePlayers() {
    return Array.from(this.remotePlayers.values());
  }

  checkStorageAvailability() {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return false;
    }

    try {
      const key = `_${this.storageKey}`;
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }
}
