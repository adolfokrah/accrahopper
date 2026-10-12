'use client'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { DEFAULT_APPEARANCE, DEST_BY_ID, NPC_BY_ID, shiftTaskDef, showOn, type DestKind } from '@/game/content'
import { dayOf } from '@/game/config'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import type { ActiveActivity, Appearance } from '@/game/types'
import { Character, type Motion, type Pose, type Prop } from './Character'
import { lookFor } from './poses'
import { CarModel } from './Ambient'
import { formatMoney } from '@/game/config'
import { Part, Walls, actionFocus, windowMat } from './shared'
import { keyVector, runtime } from '@/game/runtime'
import { Label, TextPlane } from './Label'

export const INSIDE_ORIGIN = new THREE.Vector3(600, 0, 600)
const PI = Math.PI

interface Spot {
  x: number
  z: number
  rot?: number
  pose?: Pose
  prop?: Prop
  y?: number
}
interface Patron extends Spot {
  look: Appearance
}
interface Layout {
  w: number
  d: number
  floor: [string, string]
  wall: string
  dark?: boolean
  spots: Record<string, Spot>
  staff: Spot
  crowd: Spot[]
  Props: () => ReactNode
  /** Open-air scene: no walls or ceiling lights. */
  open?: boolean
  /** Points the player walks between during wandering activities. */
  wander?: { x: number; z: number }[]
}

const look = (i: number): Appearance => ({ skin: (i * 3 + 1) % 6, hair: (i * 5 + 2) % 6, hairColor: i % 4, outfit: (i * 7) % 4, outfitColor: (i * 3 + 2) % 7, accessory: i % 3 === 0 ? (i % 6) : 0 })

/* ---------------------------- small props ---------------------------- */
function Stool({ x, z }: { x: number; z: number }) {
  return (
    <>
      <Part g="cyl" p={[x, 0.42, z]} s={[0.2, 0.06, 0.2]} c="#8a5a2b" />
      <Part g="cyl" p={[x, 0.2, z]} s={[0.05, 0.4, 0.05]} c="#5b3a29" />
    </>
  )
}
function RoundTable({ x, z, c = '#c8a27a' }: { x: number; z: number; c?: string }) {
  return (
    <>
      <Part g="cyl" p={[x, 0.75, z]} s={[0.6, 0.06, 0.6]} c={c} />
      <Part g="cyl" p={[x, 0.37, z]} s={[0.07, 0.74, 0.07]} c="#5b3a29" />
      <Part g="cyl" p={[x - 0.15, 0.8, z + 0.1]} s={[0.17, 0.03, 0.17]} c="#ffffff" cast={false} />
      <Part g="sphere" p={[x - 0.15, 0.83, z + 0.1]} s={[0.12, 0.05, 0.12]} c="#e8a33d" cast={false} />
    </>
  )
}
function Desk({ x, z, screen = true }: { x: number; z: number; screen?: boolean }) {
  return (
    <>
      <Part p={[x, 0.74, z]} s={[1.8, 0.07, 0.85]} c="#e9e3d6" />
      <Part p={[x - 0.82, 0.37, z]} s={[0.06, 0.74, 0.8]} c="#9aa4ae" />
      <Part p={[x + 0.82, 0.37, z]} s={[0.06, 0.74, 0.8]} c="#9aa4ae" />
      {screen && (
        <>
          <Part p={[x, 1.07, z - 0.22]} s={[0.75, 0.45, 0.05]} c="#1b2433" />
          <Part p={[x, 1.07, z - 0.19]} s={[0.67, 0.37, 0.02]} m={windowMat} cast={false} />
          <Part p={[x, 0.79, z + 0.12]} s={[0.5, 0.03, 0.17]} c="#2b2b2b" cast={false} />
        </>
      )}
      <Part p={[x, 0.45, z + 0.75]} s={[0.5, 0.07, 0.5]} c="#2b3a55" />
      <Part p={[x, 0.75, z + 1.0]} s={[0.5, 0.55, 0.07]} c="#2b3a55" />
    </>
  )
}
function GhanaFlag({ p, r = [0, 0, 0] }: { p: [number, number, number]; r?: [number, number, number] }) {
  return (
    <group position={p} rotation={r}>
      <Part p={[0, 0.3, 0]} s={[1.2, 0.2, 0.03]} c="#ce1126" cast={false} />
      <Part p={[0, 0.1, 0]} s={[1.2, 0.2, 0.03]} c="#fcd116" cast={false} />
      <Part p={[0, -0.1, 0]} s={[1.2, 0.2, 0.03]} c="#006b3f" cast={false} />
      <Part p={[0, 0.1, 0.02]} s={[0.12, 0.12, 0.02]} r={[0, 0, PI / 4]} c="#000000" cast={false} />
    </group>
  )
}
function Board({ p, w, title, lines, dark = true }: { p: [number, number, number]; w: number; title: string; lines: string[]; dark?: boolean }) {
  return (
    <group position={p}>
      <Part p={[0, 0, 0]} s={[w + 0.15, 1.15, 0.05]} c="#6b4423" cast={false} />
      <group position={[0, 0, 0.035]}>
        <TextPlane w={w} h={1.0} title={title} lines={lines} bg={dark ? '#24332b' : '#fafafa'} color={dark ? '#f6f2e4' : '#1f2d45'} />
      </group>
    </group>
  )
}

/* -------------------------- animated club bits -------------------------- */
function DanceFloor({ x0, z0, w, d }: { x0: number; z0: number; w: number; d: number }) {
  const mats = useMemo(() => Array.from({ length: w * d }, () => new THREE.MeshStandardMaterial({ color: '#222', emissive: '#ff00aa', emissiveIntensity: 0.8, roughness: 0.3 })), [w, d])
  const palette = useMemo(() => ['#ff2d95', '#00e5ff', '#fcd116', '#7c4dff', '#00e676', '#ff6d00'].map((c) => new THREE.Color(c)), [])
  useFrame((st) => {
    const t = Math.floor(st.clock.elapsedTime * 2.4)
    mats.forEach((m, i) => {
      m.emissive.copy(palette[(i * 7 + t * (1 + (i % 3))) % palette.length])
      m.emissiveIntensity = 0.45 + ((i + t) % 3) * 0.25
    })
  })
  return (
    <>
      {mats.map((m, i) => (
        <mesh key={i} position={[x0 + (i % w) + 0.5, 0.12, z0 + Math.floor(i / w) + 0.5]} scale={[0.96, 0.04, 0.96]} material={m}>
          <boxGeometry />
        </mesh>
      ))}
    </>
  )
}
function DiscoLights({ cx, cz }: { cx: number; cz: number }) {
  const a = useRef<THREE.PointLight>(null)
  const b = useRef<THREE.PointLight>(null)
  const c = useRef<THREE.PointLight>(null)
  const ball = useRef<THREE.Mesh>(null)
  useFrame((st) => {
    const t = st.clock.elapsedTime
    a.current?.position.set(cx + Math.cos(t * 1.3) * 3, 2.4, cz + Math.sin(t * 1.3) * 2)
    b.current?.position.set(cx + Math.cos(t * 0.9 + 2) * 3, 2.4, cz + Math.sin(t * 0.9 + 2) * 2)
    c.current?.position.set(cx + Math.cos(t * 1.7 + 4) * 2, 2.6, cz + Math.sin(t * 1.7 + 4) * 2.5)
    if (ball.current) ball.current.rotation.y = t * 0.8
  })
  return (
    <>
      <pointLight ref={a} color="#ff2d95" intensity={14} distance={9} />
      <pointLight ref={b} color="#00e5ff" intensity={14} distance={9} />
      <pointLight ref={c} color="#fcd116" intensity={10} distance={8} />
      <mesh ref={ball} position={[cx, 3.0, cz]}>
        <icosahedronGeometry args={[0.35, 1]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.95} roughness={0.15} flatShading emissive="#555" />
      </mesh>
      <Part g="cyl" p={[cx, 3.5, cz]} s={[0.01, 0.6, 0.01]} c="#999" cast={false} />
    </>
  )
}

