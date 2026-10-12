'use client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DEFAULT_APPEARANCE, DEST_BY_ID, HOMES, NPCS } from '@/game/content'
import { hourOf } from '@/game/config'
import { findMyCharacter, walkToPoint } from '@/game/nav'
import { camBasis, runtime, setZoom, turnCam, zoomBy, defaultZoom } from '@/game/runtime'
import { useGame } from '@/game/store'
import { QUALITY_ORDER, QUALITY, useUI } from '@/game/ui'
import { MAP_H, MAP_W } from '@/game/world'
import { extCount, homeLayout } from '@/game/home'
import { Pedestrians, Traffic, TrafficLights } from './Ambient'
import { Buildings } from './Buildings'
import { Character } from './Character'
import { lookFor } from './poses'
import { INTERIOR_ORIGIN, Interior } from './Interior'
import { BuildingInterior, INSIDE_ORIGIN, insideLayout } from './BuildingInterior'
import { actionFocus, bulbMat, headlightMat, isoOffset, labelScale, lighting, viewCenter, windowMat } from './shared'
import { Terrain } from './Terrain'
import { Label, LabelProjector } from './Label'
import { Part } from './shared'
import { RemotePlayers } from './RemotePlayers'

const camState = viewCenter

/* ------------------------------- camera -------------------------------- */
const CAM_R = Math.hypot(isoOffset.x, isoOffset.z)
const SIN_PITCH = Math.sin(Math.atan(isoOffset.y / Math.hypot(isoOffset.x, isoOffset.z)))

