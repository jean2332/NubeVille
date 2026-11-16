import { CheerKind, CloudActor } from '../types/game';

export interface CheerMessage {
  fromId: string;
  fromName: string;
  toId: string;
  kind: CheerKind;
  timestamp: number;
}

export interface StudyRoomTransport {
  sendState(actor: CloudActor): void;
  sendCheer(msg: CheerMessage): void;
  onPeersChange(cb: (peers: CloudActor[]) => void): () => void;
  onCheer(cb: (msg: CheerMessage) => void): () => void;
  disconnect(): void;
}

type WirePayload =
  | { type: 'state'; room: string; actor: CloudActor }
  | { type: 'leave'; room: string; actorId: string }
  | { type: 'cheer'; room: string; msg: CheerMessage };

const LS_FALLBACK_KEY = 'nubeville_sync_event';

/**
 * Tab-to-tab real-time sync using BroadcastChannel + localStorage fallback.
 * Designed behind the StudyRoomTransport interface so a WebSocket backend can drop right in.
 */
export class LocalBroadcastTransport implements StudyRoomTransport {
  private roomCode: string;
  private selfId: string;
  private channel: BroadcastChannel | null = null;
  private peers = new Map<string, CloudActor>();
  private peerListeners = new Set<(peers: CloudActor[]) => void>();
  private cheerListeners = new Set<(msg: CheerMessage) => void>();
  private pruneTimer: number;
  private onStorageBound: (e: StorageEvent) => void;

  constructor(roomCode: string, selfId: string) {
    this.roomCode = roomCode.trim().toUpperCase() || 'NUBE1';
    this.selfId = selfId;

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`nubeville_room_${this.roomCode}`);
      this.channel.onmessage = (ev: MessageEvent<WirePayload>) => {
        this.handlePayload(ev.data);
      };
    }

    this.onStorageBound = (e: StorageEvent) => {
      if (e.key === LS_FALLBACK_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as WirePayload;
          this.handlePayload(parsed);
        } catch {
          // Ignore malformed event
        }
      }
    };
    window.addEventListener('storage', this.onStorageBound);

    this.pruneTimer = window.setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, peer] of this.peers.entries()) {
        if (now - peer.lastUpdated > 7000) {
          this.peers.delete(id);
          changed = true;
        }
      }
      if (changed) this.emitPeers();
    }, 2000);
  }

  private handlePayload(payload: WirePayload) {
    if (!payload || payload.room !== this.roomCode) return;
    if (payload.type === 'state') {
      if (payload.actor.id === this.selfId) return;
      this.peers.set(payload.actor.id, {
        ...payload.actor,
        isRemote: true,
        lastUpdated: Date.now(),
      });
      this.emitPeers();
    } else if (payload.type === 'leave') {
      if (this.peers.delete(payload.actorId)) {
        this.emitPeers();
      }
    } else if (payload.type === 'cheer') {
      this.cheerListeners.forEach((cb) => cb(payload.msg));
    }
  }

  private broadcast(payload: WirePayload) {
    try {
      this.channel?.postMessage(payload);
    } catch {
      // Ignore closed channel
    }
    try {
      localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify({ ...payload, _nonce: Math.random() }));
    } catch {
      // Ignore quota errors
    }
  }

  private emitPeers() {
    const list = Array.from(this.peers.values());
    this.peerListeners.forEach((cb) => cb(list));
  }

  sendState(actor: CloudActor): void {
    this.broadcast({ type: 'state', room: this.roomCode, actor });
  }

  sendCheer(msg: CheerMessage): void {
    this.broadcast({ type: 'cheer', room: this.roomCode, msg });
  }

  onPeersChange(cb: (peers: CloudActor[]) => void): () => void {
    this.peerListeners.add(cb);
    cb(Array.from(this.peers.values()));
    return () => {
      this.peerListeners.delete(cb);
    };
  }

  onCheer(cb: (msg: CheerMessage) => void): () => void {
    this.cheerListeners.add(cb);
    return () => {
      this.cheerListeners.delete(cb);
    };
  }

  disconnect(): void {
    this.broadcast({ type: 'leave', room: this.roomCode, actorId: this.selfId });
    window.clearInterval(this.pruneTimer);
    window.removeEventListener('storage', this.onStorageBound);
    this.channel?.close();
    this.channel = null;
    this.peers.clear();
  }
}
