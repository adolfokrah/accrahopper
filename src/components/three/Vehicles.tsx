'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DEFAULT_APPEARANCE } from '@/game/content'
import { runtime } from '@/game/runtime'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import type { Appearance } from '@/game/types'
import { CarModel, MotoModel } from './Ambient'
import { Character, type Motion } from './Character'
import { TextPlane } from './Label'
import { Part, headlightMat, labelScale, viewCenter, windowMat } from './shared'

type Mode = 'trotro' | 'taxi' | 'ride' | 'okada' | 'pragia'
const DRIVER: Appearance = { skin: 4, hair: 0, hairColor: 0, outfit: 0, outfitColor: 3, accessory: 2 }
const PAX: Appearance[] = [
  { skin: 2, hair: 2, hairColor: 1, outfit: 2, outfitColor: 0, accessory: 0 },
  { skin: 5, hair: 3, hairColor: 0, outfit: 1, outfitColor: 5, accessory: 0 },
  { skin: 3, hair: 4, hairColor: 0, outfit: 0, outfitColor: 6, accessory: 0 },
  { skin: 4, hair: 1, hairColor: 0, outfit: 3, outfitColor: 2, accessory: 0 },
  { skin: 1, hair: 5, hairColor: 2, outfit: 2, outfitColor: 4, accessory: 3 },
]
const drive: () => Motion = () => ({ moving: false, speed: 0, action: 'drive' })
const sit: () => Motion = () => ({ moving: false, speed: 0, action: 'sit' })
const seated = (look: Appearance, p: [number, number, number], s = 0.75, lite = true, motion = sit, rot = 0) => (
  <group position={p} scale={s} rotation={[0, rot, 0]}>
    <Character appearance={look} lite={lite} getMotion={motion} />
  </group>
)

/* ------------------------------- exteriors ------------------------------- */
export function PragiaModel({ color = '#fcd116' }: { color?: string }) {
  return (
    <>
      <Part g="cyl" p={[0, 0.22, 1.0]} s={[0.22, 0.08, 0.22]} r={[0, 0, Math.PI / 2]} c="#1b1b1b" />
      <Part g="cyl" p={[0.55, 0.22, -0.55]} s={[0.22, 0.08, 0.22]} r={[0, 0, Math.PI / 2]} c="#1b1b1b" />
      <Part g="cyl" p={[-0.55, 0.22, -0.55]} s={[0.22, 0.08, 0.22]} r={[0, 0, Math.PI / 2]} c="#1b1b1b" />
      <Part p={[0, 0.42, 0.55]} s={[0.25, 0.2, 1.0]} c={color} />
      <Part p={[0, 0.42, -0.45]} s={[1.2, 0.22, 1.1]} c={color} />
      <Part p={[0, 0.55, 0.1]} s={[0.3, 0.12, 0.35]} c="#222" />
      <Part p={[0, 0.62, -0.55]} s={[1.05, 0.12, 0.5]} c="#3a2f2a" />
      <Part p={[0, 0.9, -0.82]} s={[1.05, 0.45, 0.08]} c="#3a2f2a" />
      <Part p={[0, 1.02, 0.85]} s={[0.6, 0.04, 0.04]} c="#333" />
      <Part p={[0, 0.7, 1.05]} s={[0.14, 0.1, 0.05]} m={headlightMat} cast={false} />
      {[[0.58, 0.85], [-0.58, 0.85], [0.58, -0.95], [-0.58, -0.95]].map(([x, z], i) => (
        <Part key={i} p={[x, 1.2, z]} s={[0.04, 1.4, 0.04]} c="#222" />
      ))}
      <Part p={[0, 1.92, -0.05]} s={[1.3, 0.06, 2.0]} c="#2e86de" />
      <Part p={[0, 1.94, -0.05]} s={[1.32, 0.03, 0.5]} c="#ce1126" />
    </>
  )
}