function CameraRig() {
  const { camera, gl } = useThree()
  const iv = useRef({ x: INTERIOR_ORIGIN.x, z: INTERIOR_ORIGIN.z, zoom: 60 })
  const zoomNow = useRef(runtime.cam.zoom)
  const shift = useRef(0)
  const focusCam = useRef({ x: 0, z: 0 })

  useEffect(() => {
    runtime.cam.zoom = Math.max(26, Math.min(44, window.innerWidth / 30))
    zoomNow.current = runtime.cam.zoom
  }, [])

  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map<number, { x: number; y: number }>()
    let moved = 0
    let pinch = 0
    let twist: number | null = null
    let rotating = false
    const dist = () => {
      const [a, b] = [...pointers.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    /** Furniture drags and the ride camera own the pointer; the map must not move. */
    const busy = () => {
      const ui = useUI.getState()
      return rideView.active || ui.dragUid !== null || ui.holdingUid !== null
    }
    const panBy = (dx: number, dy: number) => {
      const st = useGame.getState()
      const c = runtime.cam
      if (st.view !== 'world') {
        // interiors: pan the framed room a little (room units)
        const z = zoomNow.current || 40
        const b = camBasis()
        c.inPan.x += (-dx * b.rx + (dy / SIN_PITCH) * b.fx) / z
        c.inPan.z += (-dx * b.rz + (dy / SIN_PITCH) * b.fz) / z
        c.inPan.x = Math.max(-8, Math.min(8, c.inPan.x))
        c.inPan.z = Math.max(-8, Math.min(8, c.inPan.z))
        return
      }
      const z = c.zoom
      c.follow = false
      const b = camBasis()
      c.x += (-dx * b.rx + (dy / SIN_PITCH) * b.fx) / z
      c.z += (-dx * b.rz + (dy / SIN_PITCH) * b.fz) / z
      c.x = Math.min(MAP_W + 4, Math.max(-4, c.x))
      c.z = Math.min(MAP_H + 4, Math.max(-4, c.z))
    }
    /** Zoom by a factor, keeping the ground under the cursor fixed (map only, when not following). */
    const zoomAt = (f: number, clientX: number, clientY: number) => {
      const c = runtime.cam
      if (useGame.getState().view !== 'world') {
        zoomBy(f)
        return
      }
      const z0 = c.zoom
      setZoom(z0 * f)
      const z1 = c.zoom
      if (c.follow || z1 === z0) return
      const r = el.getBoundingClientRect()
      const sx = clientX - (r.left + r.width / 2)
      const sy = clientY - (r.top + r.height / 2)
      const b = camBasis()
      const k = 1 / z0 - 1 / z1
      c.x += (sx * b.rx - (sy / SIN_PITCH) * b.fx) * k
      c.z += (sx * b.rz - (sy / SIN_PITCH) * b.fz) * k
    }
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      moved = 0
      // right/middle button, or Alt/Shift + left: rotate instead of pan
      rotating = e.pointerType === 'mouse' && (e.button === 1 || e.button === 2 || e.altKey || e.shiftKey)
      if (pointers.size === 2) {
        pinch = dist()
        twist = null
      }
    }
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (busy()) return
      if (pointers.size === 2) {
        const d = dist()
        if (pinch > 0 && d > 0) zoomBy(d / pinch)
        pinch = d
        const [a, b2] = [...pointers.values()]
        const ang = Math.atan2(b2.y - a.y, b2.x - a.x)
        if (twist !== null) {
          let da = ang - twist
          while (da > Math.PI) da -= Math.PI * 2
          while (da < -Math.PI) da += Math.PI * 2
          turnCam(-da)
        }
        twist = ang
        moved = 99
        return
      }
      moved += Math.abs(dx) + Math.abs(dy)
      if (moved <= 6) return
      if (rotating) turnCam(-dx * 0.008)
      else panBy(dx, dy)
    }
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      pinch = 0
      twist = null
      if (pointers.size === 0) rotating = false
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      if (rideView.active) return
      // trackpad pinch arrives as ctrl+wheel with small deltas; mouse wheels use bigger steps
      const scale = e.ctrlKey ? 0.01 : e.deltaMode === 1 ? 0.05 : 0.0015
      const f = Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * scale)
      zoomAt(f, e.clientX, e.clientY)
    }
    const ctx = (e: Event) => e.preventDefault()
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('contextmenu', ctx)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('contextmenu', ctx)
    }
  }, [gl])

  useFrame((st, dtRaw) => {
    if (rideView.active) return
    const dt = Math.min(dtRaw, 0.1)
    const g = useGame.getState()
    const reduce = useUI.getState().settings.reduceMotion
    const c = runtime.cam
    const k = reduce ? 1 : 1 - Math.exp(-dt * 5)
    let tx: number
    let tz: number
    let zt: number
    if (g.screen !== 'game') {
      const t = st.clock.elapsedTime * 0.04
      tx = 80 + Math.cos(t) * 45
      tz = 58 + Math.sin(t * 1.3) * 22
      zt = Math.max(18, Math.min(26, window.innerWidth / 48))
      c.x = tx
      c.z = tz
    } else if (g.view === 'home' || g.view === 'inside') {
      const lay = g.view === 'inside' && g.insideDest ? insideLayout(DEST_BY_ID[g.insideDest].kind) : undefined
      const tier = g.viewing ?? g.housing.tier
      const hl = homeLayout(tier, g.viewing ? 0 : extCount(g.upgrades[tier]))
      const hw = lay ? lay.w : hl.w
      const hd = lay ? lay.d : hl.d
      const origin = lay ? INSIDE_ORIGIN : INTERIOR_ORIGIN
      iv.current.x = origin.x + hw / 2
      iv.current.z = origin.z + hd / 2
      const span = (hw + hd) * 0.707
      iv.current.zoom = Math.max(24, Math.min(90, Math.min((window.innerWidth * 0.62) / span, (window.innerHeight * 0.62) / (span * 0.63 + 2.4))))
      const ax = actionFocus.active ? actionFocus.x * 0.75 + iv.current.x * 0.25 : iv.current.x
      const az = actionFocus.active ? actionFocus.z * 0.75 + iv.current.z * 0.25 : iv.current.z
      const kk = reduce ? 1 : 1 - Math.exp(-dt * 3)
      focusCam.current.x += (ax - focusCam.current.x) * kk
      focusCam.current.z += (az - focusCam.current.z) * kk
      if (Math.abs(focusCam.current.x - ax) > 40) { focusCam.current.x = ax; focusCam.current.z = az }
      if (!c.inside) {
        c.inside = true
        c.inZoom = 1
        c.inPan.x = 0
        c.inPan.z = 0
      }
      tx = focusCam.current.x + (actionFocus.active ? 0 : c.inPan.x)
      tz = focusCam.current.z + (actionFocus.active ? 0 : c.inPan.z)
      zt = iv.current.zoom * c.inZoom * (actionFocus.active ? 1.55 : 1)
    } else {
      c.inside = false
      if (c.follow) {
        const p = runtime.player
        if (c.snap) {
          c.x = p.x
          c.z = p.z
          c.snap = false
        } else {
          c.x += (p.x - c.x) * k
          c.z += (p.z - c.z) * k
        }
      }
      tx = c.x
      tz = c.z
      zt = c.zoom
    }
    zoomNow.current += (zt - zoomNow.current) * (reduce ? 1 : 1 - Math.exp(-dt * (g.view !== 'world' ? 3 : 8)))
    camState.x = tx
    camState.z = tz
    const cam = camera as THREE.OrthographicCamera
    c.yaw += (c.yawTarget - c.yaw) * (reduce ? 1 : 1 - Math.exp(-dt * 7))
    ;(globalThis as unknown as { __camYaw?: number }).__camYaw = c.yaw
    cam.position.set(tx + Math.sin(c.yaw) * CAM_R, isoOffset.y, tz + Math.cos(c.yaw) * CAM_R)
    cam.zoom = zoomNow.current
    shift.current += (runtime.uiShift - shift.current) * (reduce ? 1 : 1 - Math.exp(-dt * 6))
    if (Math.abs(shift.current) > 0.5) cam.setViewOffset(st.size.width, st.size.height, 0, shift.current, st.size.width, st.size.height)
    else cam.clearViewOffset()
    cam.updateProjectionMatrix()
    cam.lookAt(tx, g.view !== 'world' ? 0.6 : 0, tz)
  })
  return null
}

