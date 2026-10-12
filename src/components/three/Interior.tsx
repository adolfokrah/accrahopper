'use client'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { FURNITURE, HOMES, isBed } from '@/game/content'
import { PAINTS, canPlace, extCount, footprint, homeLayout, itemsInHome, type HomeItem } from '@/game/home'
import { keyVector, runtime } from '@/game/runtime'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import type { FurnitureType } from '@/game/types'
import { DEFAULT_APPEARANCE } from '@/game/content'
import { Character, type Motion, type Pose, type Prop } from './Character'
import { furnitureUse } from './poses'
import { Part, Walls, actionFocus, bulbMat, windowMat } from './shared'
import { Label } from './Label'

export const INTERIOR_ORIGIN = new THREE.Vector3(300, 0, 300)
const NONE: string[] = []

function Bed({ w, d, kind }: { w: number; d: number; kind: FurnitureType }) {
  const color = kind === 'bed_basic' ? '#9db8d9' : kind === 'bed_comfy' ? '#e9a86f' : kind === 'bed_king' ? '#7e5bb0' : '#6aa8d8'
  return (
    <>
      <Part p={[0, 0.15, 0]} s={[w - 0.08, 0.25, d - 0.08]} c={kind === 'bed_basic' ? '#a77b52' : '#7a4e2d'} />
      <Part p={[0, 0.33, 0]} s={[w - 0.2, 0.2, d - 0.2]} c="#f4f1ea" />
      <Part p={[0.25, 0.45, 0]} s={[w - 0.8, 0.08, d - 0.18]} c={color} />
      <Part p={[-w / 2 + 0.3, 0.46, d > 1.5 ? -0.4 : 0]} s={[0.4, 0.12, 0.5]} c="#ffffff" />
      {d > 1.5 && <Part p={[-w / 2 + 0.3, 0.46, 0.4]} s={[0.4, 0.12, 0.5]} c="#ffffff" />}
      {kind !== 'bed_basic' && <Part p={[-w / 2 + 0.04, 0.6, 0]} s={[0.08, 0.7, d - 0.04]} c="#5b3a29" />}
    </>
  )
}

