'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import type { Appearance } from '@/game/types'
import { Character } from './Character'

const still = { moving: false, speed: 0 }

function Spinner({ appearance }: { appearance: Appearance }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6
  })
  return (
    <group ref={g} position={[0, -0.75, 0]} scale={1.15}>
      <Character appearance={appearance} getMotion={() => still} />
    </group>
  )
}

export default function Preview3D({ appearance }: { appearance: Appearance }) {
  return (
    <Canvas camera={{ position: [0, 0.6, 3.4], fov: 30 }} dpr={[1, 2]} gl={{ alpha: true }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 4]} intensity={2.2} />
      <hemisphereLight args={['#bfe3ff', '#d9b98a', 0.6]} />
      <Spinner appearance={appearance} />
    </Canvas>
  )
}