/* ------------------------------ lighting ------------------------------- */
interface Key {
  h: number
  sky: string
  sun: string
  sunI: number
  amb: string
  ambI: number
  night: number
}
const KEYS: Key[] = [
  { h: 0, sky: '#0d1731', sun: '#8aa0e8', sunI: 0.35, amb: '#6a7bb5', ambI: 0.55, night: 1 },
  { h: 5, sky: '#101c3a', sun: '#8aa0e8', sunI: 0.35, amb: '#6a7bb5', ambI: 0.55, night: 1 },
  { h: 6.5, sky: '#f7b58a', sun: '#ffb878', sunI: 1.0, amb: '#ffd9c0', ambI: 0.6, night: 0.35 },
  { h: 8.5, sky: '#8fd3ff', sun: '#fff4e0', sunI: 2.0, amb: '#ffffff', ambI: 0.8, night: 0 },
  { h: 16, sky: '#8fd3ff', sun: '#fff1d6', sunI: 1.9, amb: '#ffffff', ambI: 0.8, night: 0 },
  { h: 18, sky: '#f08a6b', sun: '#ff8f5a', sunI: 1.1, amb: '#ffc9a0', ambI: 0.6, night: 0.3 },
  { h: 19.6, sky: '#1c2850', sun: '#8aa0e8', sunI: 0.4, amb: '#6a7bb5', ambI: 0.55, night: 1 },
  { h: 24, sky: '#0d1731', sun: '#8aa0e8', sunI: 0.35, amb: '#6a7bb5', ambI: 0.55, night: 1 },
]
const cA = new THREE.Color()
const cB = new THREE.Color()

