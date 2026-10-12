'use client'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { ACCESSORIES, HAIR_COLORS, OUTFITS, OUTFIT_COLORS, SKIN_TONES } from '@/game/content'
import type { Appearance } from '@/game/types'
import { getMat } from './shared'

export type Pose =
  | 'dance' | 'sit' | 'desk' | 'lift' | 'work' | 'run' | 'eat' | 'talk' | 'pray' | 'cook' | 'cashier' | 'clean'
  | 'carry' | 'box' | 'swim' | 'lie' | 'cheer' | 'read' | 'phone' | 'kneel' | 'drive' | 'wave' | 'sing' | 'study' | 'snack'
export type Prop = 'plate' | 'box' | 'basket' | 'book' | 'phone' | 'drink' | 'spoon' | 'dumbbell' | 'mic' | 'ball' | 'broom' | 'shovel' | 'laptop' | 'torch'

export interface Motion {
  moving: boolean
  speed: number
  action?: Pose | null
  prop?: Prop | null
}
interface Props {
  appearance: Appearance
  getMotion: () => Motion
  lite?: boolean
  scale?: number
}

/* ------------------------------ shared geometry ------------------------------ */
const G = {
  torso: new THREE.CapsuleGeometry(0.16, 0.2, 4, 10),
  pelvis: new THREE.CapsuleGeometry(0.13, 0.08, 4, 10),
  upperArm: new THREE.CapsuleGeometry(0.058, 0.16, 3, 8),
  foreArm: new THREE.CapsuleGeometry(0.05, 0.15, 3, 8),
  thigh: new THREE.CapsuleGeometry(0.072, 0.18, 3, 8),
  shin: new THREE.CapsuleGeometry(0.06, 0.18, 3, 8),
  shoe: new THREE.CapsuleGeometry(0.055, 0.12, 3, 8),
  sphere: new THREE.SphereGeometry(1, 16, 12),
  hemi: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  neck: new THREE.CylinderGeometry(0.06, 0.07, 0.1, 10),
  skirt: new THREE.CylinderGeometry(0.17, 0.27, 0.42, 14, 1, true),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  torus: new THREE.TorusGeometry(1, 0.12, 6, 18),
}
G.skirt.translate(0, -0.21, 0)

interface J {
  hipL: number; hipR: number; kneeL: number; kneeR: number
  shL: number; shR: number; shLz: number; shRz: number; elL: number; elR: number
  spineX: number; spineY: number; headX: number; headY: number; y: number; rootX: number
}
const zero = (): J => ({ hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, shL: 0, shR: 0, shLz: 0, shRz: 0, elL: 0, elR: 0, spineX: 0, spineY: 0, headX: 0, headY: 0, y: 0, rootX: 0 })

