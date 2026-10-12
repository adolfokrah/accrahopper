'use client'
import * as THREE from 'three'

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 12, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 8),
  ico: new THREE.IcosahedronGeometry(1, 0),
  hemi: new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  torus: new THREE.TorusGeometry(1, 0.12, 6, 14),
}
export type GeoId = keyof typeof GEO

const cache = new Map<string, THREE.MeshStandardMaterial>()
export function getMat(color: string, opacity = 1, rough = 0.85): THREE.MeshStandardMaterial {
  const k = `${color}|${opacity}|${rough}`
  let m = cache.get(k)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02, flatShading: true, transparent: opacity < 1, opacity })
    cache.set(k, m)
  }
  return m
}

/** Materials whose glow follows the day/night cycle. */
export const windowMat = new THREE.MeshStandardMaterial({ color: '#a8d8f0', emissive: '#ffd27a', emissiveIntensity: 0, roughness: 0.3, metalness: 0.1 })
export const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffe08a', emissiveIntensity: 0, roughness: 0.4 })
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
export function Walls({ w, d, color, h = 3.2, windows = true }: { w: number; d: number; color: string; h?: number; windows?: boolean }) {
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
  const win = (len: number, axis: 'x' | 'z') => windows && len > 3 ? (
    <mesh geometry={GEO.box} material={windowMat} position={axis === 'x' ? [len / 2, 1.7, 0.12] : [0.12, 1.7, len / 2]} scale={axis === 'x' ? [1.4, 1.1, 0.06] : [0.06, 1.1, 1.4]} />
  ) : null
  return (
    <>
      <group ref={n} position={[0, 0, -0.1]}>
        <mesh geometry={GEO.box} material={m} position={[w / 2, h / 2, 0]} scale={[w + 0.4, h, 0.2]} receiveShadow />
        {win(w, 'x')}
      </group>
      <group ref={sth} position={[0, 0, d + 0.1]}>
        <mesh geometry={GEO.box} material={m} position={[w / 2, h / 2, 0]} scale={[w + 0.4, h, 0.2]} receiveShadow />
        <group rotation={[0, Math.PI, 0]} position={[w, 0, 0]}>{win(w, 'x')}</group>
      </group>
      <group ref={we} position={[-0.1, 0, 0]}>
        <mesh geometry={GEO.box} material={m} position={[0, h / 2, d / 2]} scale={[0.2, h, d]} receiveShadow />
        {win(d, 'z')}
      </group>
      <group ref={ea} position={[w + 0.1, 0, 0]}>
        <mesh geometry={GEO.box} material={m} position={[0, h / 2, d / 2]} scale={[0.2, h, d]} receiveShadow />
        <group rotation={[0, Math.PI, 0]} position={[0, 0, d]}>{win(d, 'z')}</group>
      </group>
    </>
  )
}
