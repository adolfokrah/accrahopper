import { AREAS, DESTINATIONS, LAGOON, MAP_H, MAP_W, OX, OZ, ROAD_CLASS, coastZ, STREET_GAP, STREET_START, STREET_W, areaAt, isInnerRoad, mapXf, streetSpan, unmapX, type AreaStyle, type RoadClass } from './content'
import type { DistrictId } from './types'

export { MAP_W, MAP_H, STREET_W }

export const G = { GRASS: 0, ROAD: 1, SIDEWALK: 2, PLAZA: 3, BOARDWALK: 4, SAND: 5, WATER: 6, DIRT: 7, FOREST: 8, CONCRETE: 9 } as const

/** The Gulf of Guinea coastline (z of the waterline) at a given x (shape kept from the original layout). */
export { coastZ }
const inLagoon = (x: number, z: number) => ((x - LAGOON.x) / LAGOON.r) ** 2 + ((z - LAGOON.z) / LAGOON.r) ** 2 < 1

export const V_STREETS: number[] = []
for (let x = STREET_START; x < MAP_W - 1; x += STREET_GAP) V_STREETS.push(x)
export const H_STREETS: number[] = []
for (let z = STREET_START; z < MAP_H - 1; z += STREET_GAP) H_STREETS.push(z)

/** Every street is 4 tiles wide (two lanes each way, right-hand traffic).
 *  Highways get a concrete median: street origin -> [first, last] tile. */
export const vSpan = (r: number): [number, number] => streetSpan('v', r)
export const hSpan = (r: number): [number, number] => streetSpan('h', r)
/** Motorways and highways: street origin -> [first, last] tile (concrete median, billboards, footbridges). */
const big = (axis: 'h' | 'v') => Object.fromEntries(Object.entries(ROAD_CLASS[axis]).filter(([, c]) => c === 'motorway' || c === 'highway').map(([r]) => [r, streetSpan(axis, +r)])) as Record<number, [number, number]>
export const HIGHWAYS = { v: big('v'), h: big('h') }
/** Width in tiles of the street whose first tile is `lo` ('x' = an east-west street). */
const WIDTH_H = new Map<number, number>()
const WIDTH_V = new Map<number, number>()
for (const r of H_STREETS) { const [a, b] = hSpan(r); WIDTH_H.set(a, b - a + 1) }
for (const r of V_STREETS) { const [a, b] = vSpan(r); WIDTH_V.set(a, b - a + 1) }
export const streetWidth = (axis: 'x' | 'z', lo: number) => (axis === 'x' ? WIDTH_H.get(lo) : WIDTH_V.get(lo)) ?? STREET_W
/** The vertical street whose carriageway covers column x (or -1). */
export const vStreetAt = (x: number) => V_STREETS.find((r) => { const [a, b] = vSpan(r); return x >= a && x <= b }) ?? -1
export const hStreetAt = (z: number) => H_STREETS.find((r) => { const [a, b] = hSpan(r); return z >= a && z <= b }) ?? -1