/** Target joint angles for a pose at time t (walk phase p). */
function poseTarget(m: Motion, t: number, p: number): J {
  const j = zero()
  const sit = () => { j.hipL = j.hipR = -1.5; j.kneeL = j.kneeR = 1.5; j.y = -0.15; j.shL = j.shR = -0.35; j.elL = j.elR = -0.5 }
  if (m.moving) {
    const run = m.speed > 3
    const a = run ? 0.9 : 0.62
    const s = Math.sin(p)
    j.hipL = s * a
    j.hipR = -s * a
    j.kneeL = Math.max(0, -Math.sin(p)) * (run ? 1.3 : 0.9) + 0.05
    j.kneeR = Math.max(0, Math.sin(p)) * (run ? 1.3 : 0.9) + 0.05
    j.shL = -s * (run ? 0.8 : 0.5)
    j.shR = s * (run ? 0.8 : 0.5)
    j.elL = j.elR = run ? -1.2 : -0.35
    j.y = Math.abs(Math.cos(p)) * (run ? 0.06 : 0.035) - (run ? 0.03 : 0)
    j.spineX = run ? 0.18 : 0.04
    return j
  }
  const b = Math.sin(t * 2)
  switch (m.action) {
    case 'sit': sit(); break
    case 'drive': sit(); j.shL = j.shR = -1.0; j.elL = j.elR = -0.5; j.shLz = 0.15; j.shRz = -0.15; j.headY = Math.sin(t * 0.7) * 0.25; break
    case 'desk': sit(); j.shL = j.shR = -0.95; j.elL = -0.7 + Math.sin(t * 18) * 0.08; j.elR = -0.7 - Math.sin(t * 17) * 0.08; j.spineX = 0.12; j.headX = 0.15; break
    case 'eat': {
      sit()
      const c = (Math.sin(t * 2.6) + 1) / 2
      j.shR = -0.6 - c * 0.7; j.elR = -1.2 - c * 0.9; j.shRz = -0.25
      j.shL = -0.7; j.elL = -0.9; j.headX = 0.12 - c * 0.15
      break
    }
    case 'study': j.shL = j.shR = -0.9; j.elL = j.elR = -1.1; j.shLz = 0.25; j.shRz = -0.25; j.headX = 0.3; break
    case 'snack': { const c = (Math.sin(t * 2.6) + 1) / 2; j.shR = -0.6 - c * 0.7; j.elR = -1.2 - c * 0.9; j.shRz = -0.25; j.shL = -0.7; j.elL = -0.9; j.headX = 0.12 - c * 0.15; break }
    case 'read': sit(); j.shL = j.shR = -0.9; j.elL = j.elR = -1.1; j.shLz = 0.25; j.shRz = -0.25; j.headX = 0.3; break
    case 'phone': j.shR = -0.4; j.elR = -2.3; j.shRz = -0.5; j.shL = -0.1; j.headY = 0.15; j.headX = Math.sin(t) * 0.05; break
    case 'talk': {
      const g = Math.sin(t * 3)
      j.shR = -0.5 + g * 0.3; j.elR = -1.1 + g * 0.3; j.shRz = -0.25
      j.shL = -0.25 - Math.max(0, Math.sin(t * 1.7)) * 0.4; j.elL = -0.8; j.shLz = 0.2
      j.headX = Math.sin(t * 2.4) * 0.08; j.headY = Math.sin(t * 0.9) * 0.15
      break
    }
    case 'sing': j.shR = -0.5; j.elR = -2.1; j.shRz = -0.35; j.shL = -1.2 + b * 0.4; j.shLz = 0.6; j.headX = -0.15; j.y = Math.abs(b) * 0.03; j.spineY = Math.sin(t) * 0.2; break
    case 'pray': j.hipL = j.hipR = 0; j.kneeL = j.kneeR = 1.55; j.y = -0.31; j.shL = j.shR = -1.0; j.shLz = -0.35; j.shRz = 0.35; j.elL = j.elR = -1.3; j.headX = 0.35 + Math.sin(t * 0.6) * 0.05; break
    case 'kneel': j.hipL = j.hipR = 0; j.kneeL = j.kneeR = 1.55; j.y = -0.31; j.shL = j.shR = -0.3; j.elL = j.elR = -0.6; break
    case 'cook': { const c = t * 5; j.shR = -0.9 + Math.sin(c) * 0.15; j.shRz = -0.2 + Math.cos(c) * 0.2; j.elR = -1.0; j.shL = -0.6; j.elL = -1.2; j.spineX = 0.15; j.headX = 0.25; break }
    case 'cashier': { const c = Math.sin(t * 3); j.shL = j.shR = -0.75; j.elL = j.elR = -0.8; j.shLz = 0.15 + c * 0.3; j.shRz = -0.15 + c * 0.3; j.spineY = c * 0.25; j.headY = c * 0.2; j.spineX = 0.08; break }
    case 'work': { const c = Math.sin(t * 6); j.shL = -1.0 + c * 0.25; j.shR = -1.0 - c * 0.25; j.elL = j.elR = -0.7; j.spineX = 0.1; break }
    case 'clean': { const c = t * 6; j.shR = -1.1 + Math.sin(c) * 0.3; j.shRz = -0.3 + Math.cos(c) * 0.3; j.elR = -0.6; j.shL = -0.5; j.elL = -0.6; j.spineX = 0.2; j.y = -0.02; break }
    case 'carry': j.shL = j.shR = -2.9; j.shLz = 0.2; j.shRz = -0.2; j.elL = j.elR = -0.5; j.y = Math.abs(Math.sin(t * 3)) * 0.02; break
    case 'lift': { const c = Math.sin(t * 3.2); j.shL = j.shR = -2.0 + c * 0.9; j.elL = j.elR = -0.6 - Math.max(0, -c) * 1.4; j.kneeL = j.kneeR = 0.25 + Math.max(0, c) * 0.2; j.hipL = j.hipR = -0.15; j.y = -0.04; break }
    case 'box': {
      const c = Math.sin(t * 8)
      j.shL = -1.4 + Math.max(0, c) * 0.2; j.elL = -1.8 + Math.max(0, c) * 1.6
      j.shR = -1.4 + Math.max(0, -c) * 0.2; j.elR = -1.8 + Math.max(0, -c) * 1.6
      j.hipL = -0.3; j.hipR = 0.2; j.kneeL = j.kneeR = 0.35; j.y = -0.05 + Math.abs(Math.sin(t * 4)) * 0.04; j.spineY = c * 0.3
      break
    }
    case 'dance': {
      const c = t * 7
      j.hipL = Math.sin(c) * 0.35; j.hipR = -Math.sin(c) * 0.35; j.kneeL = 0.3 + Math.max(0, Math.sin(c)) * 0.5; j.kneeR = 0.3 + Math.max(0, -Math.sin(c)) * 0.5
      j.shL = -2.4 + Math.sin(c * 1.5) * 0.6; j.shR = -2.4 + Math.cos(c * 1.5) * 0.6; j.elL = j.elR = -0.4
      j.y = Math.abs(Math.sin(c)) * 0.08 - 0.05; j.spineY = Math.sin(c * 0.5) * 0.45; j.headX = Math.sin(c) * 0.12
      break
    }
    case 'cheer': j.shL = j.shR = -2.8 + Math.sin(t * 6) * 0.2; j.shLz = 0.4; j.shRz = -0.4; j.y = Math.abs(Math.sin(t * 5)) * 0.08; break
    case 'wave': j.shR = -2.6; j.shRz = -0.5 + Math.sin(t * 7) * 0.4; j.elR = -0.3; break
    case 'swim': { const c = t * 5; j.rootX = Math.PI / 2 - 0.1; j.y = 0.03 + Math.sin(t * 2) * 0.03; j.shL = c % (Math.PI * 2) - Math.PI; j.shR = ((c + Math.PI) % (Math.PI * 2)) - Math.PI; j.hipL = Math.sin(c * 2) * 0.3; j.hipR = -Math.sin(c * 2) * 0.3; j.headX = -0.6; break }
    case 'lie': j.rootX = -Math.PI / 2; j.shL = j.shR = -0.1; j.headX = -0.15; j.kneeL = 0.15; j.y = 0.14 + Math.sin(t * 1.2) * 0.008; break
    case 'run': {
      const c = t * 12
      const s = Math.sin(c)
      j.hipL = s * 0.9; j.hipR = -s * 0.9; j.kneeL = Math.max(0, -s) * 1.3; j.kneeR = Math.max(0, s) * 1.3
      j.shL = -s * 0.8; j.shR = s * 0.8; j.elL = j.elR = -1.2; j.y = Math.abs(Math.cos(c)) * 0.06; j.spineX = 0.18
      break
    }
    default:
      j.shL = b * 0.04; j.shR = -b * 0.04; j.shLz = 0.06; j.shRz = -0.06; j.elL = j.elR = -0.12; j.y = b * 0.006
      j.headY = Math.sin(t * 0.37 + p) * 0.2
  }
  return j
}

