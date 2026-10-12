'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type * as THREE from 'three'
import type { Appearance } from '@/game/types'
import { Character, type Motion } from './Character'

/** Turntable state shared with the drag handlers on the canvas wrapper. */
interface Spin { angle: number; vel: number; dragging: boolean; lastX: number; idleAt: number }

function Model({ appearance, spin }: { appearance: Appearance; spin: React.MutableRefObject<Spin> }) {
  const g = useRef<THREE.Group>(null)
  const motion = useRef<Motion>({ moving: false, speed: 0, action: 'wave' })
  const waveUntil = useRef(0)
  const clock = useRef(0)
  // wave hello whenever the look changes
  const key = JSON.stringify(appearance)
  useEffect(() => {
    waveUntil.current = clock.current + 1.6
  }, [key])
  useFrame((_, dt) => {
    clock.current += dt
    const s = spin.current
    if (!s.dragging) {
      // ease back into a slow turn a moment after the player lets go
      const auto = performance.now() / 1000 - s.idleAt > 1.2 ? 0.5 : 0
      s.vel += (auto - s.vel) * Math.min(1, dt * 2)
      s.angle += s.vel * dt
    }
    if (g.current) g.current.rotation.y = s.angle
    motion.current.action = clock.current < waveUntil.current ? 'wave' : null
  })
  return (
    <group ref={g} position={[0, -0.78, 0]} scale={1.15}>
      <Character appearance={appearance} getMotion={() => motion.current} />
    </group>
  )
}

function Pedestal() {
  return (
    <group position={[0, -0.8, 0]}>
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.62, 0.66, 0.08, 40]} />
        <meshStandardMaterial color="#f3ede2" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 0.62, 40]} />
        <meshBasicMaterial color="#d4af37" />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Character on a turntable: drag sideways to turn it, it waves when its look changes. */
export default function Preview3D({ appearance }: { appearance: Appearance }) {
  const spin = useRef<Spin>({ angle: 0.4, vel: 0.5, dragging: false, lastX: 0, idleAt: 0 })
  const now = () => performance.now() / 1000
  return (
    <div
      className="avatar-stage"
      title="Drag to turn"
      onPointerDown={(e) => {
        spin.current.dragging = true
        spin.current.lastX = e.clientX
        spin.current.vel = 0
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const s = spin.current
        if (!s.dragging) return
        const dx = e.clientX - s.lastX
        s.lastX = e.clientX
        s.angle += dx * 0.012
        s.vel = dx * 0.6
      }}
      onPointerUp={() => {
        spin.current.dragging = false
        spin.current.idleAt = now()
      }}
      onPointerCancel={() => { spin.current.dragging = false }}
    >
      <Canvas camera={{ position: [0, 0.28, 4.2], fov: 30 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }} shadows>
        <ambientLight intensity={0.7} />
        <directionalLight position={[2.5, 4, 3.5]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-3, 2, 1]} intensity={0.8} color="#ffe2b8" />
        <directionalLight position={[0, 2.5, -3.5]} intensity={1.4} color="#bfe3ff" />
        <hemisphereLight args={['#fff6e8', '#c9a27a', 0.5]} />
        <Pedestal />
        <Model appearance={appearance} spin={spin} />
      </Canvas>
      <span className="avatar-hint">↔ drag to turn</span>
    </div>
  )
}
