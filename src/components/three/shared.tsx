'use client'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useLayoutEffect, type ReactNode } from 'react'

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 12, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 8),
  ico: new THREE.IcosahedronGeometry(1, 0),
  hemi: new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  torus: new THREE.TorusGeometry(1, 0.12, 6, 14),
  /** Low-poly ball for tiny lights seen from far away (thousands are instanced). */
  dot: new THREE.OctahedronGeometry(1, 0),
}
export type GeoId = keyof typeof GEO

const cache = new Map<string, THREE.MeshStandardMaterial>()
/** Shared materials whose meshes may be batched by <Merged>. */
const mergeable = new WeakSet<THREE.Material>()
export function getMat(color: string, opacity = 1, rough = 0.85): THREE.MeshStandardMaterial {
  const k = `${color}|${opacity}|${rough}`
  let m = cache.get(k)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02, flatShading: true, transparent: opacity < 1, opacity })
    cache.set(k, m)
    mergeable.add(m)
  }
  return m
}

/** Materials whose glow follows the day/night cycle. */
export const windowMat = new THREE.MeshStandardMaterial({ color: '#a8d8f0', emissive: '#ffd27a', emissiveIntensity: 0, roughness: 0.3, metalness: 0.1 })
export const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffe08a', emissiveIntensity: 0, roughness: 0.4 })
mergeable.add(windowMat)
mergeable.add(bulbMat)
export const headlightMat = new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: '#fff1a8', emissiveIntensity: 0.2 })
export const lighting = { night: 0 }

export type V3 = [number, number, number]
interface PartProps {
  g?: GeoId
  p?: V3
  s?: V3 | number
  r?: V3
  c?: string
  m?: THREE.Material
  cast?: boolean
  recv?: boolean
  opacity?: number
  rough?: number
}
export function Part({ g = 'box', p, s = 1, r, c = '#ffffff', m, cast = true, recv = true, opacity, rough }: PartProps) {
  return <mesh geometry={GEO[g]} material={m ?? getMat(c, opacity, rough)} position={p} scale={s} rotation={r} castShadow={cast} receiveShadow={recv} />
}

export const isoOffset = new THREE.Vector3(44, 50, 44)

/** Where the camera should focus while the player performs an action indoors. */
export const actionFocus = { active: false, x: 0, z: 0 }

/** Centre of what the camera is looking at (world tiles); drives recycling and LOD. */
export const viewCenter = { x: 0, z: 0 }
/** Multiplies label visibility ranges (shrunk during first-person rides). */
export const labelScale = { v: 1 }

/** Four room walls; the ones between the camera and the room hide automatically as you rotate. */
import { useFrame as useFrameR3F } from '@react-three/fiber'
import { useRef as useRefR } from 'react'
/** Optional finish for room walls: skirting, wainscot panels, rails, crown moulding, curtains or burglar bars at the windows. */
export interface WallSkin {
  base?: string
  baseH?: number
  panel?: string
  panelH?: number
  /** Raised panel face inside the wainscot. */
  inset?: string
  rail?: string
  crown?: string
  curtain?: string
  /** Window size multiplier (premium homes get tall windows). */
  winScale?: number
  bars?: boolean
  /** Grime band along the bottom of bare plaster walls. */
  grime?: string
}
function WallFinish({ len, h, skin, hasWin, ws }: { len: number; h: number; skin: WallSkin; hasWin: boolean; ws: number }) {
  const z = 0.13
  const strip = (y: number, hh: number, c: string, depth = 0.05, key?: string) => <mesh key={key} geometry={GEO.box} material={getMat(c, 1, 0.5)} position={[len / 2, y, z]} scale={[len, hh, depth]} receiveShadow />
  const wh = 1.1 * ws
  const panels = Math.max(1, Math.floor(len / 1.1))
  return (
    <>
      {skin.grime && <mesh geometry={GEO.box} material={getMat(skin.grime)} position={[len / 2, 0.35, 0.11]} scale={[len, 0.7, 0.01]} />}
      {skin.panel && strip((skin.panelH ?? 1) / 2, skin.panelH ?? 1, skin.panel, 0.03)}
      {skin.panel && Array.from({ length: panels }, (_, i) => (
        <mesh key={i} geometry={GEO.box} material={getMat(skin.inset ?? skin.panel!, 1, 0.5)} position={[((i + 0.5) * len) / panels, (skin.panelH ?? 1) / 2, z + 0.02]} scale={[len / panels - 0.25, (skin.panelH ?? 1) - 0.3, 0.015]} />
      ))}
      {skin.panel && skin.rail && strip(skin.panelH ?? 1, 0.06, skin.rail, 0.08)}
      {skin.base && strip((skin.baseH ?? 0.14) / 2 + 0.1, skin.baseH ?? 0.14, skin.base, 0.06)}
      {skin.crown && strip(h - 0.08, 0.16, skin.crown, 0.12)}
      {hasWin && skin.curtain && [-1, 1].map((sd) => (
        <mesh key={sd} geometry={GEO.box} material={getMat(skin.curtain!, 1, 0.9)} position={[len / 2 + sd * (0.7 * ws + 0.25), 1.7 + (ws - 1) * 0.3, 0.2]} scale={[0.4, wh + 0.8, 0.06]} castShadow />
      ))}
      {hasWin && skin.curtain && <mesh geometry={GEO.box} material={getMat(skin.rail ?? '#c9a24a', 1, 0.4)} position={[len / 2, 1.7 + wh / 2 + 0.45 + (ws - 1) * 0.3, 0.22]} scale={[1.4 * ws + 1.2, 0.05, 0.05]} />}
      {hasWin && skin.bars && Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} geometry={GEO.box} material={getMat('#3d4046', 1, 0.5)} position={[len / 2 - 0.6 + i * 0.3, 1.7, 0.17]} scale={[0.03, wh, 0.03]} />
      ))}
    </>
  )
}