export function Character({ appearance, getMotion, lite = false, scale = 1 }: Props) {
  const skin = SKIN_TONES[appearance.skin] ?? SKIN_TONES[0]
  const hairC = HAIR_COLORS[appearance.hairColor] ?? '#222'
  const outfit = OUTFITS[appearance.outfit] ?? OUTFITS[0]
  const main = OUTFIT_COLORS[appearance.outfitColor] ?? '#2e86de'
  const R = {
    root: useRef<THREE.Group>(null), hips: useRef<THREE.Group>(null), spine: useRef<THREE.Group>(null), head: useRef<THREE.Group>(null),
    hipL: useRef<THREE.Group>(null), hipR: useRef<THREE.Group>(null), kneeL: useRef<THREE.Group>(null), kneeR: useRef<THREE.Group>(null),
    shL: useRef<THREE.Group>(null), shR: useRef<THREE.Group>(null), elL: useRef<THREE.Group>(null), elR: useRef<THREE.Group>(null),
    eyes: useRef<THREE.Group>(null), propHand: useRef<THREE.Group>(null), propHead: useRef<THREE.Group>(null),
  }
  const cur = useRef<J>(zero())
  const phase = useRef(Math.random() * 6)
  const seed = useRef(Math.random() * 10)
  const propNow = useRef<Prop | null>(null)

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const m = getMotion()
    const t = state.clock.elapsedTime + seed.current
    if (m.moving) phase.current += dt * (6 + m.speed * 2.2)
    const tg = poseTarget(m, t, phase.current)
    const c = cur.current
    const k = 1 - Math.exp(-dt * (m.moving ? 30 : 12))
    for (const key of Object.keys(c) as (keyof J)[]) c[key] += (tg[key] - c[key]) * k
    const set = (r: React.RefObject<THREE.Group | null>, x: number, z = 0, y = 0) => {
      if (r.current) r.current.rotation.set(x, y, z)
    }
    set(R.hipL, c.hipL); set(R.hipR, c.hipR); set(R.kneeL, c.kneeL); set(R.kneeR, c.kneeR)
    set(R.shL, c.shL, c.shLz + 0.04); set(R.shR, c.shR, c.shRz - 0.04); set(R.elL, c.elL); set(R.elR, c.elR)
    set(R.spine, c.spineX, 0, c.spineY); set(R.head, c.headX, 0, c.headY)
    if (R.root.current) {
      R.root.current.rotation.x = c.rootX
      R.root.current.position.y = c.y
    }
    // blink
    if (R.eyes.current) R.eyes.current.scale.y = (t % 4.3) < 0.12 ? 0.1 : 1
    // props
    const prop = m.prop ?? null
    if (prop !== propNow.current) {
      propNow.current = prop
      const head = prop === 'box' || prop === 'basket'
      if (R.propHand.current) R.propHand.current.children.forEach((ch) => (ch.visible = !head && ch.name === prop))
      if (R.propHead.current) R.propHead.current.children.forEach((ch) => (ch.visible = head && ch.name === prop))
    }
  })

  const M = (c: string, rough = 0.85) => getMat(c, 1, rough)
  const top = M(main)
  const skinM = M(skin, 0.7)
  const bottom = outfit.style === 'ankara' ? skinM : M(outfit.bottom)
  const shoeM = M(outfit.style === 'sport' ? '#f4f4f4' : '#2a2320')
  const longSleeve = outfit.style === 'smart' || outfit.style === 'sport'
  const cast = !lite

  const leg = (side: -1 | 1, hip: React.RefObject<THREE.Group | null>, knee: React.RefObject<THREE.Group | null>) => (
    <group ref={hip} position={[0.09 * side, -0.04, 0]}>
      <mesh geometry={G.thigh} material={bottom} position={[0, -0.15, 0]} castShadow={cast} />
      <group ref={knee} position={[0, -0.31, 0]}>
        <mesh geometry={G.shin} material={outfit.style === 'ankara' ? skinM : bottom} position={[0, -0.14, 0]} castShadow={cast} />
        <mesh geometry={G.shoe} material={shoeM} position={[0, -0.29, 0.045]} rotation={[Math.PI / 2, 0, 0]} castShadow={cast} />
      </group>
    </group>
  )
  const arm = (side: -1 | 1, sh: React.RefObject<THREE.Group | null>, el: React.RefObject<THREE.Group | null>, withProps: boolean) => (
    <group ref={sh} position={[0.235 * side, 0.36, 0]}>
      <mesh geometry={G.upperArm} material={top} position={[0, -0.12, 0]} castShadow={cast} />
      <group ref={el} position={[0, -0.25, 0]}>
        <mesh geometry={G.foreArm} material={longSleeve ? top : skinM} position={[0, -0.1, 0]} castShadow={cast} />
        <mesh geometry={G.sphere} material={skinM} position={[0, -0.22, 0.01]} scale={0.056} />
        {withProps && <HandProps ref={R.propHand} />}
      </group>
    </group>
  )

  return (
    <group scale={scale}>
      <group ref={R.root}>
        <group ref={R.hips} position={[0, 0.66, 0]}>
          <mesh geometry={G.pelvis} material={outfit.style === 'ankara' ? M(outfit.bottom) : bottom} rotation={[0, 0, Math.PI / 2]} scale={[1, 1.05, 0.85]} castShadow={cast} />
          {leg(-1, R.hipL, R.kneeL)}
          {leg(1, R.hipR, R.kneeR)}
          {outfit.style === 'ankara' && <mesh geometry={G.skirt} material={M(outfit.bottom)} position={[0, 0.04, 0]} castShadow={cast} />}
          <group ref={R.spine} position={[0, 0.04, 0]}>
            <mesh geometry={G.torso} material={top} position={[0, 0.22, 0]} scale={[1.22, 1, 0.78]} castShadow={cast} />
            {!lite && <Outfit style={outfit.style} />}
            <mesh geometry={G.neck} material={skinM} position={[0, 0.45, 0]} />
            {arm(-1, R.shL, R.elL, false)}
            {arm(1, R.shR, R.elR, true)}
            <group ref={R.head} position={[0, 0.62, 0]}>
              <mesh geometry={G.sphere} material={skinM} scale={[0.165, 0.185, 0.17]} castShadow={cast} />
              {!lite && (
                <>
                  <mesh geometry={G.sphere} material={skinM} position={[-0.163, -0.01, 0]} scale={[0.03, 0.045, 0.03]} />
                  <mesh geometry={G.sphere} material={skinM} position={[0.163, -0.01, 0]} scale={[0.03, 0.045, 0.03]} />
                  <group ref={R.eyes} position={[0, 0.02, 0.145]}>
                    <mesh geometry={G.sphere} material={M('#ffffff', 0.4)} position={[-0.06, 0, 0]} scale={[0.032, 0.026, 0.018]} />
                    <mesh geometry={G.sphere} material={M('#ffffff', 0.4)} position={[0.06, 0, 0]} scale={[0.032, 0.026, 0.018]} />
                    <mesh geometry={G.sphere} material={M('#1d1512', 0.3)} position={[-0.06, 0, 0.012]} scale={0.016} />
                    <mesh geometry={G.sphere} material={M('#1d1512', 0.3)} position={[0.06, 0, 0.012]} scale={0.016} />
                  </group>
                  <mesh geometry={G.box} material={M(hairC)} position={[-0.06, 0.07, 0.155]} rotation={[0, 0, 0.12]} scale={[0.06, 0.012, 0.012]} />
                  <mesh geometry={G.box} material={M(hairC)} position={[0.06, 0.07, 0.155]} rotation={[0, 0, -0.12]} scale={[0.06, 0.012, 0.012]} />
                  <mesh geometry={G.sphere} material={skinM} position={[0, -0.025, 0.168]} scale={[0.026, 0.03, 0.03]} />
                  <mesh geometry={G.box} material={M('#7a3b2e', 0.5)} position={[0, -0.085, 0.152]} scale={[0.06, 0.014, 0.01]} />
                </>
              )}
              {lite && <mesh geometry={G.box} material={M('#1d1512')} position={[0, 0.02, 0.155]} scale={[0.14, 0.025, 0.02]} />}
              <Hair style={appearance.hair} color={hairC} accent={main} />
              {!lite && <HeadAccessory kind={appearance.accessory} hairColor={hairC} main={main} />}
              <group ref={R.propHead} position={[0, 0.2, 0]}>
                <group name="box" visible={false}><mesh geometry={G.box} material={M('#b68b52')} position={[0, 0.12, 0]} scale={[0.4, 0.24, 0.4]} castShadow /></group>
                <group name="basket" visible={false}>
                  <mesh geometry={G.cyl} material={M('#c49a5a')} position={[0, 0.08, 0]} scale={[0.26, 0.14, 0.26]} castShadow />
                  <mesh geometry={G.sphere} material={M('#4fc3e8', 0.2)} position={[-0.08, 0.17, 0]} scale={0.07} />
                  <mesh geometry={G.sphere} material={M('#4fc3e8', 0.2)} position={[0.08, 0.17, 0.05]} scale={0.07} />
                </group>
              </group>
            </group>
            {!lite && <BodyAccessory kind={appearance.accessory} />}
          </group>
        </group>
      </group>
    </group>
  )
}

