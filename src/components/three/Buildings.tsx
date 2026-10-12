'use client'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { DESTINATIONS, DEST_BY_ID, type Destination } from '@/game/content'
import { runtime } from '@/game/runtime'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import { Merged, Part, getMat, windowMat, bulbMat, viewCenter, type V3 } from './shared'
import { Label } from './Label'
import { poiColor } from '@/game/poi'
import { Arena, Bank, Cafe, Harbour, Mine, TemaPort, Station, Beach, Church, Court, Dealer, GovOffice, Hospital, Hotel, Lighthouse, Mall, Park, Plot, Police, Realty, School, Square, Stadium, Zoo } from './Landmarks'

const BASE = 0.12

interface MP {
  w: number
  d: number
  color: string
  accent: string
  doorX: number
}

function Door({ doorX, d, w = 0.7, h = 1.2, c = '#5b3a29' }: { doorX: number; d: number; w?: number; h?: number; c?: string }) {
  return <Part p={[doorX, h / 2, d / 2 + 0.03]} s={[w, h, 0.08]} c={c} cast={false} />
}

/** Grid of lit windows on the south and east faces. */
function Windows({ bw, bd, rows, cols, y0, dy, doorX, skipDoorRow = true, sz = 0.42 }: { bw: number; bd: number; rows: number; cols: number; y0: number; dy: number; doorX: number; skipDoorRow?: boolean; sz?: number }) {
  const items: React.ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -bw / 2 + ((c + 0.5) * bw) / cols
      if (skipDoorRow && r === 0 && Math.abs(x - doorX) < 0.65) continue
      items.push(<Part key={`s${r}-${c}`} p={[x, y0 + r * dy, bd / 2 + 0.02]} s={[sz, sz * 1.1, 0.05]} m={windowMat} cast={false} />)
    }
    const side = Math.max(1, Math.round(bd / 1.6))
    for (let c = 0; c < side; c++) items.push(<Part key={`e${r}-${c}`} p={[bw / 2 + 0.02, y0 + r * dy, -bd / 2 + ((c + 0.5) * bd) / side]} s={[0.05, sz * 1.1, sz]} m={windowMat} cast={false} />)
  }
  return <>{items}</>
}

function Stripes({ w, y, z, n, a, b, depth = 0.9, tilt = 0.35 }: { w: number; y: number; z: number; n: number; a: string; b: string; depth?: number; tilt?: number }) {
  const sw = w / n
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <Part key={i} p={[-w / 2 + sw * (i + 0.5), y, z]} s={[sw, 0.06, depth]} r={[tilt, 0, 0]} c={i % 2 ? a : b} />
      ))}
    </>
  )
}

