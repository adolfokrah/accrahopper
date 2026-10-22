'use client'
import { Canvas } from '@react-three/fiber'
import { Character, type Motion, type Pose } from '@/components/three/Character'
import type { Appearance } from '@/game/types'

const POSES: (Pose | null | 'walk')[] = [null, 'walk', 'sit', 'eat', 'desk', 'drive', 'read', 'study', 'snack', 'phone', 'talk', 'sing', 'pray', 'kneel',
  'cook', 'cashier', 'work', 'clean', 'carry', 'lift', 'box', 'dance', 'cheer', 'wave', 'swim', 'lie', 'run']
const LOOK: Appearance = { skin: 4, hair: 0, hairColor: 0, outfit: 0, outfitColor: 1, accessory: 0, body: 1, sex: 0, beard: 0 }
const COLS = 9

export default function GalleryCanvas() {
  return (
    <Canvas orthographic camera={{ position: [7, 2.5, 7], zoom: 120 }} shadows>
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 10, 6]} intensity={1.6} />
      {POSES.map((p, i) => {
        const x = (i % COLS) - (COLS - 1) / 2
        const z = Math.floor(i / COLS) * 2.2 - 2.2
        const m: Motion = p === 'walk' ? { moving: true, speed: 2.8 } : { moving: false, speed: 0, action: p, prop: p === 'eat' ? 'plate' : p === 'phone' ? 'phone' : null }
        return (
          <group key={i} position={[x * 1.05, -Math.floor(i / COLS) * 1.9 + 1.4, z]}>
            <Character appearance={{ ...LOOK, sex: i % 2, outfitColor: i % 10 }} getMotion={() => m} />
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}><circleGeometry args={[0.4, 24]} /><meshStandardMaterial color="#9aa8b8" /></mesh>
            {/* seat: the game's chairs put the hips about here */}
            <mesh position={[0, 0.22, -0.05]} visible={p === 'sit' || p === 'eat' || p === 'desk' || p === 'read' || p === 'drive'}><boxGeometry args={[0.4, 0.44, 0.4]} /><meshStandardMaterial color="#8a5a2b" transparent opacity={0.5} /></mesh>
            <mesh position={[0, 0.25, 0.35]} visible={false}>
              <boxGeometry args={[0.45, 0.5, 0.4]} />
              <meshStandardMaterial color="#8a5a2b" />
            </mesh>
          </group>
        )
      })}
    </Canvas>
  )
}