import { forwardRef } from 'react'
const HandProps = forwardRef<THREE.Group>(function HandProps(_, ref) {
  const M = (c: string, r = 0.6) => getMat(c, 1, r)
  return (
    <group ref={ref} position={[0, -0.25, 0.04]}>
      <group name="plate" visible={false} position={[0, 0, 0.1]}>
        <mesh geometry={G.cyl} material={M('#ffffff')} scale={[0.13, 0.015, 0.13]} />
        <mesh geometry={G.sphere} material={M('#e8a33d')} position={[0, 0.03, 0]} scale={[0.09, 0.035, 0.09]} />
      </group>
      <group name="drink" visible={false}><mesh geometry={G.cyl} material={M('#c0392b', 0.2)} position={[0, 0.06, 0.03]} scale={[0.04, 0.13, 0.04]} /></group>
      <group name="book" visible={false}><mesh geometry={G.box} material={M('#2e86de')} position={[0.04, 0.02, 0.06]} rotation={[0.6, 0, 0]} scale={[0.2, 0.26, 0.04]} /></group>
      <group name="phone" visible={false}><mesh geometry={G.box} material={M('#111111', 0.3)} position={[0, 0.03, 0.02]} scale={[0.07, 0.14, 0.015]} /></group>
      <group name="spoon" visible={false}><mesh geometry={G.cyl} material={M('#8a5a2b')} position={[0, -0.12, 0.05]} rotation={[0.3, 0, 0]} scale={[0.012, 0.32, 0.012]} /></group>
      <group name="mic" visible={false}>
        <mesh geometry={G.cyl} material={M('#222')} position={[0, 0.05, 0]} scale={[0.018, 0.12, 0.018]} />
        <mesh geometry={G.sphere} material={M('#888', 0.3)} position={[0, 0.13, 0]} scale={0.035} />
      </group>
      <group name="dumbbell" visible={false} rotation={[0, 0, Math.PI / 2]}>
        <mesh geometry={G.cyl} material={M('#444')} scale={[0.015, 0.3, 0.015]} />
        <mesh geometry={G.cyl} material={M('#e0524a')} position={[0, 0.14, 0]} scale={[0.06, 0.04, 0.06]} />
        <mesh geometry={G.cyl} material={M('#e0524a')} position={[0, -0.14, 0]} scale={[0.06, 0.04, 0.06]} />
      </group>
      <group name="ball" visible={false}><mesh geometry={G.sphere} material={M('#f4f4f4')} position={[0, -0.02, 0.1]} scale={0.11} /></group>
      <group name="broom" visible={false}><mesh geometry={G.cyl} material={M('#c9a27a')} position={[0, -0.3, 0.08]} rotation={[0.3, 0, 0]} scale={[0.015, 0.7, 0.015]} /></group>
      <group name="shovel" visible={false}>
        <mesh geometry={G.cyl} material={M('#8a5a2b')} position={[0, -0.25, 0.08]} rotation={[0.3, 0, 0]} scale={[0.016, 0.6, 0.016]} />
        <mesh geometry={G.box} material={M('#7d858f', 0.4)} position={[0, -0.56, 0.17]} rotation={[0.3, 0, 0]} scale={[0.14, 0.18, 0.02]} />
      </group>
      <group name="laptop" visible={false}>
        <mesh geometry={G.box} material={M('#2b2f36', 0.4)} position={[0, 0, 0.1]} scale={[0.3, 0.02, 0.2]} />
        <mesh geometry={G.box} material={M('#5fb0ff', 0.2)} position={[0, 0.1, 0.0]} rotation={[-0.3, 0, 0]} scale={[0.3, 0.2, 0.015]} />
      </group>
      <group name="torch" visible={false}>
        <mesh geometry={G.cyl} material={M('#222')} position={[0, 0.02, 0.06]} rotation={[1.4, 0, 0]} scale={[0.025, 0.16, 0.025]} />
        <mesh geometry={G.sphere} material={M('#fff6c0', 0.1)} position={[0, 0.03, 0.15]} scale={0.03} />
      </group>
    </group>
  )
})

