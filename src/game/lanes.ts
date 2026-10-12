/* Lane maths for right-hand (Ghana) traffic on streets 2, 4 or 6 tiles wide (W).
 *
 * Horizontal street (rows o..o+W-1): westbound (-x) uses the north half, eastbound (+x) the south half.
 * Vertical street (cols o..o+W-1): southbound (+z) uses the west half, northbound (-z) the east half.
 * Outer lane (li 1) runs along the kerb, inner lane (li 0) next to the centre line; on 2-tile inner
 * roads they are the same lane. x = east, z = south. Lane centre = tile index + 0.5. */
import { G, MAP_H, MAP_W, ground, hSpan, hStreetAt, isRoad, junctionId, junctions, streetWidth, vSpan, vStreetAt, type Junction } from './world'

export type Axis = 'x' | 'z'
export type Dir = 1 | -1
/** li: 0 = inner lane (next to the centre line), 1 = outer lane (next to the kerb). */
export type LaneIdx = 0 | 1

/** Lateral coordinate of a lane centre. For axis 'x' it is a z value, for axis 'z' an x value. */
export function laneCoord(axis: Axis, dir: Dir, origin: number, li: LaneIdx): number {
  const W = streetWidth(axis, origin)
  const half = W / 2
  // the half of the road nearer the street origin: westbound on east-west roads, southbound on north-south ones
  const nearHalf = axis === 'x' ? dir === -1 : dir === 1
  return nearHalf ? origin + (li ? 0.5 : half - 0.5) : origin + (li ? W - 0.5 : half + 0.5)
}

/** Which lane a road tile belongs to, or null for junction / non-street tiles. */
export function laneOfTile(x: number, z: number): { axis: Axis; dir: Dir; origin: number; li: LaneIdx } | null {
  if (!isRoad(x, z) || junctionId(x, z) >= 0) return null
  const ho = hStreetAt(z)
  const vo = vStreetAt(x)
  if (ho >= 0 && vo < 0) {
    const [lo, hi] = hSpan(ho)
    const k = z - lo
    const W = hi - lo + 1
    return k < W / 2 ? { axis: 'x', dir: -1, origin: lo, li: k === 0 ? 1 : 0 } : { axis: 'x', dir: 1, origin: lo, li: k === W - 1 ? 1 : 0 }
  }
  if (vo >= 0 && ho < 0) {
    const [lo, hi] = vSpan(vo)
    const k = x - lo
    const W = hi - lo + 1
    return k < W / 2 ? { axis: 'z', dir: 1, origin: lo, li: k === 0 ? 1 : 0 } : { axis: 'z', dir: -1, origin: lo, li: k === W - 1 ? 1 : 0 }
  }
  return null
}

/** Light axis used by traffic moving along `axis`. */
export const lightAxis = (axis: Axis): 'ns' | 'ew' => (axis === 'x' ? 'ew' : 'ns')

/* ------------------------------ crosswalks ------------------------------ */
/** Crosswalks are the single row/column of road tiles just outside each junction edge.
 *  xwalkJ[tile] = junction index (or -1); xwalkAxis[tile] = 0 'ew' traffic is crossed, 1 'ns'. */
let xwalkJ: Int32Array | null = null
let xwalkAxis: Uint8Array | null = null
function buildXwalk() {
  xwalkJ = new Int32Array(MAP_W * MAP_H).fill(-1)
  xwalkAxis = new Uint8Array(MAP_W * MAP_H)
  const mark = (x: number, z: number, j: number, crossesNs: boolean) => {
    if (x < 0 || z < 0 || x >= MAP_W || z >= MAP_H || !isRoad(x, z) || junctionId(x, z) >= 0) return
    const i = z * MAP_W + x
    xwalkJ![i] = j
    xwalkAxis![i] = crossesNs ? 1 : 0
  }
  junctions.forEach((J, j) => {
    for (let k = 0; k < J.w; k++) {
      mark(J.x + k, J.z - 1, j, true) // north arm: walking across the vertical street
      mark(J.x + k, J.z + J.d, j, true) // south arm
    }
    for (let k = 0; k < J.d; k++) {
      mark(J.x - 1, J.z + k, j, false) // west arm: walking across the horizontal street
      mark(J.x + J.w, J.z + k, j, false) // east arm
    }
  })
}
/** Junction a crosswalk tile belongs to and which traffic it crosses, or null. */
export function crosswalkAt(x: number, z: number): { j: number; axis: 'ns' | 'ew' } | null {
  if (!xwalkJ) buildXwalk()
  if (x < 0 || z < 0 || x >= MAP_W || z >= MAP_H) return null
  const i = z * MAP_W + x
  const j = xwalkJ![i]
  return j < 0 ? null : { j, axis: xwalkAxis![i] ? 'ns' : 'ew' }
}