export function districtAt(x: number, z = 50): DistrictId {
  return areaAt(x, z).district
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const idx = (x: number, z: number) => z * MAP_W + x
export const inMap = (x: number, z: number) => x >= 0 && z >= 0 && x < MAP_W && z < MAP_H

export const ground = new Uint8Array(MAP_W * MAP_H)
export const blocked = new Uint8Array(MAP_W * MAP_H)
/** Area style per tile (index into STYLES). */
const STYLES: AreaStyle[] = ['dense', 'business', 'upscale', 'campus', 'forest', 'industrial', 'coastal']
export const styleMap = new Uint8Array(MAP_W * MAP_H)

const isWater = (x: number, z: number) => z > coastZ(x) || inLagoon(x, z)
function isRoadAt(x: number, z: number) {
  if (isWater(x, z) || z > coastZ(x) - 2) return false
  return vStreetAt(x) >= 0 || hStreetAt(z) >= 0
}

// --- ground layer --------------------------------------------------
for (let z = 0; z < MAP_H; z++) {
  for (let x = 0; x < MAP_W; x++) {
    const i = idx(x, z)
    const style = areaAt(x, z).style
    styleMap[i] = STYLES.indexOf(style)
    let g: number
    if (isWater(x, z)) g = G.WATER
    else if (isRoadAt(x, z)) g = G.ROAD
    else {
      let nearRoad = false
      for (let dz = -1; dz <= 1 && !nearRoad; dz++) for (let dx = -1; dx <= 1; dx++) if (inMap(x + dx, z + dz) && isRoadAt(x + dx, z + dz)) { nearRoad = true; break }
      const nearWater = coastZ(x) - z < 3.5 || ((x - LAGOON.x) / (LAGOON.r * 1.7)) ** 2 + ((z - LAGOON.z) / (LAGOON.r * 1.7)) ** 2 < 1
      if (nearWater) g = G.SAND
      else if (nearRoad) g = G.SIDEWALK
      else if (style === 'dense' || style === 'coastal') g = (x * 7 + z * 13) % 11 === 0 ? G.GRASS : G.DIRT
      else if (style === 'business') g = G.PLAZA
      else if (style === 'industrial') g = G.CONCRETE
      else if (style === 'forest') g = G.FOREST
      else g = G.GRASS
    }
    ground[i] = g
    if (g === G.WATER) blocked[i] = 1
  }
}
export const isRoad = (x: number, z: number) => inMap(x, z) && ground[idx(x, z)] === G.ROAD

// --- road classes ----------------------------------------------------
export type { RoadClass }
const ROAD_RANK: Record<RoadClass, number> = { dirt: 0, street: 1, avenue: 2, highway: 3, motorway: 4 }
/** Plain streets that run through crowded or leafy areas turn into dirt lanes on alternate streets. */
function streetClass(axis: 'v' | 'h', r: number, x: number, z: number): RoadClass {
  const c = ROAD_CLASS[axis][r]
  if (c) return c
  const st = areaAt(x, z).style
  const unpaved = (st === 'dense' || st === 'coastal' || st === 'forest') && isInnerRoad(axis, r)
  return unpaved ? 'dirt' : 'street'
}
const roadClassMap = new Uint8Array(MAP_W * MAP_H)
const CLASSES: RoadClass[] = ['dirt', 'street', 'avenue', 'highway', 'motorway']
for (let z = 0; z < MAP_H; z++)
  for (let x = 0; x < MAP_W; x++) {
    if (ground[idx(x, z)] !== G.ROAD) continue
    const v = vStreetAt(x)
    const h = hStreetAt(z)
    const a = v >= 0 ? streetClass('v', v, x, z) : null
    const b = h >= 0 ? streetClass('h', h, x, z) : null
    // a junction takes the bigger road's surface
    const c = a && b ? (ROAD_RANK[a] >= ROAD_RANK[b] ? a : b) : (a ?? b ?? 'street')
    roadClassMap[idx(x, z)] = CLASSES.indexOf(c)
  }
export const roadClassAt = (x: number, z: number): RoadClass => CLASSES[roadClassMap[idx(x, z)]]
export const streetClassOf = (axis: 'v' | 'h', r: number, x: number, z: number) => streetClass(axis, r, x, z)

// --- destinations and fillers ---------------------------------------
export interface Filler {
  x: number
  z: number
  w: number
  d: number
  h: number
  color: string
  roof: string
  /** house: plain block; compound: gated villa with wall, lawn and maybe a pool; courtyard: ring of rooms round an open yard. */
  kind?: 'house' | 'compound' | 'courtyard'
  /** Street-facing side (gate side). */
  front?: Side
  pool?: boolean
  wall?: string
}
export type Side = 'S' | 'N' | 'E' | 'W'
export interface Tree {
  x: number
  z: number
  s: number
  palm: boolean
}
export interface Lamp {
  x: number
  z: number
}

const occupied = new Uint8Array(MAP_W * MAP_H)
const destOcc = new Uint8Array(MAP_W * MAP_H)
for (const d of DESTINATIONS) {
  for (let z = d.z; z < d.z + d.d; z++)
    for (let x = d.x; x < d.x + d.w; x++) {
      blocked[idx(x, z)] = 1
      occupied[idx(x, z)] = 1
      destOcc[idx(x, z)] = 1
    }
}

const rand = mulberry32(20261012)
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]
interface StyleSpec {
  density: number
  size: [number, number]
  h: [number, number]
  walls: string[]
  roofs: string[]
  tree: number
}
const SPEC: Record<AreaStyle, StyleSpec> = {
  dense: { density: 0.95, size: [2, 4], h: [1.3, 2.6], walls: ['#e8c9a0', '#d9a679', '#f2dcc0', '#c9b79c', '#e6b8a2', '#b8d4c8', '#f4e1a1'], roofs: ['#a0522d', '#8b5a3c', '#9e9e9e', '#7d6b5d', '#b5651d'], tree: 0.04 },
  coastal: { density: 0.8, size: [2, 4], h: [1.3, 2.4], walls: ['#8ecae6', '#ffd166', '#ef8354', '#f4f1de', '#e9c46a', '#a8dadc'], roofs: ['#a0522d', '#9e9e9e', '#c8553d', '#264653'], tree: 0.06 },
  business: { density: 0.75, size: [3, 6], h: [4, 12], walls: ['#9ec9e8', '#cfd8dc', '#b0c4de', '#dfe6ee', '#a7c7e7', '#e6e2d9'], roofs: ['#4a5568', '#2d3748', '#718096'], tree: 0.05 },
  upscale: { density: 0.9, size: [3, 5], h: [2, 3.6], walls: ['#fbf8f1', '#f4efe6', '#efe6d2', '#e8f0ec', '#f7e7d4'], roofs: ['#c8553d', '#7d4e3a', '#4a5568', '#b5651d'], tree: 0.2 },
  campus: { density: 0.3, size: [4, 7], h: [2, 4], walls: ['#c9a27a', '#e8dcc6', '#d8c4a4', '#f4efe6'], roofs: ['#7a1f2b', '#8a5a2b', '#5c4033'], tree: 0.28 },
  forest: { density: 0.06, size: [3, 5], h: [1.5, 3], walls: ['#e8dcc6', '#d8c4a4'], roofs: ['#5c4033'], tree: 0.6 },
  industrial: { density: 0.6, size: [5, 8], h: [2, 3.6], walls: ['#b8c2cc', '#9aa4ae', '#c9d1d9', '#d6d0c4', '#8fa3b5'], roofs: ['#4a5568', '#5a6b7b', '#2f855a'], tree: 0.02 },
}