function Waves({ w }: { w: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((st) => {
    if (ref.current) ref.current.position.y = 0.16 + Math.sin(st.clock.elapsedTime * 1.4) * 0.04
  })
  return (
    <>
      <mesh ref={ref} position={[w / 2, 0.16, 1.4]}>
        <boxGeometry args={[w, 0.12, 2.8]} />
        <meshStandardMaterial color="#4fb6dd" transparent opacity={0.8} roughness={0.15} />
      </mesh>
      <Part p={[w / 2, 0.13, 2.85]} s={[w, 0.03, 0.15]} c="#ffffff" cast={false} />
    </>
  )
}

/* ------------------------------- layouts ------------------------------- */
/* ------------------------------ trotro station board ------------------------------ */
const STOP_ROUTES: Record<string, { title: string; lines: string[]; bg: string }> = {
  stop_com: { title: 'CIRCLE LORRY PARK', lines: ['Kaneshie · Madina · Achimota', 'Tema · Kasoa · Nsawam'], bg: '#7a1f2b' },
  stop_kaneshie: { title: 'KANESHIE TERMINAL', lines: ['Kasoa · Weija · Circle', 'Mallam · Korle Bu'], bg: '#006b3f' },
  stop_madina: { title: 'MADINA STATION', lines: ['Legon · Adenta · Circle', 'Tema · East Legon'], bg: '#1f5f3a' },
  stop_res: { title: 'NIMA STATION', lines: ['Circle · Accra Central', 'Airport · Kotobabi'], bg: '#24332b' },
  stop_wf: { title: 'LABADI STOP', lines: ['La Beach · Osu · Teshie', 'Accra Mall · Circle'], bg: '#c0392b' },
  stop_teshie: { title: 'TESHIE STATION', lines: ['Nungua · Tema · Labadi', 'Spintex · Junction Mall'], bg: '#1f6f8b' },
}
function StopBoard() {
  const id = useGame((s) => s.insideDest)
  const r = (id && STOP_ROUTES[id]) || STOP_ROUTES.stop_res
  return (
    <group position={[5, 2.3, 0.06]}>
      <Part p={[0, 0, 0]} s={[4.15, 1.15, 0.05]} c="#3a2a22" cast={false} />
      <group position={[0, 0, 0.035]}>
        <TextPlane w={4} h={1.0} title={r.title} lines={r.lines} bg={r.bg} color="#fcd116" />
      </group>
      <Part g="cyl" p={[-1.9, -1.15, 0]} s={[0.05, 1.2, 0.05]} c="#555" />
      <Part g="cyl" p={[1.9, -1.15, 0]} s={[0.05, 1.2, 0.05]} c="#555" />
    </group>
  )
}

/* -------------------------- arena, mine, café, harbour -------------------------- */
function ArenaProps() {
  const day = useGame((s) => dayOf(s.minutes))
  const act = showOn(day)
  return (
    <>
      {/* stage */}
      <Part p={[7, 0.35, 1.6]} s={[9, 0.7, 2.8]} c="#111" />
      <Part p={[7, 0.72, 1.6]} s={[9, 0.04, 2.8]} c="#2a2a2a" />
      <Part p={[7, 0.74, 2.95]} s={[9, 0.03, 0.08]} c="#ff2d95" m={windowMat} cast={false} />
      {[2.7, 11.3].map((x) => (
        <group key={x}>
          <Part p={[x, 1.6, 0.6]} s={[1.0, 2.4, 0.9]} c="#151515" />
          <Part g="cyl" p={[x, 2.2, 1.06]} s={[0.32, 0.02, 0.32]} r={[PI / 2, 0, 0]} c="#444" />
          <Part g="cyl" p={[x, 1.2, 1.06]} s={[0.24, 0.02, 0.24]} r={[PI / 2, 0, 0]} c="#444" />
        </group>
      ))}
      <Part p={[7, 3.6, 0.3]} s={[10, 0.14, 0.14]} c="#333" />
      {[3, 5, 7, 9, 11].map((x, i) => <Part key={x} g="cyl" p={[x, 3.4, 0.4]} s={[0.14, 0.24, 0.14]} c={['#ff2d95', '#00e5ff', '#fcd116', '#7c4dff', '#00e676'][i]} m={windowMat} cast={false} />)}
      <group position={[7, 2.9, 0.08]}>
        <TextPlane w={7} h={1.0} title={`${act.emoji} ${act.name.toUpperCase()}`} lines={[`${act.genre} · LIVE TONIGHT 8PM`]} color="#ffffff" neon="#ff2d95" />
      </group>
      <DiscoLights cx={7} cz={5} />
      <pointLight position={[7, 3.4, 2.6]} intensity={18} distance={9} color="#ffd9f0" />
      <pointLight position={[7, 3.2, 7.5]} intensity={10} distance={10} color="#b9c6ff" />
      {/* crowd barrier */}
      <Part p={[7, 0.5, 3.5]} s={[11, 1.0, 0.12]} c="#b0b8c4" />
      {/* box office */}
      <Part p={[13.2, 0.55, 9]} s={[0.9, 1.1, 2]} c="#ff2d95" />
      <group position={[13.62, 1.6, 9]} rotation={[0, -PI / 2, 0]}><TextPlane w={1.8} h={0.4} title="🎟️ TICKETS" color="#fff" bg="#1d1b2e" /></group>
      {/* entrance rope */}
      {[5.6, 8.4].map((x) => <Part key={x} g="cyl" p={[x, 0.45, 9.6]} s={[0.08, 0.9, 0.08]} c="#d4af37" />)}
      <Part p={[7, 0.8, 9.6]} s={[2.8, 0.05, 0.05]} c="#b3122e" />
    </>
  )
}
function MineProps() {
  return (
    <>
      {/* muddy pits */}
      <Part p={[3.6, -0.05, 2.6]} s={[4.2, 0.1, 2.6]} c="#4a3220" cast={false} />
      <Part p={[3.6, 0.08, 1.2]} s={[4.4, 0.18, 0.4]} c="#a87a4a" />
      {/* brown water pools */}
      {[[9.2, 1.6], [10.4, 3.6], [8.6, 6.4]].map(([x, z], i) => <Part key={i} g="cyl" p={[x, 0.08, z]} s={[1.2, 0.04, 1.0]} c="#9a6b3a" rough={0.2} cast={false} />)}
      {/* sluice board */}
      <Part p={[8.6, 0.35, 4.3]} s={[0.6, 0.12, 2.2]} r={[0.15, 0, 0]} c="#6b4423" />
      {/* excavator */}
      <group position={[6.6, 0, 1.6]} rotation={[0, 0.5, 0]}>
        <Part p={[0, 0.3, 0]} s={[1.6, 0.4, 1.2]} c="#2b2b2b" />
        <Part p={[0, 0.85, 0]} s={[1.3, 0.7, 1.0]} c="#f1b82d" />
        <Part p={[0.3, 1.35, 0]} s={[0.6, 0.45, 0.8]} c="#9fd3f0" opacity={0.6} />
        <Part p={[-1.2, 1.2, 0]} r={[0, 0, 0.6]} s={[1.6, 0.18, 0.18]} c="#f1b82d" />
        <Part p={[-1.9, 0.5, 0]} s={[0.4, 0.4, 0.5]} c="#555" />
      </group>
      {/* tarp shelter, sacks, generator */}
      {[[10.2, 7.6], [11.6, 7.6], [10.2, 8.6], [11.6, 8.6]].map(([x, z], i) => <Part key={i} g="cyl" p={[x, 0.7, z]} s={[0.06, 1.4, 0.06]} c="#6b4423" />)}
      <Part p={[10.9, 1.42, 8.1]} s={[1.8, 0.04, 1.4]} c="#2e86de" />
      {[0, 1, 2].map((i) => <Part key={i} g="sphere" p={[0.9 + i * 0.5, 0.25, 8.3]} s={[0.25, 0.22, 0.25]} c="#d8c4a4" />)}
      <Part p={[11, 0.35, 5.2]} s={[0.8, 0.6, 0.5]} c="#c0392b" />
      {[[0.6, 1.2], [11.4, 0.6], [0.5, 4.8]].map(([x, z], i) => <group key={i}><Part g="cyl" p={[x, 0.9, z]} s={[0.12, 1.8, 0.12]} c="#5c4033" /><Part g="ico" p={[x, 2.2, z]} s={0.9} c="#2f6f3a" /></group>)}
    </>
  )
}
function CafeProps() {
  return (
    <>
      {[1.5, 2.4, 3.3].map((x) => <Desk key={x} x={x} z={1.4} />)}
      {/* back room */}
      <Part p={[6.0, 1.1, 2.6]} s={[0.1, 2.2, 5.2]} c="#9aa4ae" />
      <Part p={[6.0, 1.9, 5.6]} s={[0.1, 0.6, 1.2]} c="#9aa4ae" />
      <Part p={[6.0, 0.8, 5.6]} s={[0.04, 1.6, 1.0]} c="#3a2a22" opacity={0.0} />
      {[7.2, 8.7].map((x) => <Desk key={x} x={x} z={0.9} />)}
      <Desk x={8.0} z={3.5} />
      <Part p={[9.9, 1.2, 2.5]} s={[0.05, 0.8, 1.6]} c="#111" />
      {/* counter + printer */}
      <Part p={[5.4, 0.55, 5.2]} s={[0.8, 1.1, 1.6]} c="#2e86de" />
      <Part p={[5.4, 1.2, 4.7]} s={[0.5, 0.25, 0.4]} c="#e8e8e8" />
      <Board p={[3, 2.2, 0.06]} w={3} title="NET CAFÉ" lines={['Browsing GH₵5/hr', 'Printing · FIFA · Typing']} dark={false} />
    </>
  )
}
function HarbourProps() {
  return (
    <>
      {/* sea along the back */}
      <Part p={[6, 0.02, 0.7]} s={[12, 0.06, 1.4]} c="#1e6f8f" rough={0.15} cast={false} />
      {/* wooden jetty */}
      <Part p={[6, 0.14, 1.6]} s={[2.0, 0.08, 3.2]} c="#7a5634" />
      {/* canoes */}
      {[[3, 0.8, 0.1, '#e0524a'], [9, 0.7, -0.15, '#2fa866']].map(([x, z, r, c], i) => (
        <group key={i} position={[x as number, 0.12, z as number]} rotation={[0, (r as number) + PI / 2, 0]}>
          <Part p={[0, 0.12, 0]} s={[0.7, 0.3, 3.2]} c={c as string} />
          <Part p={[0, 0.25, 0]} s={[0.55, 0.06, 3.0]} c="#f1b82d" />
        </group>
      ))}
      {/* crates and drums */}
      {[[2.6, 4.6], [3.4, 4.6], [3.0, 4.0], [2.2, 5.4]].map(([x, z], i) => <Part key={i} p={[x, 0.32, z]} s={[0.6, 0.6, 0.6]} c={i % 2 ? '#8a6a3f' : '#a07a4a'} />)}
      {[[4.4, 5.2], [4.8, 5.6]].map(([x, z], i) => <Part key={i} g="cyl" p={[x, 0.4, z]} s={[0.3, 0.8, 0.3]} c="#2e5f8a" />)}
      {/* lorry */}
      <group position={[10.6, 0, 6.4]} rotation={[0, 0, 0]}>
        <Part p={[0, 0.7, -0.6]} s={[1.4, 1.2, 2.2]} c="#c8553d" />
        <Part p={[0, 0.7, 1.0]} s={[1.4, 1.0, 1.0]} c="#f4f1ea" />
        <Part p={[0, 0.95, 1.52]} s={[1.2, 0.4, 0.04]} c="#9fd3f0" m={windowMat} cast={false} />
        {[[0.7, 0.9], [-0.7, 0.9], [0.7, -1.2], [-0.7, -1.2]].map(([x, z], i) => <Part key={i} g="cyl" p={[x, 0.25, z]} s={[0.25, 0.12, 0.25]} r={[0, 0, PI / 2]} c="#222" />)}
      </group>
      {/* fish table */}
      <Part p={[6, 0.45, 2.9]} s={[2.2, 0.1, 0.8]} c="#6b4423" />
      {[5.3, 5.9, 6.5].map((x) => <Part key={x} g="sphere" p={[x, 0.55, 2.9]} s={[0.25, 0.08, 0.12]} c="#b8c2cc" />)}
      <Part g="cyl" p={[0.6, 2.2, 0.6]} s={[0.14, 4.4, 0.14]} c="#ffffff" />
      <Part g="cyl" p={[0.6, 4.5, 0.6]} s={[0.3, 0.3, 0.3]} c="#d63a2f" />
    </>
  )
}

const LAYOUTS: Partial<Record<DestKind, Layout>> = {
  food: {
    w: 10, d: 8, floor: ['#d9b48a', '#cfa77c'], wall: '#f6d9a8',
    spots: { idle: { x: 5, z: 7 }, eat: { x: 5, z: 5.25, rot: PI, pose: 'sit' }, work: { x: 4.3, z: 0.95, pose: 'work' }, odd: { x: 8.6, z: 1.0, pose: 'work' } },
    staff: { x: 2.4, z: 0.95, pose: 'cook', prop: 'spoon' },
    crowd: [{ x: 2.5, z: 5.25, rot: PI, pose: 'eat', prop: 'plate' }, { x: 7.5, z: 3.75, pose: 'eat', prop: 'plate' }, { x: 7.5, z: 5.25, rot: PI, pose: 'eat', prop: 'drink' }],
    Props: () => (
      <>
        <Part p={[4, 0.5, 1.75]} s={[6.2, 1, 0.7]} c="#8a5a2b" />
        <Part p={[4, 1.03, 1.75]} s={[6.3, 0.06, 0.8]} c="#e8e2d6" />
        {[1.6, 2.8, 4.0, 5.2, 6.4].map((x, i) => (
          <Part key={x} g="cyl" p={[x, 1.25, 1.7]} s={[0.26, 0.38, 0.26]} c={['#d94f3d', '#2b2b2b', '#c9892f', '#2fa866', '#d94f3d'][i]} />
        ))}
        <Part p={[8.6, 0.45, 0.45]} s={[1.2, 0.9, 0.7]} c="#f2f4f6" />
        <Part p={[8.6, 0.92, 0.45]} s={[0.9, 0.05, 0.5]} c="#9fd3f0" cast={false} />
        <Board p={[4.2, 2.2, 0.06]} w={3.4} title="TODAY'S CHOP" lines={['Waakye · Banku & Tilapia', 'Kelewele · Sobolo', 'Fufu & Light Soup']} />
        <GhanaFlag p={[0.06, 2.1, 4]} r={[0, PI / 2, 0]} />
        {[2.5, 5, 7.5].map((x) => (
          <group key={x}>
            <RoundTable x={x} z={4.5} c={x === 5 ? '#e0524a' : '#2e86de'} />
            <Stool x={x} z={3.75} />
            <Stool x={x} z={5.25} />
          </group>
        ))}
        <Part g="ico" p={[9.4, 0.6, 7.3]} s={0.45} c="#3aa655" />
        <Part g="cyl" p={[9.4, 0.2, 7.3]} s={[0.25, 0.4, 0.25]} c="#c8553d" />
      </>
    ),
  },
  market: {
    w: 12, d: 9, floor: ['#cdbb9f', '#c4b192'], wall: '#f0dcc0',
    spots: { idle: { x: 6, z: 8.2 }, eat: { x: 6, z: 3.9, rot: PI }, work: { x: 6, z: 2.15, pose: 'work' }, odd: { x: 10.4, z: 7.4, rot: 0.6, pose: 'lift' }, social: { x: 4.5, z: 4.9, rot: PI } },
    staff: { x: 3, z: 2.15, pose: 'cashier' },
    crowd: [{ x: 9, z: 3.9, rot: PI }, { x: 3, z: 7.4, rot: PI }, { x: 7.8, z: 5.4, rot: 2.2 }],
    wander: [{ x: 4.5, z: 4.8 }, { x: 7.5, z: 4.8 }, { x: 7.5, z: 8 }, { x: 2, z: 8 }, { x: 10.5, z: 7.4 }],
    Props: () => (
      <>
        {[[3, 3, '#e74c3c'], [6, 3, '#f1b82d'], [9, 3, '#2fa866'], [3, 6.5, '#2e86de'], [9, 6.5, '#8e5bd0']].map(([x, z, c], i) => (
          <group key={i} position={[x as number, 0, z as number]}>
            <Part p={[0, 0.42, 0]} s={[2, 0.84, 1]} c="#9c6b3f" />
            {[-0.6, -0.2, 0.2, 0.6].map((dx, j) => (
              <Part key={j} g="sphere" p={[dx, 0.95, (j % 2) * 0.2 - 0.1]} s={0.17} c={['#f39c12', '#e74c3c', '#7ec850', '#f1c40f'][(i + j) % 4]} />
            ))}
            <Part g="cyl" p={[-0.9, 1.1, -0.4]} s={[0.04, 2.2, 0.04]} c="#5b4636" />
            <Part g="cyl" p={[0.9, 1.1, -0.4]} s={[0.04, 2.2, 0.04]} c="#5b4636" />
            <Part p={[0, 2.2, 0]} s={[2.3, 0.06, 1.5]} r={[0.15, 0, 0]} c={c as string} opacity={0.45} cast={false} />
          </group>
        ))}
        {/* kente rack */}
        {[0, 1, 2, 3, 4].map((i) => (
          <Part key={i} p={[0.25, 1.2, 3 + i * 0.5]} s={[0.1, 1.6, 0.42]} c={['#fcd116', '#006b3f', '#ce1126', '#f39c12', '#2e86de'][i]} />
        ))}
        <Part p={[0.3, 2.05, 4]} s={[0.06, 0.06, 2.8]} c="#5b4636" />
        {[[10.8, 8, 0.55], [11.3, 7.3, 0.45], [10.9, 7.4, 0.4]].map(([x, z, s], i) => (
          <Part key={i} p={[x, s / 2 + 0.1, z]} s={[s, s, s]} c={['#b68b52', '#c99a5f', '#a77b52'][i]} />
        ))}
        <Board p={[6, 2.4, 0.06]} w={3} title="MAKOLA MARKET" lines={['Fresh · Fabrics · Furniture']} />
      </>
    ),
  },
  office: {
    w: 12, d: 9, floor: ['#d7dde3', '#cdd4db'], wall: '#eef3f7',
    spots: { idle: { x: 5, z: 8.2 }, work: { x: 5, z: 3.45, rot: PI, pose: 'desk' }, study: { x: 8, z: 6.45, rot: PI, pose: 'desk' } },
    staff: { x: 2, z: 3.45, rot: PI, pose: 'desk' },
    crowd: [{ x: 8, z: 3.45, rot: PI, pose: 'desk' }, { x: 2, z: 6.45, rot: PI, pose: 'desk' }],
    Props: () => (
      <>
        {[2, 5, 8].flatMap((x) => [2.6, 5.6].map((z) => <Desk key={`${x}-${z}`} x={x} z={z} />))}
        <Board p={[5, 2.0, 0.06]} w={3.2} title="SPRINT BOARD" lines={['MoMo budget app · v2', 'Fix login bug', 'Ship Friday 🚀']} dark={false} />
        {/* meeting room */}
        <Part p={[10.2, 1.2, 2.2]} s={[0.05, 2.4, 3.2]} c="#bfe5f5" opacity={0.35} />
        <Part p={[11.1, 1.2, 3.8]} s={[1.8, 2.4, 0.05]} c="#bfe5f5" opacity={0.35} />
        <Part p={[11.1, 0.74, 2.0]} s={[1.2, 0.07, 1.8]} c="#8a5a2b" />
        <Part p={[10.6, 0.5, 7.4]} s={[2, 0.45, 0.9]} c="#e0524a" />
        <Part p={[10.6, 0.85, 7.0]} s={[2, 0.5, 0.2]} c="#c94a42" />
        {[[0.6, 8.3], [11.4, 0.5], [0.6, 0.6]].map(([x, z], i) => (
          <group key={i}>
            <Part g="cyl" p={[x, 0.25, z]} s={[0.25, 0.5, 0.25]} c="#f4f1ea" />
            <Part g="ico" p={[x, 0.85, z]} s={0.42} c="#3aa655" />
          </group>
        ))}
      </>
    ),
  },
  training: {
    w: 11, d: 9, floor: ['#e6d5b8', '#dccbad'], wall: '#f3ecd9',
    spots: { idle: { x: 5.5, z: 8.3 }, study: { x: 5.5, z: 4.75, rot: PI, pose: 'desk' } },
    staff: { x: 5.5, z: 1.1, pose: 'work' },
    crowd: [{ x: 2.5, z: 4.75, rot: PI, pose: 'desk' }, { x: 8.5, z: 7.25, rot: PI, pose: 'desk' }, { x: 5.5, z: 7.25, rot: PI, pose: 'desk' }],
    Props: () => (
      <>
        <Board p={[5.5, 1.9, 0.06]} w={4.2} title="TODAY" lines={['Public speaking 101', 'Intro to code', 'Kitchen safety']} />
        {[2.5, 5.5, 8.5].flatMap((x) => [4, 6.5].map((z) => <Desk key={`${x}-${z}`} x={x} z={z} screen={false} />))}
        <GhanaFlag p={[0.06, 2.1, 4.5]} r={[0, PI / 2, 0]} />
        <Part p={[10.6, 1.0, 1.5]} s={[0.7, 2, 1.6]} c="#7a4e2d" />
        {[0.4, 0.9, 1.4].map((y) => (
          <Part key={y} p={[10.4, y, 1.5]} s={[0.4, 0.3, 1.4]} c={y === 0.9 ? '#2e86de' : '#e0524a'} />
        ))}
      </>
    ),
  },
  gym: {
    w: 11, d: 9, floor: ['#3b3f47', '#353941'], wall: '#e9edf2',
    spots: { idle: { x: 5.5, z: 8.3 }, workout: { x: 8.5, z: 4.25, rot: PI, pose: 'lift' }, yoga: { x: 2.5, z: 6, rot: PI, pose: 'sit' }, gymshower: { x: 10, z: 7.5, rot: PI } },
    staff: { x: 6.5, z: 4.6, rot: -0.8 },
    crowd: [{ x: 1.5, z: 1.55, rot: PI, pose: 'run' }, { x: 3.5, z: 1.55, rot: PI, pose: 'run' }, { x: 4.5, z: 6, rot: PI, pose: 'sit' }],
    Props: () => (
      <>
        {[1.5, 3.5, 5.5].map((x) => (
          <group key={x}>
            <Part p={[x, 0.15, 1.5]} s={[0.8, 0.3, 1.8]} c="#222" />
            <Part p={[x, 0.32, 1.5]} s={[0.6, 0.03, 1.6]} c="#555" cast={false} />
            <Part p={[x, 1.1, 0.55]} s={[0.8, 0.3, 0.12]} c="#333" />
            <Part p={[x, 1.1, 0.62]} s={[0.5, 0.18, 0.02]} m={windowMat} cast={false} />
          </group>
        ))}
        <Part p={[8.5, 0.6, 0.6]} s={[2.4, 1.2, 0.5]} c="#555" />
        {[7.6, 8.1, 8.6, 9.1, 9.6].map((x) => <Part key={x} g="cyl" p={[x, 1.25, 0.6]} s={[0.12, 0.25, 0.12]} r={[0, 0, PI / 2]} c="#e0524a" />)}
        <Part p={[8.5, 0.35, 3.3]} s={[0.5, 0.15, 1.4]} c="#1f2d45" />
        <Part p={[8.5, 1.3, 2.9]} s={[1.8, 0.05, 0.05]} c="#bbb" />
        <Part p={[7.6, 1.3, 2.9]} s={[0.1, 0.5, 0.5]} c="#2b2b2b" />
        <Part p={[9.4, 1.3, 2.9]} s={[0.1, 0.5, 0.5]} c="#2b2b2b" />
        <Part p={[2.5, 0.11, 6]} s={[0.9, 0.03, 1.8]} c="#2fa866" cast={false} />
        <Part p={[4.5, 0.11, 6]} s={[0.9, 0.03, 1.8]} c="#8e5bd0" cast={false} />
        <Part p={[0.06, 1.4, 4.5]} s={[0.04, 2, 5]} c="#cde9f7" rough={0.1} />
        <Part p={[10, 1.1, 7.5]} s={[1.2, 2.2, 0.05]} c="#bfe5f5" opacity={0.4} />
        <Part p={[10.6, 1.1, 7.5]} s={[0.05, 2.2, 1.6]} c="#bfe5f5" opacity={0.4} />
        <Board p={[5.5, 2.2, 0.06]} w={3} title="NO PAIN, NO GAIN" lines={['Classes 7am · 6pm']} />
      </>
    ),
  },
  lounge: {
    w: 12, d: 10, floor: ['#2a2145', '#33295a'], wall: '#463a78', dark: true,
    spots: { idle: { x: 6, z: 9.2 }, social: { x: 6, z: 5.6, pose: 'dance' }, mocktail: { x: 10.0, z: 4.5, rot: PI / 2, pose: 'sit' }, bar: { x: 11.4, z: 3.2, rot: -PI / 2, pose: 'cashier' } },
    staff: { x: 11.35, z: 4.5, rot: -PI / 2, pose: 'work' },
    crowd: [{ x: 4.6, z: 4.4, rot: 0.6, pose: 'dance' }, { x: 7.6, z: 6.6, rot: -0.7, pose: 'dance' }, { x: 5, z: 7, rot: 2.2, pose: 'dance' }, { x: 8, z: 4.2, rot: 3, pose: 'dance' }, { x: 10, z: 3.0, rot: PI / 2, pose: 'sit' }, { x: 6, z: 1.0, pose: 'dance', prop: 'mic' }],
    Props: () => (
      <>
        <DanceFloor x0={3} z0={3.5} w={6} d={4} />
        <DiscoLights cx={6} cz={5.5} />
        {/* DJ booth */}
        <Part p={[6, 0.55, 1.6]} s={[2.6, 1.1, 0.7]} c="#111" />
        <Part p={[6, 1.12, 1.6]} s={[2.4, 0.04, 0.6]} c="#00e5ff" m={windowMat} cast={false} />
        <Part g="cyl" p={[5.4, 1.17, 1.6]} s={[0.22, 0.03, 0.22]} c="#333" />
        <Part g="cyl" p={[6.6, 1.17, 1.6]} s={[0.22, 0.03, 0.22]} c="#333" />
        {[2.2, 9.8].map((x) => (
          <group key={x}>
            <Part p={[x, 0.9, 0.7]} s={[0.9, 1.8, 0.8]} c="#151515" />
            <Part g="cyl" p={[x, 1.3, 1.11]} s={[0.28, 0.02, 0.28]} r={[PI / 2, 0, 0]} c="#444" />
            <Part g="cyl" p={[x, 0.6, 1.11]} s={[0.2, 0.02, 0.2]} r={[PI / 2, 0, 0]} c="#444" />
          </group>
        ))}
        {/* bar */}
        <Part p={[10.85, 0.55, 4.5]} s={[0.8, 1.1, 5]} c="#6b4423" />
        <Part p={[10.85, 1.12, 4.5]} s={[0.95, 0.06, 5.1]} c="#fcd116" />
        <Part p={[11.85, 1.6, 4.5]} s={[0.25, 0.05, 4.5]} c="#3a2a22" />
        {Array.from({ length: 9 }).map((_, i) => (
          <Part key={i} g="cyl" p={[11.85, 1.82, 2.6 + i * 0.48]} s={[0.07, 0.38, 0.07]} c={['#2fa866', '#e0524a', '#f1b82d', '#8e5bd0'][i % 4]} opacity={0.85} />
        ))}
        {[3.0, 4.0, 5.0, 6.0].map((z) => <Stool key={z} x={10.0} z={z} />)}
        <group position={[6, 2.55, 0.08]}>
          <TextPlane w={5} h={0.8} title="LABADI BEACH CLUB" color="#ffffff" neon="#ff2d95" />
        </group>
        <Part g="ico" p={[0.7, 0.7, 9.2]} s={0.5} c="#2e7d4f" />
      </>
    ),
  },
  hospital: {
    w: 10, d: 8, floor: ['#eef6f3', '#e2efea'], wall: '#f4fbf8',
    spots: { idle: { x: 5, z: 7.3 }, consult: { x: 2.2, z: 1.7, pose: 'lie', y: 0.42 }, ward: { x: 5.2, z: 1.7, pose: 'lie', y: 0.42 }, pharmacy: { x: 8.7, z: 4.5, rot: PI / 2 }, nhis: { x: 2, z: 5.3, rot: PI }, checkup: { x: 2.2, z: 1.7, pose: 'lie', y: 0.42 }, volunteer: { x: 6.6, z: 2.4, pose: 'work' } },
    staff: { x: 3.4, z: 2.3, rot: PI, pose: 'work' },
    crowd: [{ x: 8.2, z: 1.7, pose: 'lie', y: 0.42 }, { x: 5.5, z: 6, rot: PI, pose: 'sit' }],
    wander: [{ x: 6.6, z: 2.4 }, { x: 3.7, z: 2.6 }, { x: 6, z: 5 }, { x: 8, z: 3 }],
    Props: () => (
      <>
        {[2.2, 5.2, 8.2].map((x) => (
          <group key={x}>
            <Part p={[x, 0.4, 0.9]} s={[1.0, 0.25, 1.8]} c="#f4f6f8" />
            <Part p={[x, 0.55, 0.9]} s={[0.9, 0.08, 1.7]} c="#9fd3f0" />
            <Part p={[x, 0.62, 0.25]} s={[0.6, 0.1, 0.3]} c="#ffffff" />
            <Part p={[x + 0.65, 1.2, 0.9]} s={[0.04, 2.0, 1.9]} c="#7fc8b4" opacity={0.6} />
          </group>
        ))}
        <Part p={[2, 0.55, 4.5]} s={[2.4, 1.1, 0.6]} c="#2fa866" />
        <Part p={[2, 1.12, 4.5]} s={[2.5, 0.05, 0.7]} c="#f4f6f8" />
        <Part p={[9.6, 1.1, 4.5]} s={[0.5, 2.2, 2.6]} c="#f4f6f8" />
        {[0.6, 1.2, 1.8].flatMap((y) => [3.6, 4.2, 4.8, 5.4].map((z) => <Part key={`${y}${z}`} p={[9.35, y, z]} s={[0.12, 0.2, 0.3]} c={['#e0524a', '#2e86de', '#f1b82d', '#ffffff'][Math.round(z * 3) % 4]} />))}
        {[4.5, 5.5, 6.5].map((x) => <Stool key={x} x={x} z={6} />)}
        <Board p={[5, 2.2, 0.06]} w={3} title="KORLE BU" lines={['Get NHIS · Wash hands', 'Sleep under a net']} dark={false} />
      </>
    ),
  },
  school: {
    w: 12, d: 9, floor: ['#e6d5b8', '#dccbad'], wall: '#f3ecd9',
    spots: { idle: { x: 6, z: 8.3 }, lecture: { x: 6, z: 4.75, rot: PI, pose: 'desk' }, library: { x: 10.6, z: 6.6, rot: PI, pose: 'desk' }, enroll: { x: 1.6, z: 7.2, rot: -PI / 2 }, teach: { x: 6, z: 2.0, rot: 0, pose: 'talk' }, eveningclass: { x: 6, z: 4.75, rot: PI, pose: 'desk' }, ictclass: { x: 10.6, z: 6.6, rot: PI, pose: 'desk' }, wassce: { x: 6, z: 4.75, rot: PI, pose: 'desk' }, debate: { x: 4, z: 6.5, rot: PI } },
    staff: { x: 6, z: 1.1, pose: 'work' },
    crowd: [{ x: 3, z: 4.75, rot: PI, pose: 'desk' }, { x: 9, z: 4.75, rot: PI, pose: 'desk' }, { x: 3, z: 7.25, rot: PI, pose: 'desk' }, { x: 6, z: 7.25, rot: PI, pose: 'desk' }],
    Props: () => (
      <>
        <Board p={[6, 1.9, 0.06]} w={4.6} title="LECTURE HALL 3" lines={['Algorithms · Marketing', 'Ghanaian cuisine 101']} />
        {[3, 6, 9].flatMap((x) => [4, 6.5].map((z) => <Desk key={`${x}-${z}`} x={x} z={z} screen={false} />))}
        <Part p={[11.6, 1.0, 5.5]} s={[0.6, 2, 3]} c="#7a4e2d" />
        {[0.4, 0.9, 1.4].map((y) => <Part key={y} p={[11.4, y, 5.5]} s={[0.35, 0.3, 2.8]} c={y === 0.9 ? '#7a1f2b' : '#2e86de'} />)}
        <Part p={[0.6, 0.55, 7.2]} s={[0.6, 1.1, 1.6]} c="#7a1f2b" />
        <GhanaFlag p={[0.06, 2.1, 3]} r={[0, PI / 2, 0]} />
      </>
    ),
  },
  police: {
    w: 9, d: 7, floor: ['#cfd6df', '#c3cbd6'], wall: '#e3e9f1',
    spots: { idle: { x: 3, z: 6.3 }, watch: { x: 4.2, z: 4.6, pose: 'work' }, payfine: { x: 3, z: 3.7, rot: PI }, cell: { x: 7.4, z: 1.2, pose: 'sit' } },
    staff: { x: 3, z: 2.3, pose: 'work' },
    crowd: [{ x: 1.2, z: 5, rot: PI / 2, pose: 'sit' }],
    wander: [{ x: 4.2, z: 4.6 }, { x: 1.6, z: 6.2 }, { x: 5.2, z: 6.2 }],
    Props: () => (
      <>
        <Part p={[3, 0.55, 3]} s={[2.6, 1.1, 0.7]} c="#1f3a8a" />
        <Part p={[3, 1.12, 3]} s={[2.7, 0.05, 0.8]} c="#e3e9f1" />
        {/* cells */}
        <Part p={[7.4, 0.5, 0.6]} s={[1.6, 0.5, 0.7]} c="#6b6b6b" />
        <Part p={[5.95, 1.2, 1.3]} s={[0.08, 2.4, 2.6]} c="#9aa4ae" />
        {Array.from({ length: 11 }).map((_, i) => <Part key={i} g="cyl" p={[6 + i * 0.27, 1.2, 2.6]} s={[0.035, 2.4, 0.035]} c="#555" />)}
        <Part p={[7.4, 2.4, 2.6]} s={[3, 0.08, 0.08]} c="#555" />
        <Part p={[1.2, 0.45, 5]} s={[0.5, 0.9, 1.6]} c="#8a5a2b" />
        <Board p={[2.6, 2.1, 0.06]} w={2.6} title="GHANA POLICE" lines={['Service with integrity']} dark={false} />
      </>
    ),
  },
  court: {
    w: 10, d: 8, floor: ['#b88a5a', '#ad8152'], wall: '#efe6d2',
    spots: { idle: { x: 5, z: 7.3 }, observe: { x: 7.5, z: 6.25, rot: PI, pose: 'sit' }, hearing: { x: 3.2, z: 4.4, rot: PI } },
    staff: { x: 5, z: 0.7, pose: 'work' },
    crowd: [{ x: 6.5, z: 4.4, rot: PI }, { x: 2.5, z: 6.25, rot: PI, pose: 'sit' }, { x: 5, z: 7.2, rot: PI, pose: 'sit' }],
    Props: () => (
      <>
        <Part p={[5, 0.7, 1.4]} s={[3.4, 1.4, 0.9]} c="#5b3a29" />
        <Part p={[5, 0.25, 0.7]} s={[3.6, 0.5, 1.2]} c="#7a4e2d" />
        <Part p={[5, 2.2, 0.08]} s={[1.2, 1.2, 0.05]} c="#f4c430" cast={false} />
        <Part p={[8.4, 0.6, 2.4]} s={[1.0, 1.2, 1.0]} c="#7a4e2d" />
        {[3.2, 6.5].map((x) => <Part key={x} p={[x, 0.75, 3.7]} s={[2, 0.07, 0.9]} c="#8a5a2b" />)}
        {[6.0, 7.0].map((z) => <Part key={z} p={[5, 0.45, z + 0.25]} s={[8, 0.12, 0.45]} c="#6b4423" />)}
      </>
    ),
  },
  mall: {
    w: 12, d: 9, floor: ['#f0f0f0', '#e6e6e6'], wall: '#f7f7f7',
    spots: { idle: { x: 6, z: 8.3 }, cinema: { x: 1.8, z: 5.2, rot: -PI / 2, pose: 'sit' }, foodcourt: { x: 9, z: 6.75, rot: PI, pose: 'sit' }, shopping: { x: 4.5, z: 1.9 }, ring: { x: 8.5, z: 1.9 }, pickpocket: { x: 6.3, z: 4.6, pose: 'work' }, date: { x: 9, z: 6.75, rot: PI, pose: 'sit' } },
    staff: { x: 8.5, z: 0.7, rot: 0, pose: 'work' },
    crowd: [{ x: 5.6, z: 4.2, rot: 2 }, { x: 7.2, z: 5.2, rot: -2.4 }, { x: 10.5, z: 6.75, rot: PI, pose: 'sit' }, { x: 1.8, z: 6.3, rot: -PI / 2, pose: 'sit' }, { x: 4.2, z: 1.9 }],
    wander: [{ x: 3, z: 2.2 }, { x: 6, z: 3.6 }, { x: 9, z: 2.2 }, { x: 7, z: 6 }, { x: 4, z: 6 }],
    Props: () => (
      <>
        {[[2.3, '#e0524a'], [4.6, '#2e86de'], [6.9, '#8e5bd0'], [9.2, '#f4c430']].map(([x, c], i) => (
          <group key={i} position={[x as number, 0, 0.5]}>
            <Part p={[0, 1.4, 0]} s={[2.1, 2.8, 0.8]} c={c as string} />
            <Part p={[0, 1.0, 0.42]} s={[1.7, 1.6, 0.04]} m={windowMat} cast={false} />
            <Part p={[0, 2.35, 0.42]} s={[1.9, 0.4, 0.05]} c="#ffffff" cast={false} />
          </group>
        ))}
        <Part p={[8.5, 0.5, 1.4]} s={[1.6, 1.0, 0.5]} c="#bfe5f5" opacity={0.6} />
        <Part p={[0.08, 1.7, 5.7]} s={[0.05, 1.8, 3.2]} c="#4aa3ff" m={windowMat} cast={false} />
        {[4.8, 5.8, 6.8].map((z) => <Part key={z} p={[1.8, 0.4, z]} s={[0.5, 0.4, 0.7]} c="#c0392b" />)}
        {[9, 10.5].map((x) => (
          <group key={x}>
            <RoundTable x={x} z={6} c="#f4c430" />
            <Stool x={x} z={6.75} />
          </group>
        ))}
        <Part g="ico" p={[6, 0.6, 3.6]} s={0.45} c="#3aa655" />
        <Part g="cyl" p={[6, 0.25, 3.6]} s={[0.4, 0.5, 0.4]} c="#f4f1ea" />
      </>
    ),
  },
  bank: {
    w: 8, d: 7, floor: ['#efe6d2', '#e6dcc4'], wall: '#f7f1e2',
    spots: { idle: { x: 4, z: 6.3 }, openaccount: { x: 4, z: 2.6, rot: PI }, advice: { x: 6.5, z: 4.75, rot: PI, pose: 'desk' }, teller: { x: 5.2, z: 1.0, rot: 0, pose: 'cashier' } },
    staff: { x: 4, z: 1.0, pose: 'work' },
    crowd: [{ x: 1.8, z: 2.6, rot: PI }, { x: 1.5, z: 5.2, rot: PI / 2, pose: 'sit' }],
    Props: () => (
      <>
        <Part p={[4, 0.55, 1.8]} s={[6, 1.1, 0.6]} c="#8a6a3f" />
        <Part p={[4, 1.5, 1.8]} s={[6, 0.8, 0.04]} c="#bfe5f5" opacity={0.4} />
        <Part p={[4, 1.13, 1.8]} s={[6.1, 0.05, 0.7]} c="#b8860b" rough={0.3} />
        <Desk x={6.5} z={4} />
        <Part p={[0.25, 0.9, 3.8]} s={[0.4, 1.8, 0.8]} c="#2b3a55" />
        <Part p={[0.46, 1.2, 3.8]} s={[0.02, 0.4, 0.5]} m={windowMat} cast={false} />
        <Part p={[1.5, 0.45, 5.2]} s={[0.5, 0.9, 1.8]} c="#2b3a55" />
        <Board p={[4, 2.4, 0.06]} w={3} title="GOLD COAST BANK" lines={['Save today, own tomorrow']} dark={false} />
      </>
    ),
  },
  church: {
    w: 9, d: 9, floor: ['#d8c4a4', '#cdb896'], wall: '#fbf8f1',
    spots: { idle: { x: 4.5, z: 8.3 }, service: { x: 3.2, z: 5.6, rot: PI, pose: 'sit' }, prayer: { x: 5.8, z: 6.8, rot: PI, pose: 'sit' }, choir: { x: 7.6, z: 1.6, rot: -0.8, pose: 'work' }, wedding: { x: 4.1, z: 2.4, rot: PI } },
    staff: { x: 4.5, z: 1.2, pose: 'talk' },
    crowd: [{ x: 2.2, z: 5.6, rot: PI, pose: 'pray' }, { x: 6.8, z: 5.6, rot: PI, pose: 'sit' }, { x: 3.0, z: 6.8, rot: PI, pose: 'sit' }, { x: 8.2, z: 1.9, rot: -0.8, pose: 'sing', prop: 'mic' }],
    Props: () => (
      <>
        <Part p={[4.5, 0.25, 1.4]} s={[3, 0.3, 1.4]} c="#8a5a2b" />
        <Part p={[4.5, 0.7, 1.4]} s={[1.4, 0.7, 0.6]} c="#f4f1ea" />
        <Part p={[4.5, 2.3, 0.08]} s={[0.15, 1.6, 0.06]} c="#f4c430" cast={false} />
        <Part p={[4.5, 2.6, 0.08]} s={[0.8, 0.15, 0.06]} c="#f4c430" cast={false} />
        {[5.0, 6.2, 7.4].flatMap((z) => [2.6, 6.4].map((x) => (
          <group key={`${x}${z}`}>
            <Part p={[x, 0.42, z]} s={[2.6, 0.08, 0.5]} c="#7a4e2d" />
            <Part p={[x, 0.7, z + 0.25]} s={[2.6, 0.5, 0.06]} c="#7a4e2d" />
          </group>
        )))}
        <Part p={[0.05, 1.9, 4]} s={[0.05, 1.4, 0.6]} c="#5aa0d8" m={windowMat} cast={false} />
        <Part p={[0.05, 1.9, 6.5]} s={[0.05, 1.4, 0.6]} c="#d85a5a" m={windowMat} cast={false} />
      </>
    ),
  },
  realty: {
    w: 9, d: 7, floor: ['#e3f1e8', '#d6e9dc'], wall: '#f3faf5',
    spots: { idle: { x: 4.5, z: 6.3 }, browsehomes: { x: 4.5, z: 3.45, rot: PI, pose: 'desk' } },
    staff: { x: 2, z: 3.45, rot: PI, pose: 'desk' },
    crowd: [],
    Props: () => (
      <>
        <Desk x={2} z={2.6} />
        <Desk x={4.5} z={2.6} screen={false} />
        <group position={[4.5, 0.8, 2.45]} scale={0.25}>
          <Part p={[0, 1, 0]} s={[2, 2, 2]} c="#f6c9a8" />
          <Part g="cone" p={[0, 2.6, 0]} s={[1.8, 1.2, 1.8]} r={[0, PI / 4, 0]} c="#c8553d" />
        </group>
        <Board p={[4.5, 2.2, 0.06]} w={3.2} title="LAND · HOMES · UPGRADES" lines={['Plot 7, Cantonments: FOR SALE']} dark={false} />
        <Part g="ico" p={[8.4, 0.7, 0.6]} s={0.45} c="#3aa655" />
      </>
    ),
  },
  beach: {
    w: 12, d: 9, floor: ['#f1dfaa', '#ead6a0'], wall: '#fff', open: true,
    spots: { idle: { x: 6, z: 8.3 }, swim: { x: 6, z: 1.4, rot: PI, pose: 'swim' }, horse: { x: 9.6, z: 4.6, rot: -0.6, pose: 'cheer' }, coconut: { x: 2.3, z: 6.2, rot: -PI / 2 }, social: { x: 4, z: 5.2, pose: 'sit' }, date: { x: 4.6, z: 5.6, rot: PI, pose: 'sit' } },
    staff: { x: 1.2, z: 6.2, rot: PI / 2, pose: 'work' },
    crowd: [{ x: 3, z: 4.4, rot: 0.3, pose: 'lie', y: 0.02 }, { x: 8.4, z: 1.6, rot: PI, pose: 'swim' }, { x: 7.5, z: 6.6, rot: 2, pose: 'run' }, { x: 10, z: 6.2, rot: -2, pose: 'cheer' }],
    wander: [{ x: 4.5, z: 6.5 }, { x: 8.5, z: 5.5 }, { x: 6.5, z: 7.4 }, { x: 9.5, z: 7 }],
    Props: () => (
      <>
        <Waves w={12} />
        {[[3.2, 4.0, '#e0524a'], [8, 4.2, '#2e86de'], [5.5, 3.6, '#fcd116']].map(([x, z, c], i) => (
          <group key={i} position={[x as number, 0, z as number]}>
            <Part g="cyl" p={[0, 0.9, 0]} s={[0.04, 1.8, 0.04]} c="#e8e2d6" />
            <Part g="cone" p={[0, 1.85, 0]} s={[1.1, 0.35, 1.1]} c={c as string} />
          </group>
        ))}
        <Part p={[3, 0.12, 4.6]} s={[0.8, 0.02, 1.8]} c="#2fa866" cast={false} />
        <Part p={[4.6, 0.12, 5.0]} s={[0.8, 0.02, 1.8]} c="#ce1126" cast={false} />
        {/* coconut stall */}
        <Part p={[0.6, 0.5, 6.2]} s={[0.8, 1.0, 1.6]} c="#a67c52" />
        {[5.7, 6.1, 6.5].map((z) => <Part key={z} g="sphere" p={[0.6, 1.1, z]} s={0.14} c="#3f7a2e" />)}
        <Part g="cone" p={[0.6, 2.2, 6.2]} s={[1.2, 0.6, 1.4]} r={[0, PI / 4, 0]} c="#c9a227" />
        {/* horse */}
        <group position={[10.3, 0, 4.2]} rotation={[0, -0.6, 0]}>
          <Part p={[0, 0.85, 0]} s={[0.4, 0.45, 1.1]} c="#7a4e2d" />
          <Part p={[0, 1.2, 0.6]} s={[0.25, 0.55, 0.28]} r={[0.5, 0, 0]} c="#7a4e2d" />
          {[[0.13, 0.4], [-0.13, 0.4], [0.13, -0.4], [-0.13, -0.4]].map(([x, z], i) => <Part key={i} p={[x, 0.33, z]} s={[0.09, 0.66, 0.09]} c="#5b3a29" />)}
          <Part p={[0, 1.1, -0.1]} s={[0.45, 0.08, 0.5]} c="#ce1126" />
        </group>
        {/* goals */}
        {[[3.5, 7.6], [10.8, 7.6]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <Part p={[-0.6, 0.5, 0]} s={[0.06, 1, 0.06]} c="#fff" />
            <Part p={[0.6, 0.5, 0]} s={[0.06, 1, 0.06]} c="#fff" />
            <Part p={[0, 1.0, 0]} s={[1.26, 0.06, 0.06]} c="#fff" />
          </group>
        ))}
        <Part g="cyl" p={[11.3, 1.4, 1.2]} s={[0.07, 2.8, 0.07]} c="#a67c52" />
        <Part g="cone" p={[11.3, 2.85, 1.2]} s={[0.9, 0.3, 0.9]} c="#3aa655" />
      </>
    ),
  },
  park: {
    w: 12, d: 9, floor: ['#8fd163', '#86c85a'], wall: '#fff', open: true,
    spots: { idle: { x: 6, z: 8.3 }, picnic: { x: 3, z: 7.15, rot: PI, pose: 'sit' }, date: { x: 9, z: 7.15, rot: PI, pose: 'sit' } },
    staff: { x: 6, z: 5.6, rot: 0.4, pose: 'talk' },
    crowd: [{ x: 4.5, z: 4.6, rot: -2.4 }, { x: 8.2, z: 4.4, rot: 2.6, pose: 'phone', prop: 'phone' }, { x: 10, z: 7.15, rot: PI, pose: 'sit' }],
    wander: [{ x: 3, z: 5.5 }, { x: 6, z: 4.3 }, { x: 9, z: 5.5 }, { x: 6, z: 7.3 }],
    Props: () => (
      <>
        <Part p={[6, 0.11, 6]} s={[1.6, 0.03, 6]} c="#e8e2d6" cast={false} />
        <Part p={[6, 0.11, 4.8]} s={[10, 0.03, 1.2]} c="#e8e2d6" cast={false} />
        {/* mausoleum */}
        <Part p={[6, 0.4, 1.8]} s={[4, 0.6, 2.4]} c="#f4f1ea" />
        <Part p={[6, 1.4, 1.8]} s={[2.6, 1.4, 1.6]} c="#e8e2d6" />
        <Part p={[6, 2.4, 1.8]} s={[1.6, 0.6, 1.0]} c="#e8e2d6" />
        <Part p={[6, 2.9, 1.8]} s={[0.8, 0.4, 0.5]} c="#f4c430" rough={0.3} />
        {/* statue */}
        <Part p={[9.5, 0.6, 2.5]} s={[0.8, 1.0, 0.8]} c="#9aa4ae" />
        <Part p={[9.5, 1.5, 2.5]} s={[0.4, 0.8, 0.3]} c="#3d3d3d" />
        <Part g="sphere" p={[9.5, 2.05, 2.5]} s={0.17} c="#3d3d3d" />
        <Part p={[9.65, 1.75, 2.75]} s={[0.08, 0.5, 0.08]} r={[-1.0, 0, 0]} c="#3d3d3d" />
        {[2.5, 9.5].map((x) => (
          <group key={x} position={[x, 0, x === 2.5 ? 3 : 6.4]}>
            <Part g="cyl" p={[0, 0.2, 0]} s={[0.7, 0.3, 0.7]} c="#cfd8dc" />
            <Part g="cyl" p={[0, 0.33, 0]} s={[0.6, 0.05, 0.6]} c="#4fc3e8" />
            <Part g="cyl" p={[0, 0.7, 0]} s={[0.05, 0.7, 0.05]} c="#4fc3e8" opacity={0.7} />
          </group>
        ))}
        {[3, 9, 10].map((x) => <Part key={x} p={[x, 0.42, 7.4]} s={[1.0, 0.08, 0.4]} c="#7a4e2d" />)}
        {[[0.8, 1], [11.2, 1], [0.8, 8], [11.3, 8.2]].map(([x, z], i) => (
          <group key={i}><Part g="cyl" p={[x, 0.4, z]} s={[0.1, 0.8, 0.1]} c="#7a4e2d" /><Part g="ico" p={[x, 1.2, z]} s={0.6} c="#3f9f4a" /></group>
        ))}
        {[[2, 4.4], [10, 4.4]].map(([x, z], i) => <Part key={i} p={[x, 0.15, z]} s={[1.6, 0.12, 0.6]} c={i ? '#fcd116' : '#ce1126'} cast={false} />)}
      </>
    ),
  },
  landmark: {
    w: 12, d: 9, floor: ['#d8c4a4', '#cdb896'], wall: '#fff', open: true,
    spots: { idle: { x: 6, z: 8.3 }, boxing: { x: 8, z: 3.2, rot: -PI / 2, pose: 'box', y: 0.3 }, oware: { x: 4, z: 7.0, rot: PI, pose: 'sit' }, alleyrob: { x: 11.2, z: 1.2, rot: -2.4, pose: 'box' } },
    staff: { x: 6.3, z: 5.2, rot: -0.3, pose: 'talk' },
    crowd: [{ x: 9, z: 3.2, rot: PI / 2, pose: 'box', y: 0.3 }, { x: 4, z: 5.4, pose: 'sit' }, { x: 1.2, z: 7.6, rot: 1, pose: 'carry', prop: 'basket' }, { x: 2.8, z: 6.2, rot: 2, pose: 'cashier' }],
    wander: [{ x: 1.5, z: 7.5 }, { x: 5.5, z: 8 }, { x: 10, z: 7.5 }, { x: 3.2, z: 3.6 }],
    Props: () => (
      <>
        {/* lighthouse base */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Part key={i} g="cyl" p={[1.6, 0.6 + i * 1.2, 1.6]} s={[0.9 - i * 0.05, 1.2, 0.9 - i * 0.05]} c={i % 2 ? '#d63a2f' : '#ffffff'} />
        ))}
        {/* boxing ring */}
        <Part p={[8.5, 0.2, 3.2]} s={[3, 0.3, 3]} c="#2e5f8a" />
        {[[7.05, 1.75], [9.95, 1.75], [7.05, 4.65], [9.95, 4.65]].map(([x, z], i) => <Part key={i} g="cyl" p={[x, 0.8, z]} s={[0.06, 1.0, 0.06]} c="#ce1126" />)}
        {[0.75, 1.05].map((y) => (
          <group key={y}>
            <Part p={[8.5, y, 1.75]} s={[2.9, 0.03, 0.03]} c="#fff" />
            <Part p={[8.5, y, 4.65]} s={[2.9, 0.03, 0.03]} c="#fff" />
            <Part p={[7.05, y, 3.2]} s={[0.03, 0.03, 2.9]} c="#fff" />
          </group>
        ))}
        {/* canoes and fish */}
        {[[1.5, 5.6, '#e0524a'], [2.3, 4.6, '#2fa866']].map(([x, z, c], i) => (
          <group key={i} position={[x as number, 0.2, z as number]} rotation={[0, 0.4, 0]}>
            <Part p={[0, 0, 0]} s={[2.4, 0.3, 0.6]} c={c as string} />
            <Part p={[0, 0.12, 0]} s={[2.4, 0.06, 0.62]} c="#fcd116" />
          </group>
        ))}
        {[[3, 6.3], [3.5, 6.6]].map(([x, z], i) => <Part key={i} p={[x, 0.25, z]} s={[0.5, 0.3, 0.4]} c="#8a5a2b" />)}
        {/* oware table */}
        <Part p={[4, 0.4, 6.2]} s={[0.9, 0.08, 0.5]} c="#6b4423" />
        {Array.from({ length: 6 }).map((_, i) => <Part key={i} g="sphere" p={[3.65 + i * 0.14, 0.46, 6.2]} s={0.05} c="#3d2b1f" />)}
        <Part p={[4, 0.2, 6.2]} s={[0.1, 0.4, 0.1]} c="#6b4423" />
        <Part p={[11.5, 1.5, 1]} s={[0.4, 3, 2]} c="#7a6a5a" />
      </>
    ),
  },
  stop: {
    w: 10, d: 7, floor: ['#5a6170', '#525868'], wall: '#fff', open: true,
    spots: { idle: { x: 5, z: 6.3 } },
    staff: { x: 5, z: 3.6, rot: 0.3, pose: 'cheer' },
    crowd: [{ x: 7.8, z: 5, rot: -2.6, pose: 'phone', prop: 'phone' }, { x: 2.2, z: 5.2, rot: 2.4 }, { x: 8.6, z: 5.4, rot: PI, pose: 'sit' }],
    Props: () => (
      <>
        <group position={[2.6, 0, 2]} rotation={[0, PI / 2, 0]}><CarModel danfo color="#f0ede6" /></group>
        <group position={[7.4, 0, 2]} rotation={[0, PI / 2, 0]}><CarModel danfo color="#f0ede6" /></group>
        <Part p={[8.6, 2.0, 5.6]} s={[2.2, 0.1, 1.2]} c="#f4f1ea" />
        <Part p={[7.6, 1.0, 5.1]} s={[0.06, 2, 0.06]} c="#4a4a4a" />
        <Part p={[9.6, 1.0, 5.1]} s={[0.06, 2, 0.06]} c="#4a4a4a" />
        <Part p={[8.6, 0.42, 5.4]} s={[1.8, 0.08, 0.4]} c="#8a5a2b" />
        {[1, 3, 5, 7, 9].map((x) => <Part key={x} p={[x, 0.11, 0.4]} s={[0.9, 0.02, 0.12]} c="#f5f0e0" cast={false} />)}
        <StopBoard />
      </>
    ),
  },
  hotel: {
    w: 12, d: 9, floor: ['#efe6d6', '#e6dcc8'], wall: '#f7f1e6',
    spots: { idle: { x: 6, z: 8.3 }, hotelnight: { x: 10, z: 2.1, pose: 'lie', y: 0.42 }, pool: { x: 3.2, z: 2.2, rot: PI, pose: 'swim' }, dining: { x: 7, z: 6.25, rot: PI, pose: 'eat' }, reception: { x: 5.6, z: 3.0, rot: 0, pose: 'cashier' }, date: { x: 8.2, z: 6.25, rot: PI, pose: 'eat' } },
    staff: { x: 6.5, z: 3.6, rot: 0, pose: 'talk' },
    crowd: [{ x: 4, z: 1.8, rot: 2, pose: 'swim' }, { x: 9.2, z: 7.4, rot: 0, pose: 'eat', prop: 'plate' }, { x: 2.2, z: 5, rot: 1.2, pose: 'phone', prop: 'phone' }],
    wander: [{ x: 7, z: 5.5 }, { x: 9.5, z: 6.8 }, { x: 5.5, z: 7 }],
    Props: () => (
      <>
        <Part p={[3.2, 0.08, 2.2]} s={[4.4, 0.12, 3.2]} c="#4fc3e8" rough={0.1} />
        <Part p={[3.2, 0.05, 2.2]} s={[4.8, 0.1, 3.6]} c="#f4f1ea" />
        <Part p={[10, 0.3, 1.8]} s={[2, 0.4, 2.6]} c="#7a4e2d" />
        <Part p={[10, 0.5, 1.8]} s={[1.9, 0.12, 2.5]} c="#ffffff" />
        <Part p={[10, 0.62, 2.6]} s={[1.8, 0.08, 1.2]} c="#2a9d8f" />
        <Part p={[6.5, 0.55, 3]} s={[2.4, 1.1, 0.7]} c="#8a6a3f" />
        {[7, 9.2].map((x) => <group key={x}><RoundTable x={x} z={5.5} c="#ffffff" /><Stool x={x} z={6.25} /></group>)}
        <Part g="ico" p={[11.4, 0.7, 7.5]} s={0.5} c="#3aa655" />
        <Board p={[6, 2.3, 0.06]} w={3} title="WELCOME · AKWAABA" lines={['Pool · Spa · Fine dining']} dark={false} />
      </>
    ),
  },
  stadium: {
    w: 14, d: 10, floor: ['#3f9f4a', '#47a852'], wall: '#fff', open: true,
    spots: { idle: { x: 7, z: 9.3 }, match: { x: 7, z: 8.6, rot: PI, pose: 'cheer' }, fiveaside: { x: 7, z: 4, pose: 'run' } },
    staff: { x: 12.5, z: 8.6, rot: -2.4, pose: 'cheer' },
    crowd: [{ x: 4, z: 8.6, rot: PI, pose: 'cheer' }, { x: 5.5, z: 8.6, rot: PI, pose: 'cheer' }, { x: 9, z: 8.6, rot: PI, pose: 'cheer' }, { x: 10.5, z: 8.6, rot: PI, pose: 'cheer' }, { x: 5, z: 3.5, rot: 1.5, pose: 'run' }, { x: 9, z: 5, rot: -1.5, pose: 'run' }],
    wander: [{ x: 4, z: 3 }, { x: 10, z: 3 }, { x: 10, z: 6 }, { x: 4, z: 6 }],
    Props: () => (
      <>
        <Part p={[7, 0.11, 4.5]} s={[11, 0.02, 0.06]} c="#ffffff" cast={false} />
        <Part p={[7, 0.11, 4.5]} s={[0.06, 0.02, 7]} c="#ffffff" cast={false} />
        {[1.2, 12.8].map((x) => (
          <group key={x} position={[x, 0, 4.5]}>
            <Part p={[0, 0.6, -0.9]} s={[0.08, 1.2, 0.08]} c="#fff" />
            <Part p={[0, 0.6, 0.9]} s={[0.08, 1.2, 0.08]} c="#fff" />
            <Part p={[0, 1.2, 0]} s={[0.08, 0.08, 1.9]} c="#fff" />
          </group>
        ))}
        {[0, 1, 2].map((i) => <Part key={i} p={[7, 0.2 + i * 0.35, 8.4 + i * 0.5]} s={[14, 0.35, 0.5]} c={i % 2 ? '#ce1126' : '#d9dde3'} />)}
        <Part g="sphere" p={[7, 0.25, 4.5]} s={0.12} c="#ffffff" />
      </>
    ),
  },
  square: {
    w: 12, d: 9, floor: ['#e8e2d6', '#ddd6c8'], wall: '#fff', open: true,
    spots: { idle: { x: 6, z: 8.3 }, arch: { x: 6, z: 4.6, rot: PI, pose: 'cheer' }, parade: { x: 3, z: 7, rot: 0.8, pose: 'cheer' } },
    staff: { x: 9, z: 5.5, rot: -0.6, pose: 'wave' },
    crowd: [{ x: 4.5, z: 4, rot: 2.6, pose: 'phone', prop: 'phone' }, { x: 8, z: 3.2, rot: 3, pose: 'cheer' }],
    wander: [{ x: 3, z: 5 }, { x: 6, z: 4.2 }, { x: 9, z: 5 }, { x: 6, z: 7 }],
    Props: () => (
      <>
        <Part p={[3.8, 2.2, 1.6]} s={[1.0, 4.4, 1.0]} c="#f4f1ea" />
        <Part p={[8.2, 2.2, 1.6]} s={[1.0, 4.4, 1.0]} c="#f4f1ea" />
        <Part p={[6, 4.6, 1.6]} s={[5.4, 0.9, 1.1]} c="#f4f1ea" />
        <Part p={[6, 5.5, 1.6]} s={[0.6, 0.6, 0.14]} r={[0, 0, PI / 4]} c="#000000" />
        {[2, 4, 8, 10].map((x, i) => (
          <group key={x} position={[x, 0, 7.8]}>
            <Part g="cyl" p={[0, 1.2, 0]} s={[0.03, 2.4, 0.03]} c="#cfd8dc" />
            <Part p={[0.25, 2.2, 0]} s={[0.5, 0.3, 0.02]} c={['#ce1126', '#fcd116', '#006b3f', '#ce1126'][i]} />
          </group>
        ))}
      </>
    ),
  },
  arena: {
    w: 14, d: 11, floor: ['#3e3860', '#463f6b'], wall: '#55507e', dark: true,
    spots: {
      idle: { x: 7, z: 10.3 }, show: { x: 7, z: 6.4, rot: PI, pose: 'cheer' }, sprayartist: { x: 7, z: 2.6, rot: PI, pose: 'dance' }, rehearsal: { x: 3, z: 7.5, rot: PI, pose: 'sit' },
      ticket: { x: 12.2, z: 9, rot: PI / 2, pose: 'talk' }, ticketvip: { x: 12.2, z: 9, rot: PI / 2, pose: 'talk' },
      gate: { x: 7, z: 9.3, rot: 0, pose: 'talk' }, crowd: { x: 5, z: 6, rot: 0.5, pose: 'box' }, rope: { x: 7, z: 3.9, rot: 0, pose: 'lift' }, vip: { x: 11.5, z: 2.2, rot: -PI / 2, pose: 'wave' }, work: { x: 7, z: 9.3, rot: 0 },
    },
    staff: { x: 13.2, z: 9, rot: -PI / 2, pose: 'cashier' },
    crowd: [
      { x: 7, z: 1.6, rot: 0, pose: 'sing', prop: 'mic' },
      { x: 4.5, z: 1.4, rot: 0.3, pose: 'dance' }, { x: 9.5, z: 1.4, rot: -0.3, pose: 'dance' },
      ...[4, 5.5, 8.5, 10].flatMap((x, i) => [{ x, z: 5 + (i % 2) * 0.4, rot: PI, pose: 'cheer' as const }, { x: x + 0.6, z: 6.6, rot: PI, pose: 'dance' as const }, { x, z: 7.8, rot: PI, pose: 'cheer' as const }]),
      { x: 2.4, z: 3.9, rot: 0, pose: 'lift' }, { x: 11.6, z: 3.9, rot: 0, pose: 'lift' },
    ],
    wander: [{ x: 2, z: 9 }, { x: 2, z: 4.5 }, { x: 12, z: 4.5 }, { x: 12, z: 8 }],
    Props: () => <ArenaProps />,
  },
  mine: {
    w: 12, d: 9, floor: ['#8a5a32', '#7d5130'], wall: '#fff', open: true,
    spots: { idle: { x: 6, z: 8.3 }, pit: { x: 3.6, z: 3.3, rot: PI, pose: 'work', y: -0.25 }, wash: { x: 8.6, z: 4.3, rot: -PI / 2, pose: 'clean' }, lookout: { x: 11, z: 7.6, rot: 0.6 }, panning: { x: 8.6, z: 4.3, rot: -PI / 2, pose: 'kneel' }, work: { x: 3.6, z: 3.3, rot: PI } },
    staff: { x: 6.5, z: 6.5, rot: -0.6, pose: 'talk' },
    crowd: [{ x: 2.2, z: 2.6, rot: PI, pose: 'work', prop: 'shovel', y: -0.25 }, { x: 5, z: 2.4, rot: 2.6, pose: 'work', prop: 'shovel', y: -0.25 }, { x: 9.4, z: 3.2, rot: -PI / 2, pose: 'clean' }, { x: 1.2, z: 6.8, rot: 1.2, pose: 'carry', prop: 'box' }],
    wander: [{ x: 3.6, z: 5.6 }, { x: 10.6, z: 1.5 }, { x: 10.6, z: 6.8 }],
    Props: () => <MineProps />,
  },
  cafe: {
    w: 10, d: 7, floor: ['#cfd6df', '#c3cbd6'], wall: '#e3e9f1',
    spots: { idle: { x: 3, z: 6.3 }, netbrowse: { x: 1.5, z: 2.2, rot: PI, pose: 'desk' }, gaming: { x: 3.3, z: 2.2, rot: PI, pose: 'desk' }, printcv: { x: 4.6, z: 5.2, rot: PI / 2, pose: 'talk' }, desk1: { x: 7.2, z: 1.6, rot: PI, pose: 'desk' }, desk2: { x: 8.7, z: 1.6, rot: PI, pose: 'desk' }, desk3: { x: 8.0, z: 4.2, rot: PI, pose: 'desk' }, door: { x: 6.6, z: 5.6, rot: 0.6, pose: 'talk' }, work: { x: 7.2, z: 1.6, rot: PI } },
    staff: { x: 5.4, z: 5.2, rot: -PI / 2, pose: 'cashier' },
    crowd: [{ x: 2.4, z: 2.2, rot: PI, pose: 'desk' }, { x: 8.7, z: 4.2, rot: PI, pose: 'phone', prop: 'phone' }],
    Props: () => <CafeProps />,
  },
  harbour: {
    w: 12, d: 9, floor: ['#9b7b55', '#8f714d'], wall: '#fff', open: true,
    spots: { idle: { x: 6, z: 8.3 }, crates: { x: 3.2, z: 5.3, rot: PI, pose: 'work' }, truck: { x: 10.2, z: 6.2, rot: PI / 2, pose: 'lift' }, lookout: { x: 1.3, z: 7.6, rot: 2.4, pose: 'talk' }, buyfish: { x: 6, z: 3.8, rot: PI, pose: 'talk' }, harbourwalk: { x: 6, z: 3.4, rot: PI, pose: 'cheer' }, work: { x: 3.2, z: 5.3, rot: PI } },
    staff: { x: 6, z: 2.9, rot: 0, pose: 'cashier' },
    crowd: [{ x: 4.2, z: 2.6, rot: 0.4, pose: 'carry', prop: 'box' }, { x: 8, z: 2.7, rot: -0.3, pose: 'lift' }, { x: 1.6, z: 6.4, rot: 2.2, pose: 'phone', prop: 'phone' }],
    wander: [{ x: 5, z: 2.3 }, { x: 9.6, z: 6.4 }, { x: 3, z: 6.2 }],
    Props: () => <HarbourProps />,
  },
  zoo: {
    w: 12, d: 9, floor: ['#8fbf6a', '#86b560'], wall: '#fff', open: true,
    spots: { idle: { x: 6, z: 8.3 } },
    staff: { x: 6, z: 5.8, rot: 0.3, pose: 'talk' },
    crowd: [{ x: 3.2, z: 4.4, rot: PI, pose: 'phone', prop: 'phone' }, { x: 9, z: 4.4, rot: PI }],
    wander: [{ x: 3, z: 4.2 }, { x: 6, z: 4.2 }, { x: 9, z: 4.2 }, { x: 9, z: 7 }, { x: 3, z: 7 }],
    Props: () => (
      <>
        {[2, 6, 10].map((x) => (
          <group key={x}>
            {[-1.4, -0.7, 0, 0.7, 1.4].map((dx) => <Part key={dx} g="cyl" p={[x + dx, 0.6, 3.4]} s={[0.03, 1.2, 0.03]} c="#6b4423" />)}
            <Part p={[x, 1.1, 3.4]} s={[3, 0.05, 0.05]} c="#6b4423" />
          </group>
        ))}
        <group position={[2, 0, 1.6]}>
          <Part p={[0, 0.5, 0]} s={[0.9, 0.5, 0.4]} c="#d9a441" />
          <Part g="sphere" p={[0.5, 0.75, 0]} s={0.28} c="#a8742a" />
          {[[-0.3, 0.12], [0.3, 0.12], [-0.3, -0.12], [0.3, -0.12]].map(([x, z], i) => <Part key={i} p={[x, 0.18, z]} s={[0.1, 0.36, 0.1]} c="#d9a441" />)}
        </group>
        <group position={[6, 0, 1.5]}>
          <Part p={[0, 1.0, 0]} s={[0.5, 0.45, 0.9]} c="#e1a95f" />
          <Part p={[0, 1.8, 0.4]} s={[0.15, 1.3, 0.15]} r={[0.25, 0, 0]} c="#e1a95f" />
          <Part p={[0, 2.45, 0.6]} s={[0.2, 0.2, 0.35]} c="#e1a95f" />
          {[[0.18, 0.3], [-0.18, 0.3], [0.18, -0.3], [-0.18, -0.3]].map(([x, z], i) => <Part key={i} p={[x, 0.4, z]} s={[0.08, 0.8, 0.08]} c="#c48a45" />)}
        </group>
        <group position={[10, 0, 1.6]}>
          <Part p={[0, 0.45, 0]} s={[0.6, 0.6, 0.5]} c="#3d3d3d" />
          <Part g="sphere" p={[0, 0.9, 0.15]} s={0.2} c="#3d3d3d" />
        </group>
        {[[0.6, 0.6], [11.4, 0.8], [0.8, 8.2]].map(([x, z], i) => <group key={i}><Part g="cyl" p={[x, 0.5, z]} s={[0.1, 1, 0.1]} c="#7a4e2d" /><Part g="ico" p={[x, 1.4, z]} s={0.7} c="#3f9f4a" /></group>)}
      </>
    ),
  },
  gov: {
    w: 10, d: 7, floor: ['#e3e9f1', '#d6dee8'], wall: '#eef2f6',
    spots: { idle: { x: 5, z: 6.3 }, permit: { x: 3, z: 2.6, rot: PI, pose: 'talk' }, permitbribe: { x: 7, z: 2.6, rot: PI, pose: 'talk' }, title: { x: 5, z: 2.6, rot: PI, pose: 'talk' }, drivetest: { x: 8, z: 4.8, rot: PI, pose: 'desk' }, licensebribe: { x: 8.8, z: 6.2, rot: -2.4, pose: 'talk' } },
    staff: { x: 5, z: 1.0, pose: 'desk' },
    crowd: [{ x: 1.5, z: 4.5, rot: PI / 2, pose: 'sit' }, { x: 1.5, z: 5.4, rot: PI / 2, pose: 'phone', prop: 'phone' }, { x: 3.5, z: 3.2, rot: PI }],
    Props: () => (
      <>
        <Part p={[5, 0.55, 1.8]} s={[7, 1.1, 0.6]} c="#6b7b8c" />
        <Part p={[5, 1.5, 1.8]} s={[7, 0.8, 0.04]} c="#bfe5f5" opacity={0.4} />
        <Desk x={8} z={4} />
        <Part p={[1.2, 0.45, 5]} s={[0.5, 0.9, 2]} c="#2b3a55" />
        <Board p={[5, 2.4, 0.06]} w={3.4} title="TAKE A NUMBER" lines={['Now serving: 047']} dark={false} />
        <GhanaFlag p={[0.06, 2.1, 3]} r={[0, PI / 2, 0]} />
      </>
    ),
  },
  dealer: {
    w: 12, d: 9, floor: ['#f0f2f5', '#e4e8ee'], wall: '#f7f8fa',
    spots: { idle: { x: 6, z: 8.3 }, testdrive: { x: 4.2, z: 3.2, rot: 0, pose: 'drive', y: 0.1 } },
    staff: { x: 7, z: 5, rot: -0.5, pose: 'talk' },
    crowd: [{ x: 9.5, z: 4.5, rot: 2.6 }],
    Props: () => (
      <>
        {[[4.2, 3, '#e0524a'], [8.5, 3, '#2e86de']].map(([x, z, c], i) => (
          <group key={i} position={[x as number, 0.1, z as number]} scale={1.7}>
            <CarModel danfo={false} color={c as string} />
          </group>
        ))}
        <group position={[2, 0.1, 6.5]} scale={1.4} rotation={[0, 0.6, 0]}><CarModel danfo color="#f0ede6" /></group>
        <Board p={[6, 2.4, 0.06]} w={3.4} title="SPINTEX MOTORS" lines={['Buy · Rent · Work & pay']} dark={false} />
      </>
    ),
  },
  wash: {
    w: 7, d: 6, floor: ['#e8f1f6', '#d7e7ef'], wall: '#cfe6f2',
    spots: { idle: { x: 3.5, z: 5.2 }, wc: { x: 3.25, z: 1.25, rot: PI }, washshower: { x: 5.7, z: 1.5, rot: PI } },
    staff: { x: 1.0, z: 4.6, rot: 0.6 },
    crowd: [],
    Props: () => (
      <>
        {[1.75, 3.25].map((x) => (
          <group key={x}>
            <Part p={[x, 0.2, 0.45]} s={[0.4, 0.4, 0.45]} c="#fafafa" />
            <Part p={[x, 0.55, 0.2]} s={[0.4, 0.5, 0.14]} c="#f0f0f0" />
          </group>
        ))}
        {[1.0, 2.5, 4.0].map((x) => <Part key={x} p={[x, 1.0, 0.8]} s={[0.06, 2, 1.6]} c="#2f80c2" />)}
        <Part p={[5.7, 0.04, 1]} s={[1.3, 0.08, 1.4]} c="#cfd8dc" />
        <Part p={[5.05, 1.1, 1]} s={[0.04, 2.2, 1.4]} c="#bfe5f5" opacity={0.35} />
        <Part g="cyl" p={[6.2, 1.9, 0.4]} s={[0.2, 0.04, 0.2]} c="#b0b8c4" />
        {[2.6, 3.8].map((z) => (
          <group key={z}>
            <Part p={[0.35, 0.8, z]} s={[0.5, 0.15, 0.6]} c="#fafafa" />
            <Part p={[0.07, 1.6, z]} s={[0.04, 0.8, 0.6]} c="#d5eef9" rough={0.1} />
          </group>
        ))}
      </>
    ),
  },
}

