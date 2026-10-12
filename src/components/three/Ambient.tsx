'use client'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { runtime } from '@/game/runtime'
import { useGame } from '@/game/store'
import { QUALITY, useUI } from '@/game/ui'
import { G, MAP_H, MAP_W, findPath, ground, isRoad, junctions, lightFor, walkable } from '@/game/world'
import {
  bezier,
  bezierLength,
  bezierTangent,
  crosswalkAt,
  junctionExits,
  laneCoord,
  laneOfTile,
  lightAxis,
  pedPass,
  scanAhead,
  type LaneState,
  type Pt,
} from '@/game/lanes'
import type { Appearance } from '@/game/types'
import { randomAppearance } from '@/game/content'
import { Character } from './Character'
import { GEO, Part, headlightMat, viewCenter } from './shared'
import { Label } from './Label'
import { PragiaModel } from './Vehicles'

/** Shared positions so cars can brake for people (cosmetic simulation only). */
const people: { x: number; z: number }[] = []
/** Live car positions so pedestrians do not step in front of them. */
const carSpots: { x: number; z: number; on: boolean }[] = []
const SPAWN_MIN = 8
const SPAWN_MAX = 30
const DESPAWN = 46

function rng(seed: number) {
  let a = seed
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296
    return a / 4294967296
  }
}

interface Ped {
  x: number
  z: number
  path: { x: number; z: number }[]
  speed: number
  wait: number
  moving: boolean
  look: Appearance
  cop?: boolean
}
/** The first few people in the crowd are police officers on foot patrol. */
const COPS = 3
const COP_LOOK: Appearance = { skin: 4, hair: 0, hairColor: 0, outfit: 1, outfitColor: 1, accessory: 2 }

const randomLook = (r: () => number): Appearance => randomAppearance(r)

/** Random tile near the camera that satisfies `ok`. */
function spawnNear(ok: (x: number, z: number) => boolean, min = SPAWN_MIN, max = SPAWN_MAX): { x: number; z: number } | null {
  for (let tries = 0; tries < 40; tries++) {
    const a = Math.random() * Math.PI * 2
    const r = min + Math.random() * (max - min)
    const x = Math.floor(viewCenter.x + Math.cos(a) * r)
    const z = Math.floor(viewCenter.z + Math.sin(a) * r)
    if (x >= 0 && z >= 0 && x < MAP_W && z < MAP_H && ok(x, z)) return { x, z }
  }
  return null
}
const pedTile = (x: number, z: number) => walkable(x, z) && ground[z * MAP_W + x] !== G.ROAD
const pedPassFn = pedPass(walkable)

/** May a pedestrian step from the kerb onto crosswalk tile (tx,tz)? Only when the crossed traffic has red and no car is close. */
function mayCross(fromX: number, fromZ: number, tx: number, tz: number): boolean {
  if (isRoad(Math.floor(fromX), Math.floor(fromZ))) return true // already crossing: keep going
  const cw = crosswalkAt(tx, tz)
  if (!cw) return true
  if (lightFor(cw.j, cw.axis, runtime.lightT) !== 'red') return false
  for (const c of carSpots) if (c.on && Math.abs(c.x - (tx + 0.5)) < 1.6 && Math.abs(c.z - (tz + 0.5)) < 1.6) return false
  return true
}

