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
  cone: new THREE.ConeGeometry(1, 1, 5),
}
G.skirt.translate(0, -0.21, 0)
/** Smoother body geometry for close-up (non-lite) characters. */
const GH = {
  torso: new THREE.CapsuleGeometry(0.16, 0.2, 8, 20),
  waist: new THREE.CapsuleGeometry(0.13, 0.12, 8, 20),
  pelvis: new THREE.CapsuleGeometry(0.13, 0.08, 8, 20),
  upperArm: new THREE.CapsuleGeometry(0.058, 0.16, 6, 14),
  foreArm: new THREE.CapsuleGeometry(0.05, 0.15, 6, 14),
  thigh: new THREE.CapsuleGeometry(0.072, 0.18, 6, 14),
  shin: new THREE.CapsuleGeometry(0.06, 0.18, 6, 14),
  sphere: new THREE.SphereGeometry(1, 24, 18),
}

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
  const style = outfit.style
  const top = M(main)
  const skinM = M(skin, 0.7)
  const lipM = M(shadeHex(skin, 0.72), 0.55)
  const bottom = style === 'ankara' || style === 'dress' ? skinM : style === 'jersey' ? M('#f4f4f4') : M(outfit.bottom)
  const bareShin = style === 'ankara' || style === 'dress' || style === 'jersey'
  const shoeM = M(style === 'sport' || style === 'jersey' ? '#f4f4f4' : style === 'smart' || style === 'dress' ? '#1a1412' : '#2a2320', style === 'smart' || style === 'dress' ? 0.3 : 0.8)
  const soleM = M(style === 'sport' || style === 'jersey' ? '#d9d4c8' : '#120d0b')
  const longSleeve = style === 'smart' || style === 'sport' || style === 'hoodie' || style === 'kaftan'
  const cast = !lite
  // close-ups get smooth geometry; crowds keep the cheap set
  const B = lite ? G : { ...G, ...GH }
  // build: slim, average or broad
  const bw = [0.88, 1, 1.16][appearance.body ?? 1] ?? 1
  const fem = (appearance.sex ?? 0) === 1
  // women: no beard, narrower shoulders, defined waist, wider hips
  const beard = fem ? 0 : appearance.beard ?? 0
  const shW = fem ? 0.9 : 1
  const hipW = fem ? 1.12 : 1
  const acc = ACCESSORIES[appearance.accessory] ?? 'None'

  const leg = (side: -1 | 1, hip: React.RefObject<THREE.Group | null>, knee: React.RefObject<THREE.Group | null>) => (
    <group ref={hip} position={[0.09 * side * bw * hipW, -0.04, 0]}>
      <mesh geometry={B.thigh} material={bottom} position={[0, -0.15, 0]} scale={[bw, 1, bw]} castShadow={cast} />
      {!lite && style === 'sport' && <mesh geometry={G.box} material={M('#f4f4f4')} position={[0.072 * side * bw, -0.15, 0]} scale={[0.012, 0.3, 0.03]} />}
      {!lite && style === 'jersey' && <mesh geometry={G.cyl} material={top} position={[0, -0.04, 0]} scale={[0.085 * bw, 0.1, 0.085 * bw]} />}
      <group ref={knee} position={[0, -0.31, 0]}>
        {!lite && <mesh geometry={B.sphere} material={bareShin ? skinM : bottom} scale={0.064 * (0.9 + bw * 0.1)} />}
        <mesh geometry={B.shin} material={bareShin ? skinM : bottom} position={[0, -0.14, 0]} scale={[bw * 0.95 + 0.05, 1, bw * 0.95 + 0.05]} castShadow={cast} />
        {!lite && style === 'jersey' && <mesh geometry={G.cyl} material={top} position={[0, -0.17, 0]} scale={[0.066, 0.17, 0.066]} />}
        {!lite && style === 'sport' && <mesh geometry={G.box} material={M('#f4f4f4')} position={[0.062 * side, -0.14, 0]} scale={[0.012, 0.3, 0.03]} />}
        <mesh geometry={G.shoe} material={shoeM} position={[0, -0.285, 0.045]} rotation={[Math.PI / 2, 0, 0]} castShadow={cast} />
        {!lite && <mesh geometry={G.box} material={soleM} position={[0, -0.335, 0.045]} scale={[0.115, 0.022, 0.27]} />}
      </group>
    </group>
  )
  const arm = (side: -1 | 1, sh: React.RefObject<THREE.Group | null>, el: React.RefObject<THREE.Group | null>, withProps: boolean) => (
    <group ref={sh} position={[0.235 * side * bw * shW, 0.36, 0]}>
      {!lite && <mesh geometry={B.sphere} material={top} position={[0.005 * side, -0.01, 0]} scale={[0.082 * bw, 0.075, 0.078 * bw]} castShadow={cast} />}
      <mesh geometry={B.upperArm} material={top} position={[0, -0.12, 0]} scale={[bw * shW, 1, bw * shW]} castShadow={cast} />
      {!lite && style === 'sport' && <mesh geometry={G.box} material={M('#f4f4f4')} position={[0.058 * side * bw, -0.12, 0]} scale={[0.012, 0.24, 0.028]} />}
      {!lite && !longSleeve && <mesh geometry={G.cyl} material={top} position={[0, -0.21, 0]} scale={[0.066 * bw, 0.05, 0.066 * bw]} />}
      <group ref={el} position={[0, -0.25, 0]}>
        {!lite && <mesh geometry={B.sphere} material={longSleeve ? top : skinM} scale={0.054 * (0.9 + bw * 0.1)} />}
        <mesh geometry={B.foreArm} material={longSleeve ? top : skinM} position={[0, -0.1, 0]} scale={[bw * 0.9 + 0.1, 1, bw * 0.9 + 0.1]} castShadow={cast} />
        {!lite && longSleeve && <mesh geometry={G.cyl} material={style === 'smart' ? M('#f4f4f4') : top} position={[0, -0.19, 0]} scale={[0.056, 0.03, 0.056]} />}
        {/* hand: palm and thumb */}
        <mesh geometry={G.sphere} material={skinM} position={[0, -0.235, 0.005]} scale={[0.048, 0.062, 0.034]} />
        {!lite && <mesh geometry={G.sphere} material={skinM} position={[0.035 * -side, -0.215, 0.025]} rotation={[0, 0, 0.5 * side]} scale={[0.016, 0.034, 0.016]} />}
        {!lite && side === -1 && acc === 'Wristwatch' && (
          <>
            <mesh geometry={G.cyl} material={M('#1b1b1b', 0.4)} position={[0, -0.17, 0]} scale={[0.058, 0.025, 0.058]} />
            <mesh geometry={G.cyl} material={M('#d4af37', 0.25)} position={[0, -0.17, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={[0.022, 0.012, 0.022]} />
          </>
        )}
        {withProps && <HandProps ref={R.propHand} />}
      </group>
    </group>
  )

  return (
    <group scale={scale * (fem ? 0.96 : 1)}>
      <group ref={R.root}>
        <group ref={R.hips} position={[0, 0.66, 0]}>
          <mesh geometry={B.pelvis} material={style === 'ankara' ? M(outfit.bottom) : style === 'dress' ? top : bottom} rotation={[0, 0, Math.PI / 2]} scale={[1, 1.05 * bw * hipW, 0.85 * bw * (fem ? 1.05 : 1)]} castShadow={cast} />
          {leg(-1, R.hipL, R.kneeL)}
          {leg(1, R.hipR, R.kneeR)}
          {style === 'ankara' && <mesh geometry={G.skirt} material={M(outfit.bottom)} position={[0, 0.04, 0]} scale={[bw, 1, bw]} castShadow={cast} />}
          {style === 'dress' && <mesh geometry={G.skirt} material={top} position={[0, 0.06, 0]} scale={[bw, 0.95, bw]} castShadow={cast} />}
          {style === 'kaftan' && <mesh geometry={G.skirt} material={top} position={[0, 0.08, 0]} scale={[bw * 0.95, 0.9, bw * 0.85]} castShadow={cast} />}
          {!lite && (style === 'tee' || style === 'smart' || style === 'hoodie') && <mesh geometry={G.cyl} material={M('#2a1d14', 0.4)} position={[0, 0.07, 0]} scale={[0.155 * bw, 0.035, 0.125 * bw]} />}
          {!lite && (style === 'tee' || style === 'smart' || style === 'hoodie') && <mesh geometry={G.box} material={M('#c9a24a', 0.3)} position={[0, 0.07, 0.123 * bw]} scale={[0.04, 0.03, 0.01]} />}
          <group ref={R.spine} position={[0, 0.04, 0]}>
            {lite ? (
              <mesh geometry={G.torso} material={top} position={[0, 0.22, 0]} scale={[1.22 * bw * shW, 1, 0.78 * (0.85 + bw * 0.15)]} castShadow={cast} />
            ) : (
              <>
                {/* chest broader than the waist, like a real torso */}
                <mesh geometry={GH.torso} material={top} position={[0, 0.27, 0]} scale={[1.26 * bw * shW, 0.82, 0.8 * (0.85 + bw * 0.15)]} castShadow />
                <mesh geometry={GH.waist} material={top} position={[0, 0.09, 0]} scale={[(fem ? 0.9 : 1.1) * bw, 0.75, 0.76 * (0.85 + bw * 0.15)]} castShadow />
                {fem && [-1, 1].map((sd) => <mesh key={sd} geometry={GH.sphere} material={top} position={[0.068 * sd * bw, 0.29, 0.095 * (0.85 + bw * 0.15)]} scale={[0.072 * bw, 0.068, 0.06]} castShadow />)}
              </>
            )}
            {!lite && <Outfit style={style} main={main} bw={bw} />}
            <mesh geometry={G.neck} material={skinM} position={[0, 0.46, 0]} scale={[0.85 + bw * 0.1, 1.3, 0.85 + bw * 0.1]} />
            {arm(-1, R.shL, R.elL, false)}
            {arm(1, R.shR, R.elR, true)}
            <group ref={R.head} position={[0, 0.6, 0]} scale={lite ? 0.88 : 0.78}>
              <mesh geometry={B.sphere} material={skinM} scale={[0.158, 0.188, 0.172]} castShadow={cast} />
              {/* jaw and chin */}
              <mesh geometry={B.sphere} material={skinM} position={[0, -0.082, 0.035]} scale={fem ? [0.11, 0.1, 0.118] : [0.122, 0.112, 0.125]} />
              {!lite && <mesh geometry={B.sphere} material={skinM} position={[0, -0.155, 0.085]} scale={fem ? [0.035, 0.028, 0.032] : [0.045, 0.035, 0.04]} />}
              {!lite && (
                <>
                  <mesh geometry={G.sphere} material={skinM} position={[-0.163, -0.01, 0]} scale={[0.03, 0.045, 0.03]} />
                  <mesh geometry={G.sphere} material={skinM} position={[0.163, -0.01, 0]} scale={[0.03, 0.045, 0.03]} />
                  <group ref={R.eyes} position={[0, 0.02, 0.145]}>
                    {[-1, 1].map((sd) => (
                      <group key={sd} position={[0.058 * sd, 0, 0]}>
                        <mesh geometry={G.sphere} material={M('#fbf8f2', 0.35)} scale={[0.033, 0.024, 0.016]} />
                        <mesh geometry={G.sphere} material={M('#4a2c1a', 0.3)} position={[0, -0.002, 0.009]} scale={[0.017, 0.017, 0.01]} />
                        <mesh geometry={G.sphere} material={M('#0d0907', 0.2)} position={[0, -0.002, 0.014]} scale={0.009} />
                        <mesh geometry={G.sphere} material={M('#ffffff', 0.1)} position={[0.005, 0.005, 0.018]} scale={0.0035} />
                        {/* upper lid */}
                        <mesh geometry={G.box} material={skinM} position={[0, 0.02, 0.006]} rotation={[0.3, 0, 0]} scale={[0.07, 0.012, 0.02]} />
                      </group>
                    ))}
                  </group>
                  <mesh geometry={G.box} material={M(hairC)} position={[-0.06, 0.068, 0.157]} rotation={[0.1, 0, 0.14]} scale={[0.062, 0.014, 0.014]} />
                  <mesh geometry={G.box} material={M(hairC)} position={[0.06, 0.068, 0.157]} rotation={[0.1, 0, -0.14]} scale={[0.062, 0.014, 0.014]} />
                  {/* nose: bridge and nostrils */}
                  <mesh geometry={G.sphere} material={skinM} position={[0, -0.01, 0.165]} scale={[0.018, 0.04, 0.022]} />
                  <mesh geometry={G.sphere} material={skinM} position={[0, -0.04, 0.17]} scale={[0.034, 0.022, 0.024]} />
                  {/* lips */}
                  <mesh geometry={G.sphere} material={lipM} position={[0, -0.083, 0.152]} scale={[0.04, fem ? 0.014 : 0.011, 0.016]} />
                  <mesh geometry={G.sphere} material={lipM} position={[0, -0.098, 0.149]} scale={[0.036, fem ? 0.017 : 0.013, 0.017]} />
                  {fem && [-1, 1].map((sd) => <mesh key={sd} geometry={G.box} material={M('#14100e', 0.4)} position={[0.058 * sd, 0.043, 0.16]} rotation={[0.4, 0, -0.18 * sd]} scale={[0.066, 0.009, 0.008]} />)}
                  {/* cheeks */}
                  {[-1, 1].map((sd) => <mesh key={sd} geometry={G.sphere} material={skinM} position={[0.085 * sd, -0.04, 0.115]} scale={[0.045, 0.04, 0.04]} />)}
                  <Beard kind={beard} color={hairC} />
                </>
              )}
              {lite && <mesh geometry={G.box} material={M('#1d1512')} position={[0, 0.02, 0.155]} scale={[0.14, 0.025, 0.02]} />}
              <Hair style={appearance.hair} color={hairC} accent={main} hidden={acc === 'Beanie' || acc === 'Kufi cap'} />
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

function shadeHex(hex: string, k: number) {
  const c = new THREE.Color(hex)
  c.multiplyScalar(k)
  return `#${c.getHexString()}`
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

function Outfit({ style, main, bw }: { style: string; main: string; bw: number }) {
  const M = (c: string, r = 0.8) => getMat(c, 1, r)
  const z = 0.122 * (0.85 + bw * 0.15)
  if (style === 'smart') return (
    <>
      {/* shirt front, tie and blazer lapels */}
      <mesh geometry={G.box} material={M('#f4f4f4')} position={[0, 0.3, z - 0.004]} scale={[0.13, 0.24, 0.02]} />
      <mesh geometry={G.box} material={M('#a52a2a', 0.5)} position={[0, 0.27, z + 0.008]} scale={[0.045, 0.24, 0.012]} />
      <mesh geometry={G.box} material={M('#a52a2a', 0.5)} position={[0, 0.39, z + 0.008]} scale={[0.06, 0.04, 0.014]} />
      {[-1, 1].map((sd) => <mesh key={sd} geometry={G.box} material={M(main, 0.6)} position={[0.075 * sd, 0.3, z + 0.006]} rotation={[0, 0, -0.35 * sd]} scale={[0.05, 0.22, 0.02]} />)}
      {[0.18, 0.1].map((y) => <mesh key={y} geometry={G.sphere} material={M('#1b1b1b', 0.3)} position={[0.08, y, z + 0.01]} scale={0.012} />)}
      <mesh geometry={G.box} material={M('#ffffff')} position={[-0.11 * bw, 0.33, z]} scale={[0.04, 0.025, 0.012]} />
    </>
  )
  if (style === 'ankara') return (
    <>
      {[0.32, 0.2, 0.08].map((y, i) => <mesh key={y} geometry={G.box} material={M(i % 2 ? '#2fa866' : '#fcd116')} position={[0, y, z - 0.005]} scale={[0.36 * bw, 0.045, 0.02]} />)}
      {[-0.1, 0.1].map((x) => <mesh key={x} geometry={G.box} material={M('#ce1126')} position={[x * bw, 0.2, z]} scale={[0.03, 0.3, 0.015]} />)}
      <mesh geometry={G.torus} material={M('#fcd116')} position={[0, 0.41, 0.02]} rotation={[Math.PI / 2 - 0.2, 0, 0]} scale={[0.1, 0.1, 0.1]} />
    </>
  )
  if (style === 'sport') return (
    <>
      <mesh geometry={G.box} material={M('#f0ede6')} position={[0, 0.22, z]} scale={[0.02, 0.4, 0.015]} />
      <mesh geometry={G.torus} material={M('#f0ede6')} position={[0, 0.41, 0.01]} rotation={[Math.PI / 2 - 0.15, 0, 0]} scale={[0.1, 0.1, 0.14]} />
      {[-1, 1].map((sd) => <mesh key={sd} geometry={G.box} material={M('#f4f4f4')} position={[0.19 * bw * sd, 0.24, 0]} scale={[0.012, 0.3, 0.06]} />)}
    </>
  )
  if (style === 'jersey') return (
    <>
      {/* collar in red, gold and green with a black star; number on the back */}
      <mesh geometry={G.torus} material={M('#ce1126')} position={[0, 0.405, 0.01]} rotation={[Math.PI / 2 - 0.15, 0, 0]} scale={[0.1, 0.1, 0.13]} />
      <mesh geometry={G.box} material={M('#fcd116')} position={[0, 0.3, z]} scale={[0.36 * bw, 0.03, 0.012]} />
      <mesh geometry={G.box} material={M('#006b3f')} position={[0, 0.27, z]} scale={[0.36 * bw, 0.03, 0.012]} />
      <mesh geometry={G.cone} material={M('#111111')} position={[0.08, 0.36, z + 0.005]} rotation={[Math.PI / 2, 0, 0]} scale={[0.025, 0.01, 0.025]} />
      <mesh geometry={G.box} material={M('#ffffff')} position={[0, 0.24, -z]} scale={[0.04, 0.14, 0.012]} />
      <mesh geometry={G.box} material={M('#ffffff')} position={[0.05, 0.24, -z]} scale={[0.04, 0.14, 0.012]} />
    </>
  )
  if (style === 'kaftan') return (
    <>
      <mesh geometry={G.box} material={M('#d4af37', 0.4)} position={[0, 0.34, z]} scale={[0.04, 0.16, 0.012]} />
      <mesh geometry={G.torus} material={M('#d4af37', 0.4)} position={[0, 0.405, 0.02]} rotation={[Math.PI / 2 - 0.2, 0, 0]} scale={[0.095, 0.095, 0.1]} />
      {[0.38, 0.33, 0.28].map((y) => <mesh key={y} geometry={G.box} material={M('#d4af37', 0.4)} position={[0.04, y, z]} scale={[0.04, 0.008, 0.012]} />)}
    </>
  )
  if (style === 'hoodie') return (
    <>
      {/* hood, pouch pocket and drawstrings */}
      <mesh geometry={G.sphere} material={M(main)} position={[0, 0.42, -0.1]} scale={[0.17 * bw, 0.1, 0.1]} />
      <mesh geometry={G.box} material={M(main, 0.9)} position={[0, 0.1, z + 0.005]} scale={[0.22 * bw, 0.1, 0.02]} />
      {[-1, 1].map((sd) => <mesh key={sd} geometry={G.cyl} material={M('#f4f4f4')} position={[0.035 * sd, 0.34, z + 0.01]} scale={[0.006, 0.1, 0.006]} />)}
    </>
  )
  if (style === 'dress') return (
    <>
      <mesh geometry={G.torus} material={M('#f4f4f4')} position={[0, 0.405, 0.02]} rotation={[Math.PI / 2 - 0.2, 0, 0]} scale={[0.1, 0.1, 0.1]} />
      <mesh geometry={G.cyl} material={M('#1b1b1b', 0.4)} position={[0, 0.03, 0]} scale={[0.15 * bw, 0.03, 0.12 * bw]} />
    </>
  )
  return (
    <>
      {/* tee: crew collar and a chest print */}
      <mesh geometry={G.torus} material={M(main, 0.9)} position={[0, 0.405, 0.01]} rotation={[Math.PI / 2 - 0.15, 0, 0]} scale={[0.095, 0.095, 0.12]} />
      <mesh geometry={G.box} material={M('#ffffff')} position={[0, 0.27, z]} scale={[0.12, 0.08, 0.012]} />
      <mesh geometry={G.box} material={M('#1b1b1b')} position={[0, 0.27, z + 0.004]} scale={[0.08, 0.025, 0.01]} />
    </>
  )
}

function Beard({ kind, color }: { kind: number; color: string }) {
  const M = getMat(color, 1, 0.95)
  if (kind === 1) return <mesh geometry={G.sphere} material={getMat(color, 0.55, 0.95)} position={[0, -0.07, 0.04]} scale={[0.14, 0.12, 0.14]} />
  if (kind === 2) return (
    <>
      <mesh geometry={G.box} material={M} position={[0, -0.072, 0.158]} scale={[0.07, 0.014, 0.012]} />
      <mesh geometry={G.sphere} material={M} position={[0, -0.135, 0.12]} scale={[0.04, 0.05, 0.04]} />
    </>
  )
  if (kind === 3) return (
    <>
      <mesh geometry={G.sphere} material={M} position={[0, -0.095, 0.06]} scale={[0.15, 0.115, 0.135]} />
      <mesh geometry={G.box} material={M} position={[0, -0.07, 0.158]} scale={[0.08, 0.016, 0.014]} />
      {[-1, 1].map((sd) => <mesh key={sd} geometry={G.box} material={M} position={[0.14 * sd, -0.02, 0.04]} scale={[0.02, 0.09, 0.08]} />)}
    </>
  )
  return null
}

function Hair({ style, color, accent, hidden }: { style: number; color: string; accent: string; hidden?: boolean }) {
  const M = getMat(color, 1, 0.95)
  // hats cover the hair: keep only what shows below them
  if (hidden) return style === 6 || style === 2 ? <DreadsBack M={M} /> : null
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
    case 6:
      return (
        <>
          <mesh geometry={G.hemi} material={M} position={[0, 0.03, -0.005]} scale={[0.178, 0.18, 0.184]} castShadow />
          {Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI * (0.15 + (i / 8) * 0.7)
            return <mesh key={i} geometry={G.cyl} material={M} position={[Math.cos(a) * 0.15, -0.1, -Math.sin(a) * 0.13 + 0.02]} rotation={[0.2 * Math.sin(a), 0, Math.cos(a) * 0.3]} scale={[0.026, 0.34, 0.026]} castShadow />
          })}
        </>
      )
    case 7:
      return (
        <>
          <mesh geometry={G.hemi} material={M} position={[0, 0.02, -0.005]} scale={[0.169, 0.165, 0.175]} castShadow />
          {[-0.09, -0.045, 0, 0.045, 0.09].map((x) => <mesh key={x} geometry={G.box} material={getMat(color, 1, 0.6)} position={[x, 0.17, -0.01]} rotation={[0.2, 0, 0]} scale={[0.018, 0.02, 0.3]} />)}
        </>
      )
    case 8:
      return (
        <>
          <mesh geometry={G.hemi} material={M} position={[0, 0.03, -0.005]} scale={[0.172, 0.17, 0.178]} castShadow />
          <mesh geometry={G.sphere} material={M} position={[0, 0.2, -0.06]} scale={[0.17, 0.15, 0.16]} castShadow />
          <mesh geometry={G.torus} material={getMat(accent)} position={[0, 0.1, -0.05]} rotation={[Math.PI / 2 - 0.4, 0, 0]} scale={[0.1, 0.1, 0.1]} />
        </>
      )
    case 9:
      return (
        <>
          <mesh geometry={G.hemi} material={M} position={[0, 0.03, -0.005]} scale={[0.176, 0.175, 0.182]} castShadow />
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2
            const r = i % 2 ? 0.1 : 0.05
            return <mesh key={i} geometry={G.cyl} material={M} position={[Math.cos(a) * r, 0.18, Math.sin(a) * r - 0.01]} rotation={[Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]} scale={[0.024, 0.11, 0.024]} />
          })}
        </>
      )
    case 10:
      return (
        <>
          <mesh geometry={G.hemi} material={M} position={[0, 0.05, -0.005]} scale={[0.168, 0.15, 0.174]} castShadow />
          <mesh geometry={G.box} material={getMat(color, 0.55, 0.95)} position={[0, -0.005, -0.03]} scale={[0.33, 0.05, 0.3]} />
        </>
      )
    default:
      return null
  }
}

