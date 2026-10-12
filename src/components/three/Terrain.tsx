'use client'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { QUALITY, useUI } from '@/game/ui'
import { AREA_LABELS, G, H_STREETS, footbridges, gantries, roadClassAt, streetClassOf, type RoadClass, junctions, MAP_H, MAP_W, ROAD_NAMES, V_STREETS, canoes, coastZ, fillers, frontBox, frontDims, ground, hSpan, isRoad, lamps, trees, vSpan, type Filler } from '@/game/world'
import { Label } from './Label'
import { Billboards } from './Billboards'
import { DESTINATIONS } from '@/game/content'
import { GEO, Merged, bulbMat, getMat, windowMat } from './shared'

const COLORS: Record<number, string> = {
  [G.GRASS]: '#7ec850',
  [G.ROAD]: '#4a5160',
  [G.SIDEWALK]: '#d8d0c2',
  [G.PLAZA]: '#e8dcc6',
  [G.BOARDWALK]: '#cfa77c',
  [G.SAND]: '#f1dfaa',
  [G.WATER]: '#2f93bf',
  [G.DIRT]: '#c98d5f',
  [G.FOREST]: '#4f8f3a',
  [G.CONCRETE]: '#b9b6ad',
}
/** Asphalt shade per road class (laterite for dirt lanes). */
const ROAD_COLORS: Record<RoadClass, string> = { motorway: '#373d48', highway: '#41474f', avenue: '#4a5160', street: '#575d68', dirt: '#b06e45' }
const TOP: Record<number, number> = { [G.GRASS]: 0.12, [G.ROAD]: 0.04, [G.SIDEWALK]: 0.1, [G.PLAZA]: 0.1, [G.BOARDWALK]: 0.12, [G.SAND]: 0.08, [G.WATER]: -0.3, [G.DIRT]: 0.11, [G.FOREST]: 0.13, [G.CONCRETE]: 0.09 }

const hash = (x: number, z: number) => {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/** Ground tiles in square chunks, each its own instanced mesh so off-screen chunks are culled. */
const CHUNK = 24
function GroundChunk({ cx, cz }: { cx: number; cz: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const x0 = cx * CHUNK
  const z0 = cz * CHUNK
  const w = Math.min(CHUNK, MAP_W - x0)
  const d = Math.min(CHUNK, MAP_H - z0)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    const q0 = new THREE.Quaternion()
    let i = 0
    for (let z = z0; z < z0 + d; z++)
      for (let x = x0; x < x0 + w; x++) {
        const g = ground[z * MAP_W + x]
        const top = TOP[g]
        const h = top + 1.2
        m.compose(new THREE.Vector3(x + 0.5, top - h / 2, z + 0.5), q0, new THREE.Vector3(1, h, 1))
        mesh.setMatrixAt(i, m)
        const rc = g === G.ROAD ? roadClassAt(x, z) : null
        c.set(rc ? ROAD_COLORS[rc] : COLORS[g])
        const v = (hash(x, z) - 0.5) * (g === G.GRASS || g === G.DIRT || g === G.FOREST || rc === 'dirt' ? 0.1 : g === G.ROAD ? 0.03 : 0.05)
        c.offsetHSL(0, 0, v)
        mesh.setColorAt(i, c)
        i++
      }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
  }, [x0, z0, w, d])
  return (
    <instancedMesh ref={ref} args={[GEO.box, groundMat, w * d]} receiveShadow />
  )
}
const groundMat = new THREE.MeshStandardMaterial({ roughness: 0.95 })
function Ground() {
  const chunks = useMemo(() => {
    const out: { cx: number; cz: number }[] = []
    for (let cz = 0; cz * CHUNK < MAP_H; cz++) for (let cx = 0; cx * CHUNK < MAP_W; cx++) out.push({ cx, cz })
    return out
  }, [])
  return <>{chunks.map((c) => <GroundChunk key={`${c.cx}-${c.cz}`} cx={c.cx} cz={c.cz} />)}</>
}