export function Pedestrians() {
  const count = useUI((s) => QUALITY[s.settings.quality].peds)
  const peds = useMemo<Ped[]>(() => {
    const r = rng(99)
    return Array.from({ length: 30 }, (_, i) => {
      const look = randomLook(r)
      return i < COPS ? { x: -999, z: -999, path: [], speed: 1.1, wait: r() * 3, moving: false, look: COP_LOOK, cop: true } : { x: -999, z: -999, path: [], speed: 1.3 + r() * 1.0, wait: r() * 3, moving: false, look }
    })
  }, [])
  const refs = useRef<(THREE.Group | null)[]>([])
  const rushed = useRef(false)
  useEffect(() => {
    people.length = count
    return () => { people.length = 0; runtime.peds.length = 0; runtime.cops.length = 0 }
  }, [count])
  useFrame((_, dtRaw) => {
    if (useGame.getState().view !== 'world') return // the city is hidden indoors: skip the simulation
    const dt = Math.min(dtRaw, 0.1)
    const target = useUI.getState().robTarget
    const me = runtime.player
    // caught: the nearest officer runs over to make the arrest
    const caught = useGame.getState().event?.id === 'arrest_offer'
    if (caught && !rushed.current && count > 0) {
      rushed.current = true
      const cop = peds[0]
      cop.x = me.x + 1.4
      cop.z = me.z + 0.6
      cop.path = []
      cop.wait = 30
    } else if (!caught) rushed.current = false
    runtime.cops.length = 0
    for (let i = 0; i < count; i++) {
      const p = peds[i]
      const g = refs.current[i]
      if (!p || !g) continue
      if (i === target || (caught && i === 0)) {
        // the victim (or arresting officer) stops and faces you
        p.path = []
        p.moving = false
        p.wait = 2
        g.position.set(p.x, 0.12, p.z)
        g.rotation.y = Math.atan2(me.x - p.x, me.z - p.z)
        g.visible = p.x > -100
        runtime.peds[i] = { x: p.x, z: p.z, cop: p.cop }
        if (p.cop) runtime.cops.push({ x: p.x, z: p.z })
        continue
      }
      // keep people around the camera: recycle the far ones
      if (Math.hypot(p.x - viewCenter.x, p.z - viewCenter.z) > DESPAWN) {
        const t = spawnNear(pedTile)
        if (t) { p.x = t.x + 0.5; p.z = t.z + 0.5; p.path = []; p.wait = Math.random() * 2 }
      }
      if (!p.path.length) {
        p.moving = false
        p.wait -= dt
        if (p.wait <= 0) {
          for (let tries = 0; tries < 6 && !p.path.length; tries++) {
            const tx = Math.floor(p.x + (Math.random() - 0.5) * 30)
            const tz = Math.floor(p.z + (Math.random() - 0.5) * 30)
            if (tx < 0 || tz < 0 || tx >= MAP_W || tz >= MAP_H || !pedTile(tx, tz)) continue
            // sidewalks only; streets are crossed on zebra crossings at junctions
            const path = findPath(p.x, p.z, tx, tz, { maxNodes: 3000, pass: pedPassFn })
            if (path && path.length > 2 && path.length < 60) p.path = path
          }
          p.wait = 1 + Math.random() * 4
        }
      } else {
        const t = p.path[0]
        const tx = Math.floor(t.x)
        const tz = Math.floor(t.z)
        if (!mayCross(p.x, p.z, tx, tz)) {
          p.moving = false // wait at the kerb for the green man
        } else {
          const dx = t.x - p.x
          const dz = t.z - p.z
          const d = Math.hypot(dx, dz)
          const step = p.speed * dt * (isRoad(Math.floor(p.x), Math.floor(p.z)) ? 1.4 : 1)
          if (d <= step) {
            p.x = t.x
            p.z = t.z
            p.path.shift()
          } else {
            p.x += (dx / d) * step
            p.z += (dz / d) * step
            g.rotation.y = Math.atan2(dx, dz)
          }
          p.moving = true
        }
      }
      g.position.set(p.x, 0.12, p.z)
      g.visible = p.x > -100
      people[i] = people[i] ?? { x: 0, z: 0 }
      people[i].x = p.x
      people[i].z = p.z
      runtime.peds[i] = { x: p.x, z: p.z, cop: p.cop }
      if (p.cop && p.x > -100) runtime.cops.push({ x: p.x, z: p.z })
    }
  })
  return (
    <>
      {peds.slice(0, count).map((p, i) => (
        <group
          key={i}
          ref={(el) => { refs.current[i] = el }}
          position={[p.x, 0.12, p.z]}
          onClick={(e) => {
            if (e.delta > 6) return
            e.stopPropagation()
            if (p.cop) return useUI.getState().toast('👮 A police officer on foot patrol. Crimes near them rarely go unseen.', 'info')
            useUI.setState({ robTarget: i })
          }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = '' }}
        >
          <Character appearance={p.look} lite scale={0.95} getMotion={() => ({ moving: p.moving, speed: p.speed })} />
          {p.cop && <Label id={`cop-${i}`} y={2.15} cls="npc-tag cop-tag" text="👮 Police" range={28} />}
          {p.cop && <Part p={[0, 1.02, 0.17]} s={[0.12, 0.1, 0.02]} c="#f1b82d" cast={false} />}
        </group>
      ))}
    </>
  )
}