/* ------------------------------- cockpits ------------------------------- */
function CarCockpit({ color, driver, taxi }: { color: string; driver: boolean; taxi: boolean }) {
  const trim = taxi ? '#e9c13a' : '#2b3a55'
  return (
    <>
      <Part p={[0, 0.32, -0.2]} s={[1.3, 0.06, 2.6]} c="#2b2b2b" cast={false} />
      <Part p={[0, 0.78, 1.5]} s={[1.25, 0.06, 1.0]} c={color} cast={false} />
      <Part p={[0, 0.74, 0.98]} s={[1.28, 0.22, 0.3]} c="#2a2d33" cast={false} />
      <Part p={[0, 0.86, 0.86]} s={[1.28, 0.03, 0.1]} c="#1e2024" cast={false} />
      <Part p={[0.32, 0.9, 0.9]} s={[0.3, 0.08, 0.04]} c="#111" cast={false} />
      <Part p={[0.25, 0.9, 0.875]} s={[0.07, 0.05, 0.01]} m={headlightMat} cast={false} />
      <Part p={[0.39, 0.9, 0.875]} s={[0.07, 0.05, 0.01]} m={headlightMat} cast={false} />
      <Part g="torus" p={[0.32, 0.9, 0.7]} r={[-1.05, 0, 0]} s={0.13} c="#111" cast={false} />
      <Part p={[0.32, 0.85, 0.8]} s={[0.04, 0.04, 0.2]} c="#111" cast={false} />
      <Part p={[-0.2, 0.88, 0.88]} s={[0.14, 0.03, 0.08]} c="#fcd116" cast={false} />
      {[0.6, -0.6].map((x) => (
        <group key={x}>
          <Part p={[x, 1.16, 0.82]} r={[-0.55, 0, 0]} s={[0.05, 0.66, 0.05]} c={color} cast={false} />
          <Part p={[x * 1.05, 1.15, -0.25]} s={[0.06, 0.6, 0.1]} c={color} cast={false} />
          <Part p={[x * 1.05, 1.15, -1.15]} s={[0.06, 0.6, 0.16]} c={color} cast={false} />
          <Part p={[x * 1.07, 0.62, -0.25]} s={[0.05, 0.62, 2.0]} c={trim} cast={false} />
          <Part p={[x * 1.07, 0.93, -0.25]} s={[0.06, 0.03, 2.0]} c="#1e2024" cast={false} />
        </group>
      ))}
      <Part p={[0, 1.47, 0.6]} s={[1.26, 0.05, 0.08]} c={color} cast={false} />
      <Part p={[0, 1.48, -0.35]} s={[1.32, 0.04, 1.75]} c="#d6d0c4" cast={false} />
      <Part p={[0, 0.98, -1.22]} s={[1.26, 0.05, 0.08]} c={color} cast={false} />
      {[0.32, -0.32].map((x) => (
        <group key={x}>
          <Part p={[x, 0.5, 0.0]} s={[0.5, 0.12, 0.5]} c="#3a2f2a" cast={false} />
          <Part p={[x, 0.85, -0.27]} s={[0.5, 0.62, 0.1]} c="#3a2f2a" cast={false} />
          <Part p={[x, 1.2, -0.27]} s={[0.26, 0.12, 0.09]} c="#3a2f2a" cast={false} />
        </group>
      ))}
      <Part p={[0, 0.5, -0.85]} s={[1.2, 0.12, 0.45]} c="#3a2f2a" cast={false} />
      <Part p={[0, 0.85, -1.08]} s={[1.2, 0.6, 0.1]} c="#3a2f2a" cast={false} />
      <Part p={[0, 1.42, 0.66]} s={[0.16, 0.045, 0.02]} c="#222" cast={false} />
      <Part g="sphere" p={[0, 1.31, 0.66]} s={0.018} c="#ce1126" cast={false} />
      <Part p={[0, 1.36, 0.66]} s={[0.005, 0.1, 0.005]} c="#ce1126" cast={false} />
      {!driver && seated(DRIVER, [0.32, 0.18, 0.04], 0.75, false, drive)}
      {driver && seated(PAX[0], [-0.3, 0.18, -0.8])}
      {driver && seated(PAX[4], [0.3, 0.18, -0.8])}
    </>
  )
}