function keyAt(h: number) {
  let i = 0
  while (i < KEYS.length - 2 && h >= KEYS[i + 1].h) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const t = Math.min(1, Math.max(0, (h - a.h) / (b.h - a.h)))
  return { a, b, t }
}

function DayNight() {
  const { scene } = useThree()
  const sun = useRef<THREE.DirectionalLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const q = useUI((s) => QUALITY[s.settings.quality])
  const bg = useRef(new THREE.Color('#8fd3ff'))
  useEffect(() => {
    scene.background = bg.current
    scene.fog = new THREE.Fog('#8fd3ff', 110, 260)
  }, [scene])
  useFrame(() => {
    const g = useGame.getState()
    const h = hourOf(g.minutes)
    const { a, b, t } = keyAt(h)
    bg.current.set(a.sky).lerp(cB.set(b.sky), t)
    const lay = g.view === 'inside' && g.insideDest ? insideLayout(DEST_BY_ID[g.insideDest].kind) : undefined
    const club = !!lay?.dark
    const open = !!lay?.open
    if (g.view !== 'world' && !open) bg.current.lerp(cA.set(club ? '#120d22' : '#bcd8ee'), club ? 0.95 : 0.7)
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(bg.current)
    const night = a.night + (b.night - a.night) * t
    lighting.night = night
    windowMat.emissiveIntensity = night * 1.1
    bulbMat.emissiveIntensity = night * 1.6
    headlightMat.emissiveIntensity = 0.15 + night * 1.2
    if (sun.current) {
      sun.current.color.set(a.sun).lerp(cB.set(b.sun), t)
      sun.current.intensity = a.sunI + (b.sunI - a.sunI) * t
      const ang = ((h - 6) / 12) * Math.PI
      const day = h >= 6 && h <= 18
      const ex = day ? Math.cos(ang) * -42 : 20
      const ey = day ? Math.max(14, Math.sin(ang) * 48) : 36
      sun.current.position.set(camState.x + ex, ey, camState.z + 18)
      sun.current.target.position.set(camState.x, 0, camState.z)
      sun.current.target.updateMatrixWorld()
    }
    if (amb.current) {
      amb.current.color.set(a.amb).lerp(cA.set(b.amb), t)
      amb.current.intensity = Math.max(a.ambI + (b.ambI - a.ambI) * t, g.view !== 'world' && !open ? 1.0 : 0)
      if (club) amb.current.intensity = 0.85
    }
    if (hemi.current) hemi.current.intensity = club ? 0.05 : 0.35 * (1 - night * 0.6)
    if (sun.current && club) sun.current.intensity = 0.15
  })
  return (
    <>
      <ambientLight ref={amb} intensity={0.8} />
      <hemisphereLight ref={hemi} args={['#bfe3ff', '#7a8f5a', 0.35]} />
      <directionalLight
        ref={sun}
        castShadow={q.shadows}
        intensity={2}
        position={[40, 40, 20]}
        shadow-mapSize={[q.shadowMap, q.shadowMap]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0006}
      />
    </>
  )
}

/* -------------------------------- actors ------------------------------- */
function Player() {
  const profile = useGame((s) => s.profile)
  const screen = useGame((s) => s.screen)
  const hidden = useGame((s) => s.view !== 'world' || s.activity?.kind === 'travel' || (s.activity !== null && !!s.activity.ctx.dest && s.activity.kind !== 'collapse'))
  const activity = useGame((s) => (s.activity && !s.activity.ctx.dest && s.view === 'world' ? s.activity : null))
  const look = lookFor(activity)
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!g.current) return
    g.current.position.set(runtime.player.x, 0.12, runtime.player.z)
    g.current.rotation.y = runtime.player.rot
  })
  if (screen !== 'game' || hidden) return null
  return (
    <group ref={g}>
      <Character appearance={profile?.appearance ?? DEFAULT_APPEARANCE} getMotion={() => (look ? { moving: false, speed: 0, action: look.pose, prop: look.prop ?? null } : runtime.player)} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.32, 0.4, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      <Label id="you-world" y={1.75} cls="you-tag" text={activity ? `${activity.icon} ${Math.round((activity.done / activity.total) * 100)}%` : profile?.name ?? 'You'} />
    </group>
  )
}