interface Mark { x: number; z: number; rot: number; len: number; w?: number }
function RoadMarkings() {
  const white = useRef<THREE.InstancedMesh>(null)
  const yellow = useRef<THREE.InstancedMesh>(null)
  const median = useRef<THREE.InstancedMesh>(null)
  const planter = useRef<THREE.InstancedMesh>(null)
  const shrub = useRef<THREE.InstancedMesh>(null)
  const edge = useRef<THREE.InstancedMesh>(null)
  const rail = useRef<THREE.InstancedMesh>(null)
  const { dashes, lines, barriers, planters, shrubs, edges, rails } = useMemo(() => {
    const dashes: Mark[] = []
    const lines: Mark[] = []
    const barriers: Mark[] = []
    const planters: Mark[] = []
    const shrubs: Mark[] = []
    const edges: Mark[] = []
    const rails: Mark[] = []
    const nearV = (x: number) => V_STREETS.some((r) => x >= vSpan(r)[0] - 1 && x <= vSpan(r)[1] + 1)
    const nearH = (z: number) => H_STREETS.some((r) => z >= hSpan(r)[0] - 1 && z <= hSpan(r)[1] + 1)
    const allRoad = (a: number, b: number, f: (k: number) => boolean) => { for (let k = a; k <= b; k++) if (!f(k)) return false; return true }
    /** Marks for one road tile: k runs along the road, lo is its first tile, at(u, v) maps (across, along) to a Mark. */
    const markTile = (cls: RoadClass, k: number, lo: number, W: number, at: (across: number, along: number) => Mark) => {
      if (cls === 'dirt') return
      const mid = lo + W / 2
      // inner road: one dashed centre line, no median
      if (W <= 2) { if (k % 2) lines.push(at(mid, k + 0.5)); return }
      if (k % 2) for (let q = 1; q < W; q++) if (q !== W / 2) dashes.push(at(lo + q, k + 0.5))
      if (cls === 'street') lines.push({ ...at(mid - 0.1, k + 0.5), len: 1 }, { ...at(mid + 0.1, k + 0.5), len: 1 })
      else if (cls === 'avenue') {
        planters.push({ ...at(mid, k + 0.5), len: 1 })
        if (k % 3 === 0) shrubs.push(at(mid, k + 0.5))
      } else barriers.push({ ...at(mid, k + 0.5), len: 1 })
      if (cls === 'motorway' || cls === 'highway') edges.push({ ...at(lo + 0.12, k + 0.5), len: 1 }, { ...at(lo + W - 0.12, k + 0.5), len: 1 })
      if (cls === 'motorway') rails.push({ ...at(lo - 0.12, k + 0.5), len: 1 }, { ...at(lo + W + 0.12, k + 0.5), len: 1 })
    }
    for (const r of H_STREETS) {
      const [lo, hi] = hSpan(r)
      for (let x = 1; x < MAP_W - 1; x++) {
        if (nearV(x) || !allRoad(lo, hi, (z) => isRoad(x, z))) continue
        markTile(streetClassOf('h', r, x, lo), x, lo, hi - lo + 1, (a, b) => ({ x: b, z: a, rot: 0, len: 0.9 }))
      }
    }
    for (const r of V_STREETS) {
      const [lo, hi] = vSpan(r)
      for (let z = 1; z < MAP_H - 1; z++) {
        if (nearH(z) || !allRoad(lo, hi, (x) => isRoad(x, z))) continue
        markTile(streetClassOf('v', r, lo, z), z, lo, hi - lo + 1, (a, b) => ({ x: a, z: b, rot: Math.PI / 2, len: 0.9 }))
      }
    }
    // zebra crossings on every side of each junction, with stop lines
    for (const j of junctions) {
      const sides: [number, number, boolean][] = [[j.x, j.z - 1, true], [j.x, j.z + j.d, true], [j.x - 1, j.z, false], [j.x + j.w, j.z, false]]
      for (const [sx, sz, horiz] of sides) {
        const n = horiz ? j.w : j.d
        let ok = true
        for (let k = 0; k < n; k++) if (!isRoad(horiz ? sx + k : sx, horiz ? sz : sz + k)) ok = false
        // no zebras on dirt lanes, and motorways are crossed by footbridge only
        const cls = ok ? roadClassAt(sx, sz) : 'dirt'
        if (cls === 'dirt' || cls === 'motorway') ok = false
        if (!ok) continue
        for (let k = 0; k < n * 2; k++) {
          const t = 0.25 + k * 0.5
          dashes.push(horiz ? { x: sx + t, z: sz + 0.5, rot: Math.PI / 2, len: 0.8, w: 0.22 } : { x: sx + 0.5, z: sz + t, rot: 0, len: 0.8, w: 0.22 })
        }
      }
    }
    return { dashes, lines, barriers, planters, shrubs, edges, rails }
  }, [])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const fill = (mesh: THREE.InstancedMesh | null, list: Mark[], y: number, w: number, h: number) => {
      if (!mesh) return
      list.forEach((it, i) => {
        m.compose(new THREE.Vector3(it.x, y, it.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.rot, 0)), new THREE.Vector3(it.len, h, it.w ?? w))
        mesh.setMatrixAt(i, m)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    fill(white.current, dashes, 0.07, 0.1, 0.02)
    fill(yellow.current, lines, 0.07, 0.06, 0.02)
    fill(median.current, barriers, 0.2, 0.16, 0.32)
    fill(planter.current, planters, 0.1, 0.5, 0.14)
    fill(shrub.current, shrubs.map((m) => ({ ...m, len: 0.38, w: 0.38 })), 0.32, 0.38, 0.36)
    fill(edge.current, edges, 0.07, 0.07, 0.02)
    fill(rail.current, rails, 0.42, 0.06, 0.12)
  }, [dashes, lines, barriers, planters, shrubs, edges, rails])
  return (
    <>
      <instancedMesh ref={white} args={[GEO.box, undefined, dashes.length]} frustumCulled={false}>
        <meshStandardMaterial color="#f5f0e0" />
      </instancedMesh>
      <instancedMesh ref={yellow} args={[GEO.box, undefined, Math.max(1, lines.length)]} frustumCulled={false}>
        <meshStandardMaterial color="#f2c230" />
      </instancedMesh>
      <instancedMesh ref={median} args={[GEO.box, undefined, Math.max(1, barriers.length)]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial color="#c9c4b8" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={planter} args={[GEO.box, undefined, Math.max(1, planters.length)]} receiveShadow frustumCulled={false}>
        <meshStandardMaterial color="#5c9e3f" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={shrub} args={[GEO.box, undefined, Math.max(1, shrubs.length)]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#3d7a2c" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={edge} args={[GEO.box, undefined, Math.max(1, edges.length)]} frustumCulled={false}>
        <meshStandardMaterial color="#f5f0e0" />
      </instancedMesh>
      <instancedMesh ref={rail} args={[GEO.box, undefined, Math.max(1, rails.length)]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#aab2bb" metalness={0.5} roughness={0.4} />
      </instancedMesh>
      <Merged k="bridges"><Footbridges /><Gantries /></Merged>
    </>
  )
}

function Water() {
  const a = useRef<THREE.Mesh>(null)
  const calm = useUI((s) => s.settings.reduceMotion || s.settings.quality === 'minimal')
  useFrame((st) => {
    if (calm || !a.current) return
    a.current.position.y = -0.18 + Math.sin(st.clock.elapsedTime * 0.8) * 0.03
  })
  const top = Math.min(coastZ(MAP_W), coastZ(0)) - 4
  const depth = MAP_H + 60 - top
  return (
    <>
      <mesh ref={a} rotation-x={-Math.PI / 2} position={[MAP_W / 2, -0.18, top + depth / 2]}>
        <planeGeometry args={[MAP_W + 80, depth]} />
        <meshStandardMaterial color="#6fd0ee" transparent opacity={0.62} roughness={0.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[MAP_W / 2, -0.6, top + depth / 2]}>
        <planeGeometry args={[MAP_W + 80, depth]} />
        <meshStandardMaterial color="#2a86b3" />
      </mesh>
      {canoes.map((c, i) => (
        <group key={i} position={[c.x, 0.1, c.z]} rotation={[0, c.rot, 0]}>
          <mesh geometry={GEO.box} material={getMat(c.color)} position={[0, 0.15, 0]} scale={[1.8, 0.25, 0.45]} castShadow />
          <mesh geometry={GEO.box} material={getMat('#fcd116')} position={[0, 0.25, 0]} scale={[1.82, 0.05, 0.47]} />
        </group>
      ))}
    </>
  )
}

/** Container ships anchored off Tema Port. */
function Ships() {
  const ships = useMemo(() => [{ x: 216, dz: 7, rot: 0.1 }, { x: 231, dz: 11, rot: -0.15 }], [])
  const colors = ['#e0524a', '#2e86de', '#2fa866', '#f1b82d', '#8e5bd0']
  return (
    <>
      {ships.map((sh, i) => (
        <group key={i} position={[sh.x, -0.05, coastZ(sh.x) + sh.dz]} rotation={[0, sh.rot, 0]}>
          <mesh geometry={GEO.box} material={getMat('#1f3a5f')} position={[0, 0.5, 0]} scale={[10, 1.2, 2.2]} castShadow />
          <mesh geometry={GEO.box} material={getMat('#b3261e')} position={[0, 0.05, 0]} scale={[10.1, 0.3, 2.25]} />
          <mesh geometry={GEO.box} material={getMat('#f4f1ea')} position={[-4, 1.9, 0]} scale={[1.6, 1.8, 2]} castShadow />
          {Array.from({ length: 12 }).map((_, k) => (
            <mesh key={k} geometry={GEO.box} material={getMat(colors[(k + i) % colors.length])} position={[-2.4 + (k % 6) * 1.15, 1.4 + Math.floor(k / 6) * 0.55, 0]} scale={[1.05, 0.5, 1.9]} castShadow />
          ))}
        </group>
      ))}
    </>
  )
}

function Boats() {
  const refs = useRef<(THREE.Group | null)[]>([])
  const boats = useMemo(
    () => [18, 48, 78, 108, 138, 168, 198].map((x, i) => ({ x, z: coastZ(x) + 4 + (i % 3) * 2.5, c: ['#e0524a', '#f1b82d', '#2e86de', '#f0ede6', '#2fa866', '#ee7d2d', '#8e5bd0'][i], s: 0.9 + (i % 3) * 0.2 })),
    [],
  )
  useFrame((st) => {
    const t = st.clock.elapsedTime
    boats.forEach((b, i) => {
      const g = refs.current[i]
      if (!g) return
      g.position.y = -0.12 + Math.sin(t * 1.1 + i) * 0.05
      g.rotation.z = Math.sin(t * 0.9 + i * 2) * 0.05
      g.rotation.x = Math.cos(t * 0.8 + i) * 0.03
    })
  })
  return (
    <>
      {boats.map((b, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }} position={[b.x, -0.1, b.z]} rotation={[0, (i * 1.3) % 3, 0]} scale={b.s}>
          <mesh geometry={GEO.box} material={getMat(b.c)} position={[0, 0.2, 0]} scale={[2.2, 0.4, 0.9]} castShadow />
          <mesh geometry={GEO.cone} material={getMat(b.c)} position={[1.35, 0.2, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.45, 0.5, 0.45]} castShadow />
          <mesh geometry={GEO.box} material={getMat('#f5f0e0')} position={[-0.3, 0.6, 0]} scale={[0.8, 0.4, 0.6]} castShadow />
          <mesh geometry={GEO.cyl} material={getMat('#6b4423')} position={[0.3, 1.0, 0]} scale={[0.04, 1.4, 0.04]} />
          <mesh geometry={GEO.box} material={getMat('#fdfdfd')} position={[0.3, 1.1, 0]} scale={[0.02, 0.9, 0.7]} />
        </group>
      ))}
    </>
  )
}

function Trees() {
  const q = useUI((s) => QUALITY[s.settings.quality])
  const list = useMemo(() => trees.filter((t, i) => hash(i, 7) < q.treeDensity), [q.treeDensity])
  const normal = useMemo(() => list.filter((t) => !t.palm), [list])
  const palms = useMemo(() => list.filter((t) => t.palm), [list])
  const trunk = useRef<THREE.InstancedMesh>(null)
  const c1 = useRef<THREE.InstancedMesh>(null)
  const c2 = useRef<THREE.InstancedMesh>(null)
  const pt = useRef<THREE.InstancedMesh>(null)
  const pc = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const col = new THREE.Color()
    const q0 = new THREE.Quaternion()
    normal.forEach((t, i) => {
      const s = t.s
      m.compose(new THREE.Vector3(t.x + 0.5, 0.12 + 0.35 * s, t.z + 0.5), q0, new THREE.Vector3(0.11 * s, 0.7 * s, 0.11 * s))
      trunk.current?.setMatrixAt(i, m)
      m.compose(new THREE.Vector3(t.x + 0.5, 0.12 + 1.0 * s, t.z + 0.5), q0, new THREE.Vector3(0.5 * s, 0.45 * s, 0.5 * s))
      c1.current?.setMatrixAt(i, m)
      m.compose(new THREE.Vector3(t.x + 0.5, 0.12 + 1.45 * s, t.z + 0.5), q0, new THREE.Vector3(0.36 * s, 0.34 * s, 0.36 * s))
      c2.current?.setMatrixAt(i, m)
      col.set(hash(t.x, t.z) > 0.5 ? '#3f9f4a' : '#58b043')
      c1.current?.setColorAt(i, col)
      c2.current?.setColorAt(i, col.offsetHSL(0.01, 0, 0.05))
    })
    palms.forEach((t, i) => {
      const s = t.s
      m.compose(new THREE.Vector3(t.x + 0.5, 0.12 + 0.9 * s, t.z + 0.5), q0, new THREE.Vector3(0.07 * s, 1.8 * s, 0.07 * s))
      pt.current?.setMatrixAt(i, m)
      m.compose(new THREE.Vector3(t.x + 0.5, 0.12 + 1.85 * s, t.z + 0.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hash(t.x, t.z) * 6, 0)), new THREE.Vector3(0.75 * s, 0.2 * s, 0.75 * s))
      pc.current?.setMatrixAt(i, m)
    })
    for (const r of [trunk, c1, c2, pt, pc]) {
      if (!r.current) continue
      r.current.instanceMatrix.needsUpdate = true
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true
    }
  }, [normal, palms])
  return (
    <>
      <instancedMesh key={`t${normal.length}`} ref={trunk} args={[GEO.cyl, undefined, normal.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#7a4e2d" flatShading />
      </instancedMesh>
      <instancedMesh key={`a${normal.length}`} ref={c1} args={[GEO.ico, undefined, normal.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh key={`b${normal.length}`} ref={c2} args={[GEO.ico, undefined, normal.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh key={`p${palms.length}`} ref={pt} args={[GEO.cyl, undefined, palms.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#a67c52" flatShading />
      </instancedMesh>
      <instancedMesh key={`q${palms.length}`} ref={pc} args={[GEO.cone, undefined, palms.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#3aa655" flatShading />
      </instancedMesh>
    </>
  )
}

function Lamps() {
  const pole = useRef<THREE.InstancedMesh>(null)
  const bulb = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q0 = new THREE.Quaternion()
    lamps.forEach((l, i) => {
      m.compose(new THREE.Vector3(l.x + 0.5, 0.75, l.z + 0.5), q0, new THREE.Vector3(0.05, 1.3, 0.05))
      pole.current?.setMatrixAt(i, m)
      m.compose(new THREE.Vector3(l.x + 0.5, 1.45, l.z + 0.5), q0, new THREE.Vector3(0.13, 0.13, 0.13))
      bulb.current?.setMatrixAt(i, m)
    })
    if (pole.current) pole.current.instanceMatrix.needsUpdate = true
    if (bulb.current) bulb.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={pole} args={[GEO.cyl, undefined, lamps.length]} frustumCulled={false}>
        <meshStandardMaterial color="#3d4350" />
      </instancedMesh>
      <instancedMesh ref={bulb} args={[GEO.ico, bulbMat, lamps.length]} frustumCulled={false} />
    </>
  )
}

/** A building mass (or ring room) and a decorative box (wall, lawn, pool, gate). */
interface Body { x0: number; x1: number; z0: number; z1: number; h: number; color: string; roof: string; windows: boolean; eave: number }
interface Deco { x0: number; x1: number; z0: number; z1: number; y: number; h: number; color: string }

/** Break each filler into building masses and decorations by kind. */
function fillerParts(f: Filler, bodies: Body[], deco: Deco[]) {
  if (f.kind === 'compound') {
    const { W, D } = frontDims(f)
    const t = 0.12
    const wall = f.wall ?? '#f4ead5'
    const box = (u0: number, u1: number, v0: number, v1: number, y: number, h: number, color: string) => deco.push({ ...frontBox(f, u0, u1, v0, v1), y, h, color })
    box(0.08, W - 0.08, 0.08, D - 0.08, 0.12, 0.03, '#79c25a') // lawn
    box(0.05, W - 0.05, D - 0.05 - t, D - 0.05, 0.12, 0.7, wall) // back wall
    box(0.05, 0.05 + t, 0.05, D - 0.05, 0.12, 0.7, wall)
    box(W - 0.05 - t, W - 0.05, 0.05, D - 0.05, 0.12, 0.7, wall)
    box(0.05, W / 2 - 0.5, 0.05, 0.05 + t, 0.12, 0.7, wall) // front wall with a gate
    box(W / 2 + 0.5, W - 0.05, 0.05, 0.05 + t, 0.12, 0.7, wall)
    box(W / 2 - 0.5, W / 2 + 0.5, 0.06, 0.06 + 0.06, 0.12, 0.8, '#3a3f4a')
    box(W / 2 - 0.45, W / 2 + 0.45, 0.2, Math.max(0.6, D * 0.4 - 0.1), 0.12, 0.035, '#bdb6a8') // driveway
    if (f.pool) box(0.4, Math.min(1.7, W / 2 - 0.65), 0.4, Math.max(1.0, D * 0.4 - 0.15), 0.12, 0.045, '#4fc3f7')
    bodies.push({ ...frontBox(f, 0.5, W - 0.5, Math.max(1.1, D * 0.4), D - 0.4), h: f.h, color: f.color, roof: f.roof, windows: true, eave: 0.25 })
    return
  }
  if (f.kind === 'courtyard') {
    const { W, D } = frontDims(f)
    const room = (u0: number, u1: number, v0: number, v1: number) => bodies.push({ ...frontBox(f, u0, u1, v0, v1), h: f.h, color: f.color, roof: f.roof, windows: false, eave: 0.1 })
    room(0, W, D - 1, D)
    room(0, 1, 0, D - 1)
    room(W - 1, W, 0, D - 1)
    deco.push({ ...frontBox(f, 1, W - 1, 0, D - 1), y: 0.12, h: 0.03, color: '#d9c3a0' }) // swept yard
    deco.push({ ...frontBox(f, 1, W / 2 - 0.35, 0.02, 0.14), y: 0.12, h: 0.7, color: f.color })
    deco.push({ ...frontBox(f, W / 2 + 0.35, W - 1, 0.02, 0.14), y: 0.12, h: 0.7, color: f.color })
    return
  }
  bodies.push({ x0: f.x, x1: f.x + f.w, z0: f.z, z1: f.z + f.d, h: f.h, color: f.color, roof: f.roof, windows: true, eave: 0.25 })
}

/** Non-interactive background buildings, instanced. */
function Fillers() {
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const roofs = useRef<THREE.InstancedMesh>(null)
  const wins = useRef<THREE.InstancedMesh>(null)
  const decoRef = useRef<THREE.InstancedMesh>(null)
  const { bodies, deco } = useMemo(() => {
    const bodies: Body[] = []
    const deco: Deco[] = []
    for (const f of fillers) fillerParts(f, bodies, deco)
    return { bodies, deco }
  }, [])
  const winList = useMemo(() => {
    const out: { x: number; y: number; z: number; sx: number; sz: number }[] = []
    for (const b of bodies) {
      if (!b.windows) continue
      const w = b.x1 - b.x0
      const d = b.z1 - b.z0
      const rows = Math.max(1, Math.floor(b.h / 1.2))
      const cols = Math.max(1, Math.round(w) - 1)
      const cols2 = Math.max(1, Math.round(d) - 1)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) out.push({ x: b.x0 + 0.8 + (c * (w - 1.6)) / Math.max(1, cols - 1), y: 0.12 + 0.9 + r * 1.1, z: b.z1 + 0.01, sx: 0.4, sz: 0.04 })
        for (let c = 0; c < cols2; c++) out.push({ x: b.x1 + 0.01, y: 0.12 + 0.9 + r * 1.1, z: b.z0 + 0.8 + (c * (d - 1.6)) / Math.max(1, cols2 - 1), sx: 0.04, sz: 0.4 })
      }
    }
    return out
  }, [bodies])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    const q0 = new THREE.Quaternion()
    bodies.forEach((b, i) => {
      const w = b.x1 - b.x0
      const d = b.z1 - b.z0
      const cx = (b.x0 + b.x1) / 2
      const cz = (b.z0 + b.z1) / 2
      m.compose(new THREE.Vector3(cx, 0.12 + b.h / 2, cz), q0, new THREE.Vector3(w - 0.1, b.h, d - 0.1))
      bodyRef.current?.setMatrixAt(i, m)
      bodyRef.current?.setColorAt(i, c.set(b.color))
      m.compose(new THREE.Vector3(cx, 0.12 + b.h + 0.12, cz), q0, new THREE.Vector3(w + b.eave, 0.24, d + b.eave))
      roofs.current?.setMatrixAt(i, m)
      roofs.current?.setColorAt(i, c.set(b.roof))
    })
    deco.forEach((b, i) => {
      m.compose(new THREE.Vector3((b.x0 + b.x1) / 2, b.y + b.h / 2, (b.z0 + b.z1) / 2), q0, new THREE.Vector3(b.x1 - b.x0, b.h, b.z1 - b.z0))
      decoRef.current?.setMatrixAt(i, m)
      decoRef.current?.setColorAt(i, c.set(b.color))
    })
    winList.forEach((w, i) => {
      m.compose(new THREE.Vector3(w.x, w.y, w.z), q0, new THREE.Vector3(w.sx, 0.45, w.sz))
      wins.current?.setMatrixAt(i, m)
    })
    for (const r of [bodyRef, roofs, wins, decoRef]) {
      if (!r.current) continue
      r.current.instanceMatrix.needsUpdate = true
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true
    }
  }, [bodies, deco, winList])
  return (
    <>
      <instancedMesh ref={bodyRef} args={[GEO.box, undefined, bodies.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[GEO.box, undefined, bodies.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={decoRef} args={[GEO.box, undefined, Math.max(1, deco.length)]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial flatShading roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={wins} args={[GEO.box, windowMat, winList.length]} frustumCulled={false} />
    </>
  )
}

/** Flowerbeds, market crates etc. dotted around for charm. */
function Benches() {
  const spots = useMemo(() => DESTINATIONS.filter((d) => d.kind !== 'stop' && d.kind !== 'home').map((d) => ({ x: d.door.x + 2.2, z: d.door.z + 0.5 })), [])
  return (
    <>
      {spots.map((s, i) => (
        <group key={i} position={[s.x, 0.1, s.z]}>
          <mesh geometry={GEO.box} material={getMat('#8a5a2b')} position={[0, 0.25, 0]} scale={[0.8, 0.07, 0.3]} castShadow />
          <mesh geometry={GEO.box} material={getMat('#4a4a4a')} position={[-0.32, 0.12, 0]} scale={[0.06, 0.25, 0.26]} />
          <mesh geometry={GEO.box} material={getMat('#4a4a4a')} position={[0.32, 0.12, 0]} scale={[0.06, 0.25, 0.26]} />
        </group>
      ))}
    </>
  )
}

/** Pedestrian overpasses: stairs on both pavements and a fenced deck over the traffic. */
function Footbridges() {
  const DECK = 3.4
  return (
    <>
      {footbridges.map((b, i) => {
        const len = b.hi - b.lo + 3
        const mid = (b.lo + b.hi + 1) / 2
        // local frame: deck runs along +x from one pavement to the other
        const pos: [number, number, number] = b.axis === 'h' ? [b.at + 0.5, 0, mid] : [mid, 0, b.at + 0.5]
        const rot = b.axis === 'h' ? Math.PI / 2 : 0
        return (
          <group key={i} position={pos} rotation={[0, rot, 0]}>
            <mesh geometry={GEO.box} material={getMat('#2f7d5b')} position={[0, DECK, 0]} scale={[len, 0.22, 1.1]} castShadow receiveShadow />
            {[-0.52, 0.52].map((z) => (
              <mesh key={z} geometry={GEO.box} material={getMat('#cfd6dc')} position={[0, DECK + 0.55, z]} scale={[len, 0.9, 0.06]} />
            ))}
            <mesh geometry={GEO.box} material={getMat('#f1b82d')} position={[0, DECK + 1.08, 0]} scale={[len, 0.1, 1.1]} />
            {[-1, 1].map((sd) => (
              <group key={sd} position={[(sd * (len - 1)) / 2, 0, 0]}>
                <mesh geometry={GEO.box} material={getMat('#9aa4ae')} position={[0, DECK / 2, 0]} scale={[0.5, DECK, 0.5]} castShadow />
                {/* stair flight running along the pavement */}
                {Array.from({ length: 8 }, (_, k) => (
                  <mesh key={k} geometry={GEO.box} material={getMat('#b9b6ad')} position={[sd * 0.15, DECK - (k + 0.5) * (DECK / 8), -0.95 - k * 0.32]} scale={[0.9, 0.12, 0.34]} castShadow />
                ))}
                <mesh geometry={GEO.box} material={getMat('#2f7d5b')} position={[sd * 0.15, DECK / 2, -2.25]} scale={[0.06, DECK + 0.6, 2.8]} rotation={[Math.atan2(DECK, 2.6), 0, 0]} />
              </group>
            ))}
          </group>
        )
      })}
    </>
  )
}

/** Green overhead direction signs on the motorway. */
function Gantries() {
  const show = useUI((s) => s.settings.showLabels)
  return (
    <>
      {gantries.map((g, i) => {
        const mid = (g.lo + g.hi + 1) / 2
        const len = g.hi - g.lo + 2
        const pos: [number, number, number] = g.axis === 'h' ? [g.at + 0.5, 0, mid] : [mid, 0, g.at + 0.5]
        return (
          <group key={i} position={pos} rotation={[0, g.axis === 'h' ? Math.PI / 2 : 0, 0]}>
            {[-1, 1].map((sd) => <mesh key={sd} geometry={GEO.box} material={getMat('#8a939c')} position={[(sd * len) / 2, 2.1, 0]} scale={[0.14, 4.2, 0.14]} castShadow />)}
            <mesh geometry={GEO.box} material={getMat('#8a939c')} position={[0, 4.1, 0]} scale={[len, 0.14, 0.14]} />
            <mesh geometry={GEO.box} material={getMat('#1f6b3a')} position={[0, 3.6, 0.1]} scale={[len * 0.8, 0.9, 0.08]} castShadow />
            {show && <Label id={`gantry-${i}`} y={3.6} cls="gantry-label" text={g.text} range={60} />}
          </group>
        )
      })}
    </>
  )
}

function PlaceNames() {
  const show = useUI((s) => s.settings.showLabels)
  if (!show) return null
  return (
    <>
      {AREA_LABELS.map((a) => (
        <group key={a.id} position={[a.x, 2.5, a.z]}>
          <Label id={`area-${a.id}`} cls="area-label" text={a.name.toUpperCase()} range={140} />
        </group>
      ))}
      {ROAD_NAMES.map((r, i) => (
        <group key={i} position={[r.x, 0.3, r.z]}>
          <Label id={`road-${i}`} cls="road-label" text={r.name} range={40} />
        </group>
      ))}
    </>
  )
}

export function Terrain() {
  return (
    <>
      <PlaceNames />
      <Ground />
      <RoadMarkings />
      <Water />
      <Boats />
      <Ships />
      <Trees />
      <Lamps />
      <Fillers />
      <Billboards />
      <Merged k="benches"><Benches /></Merged>
    </>
  )
}