function TrotroCockpit({ driver }: { driver: boolean }) {
  return (
    <>
      <Part p={[0, 0.34, -0.2]} s={[1.55, 0.06, 3.7]} c="#3a3a3a" cast={false} />
      <Part p={[0, 0.86, 1.55]} s={[1.5, 0.24, 0.3]} c="#2a2a2a" cast={false} />
      <Part p={[0, 0.78, 1.95]} s={[1.5, 0.06, 0.6]} c="#f0ede6" cast={false} />
      <Part g="torus" p={[0.42, 1.04, 1.3]} r={[-1.25, 0, 0]} s={0.15} c="#111" cast={false} />
      <Part p={[0.42, 0.98, 1.4]} s={[0.04, 0.04, 0.22]} c="#111" cast={false} />
      <Part p={[0, 0.99, 1.48]} s={[0.4, 0.04, 0.12]} c="#fcd116" cast={false} />
      {[0.76, -0.76].map((x) => (
        <group key={x}>
          <Part p={[x, 1.35, 1.5]} r={[-0.25, 0, 0]} s={[0.07, 0.95, 0.07]} c="#f0ede6" cast={false} />
          <Part p={[x * 1.04, 0.62, -0.2]} s={[0.05, 0.58, 3.6]} c="#f0ede6" cast={false} />
          <Part p={[x * 1.04, 0.92, -0.2]} s={[0.06, 0.04, 3.6]} c="#2e86de" cast={false} />
          {[0.4, -0.5, -1.4].map((z) => <Part key={z} p={[x * 1.04, 1.35, z]} s={[0.06, 0.85, 0.07]} c="#f0ede6" cast={false} />)}
        </group>
      ))}
      <Part p={[0, 1.82, 1.48]} s={[1.5, 0.08, 0.08]} c="#f0ede6" cast={false} />
      <Part p={[0, 1.86, -0.2]} s={[1.58, 0.04, 3.6]} c="#d8d2c4" cast={false} />
      <group position={[0, 1.7, 1.46]}><TextPlane w={1.0} h={0.16} title="GOD DEY ✝" color="#fcd116" bg="#ce1126" /></group>
      <group position={[0, 1.3, -1.95]} rotation={[0, Math.PI, 0]}><TextPlane w={1.2} h={0.2} title="NYAME BEKYERE" color="#ffffff" bg="#006b3f" /></group>
      {[1.0, 0.25, -0.45, -1.15].map((z, row) => (
        <group key={z}>
          <Part p={[0, 0.55, z]} s={[1.45, 0.1, 0.36]} c="#7a3b2e" cast={false} />
          <Part p={[0, 0.82, z - 0.2]} s={[1.45, 0.45, 0.06]} c="#7a3b2e" cast={false} />
          {row > 0 && seated(PAX[row % PAX.length], [0.45, 0.2, z + 0.02])}
          {row > 0 && row !== 2 && seated(PAX[(row + 2) % PAX.length], [-0.05, 0.2, z + 0.02])}
          {row === 3 && seated(PAX[1], [-0.5, 0.2, z + 0.02])}
        </group>
      ))}
      {!driver && seated(DRIVER, [0.42, 0.2, 1.02], 0.75, false, drive)}
      {driver && seated(PAX[2], [-0.42, 0.2, 1.02])}
      {seated(PAX[3], [-0.6, 0.3, -0.75], 0.75, true, () => ({ moving: false, speed: 0, action: 'cheer' }), Math.PI / 2)}
    </>
  )
}