export function insideLayout(kind: DestKind): Layout | undefined {
  return LAYOUTS[kind]
}

/** Which spot inside a building an activity uses. */
function spotFor(layout: Layout, a: ActiveActivity | null): Spot {
  if (!a) return layout.spots.idle
  const s = layout.spots
  if (a.kind === 'custody' || a.kind === 'jail') return s.cell ?? s.idle
  if (a.kind === 'hospital') return s.ward ?? s.idle
  if (a.kind === 'date') return s.date ?? s.social ?? s.eat ?? s.idle
  if (a.kind === 'crime') return s.pickpocket ?? s.idle
  if (a.kind === 'work') {
    const key = a.shift?.current && a.ctx.career ? shiftTaskDef(a.ctx.career, a.shift.current.key)?.at : undefined
    return (key && s[key]) || s.work || s.idle
  }
  if (s[a.defId]) return s[a.defId]
  if (a.defId.startsWith('npc_hangout')) return s.social ?? s.idle
  if (a.kind === 'meal') return s.eat ?? s.idle
  if (a.kind === 'oddjob') return s.odd ?? s.work ?? s.idle
  if (a.kind === 'study') return s.study ?? s.work ?? s.idle
  if (a.kind === 'social') return s.social ?? s.idle
  return s.idle
}