/* ---------------------------- vehicle models ---------------------------- */
export function MotoModel({ color = '#e0524a' }: { color?: string }) {
  return (
    <>
      <Part g="cyl" p={[0, 0.2, 0.42]} s={[0.2, 0.06, 0.2]} r={[0, 0, Math.PI / 2]} c="#1b1b1b" />
      <Part g="cyl" p={[0, 0.2, -0.42]} s={[0.2, 0.06, 0.2]} r={[0, 0, Math.PI / 2]} c="#1b1b1b" />
      <Part p={[0, 0.38, 0]} s={[0.16, 0.18, 0.7]} c={color} />
      <Part p={[0, 0.5, -0.12]} s={[0.2, 0.08, 0.42]} c="#222" />
      <Part p={[0, 0.48, 0.32]} s={[0.16, 0.22, 0.12]} c={color} />
      <Part p={[0, 0.66, 0.36]} s={[0.5, 0.03, 0.03]} c="#333" />
      <Part p={[0, 0.5, 0.45]} s={[0.1, 0.07, 0.04]} m={headlightMat} cast={false} />
    </>
  )
}

export function CarModel({ danfo, color }: { danfo: boolean; color: string }) {
  if (danfo)
    return (
      <>
        <Part p={[0, 0.5, 0]} s={[0.85, 0.7, 2.3]} c="#f0ede6" />
        <Part p={[0, 0.42, 0]} s={[0.87, 0.12, 2.32]} c="#2e86de" />
        <Part p={[0, 0.58, 0]} s={[0.87, 0.05, 2.32]} c="#fcd116" />
        <Part p={[0, 0.95, -0.1]} s={[0.8, 0.3, 1.9]} c="#f0ede6" />
        <Part p={[0, 1.13, -0.4]} s={[0.6, 0.08, 1.0]} c="#8a5a2b" />
        <Part p={[0, 0.95, -0.1]} s={[0.82, 0.2, 1.6]} c="#9fd3f0" />
        {[[0.43, 0.75], [-0.43, 0.75], [0.43, -0.75], [-0.43, -0.75]].map(([x, z], i) => (
          <Part key={i} g="cyl" p={[x, 0.2, z]} s={[0.2, 0.1, 0.2]} r={[0, 0, Math.PI / 2]} c="#222" />
        ))}
        <Part p={[0.28, 0.45, 1.16]} s={[0.15, 0.1, 0.04]} m={headlightMat} cast={false} />
        <Part p={[-0.28, 0.45, 1.16]} s={[0.15, 0.1, 0.04]} m={headlightMat} cast={false} />
      </>
    )
  return (
    <>
      <Part p={[0, 0.35, 0]} s={[0.78, 0.4, 1.7]} c={color} />
      <Part p={[0, 0.7, -0.1]} s={[0.68, 0.32, 0.9]} c={color} />
      <Part p={[0, 0.7, -0.1]} s={[0.7, 0.22, 0.75]} c="#9fd3f0" />
      {[[0.4, 0.55], [-0.4, 0.55], [0.4, -0.55], [-0.4, -0.55]].map(([x, z], i) => (
        <Part key={i} g="cyl" p={[x, 0.17, z]} s={[0.17, 0.09, 0.17]} r={[0, 0, Math.PI / 2]} c="#222" />
      ))}
      <Part p={[0.25, 0.38, 0.86]} s={[0.15, 0.1, 0.04]} m={headlightMat} cast={false} />
      <Part p={[-0.25, 0.38, 0.86]} s={[0.15, 0.1, 0.04]} m={headlightMat} cast={false} />
    </>
  )
}