function OkadaRig({ driver, me }: { driver: boolean; me: Appearance }) {
  return (
    <>
      <group scale={1.35}><MotoModel color="#e0524a" /></group>
      <Part p={[0, 1.08, 0.48]} s={[0.7, 0.04, 0.04]} c="#222" cast={false} />
      <Part p={[0, 1.1, 0.42]} s={[0.16, 0.08, 0.08]} c="#111" cast={false} />
      <Part p={[0.05, 1.12, 0.38]} s={[0.05, 0.04, 0.01]} m={headlightMat} cast={false} />
      {seated(driver ? me : DRIVER, [0, 0.32, -0.12], 0.8, !driver ? false : false, drive)}
      {seated(driver ? PAX[2] : me, [0, 0.38, -0.55], 0.8, driver, sit)}
    </>
  )
}

function PragiaRig({ driver, me }: { driver: boolean; me: Appearance }) {
  return (
    <>
      <PragiaModel />
      {seated(driver ? me : DRIVER, [0, 0.2, 0.18], 0.75, false, drive)}
      {seated(driver ? PAX[0] : me, [-0.28, 0.25, -0.5], 0.75, driver, sit)}
      {seated(PAX[1], [0.28, 0.25, -0.5])}
    </>
  )
}

/* ----------------------------- vehicle + camera ----------------------------- */
export const rideView = { active: false, group: null as THREE.Group | null, yaw: 0 }
const CAR_COLOR: Record<string, string> = { taxi: '#f5c518', ride: '#1f2d45' }

export function RideVehicle() {
  const ride = useGame((s) => (s.activity?.kind === 'travel' && s.activity.ctx.ride ? s.activity.ctx.ride : null)) as Mode | null
  const driver = useGame((s) => !!s.activity?.ctx.drive)
  const profile = useGame((s) => s.profile)
  const view = useUI((s) => s.rideCam)
  const g = useRef<THREE.Group>(null)
  const pos = useRef({ x: runtime.player.x, z: runtime.player.z, rot: runtime.player.rot })
  useEffect(() => {
    pos.current = { x: runtime.player.x, z: runtime.player.z, rot: runtime.player.rot }
    if (ride) useUI.setState({ rideCam: ride === 'okada' || ride === 'pragia' ? 'chase' : 'inside' })
  }, [ride])
  useFrame((st, dt) => {
    if (!g.current) return
    const p = pos.current
    const k = Math.min(1, dt * 5)
    p.x += (runtime.player.x - p.x) * k
    p.z += (runtime.player.z - p.z) * k
    let diff = runtime.player.rot - p.rot
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    p.rot += diff * Math.min(1, dt * 3)
    const held = !!runtime.ride?.holding
    g.current.position.set(p.x, 0.06 + (held ? 0 : Math.sin(st.clock.elapsedTime * 9) * 0.006), p.z)
    g.current.rotation.y = p.rot
    rideView.group = g.current
  })
  if (!ride) return null
  const me = profile?.appearance ?? DEFAULT_APPEARANCE
  const carLike = ride === 'taxi' || ride === 'ride' || ride === 'trotro'
  return (
    <group ref={g}>
      {carLike && view === 'chase' && (
        <group scale={1.7}>{ride === 'trotro' ? <CarModel danfo color="#f0ede6" /> : <CarModel danfo={false} color={CAR_COLOR[ride]} />}</group>
      )}
      {(ride === 'taxi' || ride === 'ride') && view === 'inside' && <CarCockpit color={CAR_COLOR[ride]} driver={driver} taxi={ride === 'taxi'} />}
      {ride === 'trotro' && view === 'inside' && <TrotroCockpit driver={driver} />}
      {ride === 'okada' && <OkadaRig driver={driver} me={me} />}
      {ride === 'pragia' && <PragiaRig driver={driver} me={me} />}
    </group>
  )
}