/** Pedestrian pass rule: walkable ground, and road only on crosswalks. */
export function pedPass(walkable: (x: number, z: number) => boolean) {
  return (x: number, z: number) => walkable(x, z) && (ground[z * MAP_W + x] !== G.ROAD || !!crosswalkAt(x, z))
}

/** Junction whose "box" (the crossing itself plus its crosswalks) contains the point, or -1. */
export function approachZone(x: number, z: number): number {
  const tx = Math.floor(x)
  const tz = Math.floor(z)
  const j = junctionId(tx, tz)
  if (j >= 0) return j
  return crosswalkAt(tx, tz)?.j ?? -1
}

/* ------------------------------ junction turns ------------------------------ */
export interface Pt { x: number; z: number }
export interface LaneState { axis: Axis; dir: Dir; origin: number; li: LaneIdx }

/** Entry edge coordinate (along the lane axis) where a lane meets junction J. */
export function entryEdge(J: Junction, axis: Axis, dir: Dir): number {
  if (axis === 'x') return dir === 1 ? J.x : J.x + J.w
  return dir === 1 ? J.z : J.z + J.d
}

/** Possible exits from junction J for a car arriving in `lane`. Each has the curve and the lane it leaves on. */
export function junctionExits(J: Junction, lane: LaneState): { kind: 'straight' | 'right' | 'left'; p0: Pt; p1: Pt; p2: Pt; out: LaneState; outPos: number }[] {
  const { axis, dir, li } = lane
  const c = laneCoord(axis, dir, lane.origin, li)
  const edgeIn = entryEdge(J, axis, dir)
  const p0: Pt = axis === 'x' ? { x: edgeIn, z: c } : { x: c, z: edgeIn }
  const res: ReturnType<typeof junctionExits> = []
  // straight
  {
    const edgeOut = axis === 'x' ? (dir === 1 ? J.x + J.w : J.x) : dir === 1 ? J.z + J.d : J.z
    const p2: Pt = axis === 'x' ? { x: edgeOut, z: c } : { x: c, z: edgeOut }
    const probe = axis === 'x' ? isRoad(Math.floor(edgeOut + (dir === 1 ? 0.5 : -0.5)), Math.floor(c)) : isRoad(Math.floor(c), Math.floor(edgeOut + (dir === 1 ? 0.5 : -0.5)))
    if (probe) res.push({ kind: 'straight', p0, p1: { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 }, p2, out: { ...lane, origin: lane.origin }, outPos: edgeOut })
  }
  // turns: heading h, right vector r = (-hz, hx)
  const hx = axis === 'x' ? dir : 0
  const hz = axis === 'z' ? dir : 0
  for (const kind of ['right', 'left'] as const) {
    const s = kind === 'right' ? 1 : -1
    const nx = -hz * s
    const nz = hx * s
    const outAxis: Axis = nx !== 0 ? 'x' : 'z'
    const outDir = (nx !== 0 ? nx : nz) as Dir
    const outLi: LaneIdx = kind === 'right' ? 1 : 0
    const outOrigin = outAxis === 'x' ? J.z : J.x
    const oc = laneCoord(outAxis, outDir, outOrigin, outLi)
    const edgeOut = outAxis === 'x' ? (outDir === 1 ? J.x + J.w : J.x) : outDir === 1 ? J.z + J.d : J.z
    const p2: Pt = outAxis === 'x' ? { x: edgeOut, z: oc } : { x: oc, z: edgeOut }
    const probe = outAxis === 'x' ? isRoad(Math.floor(edgeOut + (outDir === 1 ? 0.5 : -0.5)), Math.floor(oc)) : isRoad(Math.floor(oc), Math.floor(edgeOut + (outDir === 1 ? 0.5 : -0.5)))
    if (!probe) continue
    // control point: where the incoming lane line meets the outgoing lane line
    const p1: Pt = axis === 'x' ? { x: oc, z: c } : { x: c, z: oc }
    res.push({ kind, p0, p1, p2, out: { axis: outAxis, dir: outDir, origin: outOrigin, li: outLi }, outPos: edgeOut })
  }
  return res
}