export const fillers: Filler[] = []
export const trees: Tree[] = []
export const lamps: Lamp[] = []

function free(x0: number, z0: number, w: number, d: number, pad: number) {
  const ring = Math.max(1, pad)
  for (let z = z0 - ring; z < z0 + d + ring; z++)
    for (let x = x0 - ring; x < x0 + w + ring; x++) {
      if (!inMap(x, z)) return false
      const i = idx(x, z)
      const inside = x >= x0 && x < x0 + w && z >= z0 && z < z0 + d
      const edge = x >= x0 - 1 && x < x0 + w + 1 && z >= z0 - 1 && z < z0 + d + 1
      if (destOcc[i] && edge) return false
      if (occupied[i] && (inside || pad > 0)) return false
      if (!edge) continue
      const g = ground[i]
      if (g === G.WATER || g === G.ROAD) return false
      if (inside && (g === G.SIDEWALK || g === G.SAND)) return false
    }
  return true
}

const blocksX: [number, number][] = [[0, vSpan(V_STREETS[0])[0] - 1]]
V_STREETS.forEach((v, i) => blocksX.push([vSpan(v)[1] + 1, Math.min(MAP_W - 1, (V_STREETS[i + 1] !== undefined ? vSpan(V_STREETS[i + 1])[0] : MAP_W) - 1)]))
const blocksZ: [number, number][] = [[0, hSpan(H_STREETS[0])[0] - 1]]
H_STREETS.forEach((h, i) => blocksZ.push([hSpan(h)[1] + 1, Math.min(MAP_H - 1, (H_STREETS[i + 1] !== undefined ? hSpan(H_STREETS[i + 1])[0] : MAP_H) - 1)]))

for (const [x0, x1] of blocksX) {
  for (const [z0, z1] of blocksZ) {
    const style = areaAt((x0 + x1) / 2, (z0 + z1) / 2).style
    const sp = SPEC[style]
    for (let a = 0; a < 120; a++) {
      const w = sp.size[0] + Math.floor(rand() * (sp.size[1] - sp.size[0] + 1))
      const d = sp.size[0] + Math.floor(rand() * (sp.size[1] - sp.size[0] + 1))
      if (x1 - x0 + 1 < w || z1 - z0 + 1 < d) continue
      const x = x0 + Math.floor(rand() * (x1 - x0 - w + 2))
      const z = z0 + Math.floor(rand() * (z1 - z0 - d + 2))
      if (rand() > sp.density) continue
      // keep a tile of space between buildings (two in leafy areas) so the city feels open
      if (!free(x, z, w, d, style === 'campus' || style === 'forest' || style === 'upscale' ? 2 : 1)) continue
      for (let zz = z; zz < z + d; zz++) for (let xx = x; xx < x + w; xx++) {
        occupied[idx(xx, zz)] = 1
        blocked[idx(xx, zz)] = 1
      }
      const f: Filler = { x, z, w, d, h: sp.h[0] + rand() * (sp.h[1] - sp.h[0]), color: pick(sp.walls), roof: pick(sp.roofs) }
      const roll = rand()
      if ((style === 'upscale' && roll < 0.85) || ((style === 'forest' || style === 'campus') && w >= 3 && d >= 3 && roll < 0.55) || (style === 'coastal' && w >= 3 && d >= 3 && roll < 0.2)) {
        f.kind = 'compound'
        f.h = Math.min(f.h, 2.6)
        f.pool = w >= 4 && d >= 4 && rand() < 0.6
        f.wall = rand() < 0.5 ? '#f4ead5' : '#c8775a'
      } else if (style === 'dense' && w >= 3 && d >= 3 && roll < 0.35) {
        f.kind = 'courtyard'
        f.h = 1.25
      } else f.kind = 'house'
      f.front = frontSide(x, z, w, d)
      fillers.push(f)
    }
  }
}