function Npcs() {
  const motion = useRef({ moving: false, speed: 0 })
  const showLabels = useUI((s) => s.settings.showLabels)
  const refs = useRef<(THREE.Group | null)[]>([])
  const screen = useGame((s) => s.screen)
  // phones: simpler NPC bodies and a shorter draw distance
  const light = useUI((s) => s.settings.quality === 'low' || s.settings.quality === 'minimal')
  const range = light ? 28 : 40
  useFrame((_, dt) => {
    if (useGame.getState().view !== 'world') return
    NPCS.forEach((n, i) => {
      const g = refs.current[i]
      if (!g) return
      const d = DEST_BY_ID[n.destId]
      const px = runtime.player.x - g.position.x
      const pz = runtime.player.z - g.position.z
      const near = Math.hypot(px, pz) < 7
      const target = near ? Math.atan2(px, pz) : 0
      let diff = target - g.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      g.rotation.y += diff * Math.min(1, dt * 4)
      g.visible = Math.hypot(g.position.x - viewCenter.x, g.position.z - viewCenter.z) < range
      void d
    })
  })
  return (
    <>
      {NPCS.map((n, i) => {
        const d = DEST_BY_ID[n.destId]
        const x = d.door.x + 1.5
        const z = d.door.z + 0.6
        return (
          <group
            key={n.id}
            ref={(el) => { refs.current[i] = el }}
            position={[x, 0.12, z]}
            onClick={(e) => {
              if (e.delta > 6) return
              e.stopPropagation()
              if (screen === 'game') useUI.getState().selectDest(n.destId, true)
            }}
            onPointerOver={() => { document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { document.body.style.cursor = '' }}
          >
            <Character appearance={n.appearance} lite={light} getMotion={() => motion.current} />
            <mesh position={[0, 0.6, 0]} visible={false}>
              <boxGeometry args={[0.7, 1.4, 0.7]} />
            </mesh>
            {showLabels && <Label id={`npc-${n.id}`} y={1.7} cls="npc-tag" text={n.name} />}
          </group>
        )
      })}
    </>
  )
}

import { ParkedCars, RideCam, RideVehicle, rideView } from './Vehicles'

function ClickMarker() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((st) => {
    const m = runtime.marker
    if (!ref.current) return
    ref.current.visible = !!m
    if (m) {
      ref.current.position.set(m.x, 0.17, m.z)
      const s = 1 + Math.sin(st.clock.elapsedTime * 6) * 0.12
      ref.current.scale.set(s, s, 1)
    }
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.3, 0.42, 24]} />
      <meshBasicMaterial color="#35d07f" />
    </mesh>
  )
}