export function bezier(p0: Pt, p1: Pt, p2: Pt, u: number): Pt {
  const a = (1 - u) * (1 - u)
  const b = 2 * (1 - u) * u
  const c = u * u
  return { x: a * p0.x + b * p1.x + c * p2.x, z: a * p0.z + b * p1.z + c * p2.z }
}
export function bezierTangent(p0: Pt, p1: Pt, p2: Pt, u: number): Pt {
  return { x: 2 * (1 - u) * (p1.x - p0.x) + 2 * u * (p2.x - p1.x), z: 2 * (1 - u) * (p1.z - p0.z) + 2 * u * (p2.z - p1.z) }
}
export function bezierLength(p0: Pt, p1: Pt, p2: Pt): number {
  let L = 0
  let prev = p0
  for (let i = 1; i <= 8; i++) {
    const q = bezier(p0, p1, p2, i / 8)
    L += Math.hypot(q.x - prev.x, q.z - prev.z)
    prev = q
  }
  return L
}

/** Distance along the lane from `pos` to the next junction (or road end), scanning up to `max` tiles. */
export function scanAhead(lane: LaneState, pos: number, max = 24): { j: number; edge: number } | { j: -1; end: number } {
  const c = Math.floor(laneCoord(lane.axis, lane.dir, lane.origin, lane.li))
  let t = Math.floor(pos)
  for (let k = 0; k < max; k++) {
    t += lane.dir
    const x = lane.axis === 'x' ? t : c
    const z = lane.axis === 'x' ? c : t
    if (!isRoad(x, z)) return { j: -1, end: lane.dir === 1 ? t : t + 1 }
    const j = junctionId(x, z)
    if (j >= 0) return { j, edge: entryEdge(junctions[j], lane.axis, lane.dir) }
  }
  return { j: -1, end: Infinity * lane.dir }
}

/* ------------------------------ player ride path ------------------------------ */
const rideCache = new WeakMap<object, { pts: Pt[]; seg: number[]; total: number }>()

/** Turn a road-tile ride path (kerb point, road tiles..., door) into a smooth right-hand-lane polyline. */
export function rideLanePath(path: Pt[]): { pts: Pt[]; seg: number[]; total: number } {
  const hit = rideCache.get(path)
  if (hit) return hit
  const out = buildRideLane(path)
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < out.length; i++) {
    const l = Math.hypot(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z)
    seg.push(l)
    total += l
  }
  const res = { pts: out, seg, total }
  rideCache.set(path, res)
  return res
}