/** Which side of a footprint faces the street (sidewalk or road just outside its middle). */
function frontSide(x: number, z: number, w: number, d: number): Side {
  const near = (tx: number, tz: number) => inMap(tx, tz) && (ground[idx(tx, tz)] === G.SIDEWALK || ground[idx(tx, tz)] === G.ROAD)
  const mx = x + Math.floor(w / 2)
  const mz = z + Math.floor(d / 2)
  if (near(mx, z + d) || near(mx, z + d + 1)) return 'S'
  if (near(mx, z - 1) || near(mx, z - 2)) return 'N'
  if (near(x + w, mz) || near(x + w + 1, mz)) return 'E'
  if (near(x - 1, mz) || near(x - 2, mz)) return 'W'
  return 'S'
}

/** Map a box in a filler's front-facing frame (u along the front, v inward from it) to world x/z ranges. */
export function frontBox(f: Filler, u0: number, u1: number, v0: number, v1: number): { x0: number; x1: number; z0: number; z1: number } {
  switch (f.front ?? 'S') {
    case 'S': return { x0: f.x + u0, x1: f.x + u1, z0: f.z + f.d - v1, z1: f.z + f.d - v0 }
    case 'N': return { x0: f.x + u0, x1: f.x + u1, z0: f.z + v0, z1: f.z + v1 }
    case 'E': return { x0: f.x + f.w - v1, x1: f.x + f.w - v0, z0: f.z + u0, z1: f.z + u1 }
    case 'W': return { x0: f.x + v0, x1: f.x + v1, z0: f.z + u0, z1: f.z + u1 }
  }
}
/** Length along the front and depth away from it. */
export const frontDims = (f: Filler) => (f.front === 'E' || f.front === 'W' ? { W: f.d, D: f.w } : { W: f.w, D: f.d })

// trees and palms
const doorTiles = DESTINATIONS.map((d) => d.door)
for (let z = 0; z < MAP_H; z++) {
  for (let x = 0; x < MAP_W; x++) {
    const i = idx(x, z)
    if (occupied[i] || blocked[i]) continue
    const g = ground[i]
    if (g === G.ROAD || g === G.SIDEWALK || g === G.WATER) continue
    if (doorTiles.some((dr) => Math.abs(dr.x - x) <= 1 && Math.abs(dr.z - z) <= 2)) continue
    let nearBuilding = false
    for (let dz = -1; dz <= 1 && !nearBuilding; dz++)
      for (let dx = -1; dx <= 1; dx++) if (inMap(x + dx, z + dz) && occupied[idx(x + dx, z + dz)]) { nearBuilding = true; break }
    const sp = SPEC[STYLES[styleMap[i]]]
    const chance = g === G.SAND ? 0.05 : nearBuilding ? sp.tree * 0.3 : sp.tree
    if (rand() < chance) {
      trees.push({ x, z, s: 0.8 + rand() * 0.6, palm: g === G.SAND || STYLES[styleMap[i]] === 'coastal' || (STYLES[styleMap[i]] === 'upscale' && rand() < 0.4) })
      blocked[i] = 1
    }
  }
}

// palms in villa compounds and a shade tree in each courtyard yard
for (const f of fillers) {
  if (f.kind === 'courtyard') trees.push({ x: f.x + Math.floor(f.w / 2), z: f.z + Math.floor(f.d / 2), s: 0.75, palm: false })
  else if (f.kind === 'compound' && rand() < 0.7) {
    const { W } = frontDims(f)
    const b = frontBox(f, W - 0.9, W - 0.5, 0.4, 0.8)
    trees.push({ x: Math.floor((b.x0 + b.x1) / 2), z: Math.floor((b.z0 + b.z1) / 2), s: 0.75, palm: true })
  }
}

