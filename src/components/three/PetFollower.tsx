'use client'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import { useGame } from '@/game/store'
import type { PetType } from '@/game/types'
import { Part } from './shared'

const COAT: Record<PetType, { body: string; dark: string; size: number }> = {
  dog: { body: '#b98a5a', dark: '#7a5232', size: 1 },
  guard: { body: '#c08a4a', dark: '#1e1a17', size: 1.35 },
  cat: { body: '#e8a85a', dark: '#9a5a2a', size: 0.7 },
  parrot: { body: '#9aa4ae', dark: '#c0392b', size: 1 },
}

/** Low-poly dog or cat: legs trot while moving, tail wags. */
function Quadruped({ type, legs, tail }: { type: PetType; legs: React.RefObject<(THREE.Group | null)[]>; tail: React.RefObject<THREE.Group | null> }) {
  const c = COAT[type]
  const cat = type === 'cat'
  return (
    <group scale={c.size}>
      <Part p={[0, 0.3, 0]} s={[0.2, 0.18, 0.46]} c={c.body} />
      {type === 'guard' && <Part p={[0, 0.36, -0.04]} s={[0.21, 0.08, 0.36]} c={c.dark} />}
      <Part p={[0, 0.42, 0.27]} s={[0.17, 0.17, 0.17]} c={c.body} />
      <Part p={[0, 0.39, 0.38]} s={[0.09, 0.08, 0.1]} c={cat ? c.body : c.dark} />
      <Part g="sphere" p={[0, 0.4, 0.43]} s={0.022} c="#111" />
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <Part g="sphere" p={[0.045 * sd, 0.46, 0.355]} s={0.016} c="#111" />
          <Part g="cone" p={[0.06 * sd, 0.54, 0.25]} s={[0.04, cat ? 0.09 : 0.08, 0.04]} r={[0, 0, -0.25 * sd]} c={cat || type === 'guard' ? c.body : c.dark} />
        </group>
      ))}
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz], i) => (
        <group key={i} ref={(el) => { legs.current![i] = el }} position={[0.07 * sx, 0.24, 0.15 * sz]}>
          <Part p={[0, -0.11, 0]} s={[0.05, 0.22, 0.05]} c={i < 2 ? c.body : c.dark} />
        </group>
      ))}
      <group ref={tail} position={[0, 0.36, -0.23]}>
        <Part p={[0, cat ? 0.12 : 0.05, -0.05]} s={[0.035, cat ? 0.26 : 0.14, 0.035]} r={[cat ? 0.2 : -0.8, 0, 0]} c={c.dark} />
      </group>
    </group>
  )
}

function Parrot({ wings }: { wings: React.RefObject<(THREE.Group | null)[]> }) {
  return (
    <group scale={0.9}>
      <Part g="sphere" p={[0, 0, 0]} s={[0.07, 0.1, 0.07]} c="#9aa4ae" />
      <Part g="sphere" p={[0, 0.11, 0.02]} s={0.055} c="#b8c0c8" />
      <Part g="cone" p={[0, 0.1, 0.08]} s={[0.02, 0.04, 0.02]} r={[Math.PI / 2, 0, 0]} c="#1b1b1b" />
      <Part g="sphere" p={[0.03, 0.13, 0.05]} s={0.01} c="#111" />
      <Part g="sphere" p={[-0.03, 0.13, 0.05]} s={0.01} c="#111" />
      <Part p={[0, -0.1, -0.06]} s={[0.05, 0.09, 0.03]} r={[0.4, 0, 0]} c="#c0392b" />
      {[-1, 1].map((sd, i) => (
        <group key={sd} ref={(el) => { wings.current![i] = el }} position={[0.06 * sd, 0.02, 0]}>
          <Part p={[0.03 * sd, 0, -0.01]} s={[0.07, 0.12, 0.04]} c="#7d868f" />
        </group>
      ))}
    </group>
  )
}

/** Your pet trails behind you (the parrot flutters at your shoulder). */
export function PetFollower({ getTarget, hidden }: { getTarget: () => { x: number; z: number; rot: number; moving: boolean }; hidden?: boolean }) {
  const pet = useGame((s) => s.pet)
  const g = useRef<THREE.Group>(null)
  const legs = useRef<(THREE.Group | null)[]>([])
  const wings = useRef<(THREE.Group | null)[]>([])
  const tail = useRef<THREE.Group>(null)
  const pos = useRef<{ x: number; z: number; rot: number } | null>(null)
  useFrame((st, dtRaw) => {
    if (!g.current || !pet) return
    const dt = Math.min(dtRaw, 0.1)
    const t = getTarget()
    const flyer = pet.type === 'parrot'
    // sit just behind and to the side of the player
    const back = flyer ? 0.05 : 0.9
    const side = flyer ? 0.28 : 0.45
    const tx = t.x - Math.sin(t.rot) * back + Math.cos(t.rot) * side
    const tz = t.z - Math.cos(t.rot) * back - Math.sin(t.rot) * side
    if (!pos.current || Math.hypot(pos.current.x - tx, pos.current.z - tz) > 8) pos.current = { x: tx, z: tz, rot: t.rot }
    const p = pos.current
    const dx = tx - p.x
    const dz = tz - p.z
    const dist = Math.hypot(dx, dz)
    const k = Math.min(1, dt * (flyer ? 8 : 4))
    p.x += dx * k
    p.z += dz * k
    const moving = dist > 0.06
    if (moving && !flyer) p.rot = Math.atan2(dx, dz)
    else if (flyer) p.rot = t.rot
    const time = st.clock.elapsedTime
    g.current.position.set(p.x, flyer ? 1.38 + Math.sin(time * 3) * 0.02 : 0.12, p.z)
    g.current.rotation.y = p.rot
    legs.current.forEach((l, i) => { if (l) l.rotation.x = moving ? Math.sin(time * 14 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 : 0 })
    if (tail.current) tail.current.rotation.y = Math.sin(time * (pet.happy > 50 ? 12 : 3)) * (pet.happy > 50 ? 0.5 : 0.15)
    wings.current.forEach((w, i) => { if (w) w.rotation.z = (i ? -1 : 1) * (0.15 + Math.abs(Math.sin(time * (moving ? 18 : 2))) * (moving ? 0.9 : 0.1)) })
  })
  if (!pet || hidden) return null
  return (
    <group ref={g}>
      {pet.type === 'parrot' ? <Parrot wings={wings} /> : <Quadruped type={pet.type} legs={legs} tail={tail} />}
    </group>
  )
}