function Home({ w, d, color, accent, doorX, tier }: MP & { tier: string }) {
  if (tier === 'room') {
    const bw = w - 0.4
    const bd = d - 0.4
    const h = 2.3
    return (
      <>
        <Part p={[0, h / 2, 0]} s={[bw, h, bd]} c={color} />
        <Part p={[0, h + 0.38, -bd / 4]} s={[w + 0.2, 0.12, bd / 1.7]} r={[0.5, 0, 0]} c={accent} />
        <Part p={[0, h + 0.38, bd / 4]} s={[w + 0.2, 0.12, bd / 1.7]} r={[-0.5, 0, 0]} c={accent} />
        <Part p={[0, h + 0.72, 0]} s={[w + 0.25, 0.1, 0.15]} c="#8a3b1e" />
        <Part p={[doorX, 1.55, bd / 2 + 0.35]} s={[1.6, 0.08, 0.8]} c="#7a4e2d" />
        <Part p={[doorX - 0.7, 0.75, bd / 2 + 0.7]} s={[0.07, 1.5, 0.07]} c="#6b4423" />
        <Part p={[doorX + 0.7, 0.75, bd / 2 + 0.7]} s={[0.07, 1.5, 0.07]} c="#6b4423" />
        <Door doorX={doorX} d={bd} />
        <Windows bw={bw} bd={bd} rows={1} cols={3} y0={1.4} dy={1} doorX={doorX} skipDoorRow={false} />
        <Part g="cyl" p={[-bw / 2 + 0.5, h + 0.9, -0.3]} s={[0.25, 0.5, 0.25]} c="#b0b8c4" />
      </>
    )
  }
  if (tier === 'apartment') {
    const bw = w - 0.4
    const bd = d - 0.4
    const floors = 3
    const h = floors * 1.7
    return (
      <>
        <Part p={[0, h / 2, 0]} s={[bw, h, bd]} c={color} />
        <Part p={[0, h + 0.1, 0]} s={[bw + 0.3, 0.2, bd + 0.3]} c={accent} />
        {Array.from({ length: floors - 1 }).map((_, i) => (
          <group key={i} position={[0, 1.7 * (i + 1) + 0.1, bd / 2 + 0.35]}>
            <Part p={[-1.4, 0, 0]} s={[2.2, 0.1, 0.7]} c="#e4d9b8" />
            <Part p={[1.4, 0, 0]} s={[2.2, 0.1, 0.7]} c="#e4d9b8" />
            <Part p={[-1.4, 0.3, 0.32]} s={[2.2, 0.35, 0.04]} c={accent} opacity={0.8} />
            <Part p={[1.4, 0.3, 0.32]} s={[2.2, 0.35, 0.04]} c={accent} opacity={0.8} />
          </group>
        ))}
        <Part p={[0, 1.4, bd / 2 + 0.55]} s={[1.8, 0.08, 1.1]} c={accent} />
        <Door doorX={doorX} d={bd} w={0.9} h={1.3} c="#2d5f5c" />
        <Windows bw={bw} bd={bd} rows={floors} cols={4} y0={0.95} dy={1.7} doorX={doorX} />
        <Part g="cyl" p={[bw / 2 - 1, h + 0.7, -0.5]} s={[0.55, 0.9, 0.55]} c="#8fa3b5" />
        <Part g="ico" p={[-bw / 2 + 0.8, h + 0.55, 0]} s={0.4} c="#3f9f4a" />
      </>
    )
  }
  // premium villa: house on the left, pool on the right
  const hw = w - 3
  const hx = -w / 2 + hw / 2 + 0.2
  return (
    <>
      <Part p={[hx, 1.4, 0]} s={[hw - 0.2, 2.8, d - 0.4]} c={color} />
      <Part p={[hx, 3.0, 0]} s={[hw + 0.3, 0.2, d]} c="#d8d4c8" />
      <Part p={[hx + 0.4, 3.7, -0.4]} s={[hw - 1, 1.2, d - 2]} c="#fbfaf6" />
      <Part p={[hx + 0.4, 4.35, -0.4]} s={[hw - 0.6, 0.12, d - 1.6]} c={accent} />
      <Part p={[hx, 1.2, (d - 0.4) / 2 + 0.02]} s={[hw - 1.2, 1.9, 0.06]} c="#7fc8e8" opacity={0.65} rough={0.1} />
      <Part p={[hx, 3.25, (d - 0.4) / 2 + 0.4]} s={[hw - 0.4, 0.5, 0.05]} c="#bfe5f5" opacity={0.5} />
      <Door doorX={doorX} d={d - 0.4} w={0.9} h={1.5} c="#33261c" />
      {/* pool */}
      <Part p={[w / 2 - 1.5, 0.04, 0.4]} s={[2.8, 0.14, d - 1.2]} c="#f0ece2" />
      <Part p={[w / 2 - 1.5, 0.12, 0.4]} s={[2.4, 0.06, d - 1.6]} c="#4fc3e8" rough={0.1} opacity={0.9} />
      <Part g="ico" p={[w / 2 - 0.5, 0.7, -d / 2 + 0.7]} s={0.5} c="#3aa655" />
      <Part g="cyl" p={[w / 2 - 0.5, 0.35, -d / 2 + 0.7]} s={[0.07, 0.7, 0.07]} c="#8a6a3f" />
      <Part g="ico" p={[hx - hw / 2 + 0.2, 3.5, 0]} s={0.35} c="#3f9f4a" />
    </>
  )
}