/* ------------------------------- traffic ------------------------------- */
/* Lane-following traffic. Each car drives along the centre of its right-hand lane with a continuous
 * position, accelerates/brakes smoothly, queues behind the car ahead, stops before the crosswalk on
 * red, and crosses junctions on a quadratic curve into the lane of its exit street. */
const CAR_COLORS = ['#e0524a', '#2e86de', '#f0ede6', '#f5c518', '#8e5bd0', '#2fa866', '#444b57']
type Kind = 'car' | 'danfo' | 'moto' | 'pragia'
const ACCEL = 2.2
const BRAKE = 4.5 // comfortable deceleration used to plan stops
const HARD = 10 // maximum deceleration actually applied
const LEN: Record<Kind, number> = { car: 1.7, danfo: 2.3, moto: 0.9, pragia: 1.2 }

interface Turn { p0: Pt; p1: Pt; p2: Pt; u: number; len: number; out: LaneState; outPos: number }
interface Car {
  kind: Kind
  color: string
  len: number
  base: number
  v: number
  alive: boolean
  fade: number
  dying: boolean
  lane: LaneState
  pos: number
  turn: Turn | null
  /** Next junction index (-1 none), its entry edge, or a dead-end coordinate. */
  nextJ: number
  edge: number
  end: number
  committed: boolean
  stuck: number
  /** Seconds until the lane ahead is scanned again (long roads with no junction in range). */
  scanT: number
  x: number
  z: number
  hx: number
  hz: number
  rot: number
}

const laneXZ = (lane: LaneState, pos: number): Pt => {
  const c = laneCoord(lane.axis, lane.dir, lane.origin, lane.li)
  return lane.axis === 'x' ? { x: pos, z: c } : { x: c, z: pos }
}

function rescan(c: Car) {
  const a = scanAhead(c.lane, c.pos)
  c.committed = false
  if ('edge' in a) { c.nextJ = a.j; c.edge = a.edge; c.end = NaN }
  else { c.nextJ = -1; c.edge = NaN; c.end = a.end }
}

function spawnCar(c: Car, cars: Car[], count: number): boolean {
  const t = spawnNear((x, z) => !!laneOfTile(x, z), 14, 36)
  if (!t) return false
  const lane = laneOfTile(t.x, t.z)!
  const pos = (lane.axis === 'x' ? t.x : t.z) + 0.5
  const p = laneXZ(lane, pos)
  for (let k = 0; k < count; k++) {
    const o = cars[k]
    if (o !== c && o.alive && Math.hypot(o.x - p.x, o.z - p.z) < 3.5) return false
  }
  c.lane = { ...lane }
  c.pos = pos
  c.turn = null
  c.v = c.base * 0.6
  c.x = p.x
  c.z = p.z
  c.hx = lane.axis === 'x' ? lane.dir : 0
  c.hz = lane.axis === 'z' ? lane.dir : 0
  c.rot = Math.atan2(c.hx, c.hz)
  c.alive = true
  c.dying = false
  c.fade = 0
  c.stuck = 0
  rescan(c)
  return true
}

/** Speed cap from everything in front of the car (cars, people, the player). */
function obstacleCap(c: Car, cars: Car[], count: number, ignoreCars: boolean): number {
  let cap = Infinity
  const half = c.len / 2
  const consider = (ox: number, oz: number, otherHalf: number, reach: number, width: number) => {
    const dx = ox - c.x
    const dz = oz - c.z
    const along = dx * c.hx + dz * c.hz
    const across = Math.abs(dx * c.hz - dz * c.hx)
    if (along <= 0.05 || along > reach || across > width) return
    const gap = along - half - otherHalf - 0.45
    cap = Math.min(cap, gap <= 0 ? 0 : Math.sqrt(2 * BRAKE * gap))
  }
  if (!ignoreCars)
    for (let k = 0; k < count; k++) {
      const o = cars[k]
      if (o === c || !o.alive) continue
      consider(o.x, o.z, o.len / 2, 9, c.turn || o.turn ? 0.75 : 0.55)
    }
  consider(runtime.player.x, runtime.player.z, 0.3, 3.5, 0.75)
  for (const p of people) if (p) consider(p.x, p.z, 0.3, 3.5, 0.75)
  return cap
}

