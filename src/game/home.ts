import { FURNITURE, HOMES, UPGRADES, isBed } from './content'
import type { FurnitureType, HomeTier, OwnedFurniture } from './types'

export interface HomeItem {
  id: number // owned uid (>0) or fixture id (<0)
  type: FurnitureType
  x: number
  y: number
  rot: 0 | 1
  fixture: boolean
}

export function footprint(type: FurnitureType, rot: 0 | 1): { w: number; d: number } {
  const f = FURNITURE[type]
  return rot === 0 ? { w: f.w, d: f.d } : { w: f.d, d: f.w }
}

/** Room extension upgrade ids, in the order they must be bought. */
export const EXTENSIONS = ['extend1', 'extend2', 'extend3', 'extend4'] as const
/** Number of room extensions bought for a home. */
export const extCount = (upgrades: string[] = []) => EXTENSIONS.filter((e) => upgrades.includes(e)).length

/** Only homes you own (bought, or the house you built) can be extended. */
export function canExtend(s: { owned: HomeTier[]; housing: { tier: HomeTier } }): boolean {
  return s.housing.tier === 'house' || s.owned.includes(s.housing.tier)
}

/** Per-home look and moved built-in furniture (paint colours, fixture positions). */
export interface FixturePos {
  x: number
  y: number
  rot: 0 | 1
}
export interface HomeStyle {
  wall?: string
  floor?: string
  /** Built-in fixtures moved by the player, keyed by fixture index. */
  fixtures?: Record<string, FixturePos>
}
export type HomeStyleMap = Partial<Record<HomeTier, HomeStyle>>
/** Mirror of the store's homeStyle so layout helpers can see moved fixtures (kept in sync by the store). */
export const homeRuntime: { style: HomeStyleMap } = { style: {} }

export const PAINTS: { name: string; wall: string; floor: string }[] = [
  { name: 'Cream', wall: '#f6efe2', floor: '#e6dfd2' },
  { name: 'Sky blue', wall: '#cfe4f4', floor: '#e8eef2' },
  { name: 'Mint', wall: '#d4eedf', floor: '#e4e9e2' },
  { name: 'Kente gold', wall: '#f6dd8f', floor: '#d9c7a6' },
  { name: 'Terracotta', wall: '#e8b39a', floor: '#c9a27a' },
  { name: 'Lavender', wall: '#e2d6f2', floor: '#ece6ef' },
]
/** Room size and door after extensions (+2 columns and +1 row each). */
export function homeLayout(tier: HomeTier, ext = 0) {
  const h = HOMES[tier]
  return { w: h.grid.w + 2 * ext, d: h.grid.d + ext, door: { x: h.door.x, y: h.door.y + ext } }
}

export function itemsInHome(tier: HomeTier, inventory: OwnedFurniture[]): HomeItem[] {
  const home = HOMES[tier]
  const moved = homeRuntime.style[tier]?.fixtures ?? {}
  const out: HomeItem[] = home.fixtures.map((f, i) => {
    const m = moved[String(i)]
    return { id: -(i + 1), type: f.type, x: m ? m.x : f.x, y: m ? m.y : f.y, rot: m ? m.rot : f.rot, fixture: true }
  })
  for (const o of inventory) if (o.placed) out.push({ id: o.uid, type: o.type, x: o.placed.x, y: o.placed.y, rot: o.placed.rot, fixture: false })
  return out
}

export function canPlace(
  tier: HomeTier,
  inventory: OwnedFurniture[],
  type: FurnitureType,
  x: number,
  y: number,
  rot: 0 | 1,
  ignoreUid?: number,
  ext = 0,
): { ok: boolean; reason?: string } {
  const home = homeLayout(tier, ext)
  const { w, d } = footprint(type, rot)
  if (x < 0 || y < 0 || x + w > home.w || y + d > home.d) return { ok: false, reason: 'Outside the room' }
  if (home.door.x >= x && home.door.x < x + w && home.door.y >= y && home.door.y < y + d) return { ok: false, reason: 'Keep the doorway clear' }
  for (const it of itemsInHome(tier, inventory)) {
    if (it.id === ignoreUid) continue
    const fp = footprint(it.type, it.rot)
    if (x < it.x + fp.w && x + w > it.x && y < it.y + fp.d && y + d > it.y) return { ok: false, reason: 'Something is in the way' }
  }
  return { ok: true }
}

export function autoPlace(tier: HomeTier, inventory: OwnedFurniture[], type: FurnitureType, uid: number, ext = 0): { x: number; y: number; rot: 0 | 1 } | null {
  const home = homeLayout(tier, ext)
  for (const rot of [0, 1] as const)
    for (let y = 0; y < home.d; y++)
      for (let x = 0; x < home.w; x++) if (canPlace(tier, inventory, type, x, y, rot, uid, ext).ok) return { x, y, rot }
  return null
}

export function comfortOf(tier: HomeTier, inventory: OwnedFurniture[], upgrades: string[] = []): number {
  let c = HOMES[tier].comfort
  for (const u of UPGRADES) if (upgrades.includes(u.id)) c += u.comfort
  for (const it of itemsInHome(tier, inventory)) c += FURNITURE[it.type].comfort
  return c
}

/** Sleep quality multiplier for a given bed in the current home. */
export function sleepMultiplier(tier: HomeTier, inventory: OwnedFurniture[], bedType: FurnitureType, upgrades: string[] = []): number {
  const base = FURNITURE[bedType].sleepMult ?? 0.85
  const comfort = Math.min(45, comfortOf(tier, inventory, upgrades))
  return base * (1 + comfort / 100)
}

export { isBed }