export function FurnitureModel({ type }: { type: FurnitureType }) {
  const f = FURNITURE[type]
  const fan = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (fan.current) fan.current.rotation.z += dt * 12
  })
  if (isBed(type)) return <Bed w={f.w} d={f.d} kind={type} />
  if (f.build) return <WallPiece type={type} w={f.w} />
  switch (type) {
    case 'toilet':
      return (
        <>
          <Part p={[0, 0.2, 0.05]} s={[0.4, 0.4, 0.45]} c="#f7f7f7" />
          <Part p={[0, 0.55, -0.25]} s={[0.4, 0.5, 0.14]} c="#f0f0f0" />
          <Part p={[0, 0.42, 0.05]} s={[0.36, 0.05, 0.4]} c="#dfe8ee" />
        </>
      )
    case 'shower':
    case 'shower_rain':
      return (
        <>
          <Part p={[0, 0.04, 0]} s={[0.9, 0.08, 0.9]} c="#cfd8dc" />
          <Part p={[0.44, 0.9, 0]} s={[0.04, 1.8, 0.9]} c="#bfe5f5" opacity={0.35} />
          <Part p={[0, 0.9, 0.44]} s={[0.9, 1.8, 0.04]} c="#bfe5f5" opacity={0.35} />
          <Part g="cyl" p={[-0.4, 1.0, -0.4]} s={[0.03, 2, 0.03]} c="#b0b8c4" />
          {type === 'shower_rain' ? <Part g="cyl" p={[-0.2, 1.95, -0.2]} s={[0.3, 0.03, 0.3]} c="#b0b8c4" /> : <Part p={[-0.3, 1.8, -0.3]} s={[0.2, 0.08, 0.2]} c="#b0b8c4" />}
        </>
      )
    case 'fridge':
      return (
        <>
          <Part p={[0, 0.8, 0]} s={[0.72, 1.6, 0.7]} c="#f2f4f6" />
          <Part p={[0, 1.1, 0.36]} s={[0.66, 0.02, 0.02]} c="#9aa4ae" />
          <Part p={[0.28, 1.3, 0.37]} s={[0.04, 0.3, 0.04]} c="#7b8794" />
          <Part p={[0.28, 0.6, 0.37]} s={[0.04, 0.4, 0.04]} c="#7b8794" />
        </>
      )
    case 'sofa':
      return (
        <>
          <Part p={[0, 0.22, 0.05]} s={[1.9, 0.4, 0.8]} c="#d4684f" />
          <Part p={[0, 0.6, -0.3]} s={[1.9, 0.5, 0.2]} c="#c25a43" />
          <Part p={[-0.88, 0.4, 0.05]} s={[0.16, 0.5, 0.8]} c="#b84f3a" />
          <Part p={[0.88, 0.4, 0.05]} s={[0.16, 0.5, 0.8]} c="#b84f3a" />
          <Part p={[-0.4, 0.5, 0.1]} s={[0.4, 0.1, 0.4]} c="#f6d365" />
        </>
      )
    case 'computer':
      return (
        <>
          <Part p={[0, 0.72, 0]} s={[1.9, 0.07, 0.8]} c="#8a5a2b" />
          <Part p={[-0.85, 0.35, 0]} s={[0.07, 0.7, 0.7]} c="#6b4423" />
          <Part p={[0.85, 0.35, 0]} s={[0.07, 0.7, 0.7]} c="#6b4423" />
          <Part p={[0, 1.05, -0.2]} s={[0.75, 0.45, 0.05]} c="#1b2433" />
          <Part p={[0, 1.05, -0.17]} s={[0.67, 0.37, 0.02]} c="#5fb4ff" m={windowMat} cast={false} />
          <Part p={[0, 0.86, -0.2]} s={[0.12, 0.2, 0.08]} c="#333" />
          <Part p={[0, 0.77, 0.15]} s={[0.5, 0.03, 0.18]} c="#2b2b2b" />
          <Part p={[0.6, 0.76, 0.1]} s={[0.1, 0.04, 0.14]} c="#eee" />
          <Part p={[0, 0.42, 0.62]} s={[0.5, 0.07, 0.5]} c="#2b3a55" />
          <Part p={[0, 0.72, 0.86]} s={[0.5, 0.55, 0.07]} c="#2b3a55" />
          <Part g="cyl" p={[0, 0.2, 0.62]} s={[0.04, 0.4, 0.04]} c="#555" />
        </>
      )
    case 'tv':
      return (
        <>
          <Part p={[0, 0.2, 0]} s={[1.8, 0.4, 0.6]} c="#6b4423" />
          <Part p={[0, 0.95, 0]} s={[1.4, 0.8, 0.07]} c="#111" />
          <Part p={[0, 0.95, 0.04]} s={[1.3, 0.7, 0.02]} c="#4aa3ff" m={windowMat} cast={false} />
          <Part p={[0, 0.5, 0]} s={[0.2, 0.2, 0.1]} c="#222" />
        </>
      )
    case 'bookshelf':
      return (
        <>
          <Part p={[0, 0.8, 0]} s={[0.85, 1.6, 0.35]} c="#7a4e2d" />
          {[0.3, 0.7, 1.1, 1.5].map((y, i) => (
            <group key={i}>
              <Part p={[0, y - 0.1, 0.02]} s={[0.78, 0.03, 0.32]} c="#5b3a29" />
              {[-0.25, -0.1, 0.05, 0.2].map((x, j) => (
                <Part key={j} p={[x, y + 0.02, 0.04]} s={[0.1, 0.28, 0.2]} c={['#e0524a', '#2e86de', '#f1b82d', '#2fa866', '#8e5bd0'][(i + j) % 5]} />
              ))}
            </group>
          ))}
        </>
      )
    case 'plant':
      return (
        <>
          <Part g="cyl" p={[0, 0.2, 0]} s={[0.22, 0.4, 0.22]} c="#c8553d" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Part key={i} g="cone" p={[Math.cos(i * 1.26) * 0.15, 0.75, Math.sin(i * 1.26) * 0.15]} r={[Math.sin(i * 1.26) * 0.5, 0, -Math.cos(i * 1.26) * 0.5]} s={[0.1, 0.6, 0.1]} c="#3aa655" />
          ))}
        </>
      )
    case 'fan':
      return (
        <>
          <Part g="cyl" p={[0, 0.03, 0]} s={[0.25, 0.06, 0.25]} c="#444" />
          <Part g="cyl" p={[0, 0.6, 0]} s={[0.03, 1.2, 0.03]} c="#bbb" />
          <group position={[0, 1.2, 0.08]} ref={fan}>
            <Part p={[0, 0, 0]} s={[0.5, 0.06, 0.02]} c="#7ec8f0" />
            <Part p={[0, 0, 0]} s={[0.06, 0.5, 0.02]} c="#7ec8f0" />
          </group>
        </>
      )
    default:
      return <Part p={[0, 0.4, 0]} s={[f.w * 0.8, 0.8, f.d * 0.8]} c="#999" />
  }
}