function FoodStall({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  return (
    <>
      <Part p={[0, 1.1, -0.2]} s={[bw, 2.2, bd - 0.6]} c={color} />
      <Part p={[0, 2.35, -0.2]} s={[bw + 0.3, 0.2, bd - 0.3]} c="#c8553d" />
      <Part p={[0, 2.8, -0.9]} s={[bw - 0.4, 0.7, 0.12]} c={accent} />
      <Part p={[0, 0.5, bd / 2 - 0.55]} s={[bw - 0.4, 1, 0.5]} c="#8a5a2b" />
      <Stripes w={bw + 0.2} y={2.0} z={bd / 2 - 0.2} n={8} a={accent} b="#fff7e6" depth={1.3} />
      <Part p={[-bw / 2 + 0.1, 1, bd / 2 + 0.25]} s={[0.06, 2, 0.06]} c="#6b4423" />
      <Part p={[bw / 2 - 0.1, 1, bd / 2 + 0.25]} s={[0.06, 2, 0.06]} c="#6b4423" />
      <Part g="cyl" p={[-bw / 2 + 0.5, 1.15, bd / 2 - 0.55]} s={[0.22, 0.25, 0.22]} c="#d94f3d" />
      <Part g="cyl" p={[0.2, 1.1, bd / 2 - 0.55]} s={[0.2, 0.18, 0.2]} c="#2b2b2b" />
      <Part g="cyl" p={[bw / 2 - 0.6, 3.0, -0.8]} s={[0.18, 0.7, 0.18]} c="#8f8f8f" />
      <Door doorX={doorX} d={bd - 0.6} w={0.9} h={1.5} c="#4a2e1c" />
    </>
  )
}

function Market({ w, d, color, accent }: MP) {
  const cols = 3
  const rows = 2
  const sw = (w - 0.6) / cols
  const sd = (d - 0.8) / rows
  const stripes = [color, '#ffd23f', '#2e86de', '#e0524a', accent, '#8e5bd0']
  return (
    <>
      <Part p={[0, 0.06, 0]} s={[w - 0.2, 0.1, d - 0.2]} c="#c9b8a0" recv />
      {Array.from({ length: rows }).flatMap((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const x = -w / 2 + 0.3 + sw * (c + 0.5)
          const z = -d / 2 + 0.4 + sd * (r + 0.5)
          const col = stripes[(r * cols + c) % stripes.length]
          return (
            <group key={`${r}-${c}`} position={[x, 0, z]}>
              <Part p={[0, 0.45, 0]} s={[sw - 0.5, 0.9, sd - 0.7]} c="#9c6b3f" />
              <Part g="cone" p={[0, 2.0, 0]} s={[(sw - 0.1) * 0.54, 0.9, (sd - 0.1) * 0.54]} r={[0, Math.PI / 8, 0]} c={col} />
              <Part p={[-(sw - 0.5) / 2, 1.0, (sd - 0.7) / 2]} s={[0.05, 1.8, 0.05]} c="#5b4636" />
              <Part p={[(sw - 0.5) / 2, 1.0, (sd - 0.7) / 2]} s={[0.05, 1.8, 0.05]} c="#5b4636" />
              <Part g="sphere" p={[-0.25, 1.0, 0]} s={0.16} c="#f39c12" />
              <Part g="sphere" p={[0, 1.0, 0.05]} s={0.16} c="#e74c3c" />
              <Part g="sphere" p={[0.25, 1.0, 0]} s={0.16} c="#7ec850" />
            </group>
          )
        }),
      )}
      <Part p={[w / 2 - 0.5, 0.3, d / 2 - 0.3]} s={[0.5, 0.5, 0.5]} c="#b68b52" />
      <Part p={[w / 2 - 1.1, 0.2, d / 2 - 0.3]} s={[0.4, 0.4, 0.4]} c="#c99a5f" />
    </>
  )
}