// street lamps on sidewalks (cosmetic, not collidable)
for (let z = 1; z < MAP_H - 1; z++)
  for (let x = 1; x < MAP_W - 1; x++) {
    if (ground[idx(x, z)] !== G.SIDEWALK || (x + z) % 9 !== 0) continue
    if (doorTiles.some((dr) => Math.abs(dr.x - x) <= 1 && Math.abs(dr.z - z) <= 1)) continue
    lamps.push({ x, z })
  }

/* ------------------------------ billboards ------------------------------ */
export const ADS = [
  'QwikCash — Loan in 5 mins 📲',
  'Gold Star Malt — Taste the Star',
  'Akwaaba Telecom 5G',
  'Spintex Motors — Okada from GH₵3,500',
  "Auntie Esi's Waakye 🍲",
  'LIVE @ AICC this weekend 🎤',
  'Accra Realty — Own land today',
  'Stay safe. Obey traffic lights 🚦',
  'Kelewele King 🌶️',
  'Black Stars 🇬🇭 Go Ghana!',
]
/** Roadside billboards: x/z is the post position, rot turns the panel to face the road. */
export const billboards: { x: number; z: number; rot: number; ad: number }[] = []
{
  const okTile = (x: number, z: number) => {
    if (!inMap(x, z)) return false
    const i = idx(x, z)
    const g = ground[i]
    if (blocked[i] || occupied[i] || g === G.ROAD || g === G.WATER || g === G.SAND) return false
    if (doorTiles.some((dr) => Math.abs(dr.x - x) <= 2 && Math.abs(dr.z - z) <= 2)) return false
    return !junctions_near(x, z)
  }
  const near = (f: (n: number) => number, n: number) => [-2, -1, 0, 1, 2].some((k) => f(n + k) >= 0)
  /** Street corners stay clear so signals and turning traffic are visible. */
  const junctions_near = (x: number, z: number) => near(vStreetAt, x) && near(hStreetAt, z)
  let ad = 0
  const add = (x: number, z: number, rot: number) => {
    if (billboards.some((b) => Math.abs(b.x - x) + Math.abs(b.z - z) < 6)) return
    billboards.push({ x: x + 0.5, z: z + 0.5, rot, ad: ad++ % ADS.length })
  }
  // highways: every ~10 tiles, alternating sides
  for (const [r, [lo, hi]] of Object.entries(HIGHWAYS.h)) {
    void r
    for (let x = 4, k = 0; x < MAP_W - 4; x += 10, k++) {
      const z = k % 2 ? hi + 1 : lo - 1
      if (okTile(x, z)) add(x, z, k % 2 ? Math.PI : 0)
    }
  }
  for (const [r, [lo, hi]] of Object.entries(HIGHWAYS.v)) {
    void r
    for (let z = 4, k = 0; z < MAP_H - 4; z += 10, k++) {
      const x = k % 2 ? hi + 1 : lo - 1
      if (okTile(x, z)) add(x, z, k % 2 ? -Math.PI / 2 : Math.PI / 2)
    }
  }
  // a few on major streets: Ring Road and Spintex Road
  for (const hz of [OZ(46), OZ(58)]) {
    const [lo] = hSpan(hz)
    for (let x = 9; x < MAP_W - 4; x += 16) if (okTile(x, lo - 1)) add(x, lo - 1, 0)
  }
}

/** Fishing canoes pulled up on the sand at Jamestown and Teshie. */
export const canoes: { x: number; z: number; rot: number; color: string }[] = []
for (const [cx, n] of [[OX(40), 6], [OX(128), 8], [OX(146), 6], [OX(176), 6]] as [number, number][]) {
  for (let k = 0; k < n; k++) {
    const x = cx + k * 1.4 + rand() * 0.6
    canoes.push({ x, z: coastZ(x) - 0.8 - rand() * 1.2, rot: 0.2 + rand() * 0.3, color: pick(['#e0524a', '#2fa866', '#2e86de', '#f1b82d', '#8e5bd0']) })
  }
}