function startTurn(c: Car): boolean {
  const J = junctions[c.nextJ]
  if (!J) return false
  const exits = junctionExits(J, c.lane)
  if (!exits.length) return false
  const straight = exits.find((e) => e.kind === 'straight')
  const pick = straight && Math.random() < 0.6 ? straight : exits[Math.floor(Math.random() * exits.length)]
  // re-anchor the curve start on the car itself so there is no jump
  const p0 = { x: c.x, z: c.z }
  c.turn = { p0, p1: pick.p1, p2: pick.p2, u: 0, len: Math.max(0.5, bezierLength(p0, pick.p1, pick.p2)), out: pick.out, outPos: pick.outPos }
  return true
}

function startUTurn(c: Car) {
  const L = c.lane
  const out: LaneState = { axis: L.axis, dir: (L.dir === 1 ? -1 : 1) as 1 | -1, origin: L.origin, li: 1 }
  const p0 = { x: c.x, z: c.z }
  const p2 = laneXZ(out, c.pos)
  const mid = (laneCoord(L.axis, L.dir, L.origin, L.li) + laneCoord(out.axis, out.dir, out.origin, out.li)) / 2
  const p1 = L.axis === 'x' ? { x: c.pos + L.dir * 2.2, z: mid } : { x: mid, z: c.pos + L.dir * 2.2 }
  c.turn = { p0, p1, p2, u: 0, len: bezierLength(p0, p1, p2), out, outPos: c.pos }
}

function stepCar(c: Car, dt: number, cars: Car[], count: number) {
  let vt = c.base
  if (!c.turn) {
    const L = c.lane
    if (c.nextJ >= 0) {
      // stop before the crosswalk in front of the junction unless the light is green
      const toEdge = (c.edge - c.pos) * L.dir
      const stopGap = toEdge - 1 - c.len / 2 - 0.15
      if (!c.committed) {
        const light = lightFor(c.nextJ, lightAxis(L.axis), runtime.lightT)
        if (light === 'green') c.committed = stopGap < 0.3 // past the stop line on green: go
        else if (light === 'yellow' && stopGap < 0.5) c.committed = true // too close to stop safely
        else if (stopGap < -0.4) c.committed = true // already over the line (e.g. just spawned there)
        if (!c.committed && light !== 'green') vt = Math.min(vt, stopGap <= 0 ? 0 : Math.sqrt(2 * BRAKE * stopGap))
      }
      if (toEdge <= 0.05) {
        if (!startTurn(c)) { c.dying = true; c.nextJ = -1 }
      }
    } else if (!Number.isFinite(c.end)) {
      c.scanT -= dt
      if (c.scanT <= 0) { c.scanT = 1; rescan(c) }
    } else {
      // dead end (coast or map edge): slow down and turn around
      const toEnd = (c.end - c.pos) * L.dir - 1.6
      vt = Math.min(vt, Math.max(0.8, Math.sqrt(2 * BRAKE * Math.max(0, toEnd))))
      if (toEnd <= 0) startUTurn(c)
    }
  } else vt = Math.min(vt, 2.2)
  // only a car wedged inside a junction may creep past another car; queues in lanes never do
  vt = Math.min(vt, obstacleCap(c, cars, count, !!c.turn && c.stuck > 3))
  // smooth speed change, never reversing
  if (vt > c.v) c.v = Math.min(vt, c.v + ACCEL * dt)
  else c.v = Math.max(vt, c.v - HARD * dt)
  c.v = Math.max(0, c.v)
  c.stuck = c.turn && c.v < 0.05 ? c.stuck + dt : 0
  if (c.stuck > 4) c.stuck = 3.01 // nudge through a gridlock for a moment
  const ds = c.v * dt
  if (c.turn) {
    const T = c.turn
    T.u = Math.min(1, T.u + ds / T.len)
    const p = bezier(T.p0, T.p1, T.p2, T.u)
    const tg = bezierTangent(T.p0, T.p1, T.p2, T.u)
    const tl = Math.hypot(tg.x, tg.z)
    c.x = p.x
    c.z = p.z
    if (tl > 1e-4) { c.hx = tg.x / tl; c.hz = tg.z / tl }
    if (T.u >= 1) {
      c.lane = T.out
      c.pos = T.outPos
      c.turn = null
      const q = laneXZ(c.lane, c.pos)
      c.x = q.x
      c.z = q.z
      c.hx = c.lane.axis === 'x' ? c.lane.dir : 0
      c.hz = c.lane.axis === 'z' ? c.lane.dir : 0
      rescan(c)
    }
  } else {
    c.pos += ds * c.lane.dir
    const q = laneXZ(c.lane, c.pos)
    c.x = q.x
    c.z = q.z
    // safety: if the lane ever leaves the road, fade out instead of driving into water
    if (!isRoad(Math.floor(c.x), Math.floor(c.z))) c.dying = true
  }
}