function Outfit({ style }: { style: string }) {
  const M = (c: string) => getMat(c)
  if (style === 'smart') return (
    <>
      <mesh geometry={G.box} material={M('#f4f4f4')} position={[0, 0.36, 0.12]} scale={[0.12, 0.12, 0.02]} />
      <mesh geometry={G.box} material={M('#a52a2a')} position={[0, 0.25, 0.13]} scale={[0.05, 0.24, 0.015]} />
    </>
  )
  if (style === 'ankara') return (
    <>
      {[0.32, 0.2, 0.08].map((y, i) => <mesh key={y} geometry={G.box} material={M(i % 2 ? '#2fa866' : '#fcd116')} position={[0, y, 0.115]} scale={[0.36, 0.045, 0.02]} />)}
      {[-0.1, 0.1].map((x) => <mesh key={x} geometry={G.box} material={M('#ce1126')} position={[x, 0.2, 0.12]} scale={[0.03, 0.3, 0.015]} />)}
    </>
  )
  if (style === 'sport') return <mesh geometry={G.box} material={M('#f0ede6')} position={[0, 0.22, 0.125]} scale={[0.06, 0.4, 0.015]} />
  return <mesh geometry={G.box} material={M('#ffffff')} position={[0, 0.3, 0.125]} scale={[0.1, 0.06, 0.012]} />
}