function Office({ w, d, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  const h = 9
  return (
    <>
      <Part p={[0, h / 2, 0]} s={[bw, h, bd]} c="#9cc9ee" rough={0.25} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Part key={i} p={[0, 1.2 + i * 1.0, 0]} s={[bw + 0.08, 0.08, bd + 0.08]} c="#2c4a66" />
      ))}
      <Windows bw={bw} bd={bd} rows={8} cols={4} y0={1.55} dy={1.0} doorX={doorX} sz={0.55} />
      <Part p={[0, h + 0.25, 0]} s={[bw + 0.3, 0.5, bd + 0.3]} c="#0a3d62" />
      <Part g="cyl" p={[1, h + 1.3, 0]} s={[0.05, 1.6, 0.05]} c="#cfd8dc" />
      <Part g="sphere" p={[1, h + 2.1, 0]} s={0.12} c="#e0524a" />
      <Part p={[doorX, 1.7, bd / 2 + 0.45]} s={[2.4, 0.1, 1]} c="#0a3d62" />
      <Part p={[doorX, 0.85, bd / 2 + 0.03]} s={[1.6, 1.7, 0.06]} c="#bfe5f5" opacity={0.6} />
      <Part p={[-bw / 2 + 0.6, 0.35, bd / 2 + 0.6]} s={[0.8, 0.5, 0.5]} c="#3f9f4a" />
    </>
  )
}