export function Traffic() {
  const count = useUI((s) => QUALITY[s.settings.quality].cars)
  const cars = useMemo<Car[]>(() => {
    const r = rng(7)
    return Array.from({ length: 20 }, (_, i) => {
      const kind: Kind = i % 5 === 0 ? 'danfo' : i % 5 === 1 ? 'moto' : i % 5 === 2 ? 'pragia' : 'car'
      const base = kind === 'moto' ? 3.4 + r() : kind === 'pragia' ? 2.4 + r() * 0.6 : 2.6 + r() * 1.2
      return {
        kind, color: CAR_COLORS[i % CAR_COLORS.length], len: LEN[kind], base, v: 0, alive: false, fade: 0, dying: false,
        lane: { axis: 'x', dir: 1, origin: 0, li: 0 }, pos: 0, turn: null, nextJ: -1, edge: NaN, end: NaN, committed: false, stuck: 0, scanT: 1,
        x: -999, z: -999, hx: 1, hz: 0, rot: 0,
      }
    })
  }, [])
  const refs = useRef<(THREE.Group | null)[]>([])
  const reduce = useUI((s) => s.settings.reduceMotion)
  useFrame((_, dtRaw) => {
    if (useGame.getState().view !== 'world') return // the city is hidden indoors: skip the simulation
    const dt = Math.min(dtRaw, 0.05) * (reduce ? 0.6 : 1)
    carSpots.length = count
    for (let i = 0; i < count; i++) {
      const c = cars[i]
      const g = refs.current[i]
      if (!g) continue
      if (c.alive && (c.dying || Math.hypot(c.x - viewCenter.x, c.z - viewCenter.z) > DESPAWN + 4)) {
        c.fade -= dt * 3
        if (c.fade <= 0) c.alive = false
      }
      if (!c.alive && !spawnCar(c, cars, count)) {
        g.visible = false
        carSpots[i] = { x: -999, z: -999, on: false }
        continue
      }
      if (!c.dying && c.fade < 1) c.fade = Math.min(1, c.fade + dt * 2.5)
      stepCar(c, dt, cars, count)
      const want = Math.atan2(c.hx, c.hz)
      let diff = want - c.rot
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      c.rot += diff * Math.min(1, dt * 14)
      g.visible = true
      g.position.set(c.x, 0.06, c.z)
      g.rotation.y = c.rot
      const sc = 0.2 + 0.8 * Math.max(0, c.fade)
      g.scale.set(sc, sc, sc)
      carSpots[i] = carSpots[i] ?? { x: 0, z: 0, on: true }
      carSpots[i].x = c.x
      carSpots[i].z = c.z
      carSpots[i].on = true
    }
  })
  return (
    <>
      {cars.slice(0, count).map((c, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }} visible={false}>
          {c.kind === 'moto' ? <MotoRider color={c.color} /> : c.kind === 'pragia' ? <group scale={0.55}><PragiaModel /></group> : <CarModel danfo={c.kind === 'danfo'} color={c.color} />}
        </group>
      ))}
    </>
  )
}

const RIDER: Appearance = { skin: 5, hair: 0, hairColor: 0, outfit: 0, outfitColor: 6, accessory: 2 }
function MotoRider({ color }: { color: string }) {
  return (
    <>
      <MotoModel color={color} />
      <group position={[0, 0.2, -0.12]} scale={0.8}>
        <Character appearance={RIDER} lite getMotion={() => ({ moving: false, speed: 0, action: 'drive' })} />
      </group>
    </>
  )
}