/** Seat-level or chase camera while riding. Drag to look around; V toggles the view. */
export function RideCam() {
  const ride = useGame((s) => (s.activity?.kind === 'travel' && s.activity.ctx.ride ? s.activity.ctx.ride : null)) as Mode | null
  const { set, camera, size, gl } = useThree()
  const persp = useMemo(() => new THREE.PerspectiveCamera(72, 1, 0.03, 260), [])
  const prev = useRef<THREE.Camera | null>(null)
  useEffect(() => {
    if (ride && !prev.current) {
      prev.current = camera
      persp.position.copy(camera.position)
      set({ camera: persp as unknown as THREE.OrthographicCamera })
      rideView.active = true
      rideView.yaw = 0
      labelScale.v = 0.25
    } else if (!ride && prev.current) {
      set({ camera: prev.current as THREE.OrthographicCamera })
      prev.current = null
      rideView.active = false
      rideView.group = null
      labelScale.v = 1
      runtime.cam.snap = true
    }
  }, [ride]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    persp.aspect = size.width / size.height
    persp.updateProjectionMatrix()
  }, [size, persp])
  useEffect(() => {
    const el = gl.domElement
    let down: number | null = null
    const d = (e: PointerEvent) => { down = e.clientX }
    const m = (e: PointerEvent) => {
      if (down === null || !rideView.active) return
      rideView.yaw = Math.max(-1.5, Math.min(1.5, rideView.yaw - (e.clientX - down) * 0.006))
      down = e.clientX
    }
    const u = () => { down = null }
    const key = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null
      if (tg && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tg.tagName)) return
      if (!rideView.active || (e.key !== 'v' && e.key !== 'V')) return
      useUI.setState((s) => ({ rideCam: s.rideCam === 'inside' ? 'chase' : 'inside' }))
    }
    el.addEventListener('pointerdown', d)
    window.addEventListener('pointermove', m)
    window.addEventListener('pointerup', u)
    window.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('pointerdown', d)
      window.removeEventListener('pointermove', m)
      window.removeEventListener('pointerup', u)
      window.removeEventListener('keydown', key)
    }
  }, [gl])
  const eye = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame((st, dt) => {
    if (!ride || !rideView.group) return
    const gr = rideView.group
    const drv = !!useGame.getState().activity?.ctx.drive
    const view = useUI.getState().rideCam
    const yaw = rideView.yaw
    const bob = runtime.ride?.holding ? 0 : Math.sin(st.clock.elapsedTime * 7) * 0.006
    if (view === 'chase') {
      eye.set(-Math.sin(yaw) * 4.6, 2.7, -Math.cos(yaw) * 4.6)
      look.set(0, 0.9, 2.0)
    } else {
      // seat positions in vehicle space (x: + is the driver side)
      const seats: Record<Mode, [number, number, number]> = {
        taxi: drv ? [0.32, 1.22, 0.05] : [-0.32, 1.22, 0.05],
        ride: drv ? [0.32, 1.22, 0.05] : [-0.32, 1.22, 0.05],
        trotro: drv ? [0.42, 1.34, 1.0] : [-0.42, 1.34, 1.0],
        okada: drv ? [0, 1.42, -0.12] : [0.26, 1.66, -0.62],
        pragia: drv ? [0, 1.25, 0.18] : [-0.28, 1.25, -0.5],
      }
      const [sx, sy, sz] = seats[ride]
      eye.set(sx, sy + bob, sz)
      look.set(sx + Math.sin(yaw) * 6, sy - 0.15, sz + Math.cos(yaw) * 6)
    }
    gr.localToWorld(eye)
    gr.localToWorld(look)
    persp.position.lerp(eye, Math.min(1, dt * 18))
    persp.lookAt(look)
    rideView.yaw *= 1 - Math.min(1, dt * 0.3)
    viewCenter.x = gr.position.x
    viewCenter.z = gr.position.z
  })
  return null
}

export { windowMat }