export const AREA_LABELS = AREAS.map((a) => ({ id: a.id, name: a.name, x: (a.x0 + Math.min(a.x1, MAP_W)) / 2, z: Math.min((a.z0 + a.z1) / 2, coastZ((a.x0 + a.x1) / 2) - 8) }))
const OLD_ROAD_NAMES = [
  { name: 'N1 George W. Bush Hwy', x: 52, z: 35 },
  { name: 'N1 George W. Bush Hwy', x: 112, z: 35 },
  { name: 'Ring Road', x: 64, z: 59 },
  { name: 'Liberation Road', x: 83, z: 40 },
  { name: 'Oxford Street', x: 71, z: 76 },
  { name: 'Spintex Road', x: 136, z: 47 },
  { name: 'Independence Ave', x: 59, z: 68 },
  { name: 'Labadi Road', x: 108, z: 71 },
  { name: 'Kaneshie Rd', x: 22, z: 47 },
  { name: 'Legon Road', x: 83, z: 14 },
]
export const ROAD_NAMES = [
  ...OLD_ROAD_NAMES.map((r) => ({ name: r.name, x: mapXf(r.x), z: mapXf(r.z) })),
  { name: 'N6 Kumasi Road', x: 20, z: STREET_START + STREET_GAP + 2 },
  { name: 'Kasoa Road', x: STREET_START + STREET_GAP + 2, z: mapXf(90) },
  { name: 'Tema Motorway', x: mapXf(180), z: mapXf(35) },
  { name: 'Adenta Road', x: mapXf(110), z: STREET_START + 2 },
]


export const walkable = (tx: number, tz: number) => inMap(tx, tz) && !blocked[idx(tx, tz)]

export function canStand(x: number, z: number, r = 0.28): boolean {
  return walkable(Math.floor(x - r), Math.floor(z - r)) && walkable(Math.floor(x + r), Math.floor(z - r)) && walkable(Math.floor(x - r), Math.floor(z + r)) && walkable(Math.floor(x + r), Math.floor(z + r))
}

export function nearestWalkable(tx: number, tz: number, maxR = 8): { x: number; z: number } | null {
  if (walkable(tx, tz)) return { x: tx, z: tz }
  for (let r = 1; r <= maxR; r++) {
    let best: { x: number; z: number } | null = null
    let bd = Infinity
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
        if (walkable(tx + dx, tz + dz)) {
          const d = dx * dx + dz * dz
          if (d < bd) { bd = d; best = { x: tx + dx, z: tz + dz } }
        }
      }
    if (best) return best
  }
  return null
}

// --- A* ---------------------------------------------------------------
class Heap {
  private a: number[] = []
  constructor(private f: Float32Array) {}
  get size() { return this.a.length }
  push(n: number) {
    const a = this.a
    a.push(n)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.f[a[p]] <= this.f[a[i]]) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop(): number {
    const a = this.a
    const top = a[0]
    const last = a.pop()!
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < a.length && this.f[a[l]] < this.f[a[m]]) m = l
        if (r < a.length && this.f[a[r]] < this.f[a[m]]) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
}

const gScore = new Float32Array(MAP_W * MAP_H)
const fScore = new Float32Array(MAP_W * MAP_H)
const came = new Int32Array(MAP_W * MAP_H)
const closed = new Uint8Array(MAP_W * MAP_H)
/** Generation stamp so we do not clear the whole grid for every search. */
const stamp = new Uint32Array(MAP_W * MAP_H)
let gen = 0

/** A* over tiles with 8-way movement and no corner cutting. Returns tile-centre waypoints. */
export function findPath(sx: number, sz: number, tx: number, tz: number, opts: { pass?: (x: number, z: number) => boolean; diag?: boolean; maxNodes?: number } = {}): { x: number; z: number }[] | null {
  const pass = opts.pass ?? walkable
  const diag = opts.diag ?? true
  const maxNodes = opts.maxNodes ?? 100000
  sx = Math.floor(sx); sz = Math.floor(sz)
  if (!pass(tx, tz)) return null
  if (!pass(sx, sz)) {
    const n = nearestWalkable(sx, sz, 3)
    if (!n) return null
    sx = n.x; sz = n.z
  }
  gen++
  const start = idx(sx, sz)
  const goal = idx(tx, tz)
  const touch = (i: number) => {
    if (stamp[i] !== gen) {
      stamp[i] = gen
      gScore[i] = Infinity
      closed[i] = 0
      came[i] = -1
    }
  }
  touch(start)
  gScore[start] = 0
  const hf = (x: number, z: number) => {
    const dx = Math.abs(x - tx)
    const dz = Math.abs(z - tz)
    return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)
  }
  fScore[start] = hf(sx, sz)
  const heap = new Heap(fScore)
  heap.push(start)
  let expanded = 0
  let found = start === goal
  while (heap.size && !found) {
    const cur = heap.pop()
    if (closed[cur]) continue
    if (cur === goal) { found = true; break }
    closed[cur] = 1
    if (++expanded > maxNodes) return null
    const cx = cur % MAP_W
    const cz = (cur / MAP_W) | 0
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue
        if (!diag && dx && dz) continue
        const nx = cx + dx
        const nz = cz + dz
        if (!inMap(nx, nz) || !pass(nx, nz)) continue
        if (dx && dz && (!pass(cx + dx, cz) || !pass(cx, cz + dz))) continue
        const ni = idx(nx, nz)
        touch(ni)
        if (closed[ni]) continue
        const g = gScore[cur] + (dx && dz ? Math.SQRT2 : 1)
        if (g < gScore[ni]) {
          gScore[ni] = g
          came[ni] = cur
          fScore[ni] = g + hf(nx, nz)
          heap.push(ni)
        }
      }
  }
  if (!found) return null
  const out: { x: number; z: number }[] = []
  let c = goal
  while (c !== -1 && c !== start) {
    out.push({ x: (c % MAP_W) + 0.5, z: ((c / MAP_W) | 0) + 0.5 })
    c = came[c]
  }
  out.reverse()
  return out
}