/* ----------------------------- traffic lights ----------------------------- */
const LAMP = { red: new THREE.Color('#ff2b2b'), yellow: new THREE.Color('#ffc21a'), green: new THREE.Color('#2bff6a'), off: new THREE.Color('#2a2a2a') }

/** Four signal poles per junction, one at each corner of the 4x4 crossing, each with a head per direction (instanced). */
export function TrafficLights() {
  const pole = useRef<THREE.InstancedMesh>(null)
  const head = useRef<THREE.InstancedMesh>(null)
  const lamps = useRef<THREE.InstancedMesh>(null)
  const timer = useRef(0)
  // only main-road junctions get signals, with two poles on opposite corners
  const sig = useMemo(() => junctions.map((j, i) => ({ j, i })).filter((x) => x.j.signal), [])
  const N = sig.length * 2
  useEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const qy = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))
    sig.forEach(({ j }, ji) => {
      // corners just outside the crossing; heads lean in towards the junction
      const corners: [number, number, number, number][] = [
        [j.x - 0.35, j.z - 0.35, 1, 1],
        [j.x + j.w + 0.35, j.z + j.d + 0.35, -1, -1],
      ]
      corners.forEach(([x, z, sx, sz], c) => {
        const i = ji * 2 + c
        m.compose(new THREE.Vector3(x, 1.0, z), q, new THREE.Vector3(0.05, 2.0, 0.05))
        pole.current?.setMatrixAt(i, m)
        // NS head faces along z, EW head faces along x
        m.compose(new THREE.Vector3(x, 1.85, z + 0.12 * sz), q, new THREE.Vector3(0.14, 0.42, 0.1))
        head.current?.setMatrixAt(i * 2, m)
        m.compose(new THREE.Vector3(x + 0.12 * sx, 1.85, z), qy, new THREE.Vector3(0.14, 0.42, 0.1))
        head.current?.setMatrixAt(i * 2 + 1, m)
        for (let k = 0; k < 3; k++) {
          m.compose(new THREE.Vector3(x, 1.98 - k * 0.13, z + 0.18 * sz), q, new THREE.Vector3(0.045, 0.045, 0.045))
          lamps.current?.setMatrixAt(i * 6 + k, m)
          m.compose(new THREE.Vector3(x + 0.18 * sx, 1.98 - k * 0.13, z), q, new THREE.Vector3(0.045, 0.045, 0.045))
          lamps.current?.setMatrixAt(i * 6 + 3 + k, m)
        }
      })
    })
    for (const r of [pole, head, lamps]) if (r.current) r.current.instanceMatrix.needsUpdate = true
  }, [])
  useFrame((_, dt) => {
    if (useGame.getState().view !== 'world') return // the city is hidden indoors: skip the simulation
    timer.current += dt
    if (timer.current < 0.2 || !lamps.current) return
    timer.current = 0
    const t = runtime.lightT
    sig.forEach(({ i }, si) => {
      const ns = lightFor(i, 'ns', t)
      const ew = lightFor(i, 'ew', t)
      const set = (base: number, st: string) => {
        lamps.current!.setColorAt(base, st === 'red' ? LAMP.red : LAMP.off)
        lamps.current!.setColorAt(base + 1, st === 'yellow' ? LAMP.yellow : LAMP.off)
        lamps.current!.setColorAt(base + 2, st === 'green' ? LAMP.green : LAMP.off)
      }
      for (let c = 0; c < 2; c++) {
        set((si * 2 + c) * 6, ns)
        set((si * 2 + c) * 6 + 3, ew)
      }
    })
    if (lamps.current.instanceColor) lamps.current.instanceColor.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={pole} args={[GEO.cyl, undefined, N]} frustumCulled={false}>
        <meshStandardMaterial color="#2d3340" />
      </instancedMesh>
      <instancedMesh ref={head} args={[GEO.box, undefined, N * 2]} frustumCulled={false}>
        <meshStandardMaterial color="#1b1b1b" />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[GEO.dot, undefined, N * 6]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  )
}