function GroundPicker() {
  return (
    <mesh
      position={[MAP_W / 2, 0.13, MAP_H / 2]}
      rotation-x={-Math.PI / 2}
      onClick={(e) => {
        if (e.delta > 6) return
        const g = useGame.getState()
        if (g.screen !== 'game' || g.view !== 'world') return
        const ui = useUI.getState()
        if (ui.panel === 'building' || ui.panel === 'phone' || ui.panel === 'character') useUI.setState({ panel: 'none', selectedDest: null })
        else if (ui.selectedDest) useUI.setState({ selectedDest: null })
        walkToPoint(e.point.x, e.point.z)
      }}
    >
      <planeGeometry args={[MAP_W, MAP_H]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

/** Lowers the pixel ratio when frames drop, raises it again when there is headroom. */
function PerfMonitor() {
  const setDpr = useThree((s) => s.setDpr)
  const q = useUI((s) => QUALITY[s.settings.quality])
  const st = useRef({ frames: 0, time: 0, slow: 0, warm: 0, dpr: Math.min(q.dpr[1], typeof window !== 'undefined' ? window.devicePixelRatio : 1) })
  useEffect(() => {
    st.current.dpr = Math.min(q.dpr[1], window.devicePixelRatio || 1)
    st.current.slow = 0
    st.current.warm = 0
  }, [q])
  useFrame((_, dt) => {
    const s = st.current
    s.frames++
    s.time += dt
    if (s.time < 2) return
    const fps = s.frames / s.time
    s.frames = 0
    s.time = 0
    const max = Math.min(q.dpr[1], window.devicePixelRatio || 1)
    // never go below the quality's own floor (blurry), and treat 30 fps as fine: many phones cap there to save battery
    const min = Math.min(max, q.dpr[0])
    let next = s.dpr
    if (fps < 24) next = Math.max(min, s.dpr - 0.25)
    else if (fps > 27) next = Math.min(max, s.dpr + 0.1)
    if (Math.abs(next - s.dpr) > 0.01) {
      s.dpr = next
      setDpr(next)
    }
    // still slow at the lowest resolution: step the auto quality down (skip the first seconds while things load)
    s.warm++
    const ui = useUI.getState()
    if (s.warm > 3 && fps < 22 && s.dpr <= min + 0.01 && ui.settings.qualityAuto && document.visibilityState === 'visible') s.slow++
    else s.slow = 0
    if (s.slow >= 2) {
      const i = QUALITY_ORDER.indexOf(ui.settings.quality)
      if (i >= 0 && i < QUALITY_ORDER.length - 1) ui.setSettings({ quality: QUALITY_ORDER[i + 1] })
      s.slow = 0
    }
  })
  return null
}

function WorldContent() {
  const view = useGame((s) => s.view)
  return (
    <>
      <CameraRig />
      <DayNight />
      <LabelProjector />
      <PerfMonitor />
      <RemotePlayers />
      <group visible={view === 'world'}>
        <Terrain />
        <Buildings />
        <Npcs />
        <Pedestrians />
        <Traffic />
        <TrafficLights />
        <Player />
        <RideVehicle />
        <ParkedCars />
        <RideCam />
        <ClickMarker />
        <GroundPicker />
      </group>
      {view === 'home' && <Interior visible />}
      <BuildingInterior visible={view === 'inside'} />
    </>
  )
}

/** Canvas rebuilds after a lost GPU context; reset once a canvas runs stably. */
let lostAttempts = 0

export default function World3D({ onFail }: { onFail: () => void }) {
  const quality = useUI((s) => QUALITY[s.settings.quality])
  // the character creator covers the city: stop redrawing it so the creator opens fast on phones
  const idle = useGame((s) => s.screen === 'create')
  return (
    <Canvas
      frameloop={idle ? 'never' : 'always'}
      orthographic
      shadows={quality.shadows}
      dpr={quality.dpr}
      gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}
      camera={{ zoom: defaultZoom(), near: -50, far: 400, position: [60, 50, 60] }}
      onCreated={({ gl }) => {
        useUI.setState({ gfx: 'ok' })
        const el = gl.domElement
        let timer: ReturnType<typeof setTimeout> | null = null
        const settle = setTimeout(() => { lostAttempts = 0 }, 20000)
        el.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          clearTimeout(settle)
          useUI.setState({ gfx: 'lost' })
          // give the browser 3s to restore the context, then rebuild the canvas (3 tries)
          timer = setTimeout(() => {
            lostAttempts++
            if (lostAttempts > 3) {
              useUI.setState({ gfx: 'ok' })
              onFail()
            } else useUI.setState((s) => ({ viewKey: s.viewKey + 1 }))
          }, 3000)
        })
        el.addEventListener('webglcontextrestored', () => {
          if (timer) clearTimeout(timer)
          lostAttempts = 0
          useUI.setState({ gfx: 'ok' })
        })
      }}
      style={{ touchAction: 'none' }}
    >
      <WorldContent />
    </Canvas>
  )
}

export { findMyCharacter }