function nearestRoad(x: number, z: number): { x: number; z: number } | null {
  const tx = Math.floor(x)
  const tz = Math.floor(z)
  for (let r = 0; r <= 14; r++)
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
        if (isRoad(tx + dx, tz + dz)) return { x: tx + dx, z: tz + dz }
      }
  return null
}

/** Driving route: to the kerb, along roads, to the kerb nearest the destination door. */
export function roadRoute(fx: number, fz: number, tx: number, tz: number): { x: number; z: number }[] {
  const a = nearestRoad(fx, fz)
  const b = nearestRoad(tx, tz)
  if (!a || !b) return [{ x: fx, z: fz }, { x: tx + 0.5, z: tz + 0.5 }]
  const mid = findPath(a.x, a.z, b.x, b.z, { pass: isRoad, diag: false }) ?? []
  return [{ x: fx, z: fz }, { x: a.x + 0.5, z: a.z + 0.5 }, ...mid, { x: tx + 0.5, z: tz + 0.5 }]
}

export { nearestRoad }

// dev sanity: every door must be reachable from the first door
export function reachabilityReport(): string[] {
  const issues: string[] = []
  const home = DESTINATIONS[0].door
  for (const d of DESTINATIONS) {
    for (let z = d.z; z < d.z + d.d; z++)
      for (let x = d.x; x < d.x + d.w; x++) if (isRoadAt(x, z) || isWater(x, z)) { issues.push(`${d.id}: footprint on road/water at ${x},${z}`); z = 1e9; break }
    if (!walkable(d.door.x, d.door.z)) issues.push(`${d.id}: door tile blocked`)
    else if (!findPath(home.x, home.z, d.door.x, d.door.z) && !(d.door.x === home.x && d.door.z === home.z)) issues.push(`${d.id}: unreachable`)
  }
  for (let i = 0; i < DESTINATIONS.length; i++)
    for (let j = i + 1; j < DESTINATIONS.length; j++) {
      const a = DESTINATIONS[i]
      const b = DESTINATIONS[j]
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z) issues.push(`overlap ${a.id} / ${b.id}`)
    }
  return issues
}

export const PLAYER_START = { x: DESTINATIONS[0].door.x + 0.5, z: DESTINATIONS[0].door.z + 0.5 }

/* ------------------------------ traffic lights ------------------------------ */
/** A signalised junction occupies the 2x2 tiles where a vertical and horizontal street cross. */
export interface Junction { x: number; z: number; w: number; d: number; offset: number }
export const junctions: Junction[] = []
const junctionAt = new Int16Array(MAP_W * MAP_H).fill(-1)
for (const vx of V_STREETS)
  for (const hz of H_STREETS) {
    const [x0, x1] = vSpan(vx)
    const [z0, z1] = hSpan(hz)
    let all = true
    for (let z = z0; z <= z1 && all; z++) for (let x = x0; x <= x1; x++) if (!isRoad(x, z)) { all = false; break }
    if (!all) continue
    const id = junctions.length
    junctions.push({ x: x0, z: z0, w: x1 - x0 + 1, d: z1 - z0 + 1, offset: ((vx * 7 + hz * 13) % 14) })
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) junctionAt[idx(x, z)] = id
  }