function Training({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  const h = 3.2
  return (
    <>
      <Part p={[0, h / 2, 0]} s={[bw, h, bd]} c={color} />
      <Part p={[0, h + 0.4, -bd / 4]} s={[w + 0.2, 0.12, bd / 1.7]} r={[0.35, 0, 0]} c={accent} />
      <Part p={[0, h + 0.4, bd / 4]} s={[w + 0.2, 0.12, bd / 1.7]} r={[-0.35, 0, 0]} c={accent} />
      <Part p={[doorX, 2.2, bd / 2 + 0.05]} s={[2.6, 1.3, 0.2]} c="#f4f1ea" />
      <Part p={[doorX, 2.4, bd / 2 + 0.17]} s={[2.2, 0.4, 0.04]} c={accent} />
      <Part g="cyl" p={[doorX, 3.4, bd / 2 + 0.1]} s={[0.3, 0.08, 0.3]} r={[Math.PI / 2, 0, 0]} c="#fff" />
      <Part p={[doorX, 0.2, bd / 2 + 0.35]} s={[2.2, 0.2, 0.7]} c="#d8d4c8" />
      <Part g="cyl" p={[-bw / 2 + 0.4, h + 1.6, bd / 2 - 0.4]} s={[0.04, 3, 0.04]} c="#cfd8dc" />
      <Part p={[-bw / 2 + 0.85, h + 2.5, bd / 2 - 0.4]} s={[0.8, 0.5, 0.03]} c="#e0524a" />
      <Door doorX={doorX} d={bd} w={1.1} h={1.5} c="#2d6a4f" />
      <Windows bw={bw} bd={bd} rows={2} cols={5} y0={1.0} dy={1.5} doorX={doorX} />
    </>
  )
}

function Gym({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  const h = 3.0
  return (
    <>
      <Part p={[0, h / 2, 0]} s={[bw, h, bd]} c={color} />
      <Part p={[0, h + 0.15, 0]} s={[bw + 0.3, 0.3, bd + 0.3]} c={accent} />
      <Part p={[doorX - 1.6, 1.3, bd / 2 + 0.02]} s={[2.2, 1.7, 0.06]} c="#bfe5f5" opacity={0.6} />
      <Part p={[doorX + 1.9, 1.3, bd / 2 + 0.02]} s={[2.2, 1.7, 0.06]} c="#bfe5f5" opacity={0.6} />
      <Door doorX={doorX} d={bd} w={1.1} h={1.5} c="#3a2a22" />
      {/* giant dumbbell on the roof */}
      <group position={[0, h + 1.0, 0]}>
        <Part p={[0, 0, 0]} s={[2.4, 0.14, 0.14]} c="#2b2b2b" />
        <Part p={[-1.3, 0, 0]} s={[0.35, 0.9, 0.9]} c="#e0524a" />
        <Part p={[1.3, 0, 0]} s={[0.35, 0.9, 0.9]} c="#e0524a" />
        <Part p={[-1.7, 0, 0]} s={[0.25, 0.6, 0.6]} c="#2b2b2b" />
        <Part p={[1.7, 0, 0]} s={[0.25, 0.6, 0.6]} c="#2b2b2b" />
      </group>
      <Windows bw={bw} bd={bd} rows={1} cols={2} y0={2.3} dy={1} doorX={doorX} skipDoorRow={false} />
    </>
  )
}

function Lounge({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  const parasols = [
    [-w / 2 + 1.2, d / 2 - 1.0, '#e0524a'], [-w / 2 + 3.2, d / 2 - 1.2, '#ffd23f'], [w / 2 - 3.2, d / 2 - 1.0, '#e0524a'], [w / 2 - 1.2, d / 2 - 1.2, '#ffd23f'],
  ] as [number, number, string][]
  return (
    <>
      <Part p={[0, 0.06, 0]} s={[w - 0.2, 0.1, d - 0.2]} c="#b88a5a" />
      <Part p={[0, 1.2, -d / 4 + 0.1]} s={[bw, 2.4, bd / 2]} c={color} />
      <Part p={[0, 2.55, -d / 4 + 0.1]} s={[bw + 0.3, 0.2, bd / 2 + 0.3]} c={accent} />
      <Part p={[0, 1.3, -d / 4 + bd / 4 + 0.12]} s={[bw - 0.5, 1.4, 0.04]} c="#bfe5f5" opacity={0.55} />
      <Part p={[doorX - 1.5, 0.55, -0.2]} s={[3, 0.9, 0.5]} c="#6b4423" />
      {parasols.map(([x, z, c], i) => (
        <group key={i} position={[x, 0, z]}>
          <Part g="cyl" p={[0, 0.8, 0]} s={[0.04, 1.6, 0.04]} c="#e8e2d6" />
          <Part g="cone" p={[0, 1.75, 0]} s={[0.85, 0.35, 0.85]} c={c} />
          <Part g="cyl" p={[0, 0.4, 0.55]} s={[0.3, 0.05, 0.3]} c="#f4f1ea" />
          <Part g="cyl" p={[0, 0.2, 0.55]} s={[0.05, 0.4, 0.05]} c="#f4f1ea" />
        </group>
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <Part key={i} g="sphere" p={[-bw / 2 + (i * bw) / 8, 2.9 - Math.sin((i / 8) * Math.PI) * -0.0, d / 2 - 0.2]} s={0.07} m={bulbMat} cast={false} />
      ))}
    </>
  )
}

function Wash({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.3
  const bd = d - 0.3
  return (
    <>
      <Part p={[0, 1.2, 0]} s={[bw, 2.4, bd]} c={color} />
      <Part p={[0, 2.55, 0]} s={[bw + 0.3, 0.2, bd + 0.3]} c={accent} />
      <Part p={[doorX - 0.4, 0.8, bd / 2 + 0.03]} s={[0.55, 1.6, 0.06]} c="#2f80c2" />
      <Part p={[doorX + 0.35, 0.8, bd / 2 + 0.03]} s={[0.55, 1.6, 0.06]} c="#e0524a" />
      <Part p={[0, 2.0, bd / 2 + 0.03]} s={[bw - 0.2, 0.4, 0.04]} c="#f4f1ea" />
      <Part g="cyl" p={[bw / 2 - 0.4, 3.0, -0.2]} s={[0.35, 0.8, 0.35]} c="#8fa3b5" />
    </>
  )
}

function Body({ dest }: { dest: Destination }) {
  const doorX = dest.door.x + 0.5 - (dest.x + dest.w / 2)
  const p: MP = { w: dest.w, d: dest.d, color: dest.color, accent: dest.accent, doorX }
  switch (dest.kind) {
    case 'home': return <Home {...p} tier={dest.homeTier ?? 'room'} />
    case 'food': return <FoodStall {...p} />
    case 'market': return <Market {...p} />
    case 'office': return <Office {...p} />
    case 'training': return <Training {...p} />
    case 'gym': return <Gym {...p} />
    case 'lounge': return <Lounge {...p} />
    case 'stop': return <Station {...p} id={dest.id} />
    case 'hospital': return <Hospital {...p} />
    case 'school': return <School {...p} />
    case 'police': return <Police {...p} />
    case 'court': return <Court {...p} />
    case 'mall': return <Mall {...p} />
    case 'bank': return <Bank {...p} />
    case 'church': return <Church {...p} />
    case 'realty': return <Realty {...p} />
    case 'beach': return <Beach {...p} />
    case 'park': return <Park {...p} />
    case 'landmark': return <Lighthouse {...p} />
    case 'plot': return <Plot {...p} id={dest.id} />
    case 'hotel': return <Hotel {...p} />
    case 'stadium': return <Stadium {...p} />
    case 'square': return <Square {...p} />
    case 'arena': return <Arena {...p} />
    case 'mine': return <Mine {...p} />
    case 'cafe': return <Cafe {...p} />
    case 'harbour': return dest.id === 'harbour_tema' ? <TemaPort {...p} /> : <Harbour {...p} />
    case 'zoo': return <Zoo {...p} />
    case 'gov': return <GovOffice {...p} />
    case 'dealer': return <Dealer {...p} />
    default: return <Wash {...p} />
  }
}

const LABEL_Y: Record<string, number> = { home: 4.2, food: 3.9, market: 3.4, office: 12, training: 5.3, gym: 6.2, lounge: 3.6, stop: 3.9, wash: 4.0, hospital: 5.4, school: 6.6, police: 4.2, court: 5.4, mall: 4.8, bank: 5.0, church: 7.6, realty: 3.6, beach: 2.8, park: 3.2, landmark: 8.9, plot: 3.6, hotel: 12.4, stadium: 6, square: 6.4, arena: 5.6, mine: 2.6, cafe: 3.2, harbour: 3.2, zoo: 3.6, gov: 4.8, dealer: 4.6 }

function Highlight({ w, d, active }: { w: number; d: number; active: 'selected' | 'hover' | 'quest' | null }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((st) => {
    if (!ref.current) return
    const s = 1 + Math.sin(st.clock.elapsedTime * 4) * 0.015
    ref.current.scale.set(s, 1, s)
  })
  if (!active) return null
  const color = active === 'selected' ? '#ffd23f' : active === 'hover' ? '#ffffff' : '#7cf0b4'
  const ww = w + 0.9
  const dd = d + 0.9
  const t = active === 'selected' ? 0.16 : 0.1
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
  return (
    <group ref={ref} position={[0, 0.16, 0]}>
      <mesh position={[0, 0, -dd / 2]} scale={[ww, 0.03, t]} material={mat}><boxGeometry /></mesh>
      <mesh position={[0, 0, dd / 2]} scale={[ww, 0.03, t]} material={mat}><boxGeometry /></mesh>
      <mesh position={[-ww / 2, 0, 0]} scale={[t, 0.03, dd]} material={mat}><boxGeometry /></mesh>
      <mesh position={[ww / 2, 0, 0]} scale={[t, 0.03, dd]} material={mat}><boxGeometry /></mesh>
    </group>
  )
}

function Bubble({ destId, y }: { destId: string; y: number }) {
  const a = useGame((s) => (s.activity?.ctx.dest === destId && s.view === 'world' ? s.activity : null))
  if (!a) return null
  const pct = Math.round((a.done / a.total) * 100)
  return <Label id={`bb-${destId}`} y={y - 0.7} cls="bubble" text={`${a.icon} ${a.kind === 'travel' ? 'Riding' : a.kind === 'work' ? 'Working' : 'Busy'} ${pct}%`} />
}

function Building({ dest }: { dest: Destination }) {
  const selected = useUI((s) => s.selectedDest === dest.id && s.panel === 'building')
  const tracked = useUI((s) => s.trackedDest === dest.id)
  const showLabels = useUI((s) => s.settings.showLabels)
  const [hovered, setHovered] = useState(false)
  const cx = dest.x + dest.w / 2
  const cz = dest.z + dest.d / 2
  // level of detail: far buildings collapse to a single coloured block
  const [near, setNear] = useState(true)
  const nearRef = useRef(true)
  useFrame(() => {
    // full detail near the camera; phones (low quality) switch to plain blocks sooner
    const q = useUI.getState().settings.quality
    const n = Math.hypot(cx - viewCenter.x, cz - viewCenter.z) < (q === 'low' || q === 'minimal' ? 36 : 52)
    if (n !== nearRef.current) {
      nearRef.current = n
      setNear(n)
    }
  })
  const active = selected ? 'selected' : tracked ? 'quest' : hovered ? 'hover' : null
  return (
    <group
      position={[cx, BASE, cz]}
      onClick={(e) => {
        if (e.delta > 6) return
        e.stopPropagation()
        useUI.getState().selectDest(dest.id, true)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        runtime.hoverDest = dest.id
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        if (runtime.hoverDest === dest.id) runtime.hoverDest = null
        document.body.style.cursor = ''
      }}
    >
      {near ? (dest.kind === 'plot' ? <Body dest={dest} /> : <Merged k={dest.id}><Body dest={dest} /></Merged>) : <Part p={[0, (LABEL_Y[dest.kind] ?? 4) * 0.3, 0]} s={[dest.w - 0.4, (LABEL_Y[dest.kind] ?? 4) * 0.6, dest.d - 0.4]} c={dest.color} cast={false} />}
      <Highlight w={dest.w} d={dest.d} active={active} />
      {showLabels && <Label id={`b-${dest.id}`} y={LABEL_Y[dest.kind] ?? 4} cls={`poi-pin ${selected ? 'sel' : ''}`} icon={dest.emoji} color={poiColor(dest.kind)} text={dest.name} range={selected || tracked ? 400 : 48} />}
      <Bubble destId={dest.id} y={LABEL_Y[dest.kind] ?? 4} />
      {tracked && <TrackArrow y={(LABEL_Y[dest.kind] ?? 4) + 1.2} />}
    </group>
  )
}

function TrackArrow({ y }: { y: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((st) => {
    if (ref.current) {
      ref.current.position.y = y + Math.sin(st.clock.elapsedTime * 3) * 0.25
      ref.current.rotation.y = st.clock.elapsedTime * 1.5
    }
  })
  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh rotation={[Math.PI, 0, 0]} scale={[0.5, 0.9, 0.5]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color="#35d07f" emissive="#35d07f" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

export function Buildings() {
  return (
    <>
      {DESTINATIONS.map((d) => (
        <Building key={d.id} dest={d} />
      ))}
    </>
  )
}

export { DEST_BY_ID, getMat }
export type { V3 }