function DreadsBack({ M }: { M: THREE.Material }) {
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * (0.2 + (i / 6) * 0.6)
        return <mesh key={i} geometry={G.cyl} material={M} position={[Math.cos(a) * 0.14, -0.12, -Math.sin(a) * 0.12]} scale={[0.024, 0.28, 0.024]} />
      })}
    </>
  )
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
    case 'Sunglasses':
      return (
        <group position={[0, 0.02, 0.163]}>
          {[-1, 1].map((sd) => <mesh key={sd} geometry={G.box} material={M('#0d0d0f', 0.15)} position={[0.058 * sd, 0, 0]} scale={[0.065, 0.04, 0.012]} />)}
          <mesh geometry={G.box} material={M('#d4af37', 0.3)} position={[0, 0.012, 0]} scale={[0.17, 0.008, 0.01]} />
          {[-1, 1].map((sd) => <mesh key={sd} geometry={G.box} material={M('#d4af37', 0.3)} position={[0.16 * sd, 0.01, -0.08]} scale={[0.006, 0.006, 0.16]} />)}
        </group>
      )
    case 'Earrings':
      return (
        <>
          {[-1, 1].map((sd) => <mesh key={sd} geometry={G.torus} material={M('#d4af37', 0.25)} position={[0.168 * sd, -0.06, 0.005]} rotation={[0, Math.PI / 2, 0]} scale={0.022} />)}
        </>
      )
    case 'Beanie':
      return (
        <>
          <mesh geometry={G.hemi} material={M(main, 0.95)} position={[0, 0.04, -0.005]} scale={[0.182, 0.2, 0.188]} castShadow />
          <mesh geometry={G.cyl} material={M(main === '#f0ede6' ? '#1b1b1b' : '#f0ede6', 0.95)} position={[0, 0.06, -0.005]} scale={[0.184, 0.05, 0.19]} />
        </>
      )
    case 'Kufi cap':
      return (
        <>
          <mesh geometry={G.cyl} material={M('#f4f1ea', 0.9)} position={[0, 0.13, -0.01]} scale={[0.165, 0.1, 0.17]} castShadow />
          <mesh geometry={G.cyl} material={M('#d4af37', 0.5)} position={[0, 0.1, -0.01]} scale={[0.167, 0.02, 0.172]} />
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
