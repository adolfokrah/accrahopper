'use client'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { clone as cloneSkinned, retargetClip } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { HAIR_COLORS, OUTFITS, OUTFIT_COLORS, SKIN_TONES } from '@/game/content'
import type { Appearance } from '@/game/types'
import { HandProps, poseTarget, zero, type J, type Motion, type Prop } from './Character'

/**
 * Realistic low-poly people (CC0 Quaternius Ultimate Modular Men & Women, ~6k triangles each).
 * Every character shares one skeleton, so the same clips drive everyone. Clips the pack lacks
 * (sitting, dancing, driving...) are retargeted once from the CC0 Universal Animation Library.
 */
const DIR = '/models/people/'
const UAL_URL = '/models/ual-dance.glb'
/** Height the rest of the game is built around (labels, doors, furniture). */
const TARGET_HEIGHT = 1.62
const FADE = 0.25

type CharKey = 'w_casual' | 'w_formal' | 'w_suit' | 'w_worker' | 'w_punk' | 'm_casual' | 'm_hoodie' | 'm_beach' | 'm_farmer' | 'm_suit' | 'm_worker' | 'm_punk'

/** Outfit style -> character, for men and women. */
const BY_STYLE: Record<string, [CharKey, CharKey]> = {
  tee: ['m_casual', 'w_casual'], smart: ['m_suit', 'w_suit'], ankara: ['m_farmer', 'w_formal'], sport: ['m_beach', 'w_punk'],
  jersey: ['m_beach', 'w_casual'], kaftan: ['m_farmer', 'w_formal'], hoodie: ['m_hoodie', 'w_punk'], dress: ['m_suit', 'w_formal'],
}
/** The garment that takes the player's outfit colour. */
const MAIN_MATERIAL: Record<CharKey, string> = {
  w_casual: 'White', w_formal: 'LimeGreen', w_suit: 'Black', w_worker: 'Worker_Vest', w_punk: 'Pink',
  m_casual: 'LightBrown', m_hoodie: 'Purple', m_beach: 'LightBrown', m_farmer: 'LightBlue', m_suit: 'Suit', m_worker: 'Worker_Vest', m_punk: 'White',
}
/** Trousers/skirt: take the outfit's bottom colour (characters whose legs share the main garment are left out). */
const LEGS_MATERIAL: Partial<Record<CharKey, string>> = {
  w_casual: 'Orange', w_punk: 'Black', m_casual: 'LightBlue', m_hoodie: 'LightBlue', m_punk: 'LightBlue', m_beach: 'Red_Dark',
}
const HAIR_MATERIALS = /^(Hair|Hair_Brown|Hair_Blond|Eyebrows)$/

/**
 * Poses with a good clip play it. Every other pose (sitting, eating, driving, kneeling, cooking...)
 * plays the idle clip with the game's hand-tuned joint angles layered on top, so seats, tables and
 * steering wheels line up exactly as they were designed.
 */
