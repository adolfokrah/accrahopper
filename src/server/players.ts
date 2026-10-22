import { query } from './db'

export interface PlayerInfo { id: string; username: string; name: string }

/** Account + character name (from the cloud save) for a set of players. */
export async function playerInfo(ids: string[]): Promise<Record<string, PlayerInfo>> {
  if (!ids.length) return {}
  const rows = await query<PlayerInfo>(
    `select u.id, coalesce(u."displayUsername", u.username, u.name) as username,
            coalesce(s.data->'game'->'profile'->>'name', u.name) as name
     from "user" u left join saves s on s.user_id = u.id where u.id = any($1)`,
    [ids],
  )
  return Object.fromEntries(rows.map((r) => [r.id, r]))
}

/** Simple per-instance rate limit: at most `max` calls per `ms` per key. */
const hits = new Map<string, number[]>()
export function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < ms)
  recent.push(now)
  hits.set(key, recent)
  return recent.length > max
}