function Hair({ style, color, accent }: { style: number; color: string; accent: string }) {
  const M = getMat(color, 1, 0.95)
  switch (style) {
    case 0:
      return <mesh geometry={G.hemi} material={M} position={[0, 0.03, -0.005]} scale={[0.172, 0.17, 0.178]} castShadow />
    case 1:
      return <mesh geometry={G.sphere} material={M} position={[0, 0.08, -0.03]} scale={[0.26, 0.24, 0.25]} castShadow />
    case 2:
      return (
        <>
          <mesh geometry={G.hemi} material={M} position={[0, 0.03, -0.005]} scale={[0.176, 0.175, 0.182]} castShadow />
          {[-0.12, -0.06, 0, 0.06, 0.12].map((x) => (
            <mesh key={x} geometry={G.cyl} material={M} position={[x, -0.12, -0.13]} rotation={[0.15, 0, x * 0.6]} scale={[0.018, 0.3, 0.018]} />
          ))}
        </>
      )
    case 4:
      return (
        <>
          <mesh geometry={G.hemi} material={M} position={[0, 0.03, -0.005]} scale={[0.172, 0.17, 0.178]} castShadow />
          <mesh geometry={G.sphere} material={M} position={[0, 0.22, -0.04]} scale={0.085} castShadow />
        </>
      )
    case 5:
      return (
        <>
          <mesh geometry={G.hemi} material={getMat(accent)} position={[0, 0.02, -0.005]} scale={[0.182, 0.17, 0.186]} castShadow />
          <mesh geometry={G.box} material={getMat(accent)} position={[0, 0.2, -0.02]} rotation={[0, 0, 0.2]} scale={[0.32, 0.12, 0.17]} castShadow />
          <mesh geometry={G.box} material={getMat('#fcd116')} position={[0.02, 0.17, 0.04]} rotation={[0, 0, -0.3]} scale={[0.16, 0.08, 0.1]} />
        </>
      )
    default:
      return null
  }
}

