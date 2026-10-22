import { BALANCE } from './config'

/**
 * The shared world clock. Every player derives the same game time from the server's clock:
 * Day 1 08:00 began at BALANCE.worldEpoch and time runs at clockMinutesPerSecond for everyone.
 * Nothing can pause or skip it.
 */
let offset = 0 // server ms − local ms
let synced = false

export const serverNow = () => Date.now() + offset
export const clockSynced = () => synced

/** Game minutes on the shared clock at a server timestamp (default: now). */
export function worldMinutes(ms = serverNow()): number {
  return BALANCE.startMinute + ((ms - BALANCE.worldEpoch) / 1000) * BALANCE.clockMinutesPerSecond
}

/** Estimates the server clock offset (best of a few round trips). Falls back to the local clock. */
export async function syncClock(): Promise<void> {
  let best = Infinity
  for (let i = 0; i < 3; i++) {
    try {
      const t0 = Date.now()
      const res = await fetch('/api/time', { cache: 'no-store' })
      const { now } = (await res.json()) as { now: number }
      const t1 = Date.now()
      if (t1 - t0 < best) {
        best = t1 - t0
        offset = now - (t0 + t1) / 2
      }
    } catch {
      break
    }
  }
  synced = best < Infinity
}