const WALL_H = 2.1
const WALL_T = 0.18
/** Interior walls, half walls and doorways; they take the home's paint colour. */
function WallPiece({ type, w }: { type: FurnitureType; w: number }) {
  const wall = useGame((s) => s.homeStyle[s.housing.tier]?.wall) ?? PAINTS[0].wall
  if (type === 'wall_half')
    return (
      <>
        <Part p={[0, 0.5, 0]} s={[w, 1.0, WALL_T + 0.1]} c={wall} />
        <Part p={[0, 1.03, 0]} s={[w + 0.04, 0.06, WALL_T + 0.3]} c="#8a5a2b" />
      </>
    )
  if (type === 'doorway')
    return (
      <>
        <Part p={[-0.43, WALL_H / 2, 0]} s={[0.14, WALL_H, WALL_T]} c={wall} />
        <Part p={[0.43, WALL_H / 2, 0]} s={[0.14, WALL_H, WALL_T]} c={wall} />
        <Part p={[0, WALL_H - 0.2, 0]} s={[1, 0.4, WALL_T]} c={wall} />
        <Part p={[0, 0.95, 0]} s={[0.04, 1.9, 0.04]} c="#7a4e2d" cast={false} />
        <group position={[-0.36, 0, 0.03]} rotation={[0, -1.1, 0]}>
          <Part p={[0.36, 0.95, 0]} s={[0.72, 1.85, 0.05]} c="#8a5a2b" />
          <Part p={[0.62, 0.95, 0.05]} s={[0.05, 0.05, 0.06]} c="#f1b82d" />
        </group>
      </>
    )
  return (
    <>
      <Part p={[0, WALL_H / 2, 0]} s={[w, WALL_H, WALL_T]} c={wall} />
      <Part p={[0, WALL_H + 0.03, 0]} s={[w + 0.02, 0.06, WALL_T + 0.04]} c="#e8e2d6" />
      <Part p={[0, 0.06, 0]} s={[w + 0.01, 0.12, WALL_T + 0.04]} c="#7a6a58" cast={false} />
    </>
  )
}

/** White mosquito net canopy over a bed. */
function MosquitoNet({ w, d }: { w: number; d: number }) {
  return (
    <>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Part key={i} g="cyl" p={[(sx * (w - 0.1)) / 2, 1.0, (sz * (d - 0.1)) / 2]} s={[0.025, 2.0, 0.025]} c="#e8e8e8" cast={false} />
      ))}
      <Part p={[0, 1.15, 0]} s={[w - 0.08, 1.5, d - 0.08]} c="#ffffff" opacity={0.22} cast={false} />
      <Part p={[0, 1.92, 0]} s={[w - 0.04, 0.04, d - 0.04]} c="#ffffff" opacity={0.5} cast={false} />
    </>
  )
}

/** Something fixed to whichever back wall the camera can currently see (walls facing the camera are hidden). */
function WallMounted({ w, d, t, y, children }: { w: number; d: number; t: number; y: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!g.current) return
    const yaw = (globalThis as unknown as { __camYaw?: number }).__camYaw ?? Math.PI / 4
    const sx = Math.sin(yaw)
    const cz = Math.cos(yaw)
    // prefer the wall seen most squarely
    if (Math.abs(cz) >= Math.abs(sx)) {
      if (cz > 0) { g.current.position.set(w * t, y, 0.02); g.current.rotation.y = 0 }
      else { g.current.position.set(w * (1 - t), y, d - 0.02); g.current.rotation.y = Math.PI }
    } else if (sx > 0) { g.current.position.set(0.02, y, d * (1 - t)); g.current.rotation.y = Math.PI / 2 }
    else { g.current.position.set(w - 0.02, y, d * t); g.current.rotation.y = -Math.PI / 2 }
  })
  return <group ref={g}>{children}</group>
}