const CLIP_POSES: Record<string, string> = { wave: 'Wave', dance: 'Dance_Loop', run: 'Run' }
const RETARGET = ['Dance_Loop']
/** Pose-layer joint (old rig, "L" at -X) -> bone on this skeleton (".L" at +X). */
const LAYER = {
  hipL: 'UpperLeg.R', hipR: 'UpperLeg.L', kneeL: 'LowerLeg.R', kneeR: 'LowerLeg.L',
  shL: 'UpperArm.R', shR: 'UpperArm.L', elL: 'LowerArm.R', elR: 'LowerArm.L',
} as const
/** Old rig leg lengths (game units): its pose heights were tuned around these. */
const OLD_LEGS = { T: 0.31, S: 0.335 }
/** How far the hips drop so the lower foot stays on the floor, for given thigh/shin lengths. */
function legDrop(L: { T: number; S: number }, j: J) {
  const reach = (hip: number, knee: number) => L.T * Math.cos(hip) + L.S * Math.cos(hip + knee)
  return L.T + L.S - Math.max(reach(j.hipL, j.kneeL), reach(j.hipR, j.kneeR))
}
const AX = new THREE.Vector3()
const Q = new THREE.Quaternion()
const QP = new THREE.Quaternion()
const QROOT = new THREE.Quaternion()
/** Turn a bone about a character-space axis (right, up or forward) by `angle`. */
function turnBone(bone: THREE.Object3D | undefined, axis: THREE.Vector3, angle: number) {
  if (!bone || !angle || !bone.parent) return
  bone.parent.updateWorldMatrix(true, false)
  bone.parent.getWorldQuaternion(QP).invert()
  Q.setFromAxisAngle(AX.copy(axis).applyQuaternion(QP).normalize(), angle)
  bone.quaternion.premultiply(Q)
  bone.updateMatrixWorld(true)
}
/** GLTFLoader strips characters like "." from node names ("UpperArm.R" loads as "UpperArmR"). */
const nodeName = (n: string) => THREE.PropertyBinding.sanitizeNodeName(n)
/** Quaternius bone -> Universal Animation Library bone (written as authored, sanitized below). */
const BONE_MAP_AUTHORED: Record<string, string> = {
  Hips: 'DEF-hips', Abdomen: 'DEF-spine.001', Torso: 'DEF-spine.002', Chest: 'DEF-spine.003', Neck: 'DEF-neck', Head: 'DEF-head',
  'Shoulder.L': 'DEF-shoulder.L', 'UpperArm.L': 'DEF-upper_arm.L', 'LowerArm.L': 'DEF-forearm.L', 'Wrist.L': 'DEF-hand.L',
  'Shoulder.R': 'DEF-shoulder.R', 'UpperArm.R': 'DEF-upper_arm.R', 'LowerArm.R': 'DEF-forearm.R', 'Wrist.R': 'DEF-hand.R',
  'UpperLeg.L': 'DEF-thigh.L', 'LowerLeg.L': 'DEF-shin.L', 'Foot.L': 'DEF-foot.L', 'UpperLeg.R': 'DEF-thigh.R', 'LowerLeg.R': 'DEF-shin.R', 'Foot.R': 'DEF-foot.R',
}
const BONE_MAP: Record<string, string> = Object.fromEntries(Object.entries(BONE_MAP_AUTHORED).map(([k, v]) => [nodeName(k), nodeName(v)]))

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
interface Base { scene: THREE.Group; scale: number }
const chars = new Map<CharKey, Promise<Base>>()
const ready = new Map<CharKey, Base>()
let clips: THREE.AnimationClip[] | null = null
let clipsLoading: Promise<THREE.AnimationClip[]> | null = null

function charFor(a: Appearance): CharKey {
  const style = OUTFITS[a.outfit]?.style ?? 'tee'
  return (BY_STYLE[style] ?? BY_STYLE.tee)[(a.sex ?? 0) === 1 ? 1 : 0]
}

function loadChar(key: CharKey): Promise<Base> {
  let p = chars.get(key)
  if (!p) {
    p = loader.loadAsync(`${DIR}${key}.glb`).then((g) => {
      g.scene.getObjectByName('Pistol')?.removeFromParent()
      const box = new THREE.Box3().setFromObject(g.scene)
      const base = { scene: g.scene as THREE.Group, scale: TARGET_HEIGHT / (box.max.y - box.min.y || 1.8) }
      ready.set(key, base)
      return base
    })
    chars.set(key, p)
  }
  return p
}

/** Native clips plus library clips retargeted onto the shared skeleton (done once). */
function loadClips(): Promise<THREE.AnimationClip[]> {
  clipsLoading ??= Promise.all([loader.loadAsync(`${DIR}clips.glb`), loader.loadAsync(UAL_URL)]).then(([own, ual]) => {
    const target = findSkinned(own.scene)
    const source = findSkinned(ual.scene)
    const out = [...own.animations]
    if (target && source) {
      const names: Record<string, string> = {}
      for (const b of target.skeleton.bones) names[b.name] = BONE_MAP[b.name] ?? ''
      for (const name of RETARGET) {
        const clip = ual.animations.find((c) => c.name === name)
        if (!clip) continue
        try {
          const rc = retargetClip(target, source, clip, { names, hip: 'Hips', useFirstFramePosition: true, fps: 30 })
          rc.name = name
          // ".bones[Hips].quaternion" -> "Hips.quaternion" so any character's mixer can bind it;
          // keep rotations of mapped bones only (position tracks would slide people around)
          const hips = target.skeleton.getBoneByName('Hips')
          rc.tracks = rc.tracks.flatMap((t) => {
            const m = /^\.bones\[(.+)\]\.(quaternion|position)$/.exec(t.name)
            if (!m || !BONE_MAP[m[1]]) return []
            if (m[2] === 'position') {
              // hips may go up and down (sitting, kneeling) but never wander sideways
              if (m[1] !== 'Hips' || !hips) return []
              const v = t.values
              for (let i = 0; i < v.length; i += 3) { v[i] = hips.position.x; v[i + 2] = hips.position.z }
            }
            t.name = `${m[1]}.${m[2]}`
            return [t]
          })
          out.push(rc)
        } catch (e) {
          console.warn('[Human] retarget failed', name, e)
        }
      }
    }
    clips = out
    return out
  })
  return clipsLoading
}