export function Walls({ w, d, color, h = 3.2, windows = true, skin }: { w: number; d: number; color: string; h?: number; windows?: boolean; skin?: WallSkin }) {
  const n = useRefR<THREE.Group>(null)
  const sth = useRefR<THREE.Group>(null)
  const we = useRefR<THREE.Group>(null)
  const ea = useRefR<THREE.Group>(null)
  useFrameR3F(() => {
    const yaw = (globalThis as unknown as { __camYaw?: number }).__camYaw ?? Math.PI / 4
    const sx = Math.sin(yaw)
    const cz = Math.cos(yaw)
    if (n.current) n.current.visible = cz > 0.15
    if (sth.current) sth.current.visible = cz < -0.15
    if (we.current) we.current.visible = sx > 0.15
    if (ea.current) ea.current.visible = sx < -0.15
  })
  const m = getMat(color)
  const ws = skin?.winScale ?? 1
  const win = (len: number, axis: 'x' | 'z') => windows && len > 3 ? (
    <mesh geometry={GEO.box} material={windowMat} position={axis === 'x' ? [len / 2, 1.7 + (ws - 1) * 0.3, 0.12] : [0.12, 1.7 + (ws - 1) * 0.3, len / 2]} scale={axis === 'x' ? [1.4 * ws, 1.1 * ws, 0.06] : [0.06, 1.1 * ws, 1.4 * ws]} />
  ) : null
  // finishes are built along +x; west/east walls turn them to run along z
  const fin = (len: number) => skin ? <WallFinish len={len} h={h} skin={skin} hasWin={windows && len > 3} ws={ws} /> : null
  return (
    <>
      <group ref={n} position={[0, 0, -0.1]}>
        <mesh geometry={GEO.box} material={m} position={[w / 2, h / 2, 0]} scale={[w + 0.4, h, 0.2]} receiveShadow />
        {win(w, 'x')}
        {fin(w)}
      </group>
      <group ref={sth} position={[0, 0, d + 0.1]}>
        <mesh geometry={GEO.box} material={m} position={[w / 2, h / 2, 0]} scale={[w + 0.4, h, 0.2]} receiveShadow />
        <group rotation={[0, Math.PI, 0]} position={[w, 0, 0]}>{win(w, 'x')}{fin(w)}</group>
      </group>
      <group ref={we} position={[-0.1, 0, 0]}>
        <mesh geometry={GEO.box} material={m} position={[0, h / 2, d / 2]} scale={[0.2, h, d]} receiveShadow />
        {win(d, 'z')}
        <group rotation={[0, Math.PI / 2, 0]} position={[0, 0, d]}>{fin(d)}</group>
      </group>
      <group ref={ea} position={[w + 0.1, 0, 0]}>
        <mesh geometry={GEO.box} material={m} position={[0, h / 2, d / 2]} scale={[0.2, h, d]} receiveShadow />
        <group rotation={[0, Math.PI, 0]} position={[0, 0, d]}>{win(d, 'z')}</group>
        <group rotation={[0, -Math.PI / 2, 0]}>{fin(d)}</group>
      </group>
    </>
  )
}

/**
 * Batches the static meshes below it into one draw call per material (built once on mount and when `k` changes).
 * Animated parts must sit under an object with `userData={{ noMerge: true }}`; meshes with their own materials are left alone.
 */
export function Merged({ children, k }: { children: ReactNode; k?: string | number }) {
  const root = useRefR<THREE.Group>(null)
  useLayoutEffect(() => {
    const g = root.current
    if (!g) return
    g.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert()
    const m = new THREE.Matrix4()
    const buckets = new Map<string, { mat: THREE.Material; cast: boolean; recv: boolean; geos: THREE.BufferGeometry[]; src: THREE.Mesh[] }>()
    const walk = (o: THREE.Object3D) => {
      if (o.userData.noMerge || o.userData.merged || !o.visible) return
      const mesh = o as THREE.Mesh
      if (mesh.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(mesh.material) && mergeable.has(mesh.material)) {
        const geo = mesh.geometry.clone()
        for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name)
        geo.applyMatrix4(m.multiplyMatrices(inv, mesh.matrixWorld))
        const key = `${mesh.material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${geo.index ? 1 : 0}`
        let b = buckets.get(key)
        if (!b) buckets.set(key, (b = { mat: mesh.material, cast: mesh.castShadow, recv: mesh.receiveShadow, geos: [], src: [] }))
        b.geos.push(geo)
        b.src.push(mesh)
      }
      for (const c of o.children) walk(c)
    }
    walk(g)
    const made: THREE.Mesh[] = []
    const off: THREE.Mesh[] = []
    for (const b of buckets.values()) {
      if (b.geos.length < 2) { b.geos.forEach((x) => x.dispose()); continue }
      const merged = mergeGeometries(b.geos, false)
      b.geos.forEach((x) => x.dispose())
      if (!merged) continue
      const mesh = new THREE.Mesh(merged, b.mat)
      mesh.castShadow = b.cast
      mesh.receiveShadow = b.recv
      mesh.userData.merged = true
      // clicks still land on the hidden originals
      mesh.raycast = () => {}
      g.add(mesh)
      made.push(mesh)
      for (const h of b.src) { h.visible = false; off.push(h) }
    }
    return () => {
      made.forEach((x) => { g.remove(x); x.geometry.dispose() })
      off.forEach((h) => { h.visible = true })
    }
  }, [k])
  return <group ref={root}>{children}</group>
}
