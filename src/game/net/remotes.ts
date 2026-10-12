import { create } from 'zustand'
import { OfflineAdapter, type NetAdapter, type PresenceState } from './presence'

/** Interpolation buffer per remote player (render ~150 ms in the past for smooth motion). */
interface Snap { t: number; x: number; z: number; rot: number; moving: boolean }
interface Remote { state: PresenceState; snaps: Snap[]; lastSeen: number }

export const remotes = new Map<string, Remote>()
export const MAX_VISIBLE_REMOTES = 24
const INTERP_DELAY = 150
const STALE_MS = 15000

/** Only the id list lives in React state, and it changes only on join/leave. */
export const useRemoteIds = create<{ ids: string[] }>(() => ({ ids: [] }))
let adapter: NetAdapter = new OfflineAdapter()
let unsubs: (() => void)[] = []

function syncIds() {
  const ids = [...remotes.keys()]
  const cur = useRemoteIds.getState().ids
  if (ids.length !== cur.length || ids.some((id, i) => id !== cur[i])) useRemoteIds.setState({ ids })
}

export function ingest(states: PresenceState[], selfId: string) {
  const now = performance.now()
  for (const st of states) {
    if (st.id === selfId) continue
    let r = remotes.get(st.id)
    if (!r) {
      r = { state: st, snaps: [], lastSeen: now }
      remotes.set(st.id, r)
    }
    r.state = st
    r.lastSeen = now
    r.snaps.push({ t: now, x: st.x, z: st.z, rot: st.rot, moving: st.moving })
    if (r.snaps.length > 12) r.snaps.splice(0, r.snaps.length - 12)
  }
  syncIds()
}

export function dropRemote(id: string) {
  remotes.delete(id)
  syncIds()
}

/** Interpolated pose for a remote at the current render time. */
export function sampleRemote(id: string, out: { x: number; z: number; rot: number; moving: boolean }): boolean {
  const r = remotes.get(id)
  if (!r || !r.snaps.length) return false
  const t = performance.now() - INTERP_DELAY
  const s = r.snaps
  let a = s[0]
  let b = s[s.length - 1]
  for (let i = 0; i < s.length - 1; i++) if (s[i].t <= t && s[i + 1].t >= t) { a = s[i]; b = s[i + 1]; break }
  const k = b.t === a.t ? 1 : Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))
  out.x = a.x + (b.x - a.x) * k
  out.z = a.z + (b.z - a.z) * k
  out.rot = b.rot
  out.moving = b.moving
  return true
}

export function pruneStale() {
  const now = performance.now()
  let changed = false
  for (const [id, r] of remotes) if (now - r.lastSeen > STALE_MS) { remotes.delete(id); changed = true }
  if (changed) syncIds()
}

export function setNetAdapter(next: NetAdapter, selfId: string) {
  unsubs.forEach((u) => u())
  adapter.disconnect()
  adapter = next
  remotes.clear()
  syncIds()
  unsubs = [next.onPresence((st) => ingest(st, selfId)), next.onLeave(dropRemote)]
  void next.connect(selfId)
}

export const getNetAdapter = () => adapter