/** Centre of a junction rectangle in world units. */
export const junctionCenter = (j: Junction) => ({ x: j.x + j.w / 2, z: j.z + j.d / 2 })
export const junctionId = (x: number, z: number) => (inMap(x, z) ? junctionAt[idx(x, z)] : -1)

export type Light = 'green' | 'yellow' | 'red'
export const LIGHT_CYCLE = 14
/** Signal for traffic travelling along an axis ('ns' = along z, 'ew' = along x). */
export function lightFor(j: number, axis: 'ns' | 'ew', t: number): Light {
  const ph = (t + junctions[j].offset) % LIGHT_CYCLE
  const ns: Light = ph < 6 ? 'green' : ph < 7 ? 'yellow' : 'red'
  const ew: Light = ph >= 7 && ph < 13 ? 'green' : ph >= 13 ? 'yellow' : 'red'
  return axis === 'ns' ? ns : ew
}
/** Nearest junction to a tile along a street (for pedestrians crossing). */
export function nearestJunction(x: number, z: number, maxD = 6): number {
  let best = -1
  let bd = maxD
  junctions.forEach((j, i) => {
    const d = Math.hypot(j.x + j.w / 2 - x, j.z + j.d / 2 - z)
    if (d < bd) { bd = d; best = i }
  })
  return best
}

// --- footbridges and motorway signs ------------------------------------
/** Pedestrian overpass across a big road: stairs on the pavement either side, deck over the carriageway. */
export interface Footbridge {
  /** 'h': crosses an east-west road (deck runs north-south at column x). */
  axis: 'h' | 'v'
  /** Column (axis 'h') or row (axis 'v') the bridge stands on. */
  at: number
  /** First and last road tile it spans. */
  lo: number
  hi: number
}
export const footbridges: Footbridge[] = []
/** Overhead green direction signs on the motorway. */
export const gantries: { axis: 'h' | 'v'; at: number; lo: number; hi: number; text: string }[] = []
{
  const nearJunction = (x: number, z: number) => junctions.some((j) => x >= j.x - 4 && x < j.x + j.w + 4 && z >= j.z - 4 && z < j.z + j.d + 4)
  const pave = (x: number, z: number) => inMap(x, z) && ground[idx(x, z)] === G.SIDEWALK && !destOcc[idx(x, z)]
  const SIGNS = ['TEMA ➜  KASOA ⬅', 'ACCRA CENTRAL ➜', 'AIRPORT  ⬆  MADINA', 'SPINTEX RD ➜ EXIT', 'KUMASI N6 ⬅']
  for (const axis of ['h', 'v'] as const) {
    const lines = axis === 'h' ? H_STREETS : V_STREETS
    for (const r of lines) {
      const cls = ROAD_CLASS[axis][r]
      if (cls !== 'motorway' && cls !== 'highway') continue
      const [lo, hi] = axis === 'h' ? hSpan(r) : vSpan(r)
      const len = axis === 'h' ? MAP_W : MAP_H
      let last = -99
      let lastSign = -99
      for (let k = 6; k < len - 6; k++) {
        const cell = (q: number) => (axis === 'h' ? [k, q] : [q, k]) as [number, number]
        if (!isRoad(...cell(lo)) || !isRoad(...cell(hi))) continue
        if (nearJunction(axis === 'h' ? k : lo, axis === 'h' ? lo : k)) continue
        if (k - last >= (cls === 'motorway' ? 20 : 28) && pave(...cell(lo - 1)) && pave(...cell(hi + 1))) {
          footbridges.push({ axis, at: k, lo, hi })
          last = k
          continue
        }
        if (cls === 'motorway' && k - lastSign >= 26 && k - last > 5) {
          gantries.push({ axis, at: k, lo, hi, text: SIGNS[gantries.length % SIGNS.length] })
          lastSign = k
        }
      }
    }
  }
  // keep lamps and billboards off the stair landings
  const onBridge = (x: number, z: number) => footbridges.some((b) => (b.axis === 'h' ? Math.abs(x - (b.at + 0.5)) < 2.5 && z > b.lo - 2.5 && z < b.hi + 3.5 : Math.abs(z - (b.at + 0.5)) < 2.5 && x > b.lo - 2.5 && x < b.hi + 3.5))
  for (let i = lamps.length - 1; i >= 0; i--) if (onBridge(lamps[i].x, lamps[i].z)) lamps.splice(i, 1)
  for (let i = billboards.length - 1; i >= 0; i--) if (onBridge(billboards[i].x, billboards[i].z)) billboards.splice(i, 1)
}