function AirCon() {
  const flap = useRef<THREE.Group>(null)
  useFrame((st) => { if (flap.current) flap.current.rotation.x = 0.3 + Math.sin(st.clock.elapsedTime * 1.5) * 0.15 })
  return (
    <>
      <Part p={[0, 0, 0.13]} s={[1.1, 0.34, 0.24]} c="#f7f8fa" />
      <Part p={[0, 0.06, 0.255]} s={[1.0, 0.03, 0.01]} c="#d5dbe2" cast={false} />
      <group ref={flap} position={[0, -0.13, 0.25]}><Part p={[0, 0, 0]} s={[0.95, 0.02, 0.06]} c="#dfe4ea" cast={false} /></group>
      <Part p={[0.45, 0.08, 0.256]} s={[0.04, 0.04, 0.01]} c="#35d07f" m={bulbMat} cast={false} />
    </>
  )
}

function SolarInverter() {
  return (
    <>
      <Part p={[0, 0, 0.09]} s={[0.5, 0.65, 0.16]} c="#2b3a55" />
      <Part p={[0, 0.12, 0.175]} s={[0.3, 0.18, 0.01]} c="#5fb4ff" m={windowMat} cast={false} />
      <Part p={[-0.12, -0.15, 0.175]} s={[0.05, 0.05, 0.01]} c="#35d07f" m={bulbMat} cast={false} />
      <Part p={[0, -0.75, 0.2]} s={[0.55, 0.5, 0.36]} c="#3a3f47" />
      <Part p={[0, -0.48, 0.2]} s={[0.2, 0.05, 0.1]} c="#f1b82d" cast={false} />
    </>
  )
}

