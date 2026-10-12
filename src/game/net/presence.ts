import type { Appearance } from '../types'

/** What each player shares with others (kept small: sent ~5 times a second). */
export interface PresenceState {
  id: string
  name: string
  appearance: Appearance
  x: number
  z: number
  rot: number
  moving: boolean
  action?: string | null
  view: 'world' | 'home' | 'inside'
  place?: string | null
  ts: number
}

/**
 * Transport-agnostic multiplayer adapter. The game only talks to this interface,
 * so Ably (or any realtime service) can be plugged in without touching gameplay code.
 * Money, inventory, purchases and rewards must never be trusted from presence data:
 * they belong on an authoritative server.
 */
export interface NetAdapter {
  readonly online: boolean
  connect(selfId: string): Promise<void>
  publish(state: PresenceState): void
  onPresence(cb: (states: PresenceState[]) => void): () => void
  onLeave(cb: (id: string) => void): () => void
  disconnect(): void
}

/** Default: single-player. Nothing is sent and no fake players are shown. */
export class OfflineAdapter implements NetAdapter {
  readonly online = false
  async connect() {}
  publish() {}
  onPresence() { return () => {} }
  onLeave() { return () => {} }
  disconnect() {}
}

/** Minimal shape of an Ably-style realtime client (matches `new Ably.Realtime(...)`). */
export interface RealtimeLike {
  channels: {
    get(name: string): {
      presence: {
        enter(data: unknown): Promise<void> | void
        update(data: unknown): Promise<void> | void
        leave(): Promise<void> | void
        subscribe(event: string | string[], cb: (msg: { clientId: string; data: unknown; action?: string }) => void): void
        unsubscribe(): void
      }
    }
  }
  close(): void
}

/**
 * Adapter for an Ably-compatible client. Usage later:
 *   const client = new Ably.Realtime({ authUrl: '/api/ably-token', clientId })
 *   setNetAdapter(new RealtimeAdapter(client, 'accra:presence'))
 * Presence updates are throttled by the caller (see startPresenceLoop).
 */
export class RealtimeAdapter implements NetAdapter {
  online = false
  private presenceCbs = new Set<(s: PresenceState[]) => void>()
  private leaveCbs = new Set<(id: string) => void>()
  private entered = false
  constructor(private client: RealtimeLike, private channelName: string) {}
  private get ch() {
    return this.client.channels.get(this.channelName)
  }
  async connect() {
    this.ch.presence.subscribe(['enter', 'update', 'present'], (m) => {
      const st = m.data as PresenceState
      if (st && typeof st.x === 'number') this.presenceCbs.forEach((cb) => cb([st]))
    })
    this.ch.presence.subscribe('leave', (m) => this.leaveCbs.forEach((cb) => cb(m.clientId)))
    this.online = true
  }
  publish(state: PresenceState) {
    if (!this.online) return
    if (!this.entered) {
      this.entered = true
      void this.ch.presence.enter(state)
    } else void this.ch.presence.update(state)
  }
  onPresence(cb: (s: PresenceState[]) => void) {
    this.presenceCbs.add(cb)
    return () => this.presenceCbs.delete(cb)
  }
  onLeave(cb: (id: string) => void) {
    this.leaveCbs.add(cb)
    return () => this.leaveCbs.delete(cb)
  }
  disconnect() {
    void this.ch.presence.leave()
    this.ch.presence.unsubscribe()
    this.client.close()
    this.online = false
  }
}