function findSkinned(o: THREE.Object3D): THREE.SkinnedMesh | null {
  let found: THREE.SkinnedMesh | null = null
  o.traverse((c) => { if (!found && (c as THREE.SkinnedMesh).isSkinnedMesh) found = c as THREE.SkinnedMesh })
  return found
}

/** True once this person's model and the clips are ready; starts loading on first use. */
export function useHumanReady(a?: Appearance): boolean {
  const key = a ? charFor(a) : null
  const [, bump] = useState(0)
  const isReady = !!clips && (!key || ready.has(key))
  useEffect(() => {
    if (isReady) return
    let live = true
    Promise.all([loadClips(), key ? loadChar(key) : null]).then(() => live && bump((v) => v + 1)).catch((e) => console.warn('[Human] load failed', e))
    return () => { live = false }
  }, [key, isReady])
  return isReady
}

function clipFor(m: Motion): string {
  if (m.moving) return m.speed > 4 ? 'Run' : 'Walk'
  return (m.action && CLIP_POSES[m.action]) || 'Idle'
}
/** Poses drawn by the joint layer (no matching clip). */
const layered = (m: Motion) => !m.moving && !!m.action && !CLIP_POSES[m.action]

const shade = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k)

export function Human({ appearance, getMotion, scale = 1 }: { appearance: Appearance; getMotion: () => Motion; scale?: number }) {
  const key = charFor(appearance)
  const base = ready.get(key)!
  const { root, mixer, actions, bones, rest, legs, hand } = useMemo(() => {
    const root = cloneSkinned(base.scene) as THREE.Group
    root.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.frustumCulled = false
      // own materials so each person can be recoloured
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((mt) => mt.clone()) : mesh.material.clone()
    })
    const mixer = new THREE.AnimationMixer(root)
    const actions = new Map((clips ?? []).map((c) => [c.name, mixer.clipAction(c)]))
        const bone = (n: string) => root.getObjectByName(nodeName(n)) ?? undefined
    const bones = {
      hipL: bone(LAYER.hipL), hipR: bone(LAYER.hipR), kneeL: bone(LAYER.kneeL), kneeR: bone(LAYER.kneeR),
      shL: bone(LAYER.shL), shR: bone(LAYER.shR), elL: bone(LAYER.elL), elR: bone(LAYER.elR),
      chest: bone('Chest'), torso: bone('Torso'), head: bone('Head'),
    }
    // remember each layered bone's rest pose: bones a clip leaves alone are reset to it every frame,
    // so the pose layer never piles up
    // thigh and shin lengths of this body (model units) for keeping feet on the floor
    root.updateMatrixWorld(true)
    const at = (n?: THREE.Object3D) => (n ? n.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3())
    const legs = { T: at(bones.hipR).distanceTo(at(bones.kneeR)), S: at(bones.kneeR).distanceTo(at(bone('Foot.L'))) }
    const rest = Object.values(bones).filter((b): b is THREE.Object3D => !!b).map((b) => [b, b.quaternion.clone()] as const)
    // the old rig held props in its +X hand, which is ".L" here
    return { root, mixer, actions, bones, rest, legs, hand: bone('Wrist.L') ?? null }
  }, [base])

  // skin, hair and the main garment follow the player's choices
  useEffect(() => {
    const skin = SKIN_TONES[appearance.skin] ?? SKIN_TONES[0]
    const hair = HAIR_COLORS[appearance.hairColor] ?? '#222'
    const main = OUTFIT_COLORS[appearance.outfitColor] ?? '#2e86de'
    const bottom = OUTFITS[appearance.outfit]?.bottom ?? '#3b5a8c'
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const isHead = /Head/i.test(mesh.name) || /Head/i.test(mesh.parent?.name ?? '')
      for (const mt of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[]) {
        if (!mt.color) continue
        if (mt.name === 'Skin') mt.color.set(skin)
        else if (mt.name === 'Skin_Darker') mt.color.copy(shade(skin, 0.8))
        else if (HAIR_MATERIALS.test(mt.name) || (isHead && mt.name === 'Brown' && key.startsWith('w_'))) mt.color.set(hair)
        else if (mt.name === MAIN_MATERIAL[key]) mt.color.set(main)
        else if (mt.name === LEGS_MATERIAL[key] && /Legs|Pants/i.test(mesh.name + (mesh.parent?.name ?? ''))) mt.color.set(bottom)
        mt.roughness = Math.max(mt.roughness, 0.7)
        mt.metalness = 0
      }
    })
  }, [root, key, appearance.skin, appearance.hairColor, appearance.outfitColor, appearance.outfit])

  useEffect(() => () => { mixer.stopAllAction(); mixer.uncacheRoot(root) }, [mixer, root])

  // props ride on the right hand bone
  const propRef = useRef<THREE.Group>(null)
  useEffect(() => {
    const p = propRef.current
    if (!hand || !p) return
    hand.add(p)
    return () => { hand.remove(p) }
  }, [hand])

  const current = useRef<string | null>(null)
  const propNow = useRef<Prop | null | undefined>(undefined)
  const body = useRef<THREE.Group>(null)
  const offset = useRef(Math.random() * 3)
  const joints = useRef<J>(zero())
  const seed = useRef(Math.random() * 10)
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const m = getMotion()
    let name = clipFor(m)
    if (!actions.has(name)) name = 'Idle'
    if (name !== current.current) {
      const next = actions.get(name) ?? actions.get('Idle')
      const prev = current.current ? actions.get(current.current) : null
      if (next) {
        next.reset().setEffectiveWeight(1).fadeIn(prev ? FADE : 0).play()
        if (!prev) next.time = offset.current % next.getClip().duration
        prev?.fadeOut(FADE)
      }
      current.current = name
    }
    // walk cycle keeps pace with movement speed
    const act = actions.get(name)
    if (act) act.timeScale = m.moving ? Math.max(0.6, Math.min(1.6, m.speed / (name === 'Run' ? 4.5 : 2.8))) : 1
    for (const [b, q] of rest) b.quaternion.copy(q)
    mixer.update(dt)
    // pose layer: ease the joint angles toward the pose (or back to zero when a clip takes over)
    const tg = layered(m) ? poseTarget(m, state.clock.elapsedTime + seed.current, 0) : zero()
    const c = joints.current
    const k = 1 - Math.exp(-dt * 10)
    for (const key of Object.keys(c) as (keyof J)[]) c[key] += (tg[key] - c[key]) * k
    if (body.current) {
      // the old heights assumed the old leg lengths: swap its leg drop for this body's
      const k2 = base.scale * scale
      body.current.position.y = c.rootX ? c.y : c.y + legDrop(OLD_LEGS, c) - legDrop({ T: legs.T * k2, S: legs.S * k2 }, c)
      body.current.rotation.x = c.rootX
      root.getWorldQuaternion(QROOT)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(QROOT)
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(QROOT)
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(QROOT)
      const b = bones
      turnBone(b.torso, right, c.spineX * 0.5); turnBone(b.chest, right, c.spineX * 0.5); turnBone(b.chest, up, c.spineY)
      turnBone(b.head, right, c.headX); turnBone(b.head, up, c.headY)
      turnBone(b.shL, right, c.shL); turnBone(b.shL, fwd, c.shLz); turnBone(b.elL, right, c.elL)
      turnBone(b.shR, right, c.shR); turnBone(b.shR, fwd, c.shRz); turnBone(b.elR, right, c.elR)
      turnBone(b.hipL, right, c.hipL); turnBone(b.kneeL, right, c.kneeL)
      turnBone(b.hipR, right, c.hipR); turnBone(b.kneeR, right, c.kneeR)
    }
    const prop = m.prop ?? null
    if (prop !== propNow.current && propRef.current) {
      propNow.current = prop
      propRef.current.children[0]?.children[0]?.children.forEach((ch) => (ch.visible = ch.name === prop))
    }
  })

  return (
    <group ref={body} scale={base.scale * scale}>
      <primitive object={root} />
      {/* bone space is in the model's own units: undo the overall scale for the props */}
      <group ref={propRef} scale={1 / base.scale}>
        {/* HandProps sits at the old elbow-to-hand offset; cancel it so props start at the palm */}
        <group position={[0, 0.25, -0.04]}>
          <HandProps />
        </group>
      </group>
    </group>
  )
}