function PartnerNear({ npcId, spot, pose }: { npcId: string; spot: Spot; pose?: Pose }) {
  const npc = NPC_BY_ID[npcId]
  const rot = spot.rot ?? 0
  const ox = Math.cos(rot) * 0.9
  const oz = -Math.sin(rot) * 0.9
  return (
    <group position={[spot.x + ox, 0.12, spot.z + oz]} rotation={[0, rot, 0]}>
      <Character appearance={npc.appearance} getMotion={() => ({ moving: false, speed: 0, action: pose ?? spot.pose ?? null })} />
      <Label id="inside-partner" y={1.75} cls="npc-tag" text={`${pose ? '🤝' : '💕'} ${npc.name}`} />
    </group>
  )
}

export function BuildingInterior({ visible }: { visible: boolean }) {
  const destId = useGame((s) => s.insideDest)
  const dest = destId ? DEST_BY_ID[destId] : null
  const layout = dest ? LAYOUTS[dest.kind] : undefined
  if (!visible || !dest || !layout) return null
  return <Room key={dest.id} destId={dest.id} layout={layout} />
}

function Room({ destId, layout }: { destId: string; layout: Layout }) {
  const dest = DEST_BY_ID[destId]
  const activity = useGame((s) => (s.activity && s.activity.ctx.dest === destId ? s.activity : null))
  const profile = useGame((s) => s.profile)
  const dialog = useUI((s) => s.dialog)
  const { w, d, Props } = layout
  const player = useRef<THREE.Group>(null)
  const staffRef = useRef<THREE.Group>(null)
  const cur = useRef({ x: layout.spots.idle.x, z: d - 0.3, y: 0 })
  const motion = useRef<Motion>({ moving: false, speed: 0, action: null, prop: null })
  const staffMotion = useRef<Motion>({ moving: false, speed: 0, action: layout.staff.pose ?? null })
  const npc = dest.npcs[0] ? NPC_BY_ID[dest.npcs[0]] : null
  const crowd: Patron[] = useMemo(() => layout.crowd.map((c, i) => ({ ...c, look: look(i + destId.length) })), [layout, destId])
  const talking = !!dialog && !!npc && dialog.npcId === npc.id

  useEffect(() => () => { actionFocus.active = false }, [])

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const g = player.current
    if (!g) return
    const lk = lookFor(activity)
    let spot = spotFor(layout, activity)
    let pose: Pose | null = activity ? lk?.pose ?? spot.pose ?? null : null
    const prop: Prop | null = activity ? lk?.prop ?? null : null
    // wander between points for tours, hustles and browsing
    if (activity && lk?.wander && layout.wander?.length) {
      const pts = layout.wander
      const cur = activity.shift?.current
      const frac = cur ? (activity.done - cur.startedAt) / Math.max(1e-6, cur.until - cur.startedAt) : activity.done / activity.total
      const idx = Math.floor(frac * pts.length * (cur ? 1 : 2)) % pts.length
      spot = { ...pts[idx], pose: lk.pose }
    }
    // face-to-face conversation with the staff member
    const sp = layout.staff
    if (talking && !activity) {
      const r = sp.rot ?? 0
      spot = { x: sp.x + Math.sin(r) * 0.95, z: sp.z + Math.cos(r) * 0.95, rot: r + PI }
      pose = 'talk'
    }
    const c = cur.current
    // free walking when idle (or between tasks on a shift): WASD or click-to-walk
    const betweenTasks = !!activity?.shift && !activity.shift.current
    if ((!activity || betweenTasks) && !talking) {
      const kv = keyVector()
      const free = runtime.insideTarget
      if (kv.x || kv.z) {
        runtime.insideTarget = null
        c.x = Math.min(w - 0.3, Math.max(0.3, c.x + kv.x * 3.2 * dt))
        c.z = Math.min(d - 0.2, Math.max(0.3, c.z + kv.z * 3.2 * dt))
        g.rotation.y = Math.atan2(kv.x, kv.z)
        motion.current = { moving: true, speed: 2.8, action: null, prop: null }
      } else if (free) {
        const fx = free.x - c.x
        const fz = free.z - c.z
        const fd = Math.hypot(fx, fz)
        if (fd < 0.05) {
          runtime.insideTarget = null
          motion.current = { moving: false, speed: 0, action: null, prop: null }
        } else {
          const k = Math.min(1, (3.2 * dt) / fd)
          c.x += fx * k
          c.z += fz * k
          g.rotation.y = Math.atan2(fx, fz)
          motion.current = { moving: true, speed: 2.8, action: null, prop: null }
        }
      } else motion.current = { moving: false, speed: 0, action: null, prop: null }
      c.y += (0 - c.y) * Math.min(1, dt * 10)
      g.position.set(c.x, 0.12 + c.y, c.z)
      actionFocus.active = false
      actionFocus.x = INSIDE_ORIGIN.x + c.x
      actionFocus.z = INSIDE_ORIGIN.z + c.z
      return
    }
    const dx = spot.x - c.x
    const dz = spot.z - c.z
    const dist = Math.hypot(dx, dz)
    const step = (lk?.pose === 'run' ? 4.5 : 2.8) * dt
    if (dist > 0.04) {
      const k = Math.min(1, step / dist)
      c.x += dx * k
      c.z += dz * k
      c.y += (0 - c.y) * Math.min(1, dt * 10)
      g.rotation.y = Math.atan2(dx, dz)
      motion.current = { moving: true, speed: lk?.pose === 'run' ? 4.5 : 2.6, action: null, prop: lk?.wander ? prop : null }
    } else {
      let diff = (spot.rot ?? 0) - g.rotation.y
      while (diff > PI) diff -= PI * 2
      while (diff < -PI) diff += PI * 2
      g.rotation.y += diff * Math.min(1, dt * 8)
      c.y += ((spot.y ?? 0) - c.y) * Math.min(1, dt * 8)
      motion.current = { moving: false, speed: 0, action: pose, prop }
    }
    g.position.set(c.x, 0.12 + c.y, c.z)
    // staff turns to chat
    if (staffRef.current) {
      const r = sp.rot ?? 0
      const want = talking ? Math.atan2(c.x - sp.x, c.z - sp.z) : r
      let diff = want - staffRef.current.rotation.y
      while (diff > PI) diff -= PI * 2
      while (diff < -PI) diff += PI * 2
      staffRef.current.rotation.y += diff * Math.min(1, dt * 6)
      staffMotion.current = { moving: false, speed: 0, action: talking ? 'talk' : sp.pose ?? null }
    }
    actionFocus.active = !!activity || talking
    actionFocus.x = INSIDE_ORIGIN.x + c.x
    actionFocus.z = INSIDE_ORIGIN.z + c.z
    void st
  })

  const pct = activity ? Math.round((activity.done / activity.total) * 100) : null
  const wage = activity?.shift ? activity.shift.earned + activity.shift.tips : 0
  const checker = useMemo(() => {
    const out: { x: number; z: number; alt: boolean }[] = []
    for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) out.push({ x, z, alt: (x + z) % 2 === 0 })
    return out
  }, [w, d])

  return (
    <group position={INSIDE_ORIGIN}>
      {checker.map((t) => (
        <Part key={`${t.x}-${t.z}`} p={[t.x + 0.5, 0.05, t.z + 0.5]} s={[1, 0.1, 1]} c={t.alt ? layout.floor[0] : layout.floor[1]} cast={false} />
      ))}
      <Part p={[w / 2, -0.3, d / 2]} s={[w + 0.5, 0.6, d + 0.5]} c={layout.open ? '#8a7a5a' : '#4b3f35'} cast={false} />
      {!layout.open && <Walls w={w} d={d} color={layout.wall} windows={!layout.dark} />}
      {!layout.dark && !layout.open && <pointLight position={[w / 2, 2.8, d / 2]} intensity={14} distance={20} color="#ffe9c4" />}
      {/* click the floor to walk */}
      <mesh
        position={[w / 2, 0.12, d / 2]}
        rotation-x={-Math.PI / 2}
        onClick={(e) => {
          if (e.delta > 6) return
          runtime.insideTarget = { x: Math.min(w - 0.3, Math.max(0.3, e.point.x - INSIDE_ORIGIN.x)), z: Math.min(d - 0.2, Math.max(0.3, e.point.z - INSIDE_ORIGIN.z)) }
        }}
      >
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {layout.dark && <pointLight position={[w / 2, 3, d / 2 + 1]} intensity={10} distance={18} color="#9b7bff" />}
      <Props />

      {/* exit */}
      <group
        position={[layout.spots.idle.x, 0.11, d - 0.3]}
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta > 6) return
          useGame.getState().exitBuilding()
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}
      >
        <Part p={[0, 0, 0]} s={[1.2, 0.04, 0.6]} c="#35d07f" cast={false} />
        <Label id="inside-exit" y={0.6} cls="loc-label sel" text={layout.open ? '🚶 Leave' : '🚪 Exit'} />
      </group>

      <group
        ref={staffRef}
        position={[layout.staff.x, 0.12, layout.staff.z]}
        rotation={[0, layout.staff.rot ?? 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta > 6 || !npc) return
          if (!useGame.getState().activity) useGame.getState().startTalk(npc.id)
        }}
        onPointerOver={() => { if (npc) document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}
      >
        <Character appearance={npc ? npc.appearance : look(3)} getMotion={() => staffMotion.current} />
        <mesh position={[0, 0.7, 0]} visible={false}><boxGeometry args={[0.8, 1.5, 0.8]} /></mesh>
        {npc && <Label id="inside-npc" y={1.85} cls="npc-tag chat" text={npc.name} />}
      </group>
      {crowd.map((c, i) => (
        <group key={i} position={[c.x, 0.12 + (c.y ?? 0), c.z]} rotation={[0, c.rot ?? 0, 0]}>
          <Character appearance={c.look} lite getMotion={() => ({ moving: false, speed: 0, action: c.pose ?? null, prop: c.prop ?? null })} />
        </group>
      ))}

      {(activity?.kind === 'date' || activity?.kind === 'event') && activity.ctx.npc && NPC_BY_ID[activity.ctx.npc] && (
        <PartnerNear npcId={activity.ctx.npc} spot={spotFor(layout, activity)} pose={activity.kind === 'event' ? lookFor(activity)?.pose : undefined} />
      )}
      <group ref={player}>
        <Character appearance={profile?.appearance ?? DEFAULT_APPEARANCE} getMotion={() => motion.current} />
        <Label id="inside-you" y={1.85} cls={wage ? 'bubble wage' : 'you-tag'} text={activity ? (activity.shift ? (activity.shift.current ? `${activity.shift.current.icon} ${activity.shift.current.label}` : `💼 ${wage ? `+${formatMoney(wage)}` : 'On shift'}`) : `${activity.icon} ${pct}%`) : profile?.name ?? 'You'} />
      </group>
    </group>
  )
}