function buildRideLane(path: Pt[]): Pt[] {
  if (path.length < 4) return path.slice()
  const start = path[0]
  const end = path[path.length - 1]
  const tiles = path.slice(1, -1).map((p) => ({ x: Math.floor(p.x), z: Math.floor(p.z) }))
  // runs of steps along one axis
  interface Run { axis: Axis; dir: Dir; from: { x: number; z: number }; to: { x: number; z: number } }
  let runs: Run[] = []
  for (let i = 1; i < tiles.length; i++) {
    const a = tiles[i - 1]
    const b = tiles[i]
    const axis: Axis = b.x !== a.x ? 'x' : 'z'
    const dir = (axis === 'x' ? Math.sign(b.x - a.x) : Math.sign(b.z - a.z)) as Dir
    if (!dir) continue
    const last = runs[runs.length - 1]
    if (last && last.axis === axis && last.dir === dir) last.to = b
    else runs.push({ axis, dir, from: a, to: b })
  }
  // drop sideways lane-change steps (moving across a street rather than along one)
  runs = runs.filter((r) => {
    const len = Math.abs(r.axis === 'x' ? r.to.x - r.from.x : r.to.z - r.from.z)
    const vs = vStreetAt(r.from.x)
    const hs = hStreetAt(r.from.z)
    const across = r.axis === 'x' ? vs >= 0 && hs < 0 : hs >= 0 && vs < 0
    const W = r.axis === 'x' ? (vs >= 0 ? vSpan(vs)[1] - vSpan(vs)[0] + 1 : 4) : hs >= 0 ? hSpan(hs)[1] - hSpan(hs)[0] + 1 : 4
    return !(across && len < W)
  })
  const merged: Run[] = []
  for (const r of runs) {
    const last = merged[merged.length - 1]
    if (last && last.axis === r.axis && last.dir === r.dir) last.to = r.to
    else merged.push({ ...r })
  }
  if (!merged.length) return path.slice()
  // lane coordinate of each run (outer kerb lane, so rides can pull over)
  const lat = merged.map((r) => {
    const o = r.axis === 'x' ? hStreetAt(r.from.z) : vStreetAt(r.from.x)
    if (o < 0) return r.axis === 'x' ? r.from.z + 0.5 : r.from.x + 0.5
    return laneCoord(r.axis, r.dir, (r.axis === 'x' ? hSpan(o) : vSpan(o))[0], 1)
  })
  const corners: Pt[] = []
  const r0 = merged[0]
  corners.push(r0.axis === 'x' ? { x: r0.from.x + 0.5, z: lat[0] } : { x: lat[0], z: r0.from.z + 0.5 })
  for (let i = 0; i < merged.length - 1; i++) {
    const a = merged[i]
    const b = merged[i + 1]
    if (a.axis === b.axis) {
      // same axis, different lane (rare): step across at the boundary
      corners.push(a.axis === 'x' ? { x: a.to.x + 0.5, z: lat[i] } : { x: lat[i], z: a.to.z + 0.5 })
      corners.push(a.axis === 'x' ? { x: a.to.x + 0.5, z: lat[i + 1] } : { x: lat[i + 1], z: a.to.z + 0.5 })
    } else corners.push(a.axis === 'x' ? { x: lat[i + 1], z: lat[i] } : { x: lat[i], z: lat[i + 1] })
  }
  const rl = merged[merged.length - 1]
  corners.push(rl.axis === 'x' ? { x: rl.to.x + 0.5, z: lat[lat.length - 1] } : { x: lat[lat.length - 1], z: rl.to.z + 0.5 })
  // round the corners with short quadratic curves
  const pts: Pt[] = [start]
  pts.push(corners[0])
  for (let i = 1; i < corners.length - 1; i++) {
    const p = corners[i - 1]
    const c = corners[i]
    const n = corners[i + 1]
    const lin = Math.hypot(c.x - p.x, c.z - p.z)
    const lout = Math.hypot(n.x - c.x, n.z - c.z)
    const r = Math.min(1.6, lin / 2, lout / 2)
    if (r < 0.05) { pts.push(c); continue }
    const a = { x: c.x + ((p.x - c.x) / lin) * r, z: c.z + ((p.z - c.z) / lin) * r }
    const b = { x: c.x + ((n.x - c.x) / lout) * r, z: c.z + ((n.z - c.z) / lout) * r }
    for (let k = 0; k <= 4; k++) pts.push(bezier(a, c, b, k / 4))
  }
  pts.push(corners[corners.length - 1])
  pts.push(end)
  return pts
}

/** Point and heading at fraction `frac` of a polyline. */
export function alongPath(p: { pts: Pt[]; seg: number[]; total: number }, frac: number): { x: number; z: number; rot: number | null } {
  let want = Math.min(1, Math.max(0, frac)) * p.total
  for (let i = 0; i < p.seg.length; i++) {
    if (want <= p.seg[i] || i === p.seg.length - 1) {
      const a = p.pts[i]
      const b = p.pts[i + 1]
      const t = p.seg[i] ? Math.min(1, want / p.seg[i]) : 1
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, rot: p.seg[i] > 1e-6 ? Math.atan2(b.x - a.x, b.z - a.z) : null }
    }
    want -= p.seg[i]
  }
  const l = p.pts[p.pts.length - 1]
  return { x: l.x, z: l.z, rot: null }
}