function HeadAccessory({ kind, hairColor, main }: { kind: number; hairColor: string; main: string }) {
  const M = (c: string, r = 0.6) => getMat(c, 1, r)
  switch (ACCESSORIES[kind]) {
    case 'Glasses':
      return (
        <group position={[0, 0.02, 0.165]}>
          <mesh geometry={G.torus} material={M('#1b1b1b')} position={[-0.06, 0, 0]} scale={0.042} />
          <mesh geometry={G.torus} material={M('#1b1b1b')} position={[0.06, 0, 0]} scale={0.042} />
          <mesh geometry={G.box} material={M('#1b1b1b')} scale={[0.04, 0.01, 0.01]} />
        </group>
      )
    case 'Cap':
      return (
        <>
          <mesh geometry={G.hemi} material={M(main === '#f0ede6' ? '#2e86de' : '#f0ede6')} position={[0, 0.05, 0]} scale={[0.18, 0.14, 0.185]} castShadow />
          <mesh geometry={G.box} material={M('#2b2b2b')} position={[0, 0.06, 0.18]} scale={[0.18, 0.018, 0.12]} />
        </>
      )
    case 'Headphones':
      return (
        <>
          <mesh geometry={G.torus} material={M(hairColor === '#1c1a1a' ? '#444' : '#1c1a1a')} position={[0, 0.03, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.19, 0.2, 0.19]} />
          <mesh geometry={G.cyl} material={M('#e0524a')} position={[-0.17, -0.01, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.05, 0.04, 0.05]} />
          <mesh geometry={G.cyl} material={M('#e0524a')} position={[0.17, -0.01, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.05, 0.04, 0.05]} />
        </>
      )
    default:
      return null
  }
}

function BodyAccessory({ kind }: { kind: number }) {
  switch (ACCESSORIES[kind]) {
    case 'Gold chain':
      return <mesh geometry={G.torus} material={getMat('#f4c430', 1, 0.3)} position={[0, 0.38, 0.06]} rotation={[Math.PI / 2 - 0.35, 0, 0]} scale={0.11} />
    case 'Backpack':
      return <mesh geometry={G.box} material={getMat('#8a5a2b')} position={[0, 0.24, -0.17]} scale={[0.28, 0.32, 0.12]} castShadow />
    default:
      return null
  }
}