function Item({ item, onClick, selected, dragging, onDragStart, net }: { item: HomeItem; onClick: () => void; selected: boolean; dragging: boolean; onDragStart: () => boolean; net: boolean }) {
  const f = footprint(item.type, item.rot)
  const raw = FURNITURE[item.type]
  return (
    <group
      position={[item.x + f.w / 2, 0.12, item.y + f.d / 2]}
      visible={!dragging}
      onPointerDown={(e) => {
        if (onDragStart()) e.stopPropagation()
      }}
      onClick={(e) => {
        if (e.delta > 6) return
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = useUI.getState().editMode ? 'grab' : 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      <group rotation={[0, item.rot ? -Math.PI / 2 : 0, 0]}>
        <FurnitureModel type={item.type} />
        {net && isBed(item.type) && <MosquitoNet w={raw.w} d={raw.d} />}
      </group>
      {selected && (
        <mesh position={[0, 0.03, 0]} scale={[f.w + 0.15, 0.04, f.d + 0.15]}>
          <boxGeometry />
          <meshBasicMaterial color="#ffd23f" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}

export function Interior({ visible }: { visible: boolean }) {
  const tier = useGame((s) => s.viewing ?? s.housing.tier)
  const viewing = useGame((s) => s.viewing)
  const ownInventory = useGame((s) => s.inventory)
  const ext = useGame((s) => (s.viewing ? 0 : extCount(s.upgrades[s.housing.tier])))
  const upg = useGame((s) => (s.viewing ? NONE : s.upgrades[s.housing.tier] ?? NONE))
  const style = useGame((s) => (s.viewing ? undefined : s.homeStyle[s.housing.tier]))
  const inventory = useMemo(() => (viewing ? [] : ownInventory), [viewing, ownInventory])
  const activity = useGame((s) => s.activity)
  const hookup = useGame((s) => s.hookup)
  const profile = useGame((s) => s.profile)
  const home = HOMES[tier]
  const lay = homeLayout(tier, ext)
  // style is a dependency: moved fixtures live in homeStyle
  const items = useMemo(() => itemsInHome(tier, inventory), [tier, inventory, style]) // eslint-disable-line react-hooks/exhaustive-deps
  const painted = upg.includes('paint')
  const selected = useUI((s) => s.selectedFurniture)
  const holdingUid = useUI((s) => s.holdingUid)
  const dragUid = useUI((s) => s.dragUid)
  const holdRot = useUI((s) => s.holdRot)
  const editMode = useUI((s) => s.editMode)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const { w, d } = lay
  const movingUid = dragUid ?? holdingUid
  const moving = movingUid === null ? undefined : items.find((o) => o.id === movingUid) ?? inventory.map((o) => ({ id: o.uid, type: o.type })).find((o) => o.id === movingUid)
  const ghost = useMemo(() => {
    if (!moving || !cursor) return null
    const fp = footprint(moving.type, holdRot)
    const x = cursor.x - Math.floor((fp.w - 1) / 2)
    const y = cursor.y - Math.floor((fp.d - 1) / 2)
    return { x, y, fp, ok: canPlace(tier, inventory, moving.type, x, y, holdRot, moving.id, ext).ok }
  }, [moving, cursor, holdRot, tier, inventory, ext])
  const ghostRef = useRef(ghost)
  ghostRef.current = ghost

  // finish a drag wherever the pointer is released
  useEffect(() => {
    if (dragUid === null) return
    const up = () => {
      const g = ghostRef.current
      const ui = useUI.getState()
      if (g && g.ok && ui.dragUid !== null) useGame.getState().placeFurniture(ui.dragUid, g.x, g.y, ui.holdRot)
      useUI.setState({ dragUid: null })
      setCursor(null)
    }
    const cancel = () => { useUI.setState({ dragUid: null }); setCursor(null) }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') useUI.setState((u) => ({ holdRot: u.holdRot === 0 ? 1 : 0 }))
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key)
    }
  }, [dragUid])

  const player = useRef<THREE.Group>(null)
  const cur = useRef({ x: lay.door.x + 0.5, z: lay.door.y + 0.3, y: 0 })
  const motion = useRef<Motion>({ moving: false, speed: 0, action: null, prop: null })
  const lastSel = useRef<number | null>(null)
  // put the player at the door whenever they come in, change home, or the room grows
  useEffect(() => {
    if (!visible) return
    cur.current = { x: lay.door.x + 0.5, z: lay.door.y + 0.3, y: 0 }
    runtime.insideTarget = null
    if (player.current) player.current.position.set(cur.current.x, 0.12, cur.current.z)
  }, [visible, tier, ext, lay.door.x, lay.door.y])

  /** Furniture cells block walking (the door cell never does). */
  const blockedAt = (x: number, z: number) => {
    for (const it of items) {
      if (FURNITURE[it.type].walkable) continue
      const fp = footprint(it.type, it.rot)
      if (x > it.x - 0.15 && x < it.x + fp.w + 0.15 && z > it.y - 0.15 && z < it.y + fp.d + 0.15) return true
    }
    return false
  }

  /** Grid route around walls and furniture (through doorways) to a point; waypoints exclude the point itself. */
  const route = useRef<{ key: string; pts: { x: number; z: number }[] } | null>(null)
  const planRoute = (fx: number, fz: number, tx: number, tz: number) => {
    const cell = (x: number, z: number) => Math.min(d - 1, Math.max(0, Math.floor(z))) * w + Math.min(w - 1, Math.max(0, Math.floor(x)))
    const solid = new Uint8Array(w * d)
    for (const it of items) {
      if (FURNITURE[it.type].walkable) continue
      const fp = footprint(it.type, it.rot)
      for (let z = it.y; z < it.y + fp.d; z++) for (let x = it.x; x < it.x + fp.w; x++) if (x >= 0 && z >= 0 && x < w && z < d) solid[z * w + x] = 1
    }
    const start = cell(fx, fz)
    const goal = cell(tx, tz)
    solid[start] = 0
    solid[goal] = 0
    const prev = new Int32Array(w * d).fill(-1)
    prev[start] = start
    const queue = [start]
    while (queue.length) {
      const i = queue.shift()!
      if (i === goal) break
      const x = i % w
      const z = (i - x) / w
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        if (nx < 0 || nz < 0 || nx >= w || nz >= d) continue
        const j = nz * w + nx
        if (solid[j] || prev[j] >= 0) continue
        prev[j] = i
        queue.push(j)
      }
    }
    if (prev[goal] < 0) return []
    const cells: { x: number; z: number }[] = []
    for (let i = goal; i !== start; i = prev[i]) cells.unshift({ x: (i % w) + 0.5, z: Math.floor(i / w) + 0.5 })
    cells.pop()
    // drop waypoints you can walk straight past
    const clear = (a: { x: number; z: number }, b: { x: number; z: number }) => {
      const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.15)
      for (let k = 1; k < n; k++) if (blockedAt(a.x + ((b.x - a.x) * k) / n, a.z + ((b.z - a.z) * k) / n)) return false
      return true
    }
    const out: { x: number; z: number }[] = []
    let from = { x: fx, z: fz }
    for (let k = 0; k < cells.length; k++) {
      const next = cells[k + 1] ?? { x: tx, z: tz }
      if (!clear(from, next)) { out.push(cells[k]); from = cells[k] }
    }
    return out
  }
  /** Next point to head for on the way to (tx, tz). */
  const nextStep = (tx: number, tz: number) => {
    const c = cur.current
    const key = `${tx.toFixed(2)},${tz.toFixed(2)}`
    if (route.current?.key !== key) route.current = { key, pts: planRoute(c.x, c.z, tx, tz) }
    const pts = route.current.pts
    while (pts.length && Math.hypot(pts[0].x - c.x, pts[0].z - c.z) < 0.12) pts.shift()
    return pts[0] ?? null
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    if (!visible || !player.current) return
    const c = cur.current
    let target: { x: number; z: number; face?: number; y?: number; pose?: Pose | null; prop?: Prop | null; perform: boolean } | null = null
    const approach = (id: number, actId: string, perform: boolean) => {
      const it = items.find((i) => i.id === id)
      if (!it) return null
      const fp = footprint(it.type, it.rot)
      const cx = it.x + fp.w / 2
      const cz = it.y + fp.d / 2
      const u = furnitureUse(it.type, actId)
      const fr = it.rot ? -Math.PI / 2 : 0
      const ux = perform ? u.dx : 0
      const uz = perform ? u.dz : Math.max(u.dz, FURNITURE[it.type].d / 2 + 0.45)
      return { x: cx + ux * Math.cos(fr) + uz * Math.sin(fr), z: cz - ux * Math.sin(fr) + uz * Math.cos(fr), face: fr + (perform ? u.face : Math.PI), y: perform ? u.y ?? 0 : 0, pose: perform ? u.pose : null, prop: perform ? u.prop ?? null : null, perform }
    }
    if (activity && activity.ctx.furnitureUid !== undefined) target = approach(activity.ctx.furnitureUid, activity.defId, true)
    else if (selected !== null && selected !== lastSel.current && !editMode) {
      const a = approach(selected, '', false)
      if (a) runtime.insideTarget = { x: a.x, z: a.z }
    }
    lastSel.current = selected

    if (target) {
      const via = nextStep(target.x, target.z)
      const dx = (via ?? target).x - c.x
      const dz = (via ?? target).z - c.z
      const dist = Math.hypot(dx, dz)
      if (via || dist > 0.03) {
        const k = Math.min(1, (3.0 * dt) / dist)
        c.x += dx * k
        c.z += dz * k
        c.y += (0 - c.y) * Math.min(1, dt * 10)
        player.current.rotation.y = Math.atan2(dx, dz)
        motion.current = { moving: true, speed: 2.4, action: null, prop: null }
      } else {
        let diff = (target.face ?? 0) - player.current.rotation.y
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        player.current.rotation.y += diff * Math.min(1, dt * 8)
        c.y += ((target.y ?? 0) - c.y) * Math.min(1, dt * 8)
        motion.current = { moving: false, speed: 0, action: target.pose ?? null, prop: target.prop ?? null }
      }
    } else {
      // free walking: WASD or click the floor
      c.y += (0 - c.y) * Math.min(1, dt * 10)
      const kv = keyVector()
      let vx = 0
      let vz = 0
      if (kv.x || kv.z) {
        runtime.insideTarget = null
        route.current = null
        vx = kv.x
        vz = kv.z
      } else if (runtime.insideTarget) {
        const t = runtime.insideTarget
        const via = nextStep(t.x, t.z) ?? t
        const fx = via.x - c.x
        const fz = via.z - c.z
        const fd = Math.hypot(fx, fz)
        if (via === t && fd < 0.06) runtime.insideTarget = null
        else if (fd > 1e-4) { vx = fx / fd; vz = fz / fd }
      }
      if (vx || vz) {
        const step = 3.0 * dt
        const nx = Math.min(w - 0.25, Math.max(0.25, c.x + vx * step))
        const nz = Math.min(d - 0.05, Math.max(0.25, c.z + vz * step))
        const goingTo = runtime.insideTarget
        const intoTarget = (x: number, z: number) => goingTo && Math.hypot(goingTo.x - x, goingTo.z - z) < 0.6
        // standing inside furniture (e.g. something was placed on you): let them walk out freely
        const stuck = blockedAt(c.x, c.z)
        const ox = c.x
        const oz = c.z
        if (stuck || !blockedAt(nx, c.z) || intoTarget(nx, c.z)) c.x = nx
        if (stuck || !blockedAt(c.x, nz) || intoTarget(c.x, nz)) c.z = nz
        // can't get any closer to a clicked spot: stop instead of pushing against furniture forever
        if (goingTo && c.x === ox && c.z === oz) runtime.insideTarget = null
        player.current.rotation.y = Math.atan2(vx, vz)
        motion.current = { moving: true, speed: 2.4, action: null, prop: null }
      } else motion.current = { moving: false, speed: 0, action: null, prop: null }
    }
    player.current.position.set(c.x, 0.12 + c.y, c.z)
    actionFocus.active = !!activity
    actionFocus.x = INTERIOR_ORIGIN.x + c.x
    actionFocus.z = INTERIOR_ORIGIN.z + c.z
  })

  const checker = useMemo(() => {
    const out: { x: number; z: number; alt: boolean }[] = []
    for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) out.push({ x, z, alt: (x + z) % 2 === 0 })
    return out
  }, [w, d])

  const wallColor = painted ? style?.wall ?? PAINTS[0].wall : tier === 'room' ? '#f2d7b6' : tier === 'apartment' ? '#cfe6e4' : '#efe9dc'
  const floorA = painted ? style?.floor ?? PAINTS[0].floor : home.floor
  const floorB = painted ? shade(floorA, 0.88) : shade(home.floor)
  const pctShown = activity && activity.ctx.furnitureUid !== undefined ? Math.round((activity.done / activity.total) * 100) : null

  const setC = (e: ThreeEvent<PointerEvent>) => {
    const x = Math.floor(e.point.x - INTERIOR_ORIGIN.x)
    const y = Math.floor(e.point.z - INTERIOR_ORIGIN.z)
    setCursor((c) => (c && c.x === x && c.y === y ? c : { x, y }))
  }

  return (
    <group position={INTERIOR_ORIGIN} visible={visible}>
      {checker.map((t) => (
        <Part key={`${t.x}-${t.z}`} p={[t.x + 0.5, 0.05, t.z + 0.5]} s={painted ? [0.96, 0.1, 0.96] : [1, 0.1, 1]} c={t.alt ? floorA : floorB} cast={false} />
      ))}
      <Part p={[w / 2, -0.3, d / 2]} s={[w + 0.5, 0.6, d + 0.5]} c={painted ? '#bdb6aa' : '#6b5a4a'} cast={false} />
      {upg.includes('ac') && <WallMounted w={w} d={d} t={0.72} y={2.35}><AirCon /></WallMounted>}
      {upg.includes('generator') && (
        <>
          <WallMounted w={w} d={d} t={0.12} y={1.5}><SolarInverter /></WallMounted>
          <Part g="sphere" p={[w / 4, 2.8, d / 4]} s={0.1} m={bulbMat} cast={false} />
          <Part g="sphere" p={[(3 * w) / 4, 2.8, (3 * d) / 4]} s={0.1} m={bulbMat} cast={false} />
          <pointLight position={[w / 4, 2.5, d / 4]} intensity={visible ? 5 : 0} distance={10} color="#fff4dc" />
        </>
      )}
      <Walls w={w} d={d} color={wallColor} h={3} />
      <Part g="sphere" p={[w / 2, 2.8, d / 2]} s={0.14} m={bulbMat} cast={false} />
      <pointLight position={[w / 2, 2.6, d / 2]} intensity={visible ? 12 : 0} distance={18} color="#ffe2b0" />

      <group
        position={[lay.door.x + 0.5, 0.11, lay.door.y + 0.5]}
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta > 6) return
          if (!useUI.getState().holdingUid && !useUI.getState().dragUid) useGame.getState().exitHome()
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}
      >
        <Part p={[0, 0, 0]} s={[0.9, 0.04, 0.9]} c="#35d07f" />
        <Label id="home-exit" y={0.6} cls="loc-label sel" text="🚪 Exit" />
      </group>

      {/* floor: walk, place or drop */}
      <mesh
        position={[w / 2, 0.11, d / 2]}
        rotation-x={-Math.PI / 2}
        onPointerMove={(e) => { if (movingUid !== null) setC(e) }}
        onPointerDown={(e) => { if (movingUid !== null) setC(e) }}
        onClick={(e) => {
          if (e.delta > 6) return
          const ui = useUI.getState()
          if (ui.holdingUid !== null && moving) {
            // compute from the tap itself (on touch there is no hover to place the ghost first)
            const fp = footprint(moving.type, ui.holdRot)
            const x = Math.floor(e.point.x - INTERIOR_ORIGIN.x) - Math.floor((fp.w - 1) / 2)
            const y = Math.floor(e.point.z - INTERIOR_ORIGIN.z) - Math.floor((fp.d - 1) / 2)
            setC(e as unknown as ThreeEvent<PointerEvent>)
            if (useGame.getState().placeFurniture(ui.holdingUid, x, y, ui.holdRot)) {
              useUI.setState({ holdingUid: null })
              setCursor(null)
            }
            return
          }
          useUI.setState({ selectedFurniture: null })
          runtime.insideTarget = { x: e.point.x - INTERIOR_ORIGIN.x, z: e.point.z - INTERIOR_ORIGIN.z }
        }}
      >
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {items.map((it) => (
        <Item
          key={it.id}
          item={it}
          selected={selected === it.id}
          dragging={dragUid === it.id || holdingUid === it.id}
          net={upg.includes('net')}
          onDragStart={() => {
            const ui = useUI.getState()
            if (!ui.editMode || ui.holdingUid) return false
            useUI.setState({ dragUid: it.id, holdRot: it.rot, selectedFurniture: it.id })
            setCursor({ x: it.x + Math.floor((footprint(it.type, it.rot).w - 1) / 2), y: it.y + Math.floor((footprint(it.type, it.rot).d - 1) / 2) })
            return true
          }}
          onClick={() => {
            const ui = useUI.getState()
            if (ui.holdingUid || ui.dragUid) return
            useUI.setState({ selectedFurniture: it.id, panel: 'home' })
          }}
        />
      ))}

      {ghost && moving && (
        <group position={[ghost.x + ghost.fp.w / 2, 0.12, ghost.y + ghost.fp.d / 2]}>
          <group rotation={[0, holdRot ? -Math.PI / 2 : 0, 0]}>
            <FurnitureModel type={moving.type} />
          </group>
          <mesh position={[0, 0.03, 0]} scale={[ghost.fp.w - 0.05, 0.05, ghost.fp.d - 0.05]}>
            <boxGeometry />
            <meshBasicMaterial color={ghost.ok ? '#35d07f' : '#e0524a'} transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      <group ref={player} position={[lay.door.x + 0.5, 0.12, lay.door.y + 0.3]}>
        <Character appearance={profile?.appearance ?? DEFAULT_APPEARANCE} getMotion={() => motion.current} />
        {hookup && activity?.defId === 'intimate' && (
          <group position={[0.5, 0, 0.05]}>
            <Character appearance={hookup.look} getMotion={() => motion.current} />
            <Label id="home-hookup" y={1.6} cls="npc-tag" text={`💞 ${hookup.name}`} />
          </group>
        )}
        {pctShown !== null && activity && <Label id="home-bubble" y={1.9} cls="bubble" text={`${activity.icon} ${pctShown}%`} />}
      </group>
    </group>
  )
}

function shade(hex: string, k = 0.93) {
  const c = new THREE.Color(hex)
  c.multiplyScalar(k)
  return `#${c.getHexString()}`
}
