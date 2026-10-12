'use client'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import { useGame } from '@/game/store'
import { projectStages, type ProjectId } from '@/game/content'
import { Part, bulbMat, windowMat } from './shared'

interface MP {
  w: number
  d: number
  color: string
  accent: string
  doorX: number
}

function Windows({ bw, bd, rows, cols, y0, dy, doorX, sz = 0.42 }: { bw: number; bd: number; rows: number; cols: number; y0: number; dy: number; doorX: number; sz?: number }) {
  const out: React.ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -bw / 2 + ((c + 0.5) * bw) / cols
      if (r === 0 && Math.abs(x - doorX) < 0.8) continue
      out.push(<Part key={`s${r}${c}`} p={[x, y0 + r * dy, bd / 2 + 0.02]} s={[sz, sz * 1.1, 0.05]} m={windowMat} cast={false} />)
    }
    const side = Math.max(1, Math.round(bd / 1.6))
    for (let c = 0; c < side; c++) out.push(<Part key={`e${r}${c}`} p={[bw / 2 + 0.02, y0 + r * dy, -bd / 2 + ((c + 0.5) * bd) / side]} s={[0.05, sz * 1.1, sz]} m={windowMat} cast={false} />)
  }
  return <>{out}</>
}
const Door = ({ x, z, w = 0.9, h = 1.5, c = '#3a2a22' }: { x: number; z: number; w?: number; h?: number; c?: string }) => <Part p={[x, h / 2, z + 0.03]} s={[w, h, 0.08]} c={c} cast={false} />

function Car({ x, z, rot = 0, body, stripe }: { x: number; z: number; rot?: number; body: string; stripe?: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <Part p={[0, 0.35, 0]} s={[0.8, 0.4, 1.7]} c={body} />
      {stripe && <Part p={[0, 0.38, 0]} s={[0.82, 0.1, 1.72]} c={stripe} />}
      <Part p={[0, 0.7, -0.1]} s={[0.7, 0.32, 0.9]} c={body} />
      <Part p={[0, 0.7, -0.1]} s={[0.72, 0.22, 0.75]} c="#9fd3f0" />
      {[[0.4, 0.55], [-0.4, 0.55], [0.4, -0.55], [-0.4, -0.55]].map(([wx, wz], i) => (
        <Part key={i} g="cyl" p={[wx, 0.17, wz]} s={[0.17, 0.09, 0.17]} r={[0, 0, Math.PI / 2]} c="#222" />
      ))}
    </group>
  )
}

export function Hospital({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  return (
    <>
      <Part p={[0, 2.2, -0.3]} s={[bw, 4.4, bd - 0.6]} c={color} />
      <Part p={[0, 4.5, -0.3]} s={[bw + 0.3, 0.2, bd - 0.3]} c="#cfd8dc" />
      <Windows bw={bw} bd={bd - 0.6} rows={3} cols={6} y0={1.0} dy={1.3} doorX={doorX} />
      <Part p={[doorX, 1.7, bd / 2 - 0.1]} s={[2.6, 0.12, 1.4]} c={accent} />
      <Door x={doorX} z={bd / 2 - 0.6} w={1.4} h={1.6} c="#bfe5f5" />
      {/* red cross */}
      <group position={[-bw / 2 + 1.4, 3.6, (bd - 0.6) / 2 - 0.25]}>
        <Part p={[0, 0, 0]} s={[1.1, 0.35, 0.06]} c={accent} cast={false} />
        <Part p={[0, 0, 0]} s={[0.35, 1.1, 0.06]} c={accent} cast={false} />
      </group>
      <group position={[bw / 2 - 1.2, 0, bd / 2 - 0.4]}>
        <Part p={[0, 0.55, 0]} s={[0.9, 0.9, 1.9]} c="#ffffff" />
        <Part p={[0, 0.55, 0]} s={[0.92, 0.14, 1.92]} c={accent} />
        <Part p={[0, 1.05, 0.5]} s={[0.25, 0.1, 0.25]} c="#2e86de" m={bulbMat} />
      </group>
    </>
  )
}

export function School({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  return (
    <>
      <Part p={[0, 1.6, 0]} s={[bw, 3.2, bd]} c={color} />
      <Windows bw={bw} bd={bd} rows={2} cols={6} y0={1.0} dy={1.2} doorX={doorX} />
      {/* tiered Legon-style roof */}
      <Part g="cone" p={[0, 3.9, 0]} s={[bw * 0.54, 1.3, bd * 0.54]} r={[0, Math.PI / 8, 0]} c={accent} />
      <Part p={[0, 4.4, 0]} s={[2.2, 1.2, 2.2]} c={color} />
      <Part g="cone" p={[0, 5.4, 0]} s={[1.6, 0.9, 1.6]} r={[0, Math.PI / 8, 0]} c={accent} />
      {[-1.4, -0.5, 0.5, 1.4].map((x) => (
        <Part key={x} g="cyl" p={[doorX + x, 1.1, bd / 2 + 0.5]} s={[0.14, 2.2, 0.14]} c="#f4f1ea" />
      ))}
      <Part p={[doorX, 2.25, bd / 2 + 0.5]} s={[3.6, 0.15, 1.1]} c={accent} />
      <Door x={doorX} z={bd / 2} w={1.1} h={1.6} c="#5b3a29" />
    </>
  )
}

export function Police({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  return (
    <>
      <Part p={[0, 1.5, 0]} s={[bw, 3, bd]} c={color} />
      <Part p={[0, 2.5, 0]} s={[bw + 0.04, 0.35, bd + 0.04]} c={accent} />
      <Part p={[0, 3.1, 0]} s={[bw + 0.3, 0.2, bd + 0.3]} c="#1b2b5e" />
      <Part p={[doorX, 2.0, bd / 2 + 0.04]} s={[1.6, 0.35, 0.04]} c="#ffffff" cast={false} />
      <Windows bw={bw} bd={bd} rows={1} cols={3} y0={1.3} dy={1} doorX={doorX} />
      <Door x={doorX} z={bd / 2} w={1} h={1.5} c="#1b2b5e" />
      <Part g="cyl" p={[-bw / 2 + 0.2, 1.8, bd / 2 + 0.3]} s={[0.04, 3.6, 0.04]} c="#cfd8dc" />
      <group position={[-bw / 2 + 0.6, 3.3, bd / 2 + 0.3]}>
        <Part p={[0, 0.2, 0]} s={[0.8, 0.18, 0.03]} c="#ce1126" cast={false} />
        <Part p={[0, 0.02, 0]} s={[0.8, 0.18, 0.03]} c="#fcd116" cast={false} />
        <Part p={[0, -0.16, 0]} s={[0.8, 0.18, 0.03]} c="#006b3f" cast={false} />
      </group>
      <Car x={bw / 2 + 0.2} z={bd / 2 + 1.0} rot={Math.PI / 2} body="#f4f6f8" stripe="#1f3a8a" />
    </>
  )
}

export function Court({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.6
  const bd = d - 1.2
  return (
    <>
      <Part p={[0, 0.15, 0.3]} s={[w - 0.2, 0.3, d - 0.4]} c="#d8d0c0" />
      <Part p={[0, 2.0, -0.3]} s={[bw, 3.4, bd]} c={color} />
      {[-2, -1, 0, 1, 2].map((x) => (
        <Part key={x} g="cyl" p={[x, 1.9, bd / 2]} s={[0.2, 3.2, 0.2]} c="#f7f2e6" />
      ))}
      <Part p={[0, 3.6, bd / 2 - 0.2]} s={[bw + 0.2, 0.25, 1.2]} c="#e8dfca" />
      <Part p={[0, 4.15, bd / 2 - 0.2]} s={[bw * 0.75, 0.9, 0.9]} r={[0, 0, Math.PI / 4]} c={accent} />
      <Part p={[0, 3.9, -0.3]} s={[bw + 0.3, 0.2, bd + 0.2]} c="#cbbd9c" />
      <Door x={doorX} z={bd / 2 - 0.85} w={1.1} h={2} c="#5b3a29" />
    </>
  )
}

export function Mall({ w, d, color, accent }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  return (
    <>
      <Part p={[0, 1.8, 0]} s={[bw, 3.6, bd]} c={color} />
      <Part p={[0, 1.3, bd / 2 + 0.02]} s={[bw - 0.6, 2.2, 0.06]} c="#9fd3f0" m={windowMat} />
      <Part p={[0, 3.0, bd / 2 + 0.06]} s={[bw, 0.6, 0.1]} c={accent} />
      <Part p={[0, 3.75, 0]} s={[bw + 0.3, 0.3, bd + 0.3]} c="#9aa4ae" />
      {[-3, 0, 3].map((x) => (
        <Part key={x} p={[x, 3.95, -1]} s={[1.5, 0.15, 1.5]} c="#b0b8c4" />
      ))}
      {[-bw / 2 + 0.3, bw / 2 - 0.3].map((x) => (
        <group key={x}>
          <Part g="cyl" p={[x, 1.1, bd / 2 + 0.7]} s={[0.08, 2.2, 0.08]} c="#a67c52" />
          <Part g="cone" p={[x, 2.3, bd / 2 + 0.7]} s={[0.8, 0.3, 0.8]} c="#3aa655" />
        </group>
      ))}
    </>
  )
}

export function Bank({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  return (
    <>
      <Part p={[0, 2, 0]} s={[bw, 4, bd]} c={color} />
      <Part p={[0, 4.1, 0]} s={[bw + 0.3, 0.25, bd + 0.3]} c={accent} rough={0.3} />
      <Part p={[0, 3.3, bd / 2 + 0.03]} s={[bw - 0.4, 0.4, 0.05]} c={accent} rough={0.3} cast={false} />
      {[-1.4, -0.5, 0.5, 1.4].map((x) => (
        <Part key={x} g="cyl" p={[doorX + x * 0.9, 1.4, bd / 2 + 0.3]} s={[0.13, 2.8, 0.13]} c="#fbf6ea" />
      ))}
      <Windows bw={bw} bd={bd} rows={2} cols={3} y0={1.2} dy={1.3} doorX={doorX} />
      <Door x={doorX} z={bd / 2} w={1} h={1.8} c="#3a2a22" />
    </>
  )
}

export function Church({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.6
  const bd = d - 0.6
  return (
    <>
      <Part p={[0, 1.5, -0.4]} s={[bw, 3, bd - 1]} c={color} />
      <Part p={[0, 3.4, -0.4 - (bd - 1) / 4]} s={[bw + 0.3, 0.12, (bd - 1) / 1.6]} r={[0.6, 0, 0]} c={accent} />
      <Part p={[0, 3.4, -0.4 + (bd - 1) / 4]} s={[bw + 0.3, 0.12, (bd - 1) / 1.6]} r={[-0.6, 0, 0]} c={accent} />
      {/* steeple */}
      <Part p={[doorX, 2.4, bd / 2 - 0.6]} s={[1.4, 4.8, 1.2]} c={color} />
      <Part g="cone" p={[doorX, 5.5, bd / 2 - 0.6]} s={[0.95, 1.6, 0.95]} r={[0, Math.PI / 4, 0]} c={accent} />
      <Part p={[doorX, 6.7, bd / 2 - 0.6]} s={[0.1, 0.8, 0.1]} c="#f4c430" />
      <Part p={[doorX, 6.85, bd / 2 - 0.6]} s={[0.5, 0.1, 0.1]} c="#f4c430" />
      <Part p={[doorX, 3.6, bd / 2 + 0.02]} s={[0.5, 0.7, 0.05]} m={windowMat} cast={false} />
      {[-1.6, 1.6].map((x) => (
        <Part key={x} p={[x, 1.6, (bd - 1) / 2 - 0.38]} s={[0.5, 1.2, 0.05]} c="#5aa0d8" m={windowMat} cast={false} />
      ))}
      <Door x={doorX} z={bd / 2 - 0.05} w={0.8} h={1.5} c="#7a4e2d" />
    </>
  )
}

export function Realty({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  return (
    <>
      <Part p={[0, 1.3, 0]} s={[bw, 2.6, bd]} c={color} />
      <Part p={[0, 2.7, 0]} s={[bw + 0.3, 0.2, bd + 0.3]} c={accent} />
      <Part p={[0, 1.2, bd / 2 + 0.02]} s={[bw - 0.8, 1.6, 0.05]} c="#bfe5f5" m={windowMat} cast={false} />
      <Door x={doorX} z={bd / 2} w={0.8} h={1.5} c="#2f8a5a" />
      <Part g="cyl" p={[bw / 2 + 0.3, 0.7, bd / 2 + 0.5]} s={[0.04, 1.4, 0.04]} c="#5b3a29" />
      <Part p={[bw / 2 + 0.3, 1.35, bd / 2 + 0.5]} s={[0.8, 0.5, 0.05]} c="#e0524a" />
    </>
  )
}

export function Beach({ w, d, color, accent }: MP) {
  const t = useRef<THREE.Group>(null)
  useFrame((st) => {
    if (t.current) t.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.5) * 0.4
  })
  return (
    <>
      <Part p={[-0.3, 0.6, -0.1]} s={[1.6, 1.2, 1.2]} c="#c9a27a" />
      <Part g="cone" p={[-0.3, 1.6, -0.1]} s={[0.95, 0.9, 0.75]} r={[0, Math.PI / 8, 0]} c={color} />
      {[[1.1, 0.4, accent], [-1.6, 0.6, '#2e86de']].map(([x, z, c], i) => (
        <group key={i} position={[x as number, 0, z as number]}>
          <Part g="cyl" p={[0, 0.7, 0]} s={[0.04, 1.4, 0.04]} c="#e8e2d6" />
          <Part g="cone" p={[0, 1.45, 0]} s={[0.8, 0.3, 0.8]} c={c as string} />
        </group>
      ))}
      {/* horse */}
      <group ref={t} position={[1.0, 0, -1.0]} userData={{ noMerge: true }}>
        <Part p={[0, 0.75, 0]} s={[0.35, 0.4, 0.95]} c="#7a4e2d" />
        <Part p={[0, 1.05, 0.5]} s={[0.22, 0.5, 0.25]} r={[0.5, 0, 0]} c="#7a4e2d" />
        {[[0.12, 0.35], [-0.12, 0.35], [0.12, -0.35], [-0.12, -0.35]].map(([x, z], i) => (
          <Part key={i} p={[x, 0.3, z]} s={[0.08, 0.6, 0.08]} c="#5b3a29" />
        ))}
      </group>
      <Part p={[0.2, 0.12, 0.6]} s={[0.9, 0.06, 0.5]} c="#e0524a" cast={false} />
    </>
  )
}

export function Park({ w, d, color, accent }: MP) {
  return (
    <>
      <Part p={[0, 0.08, 0]} s={[w - 0.2, 0.12, d - 0.2]} c="#e8e2d6" />
      <Part p={[-1.2, 0.9, -0.2]} s={[2.2, 1.6, 1.6]} c={color} />
      <Part p={[-1.2, 1.9, -0.2]} s={[1.6, 0.5, 1.2]} c={color} />
      <Part p={[-1.2, 2.3, -0.2]} s={[1.0, 0.35, 0.8]} c="#f4c430" rough={0.3} />
      <Part p={[1.5, 0.6, 0]} s={[0.7, 1.0, 0.7]} c="#9aa4ae" />
      <Part p={[1.5, 1.45, 0]} s={[0.35, 0.7, 0.3]} c="#3d3d3d" />
      <Part g="sphere" p={[1.5, 1.95, 0]} s={0.15} c="#3d3d3d" />
      <Part p={[1.6, 1.55, 0.25]} s={[0.08, 0.4, 0.08]} r={[-0.9, 0, 0]} c="#3d3d3d" />
      {[-2.4, 0.4].map((x) => (
        <group key={x} position={[x, 0, 0.9]}>
          <Part g="cyl" p={[0, 0.2, 0]} s={[0.45, 0.2, 0.45]} c="#cfd8dc" />
          <Part g="cyl" p={[0, 0.3, 0]} s={[0.38, 0.05, 0.38]} c="#4fc3e8" />
          <Part g="cyl" p={[0, 0.55, 0]} s={[0.05, 0.5, 0.05]} c={accent} />
        </group>
      ))}
    </>
  )
}

export function Lighthouse({ color, accent }: MP) {
  const lamp = useRef<THREE.Mesh>(null)
  useFrame((st) => {
    if (lamp.current) lamp.current.rotation.y = st.clock.elapsedTime * 2
  })
  return (
    <>
      <Part p={[0.8, 0.6, 0.6]} s={[1.2, 1.2, 1.2]} c="#f4f1ea" />
      <Part p={[0.8, 1.3, 0.6]} s={[1.4, 0.15, 1.4]} c={accent} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Part key={i} g="cyl" p={[-0.3, 0.6 + i * 1.1, -0.3]} s={[0.55 - i * 0.03, 1.1, 0.55 - i * 0.03]} c={i % 2 ? accent : color} />
      ))}
      <Part g="cyl" p={[-0.3, 7.0, -0.3]} s={[0.55, 0.12, 0.55]} c="#2b2b2b" />
      <mesh ref={lamp} position={[-0.3, 7.4, -0.3]} userData={{ noMerge: true }}>
        <cylinderGeometry args={[0.32, 0.32, 0.6, 8]} />
        <primitive object={bulbMat} attach="material" />
      </mesh>
      <Part g="cone" p={[-0.3, 7.95, -0.3]} s={[0.45, 0.5, 0.45]} c={accent} />
    </>
  )
}

/** Plot 7: shows the land, then each construction stage, then the finished house. */
export function Plot({ w, d, id }: MP & { id: string }) {
  const land = useGame((s) => !!s.plots[id]?.owned)
  const rawStage = useGame((s) => s.plots[id]?.stage ?? 0)
  const project = useGame((s) => s.plots[id]?.project ?? null) as ProjectId | null
  const total = projectStages(project).length
  const finished = !!project && rawStage >= total
  // generic construction look: foundation, walls, roof, finishing (extra stages show scaffolding)
  const stage = finished ? 4 : Math.min(3, rawStage)
  const busy = useGame((s) => (s.plots[id]?.until ?? null) !== null)
  const crane = useRef<THREE.Group>(null)
  useFrame((st) => {
    if (crane.current) crane.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.4) * 0.8
  })
  const fence = []
  for (let x = -w / 2; x <= w / 2; x += 0.75) {
    fence.push(<Part key={`a${x}`} p={[x, 0.3, -d / 2]} s={[0.06, 0.6, 0.06]} c="#8a5a2b" />)
    fence.push(<Part key={`b${x}`} p={[x, 0.3, d / 2 - 0.1]} s={[0.06, 0.6, 0.06]} c="#8a5a2b" />)
  }
  return (
    <>
      <Part p={[0, 0.04, 0]} s={[w - 0.1, 0.06, d - 0.1]} c={stage > 0 ? '#c2a679' : '#8fd163'} cast={false} />
      {fence}
      {!land && (
        <group position={[0, 0, d / 2 - 0.6]}>
          <Part g="cyl" p={[0, 0.6, 0]} s={[0.05, 1.2, 0.05]} c="#5b3a29" />
          <Part p={[0, 1.2, 0]} s={[1.2, 0.6, 0.05]} c="#e0524a" />
          <Part p={[0, 1.2, 0.03]} s={[1.0, 0.15, 0.02]} c="#ffffff" cast={false} />
        </group>
      )}
      {land && stage === 0 && !busy && [[-0.8, -1.5], [0.8, -1.5], [-0.8, 1.2], [0.8, 1.2]].map(([x, z], i) => <Part key={i} p={[x, 0.2, z]} s={[0.06, 0.4, 0.06]} c="#e0524a" />)}
      {land && project && !finished && (
        <group position={[-w / 2 + 0.5, 0, d / 2 - 0.35]}>
          <Part g="cyl" p={[0, 0.5, 0]} s={[0.04, 1.0, 0.04]} c="#5b3a29" />
          <Part p={[0, 1.0, 0]} s={[0.8, 0.45, 0.04]} c={PROJECT_LOOK[project].sign} />
        </group>
      )}
      {finished && project && project !== 'bungalow' && <ProjectBuilding w={w} d={d} project={project} />}
      {stage >= 1 && !(finished && project !== 'bungalow') && <Part p={[0, 0.15, -0.2]} s={[w - 0.6, 0.25, d - 1.2]} c="#9e9e9e" />}
      {stage >= 2 && !(finished && project !== 'bungalow') && (
        <>
          <Part p={[0, 1.2, -0.2]} s={[w - 0.7, 1.9, d - 1.3]} c={stage >= 4 ? '#f6c9a8' : '#b8b2a7'} />
          {stage >= 4 && <Part p={[0, 0.75, (d - 1.3) / 2 - 0.17]} s={[0.6, 1.2, 0.06]} c="#5b3a29" cast={false} />}
          {stage >= 4 && <Part p={[0.8, 1.4, (d - 1.3) / 2 - 0.17]} s={[0.5, 0.5, 0.05]} m={windowMat} cast={false} />}
        </>
      )}
      {stage >= 3 && !(finished && project !== 'bungalow') && (
        <>
          <Part p={[0, 2.45, -0.2 - (d - 1.3) / 4]} s={[w - 0.3, 0.12, (d - 1.3) / 1.65]} r={[0.5, 0, 0]} c={stage >= 4 ? '#c8553d' : '#8a8a8a'} />
          <Part p={[0, 2.45, -0.2 + (d - 1.3) / 4]} s={[w - 0.3, 0.12, (d - 1.3) / 1.65]} r={[-0.5, 0, 0]} c={stage >= 4 ? '#c8553d' : '#8a8a8a'} />
        </>
      )}
      {busy && (
        <group position={[w / 2 - 0.3, 0, -d / 2 + 0.4]}>
          <Part p={[0, 2.2, 0]} s={[0.15, 4.4, 0.15]} c="#f1b82d" />
          <group ref={crane} position={[0, 4.4, 0]} userData={{ noMerge: true }}>
            <Part p={[-1, 0, 0]} s={[2.4, 0.12, 0.12]} c="#f1b82d" />
            <Part p={[-1.9, -0.6, 0]} s={[0.03, 1.2, 0.03]} c="#333" />
          </group>
        </group>
      )}
    </>
  )
}

const PROJECT_LOOK: Record<ProjectId, { sign: string }> = {
  bungalow: { sign: '#c8553d' },
  villa: { sign: '#2c7da0' },
  guesthouse: { sign: '#8e5bd0' },
  apartments: { sign: '#1f3a8a' },
  plaza: { sign: '#e0524a' },
}

/** Finished building for the non-bungalow projects (all inside the plot footprint). */
function ProjectBuilding({ w, d, project }: { w: number; d: number; project: ProjectId }) {
  const bw = w - 0.5
  const bd = d - 1.2
  if (project === 'villa')
    return (
      <>
        <Part p={[0, 0.9, -0.5]} s={[bw, 1.8, bd - 1]} c="#fbf8f1" />
        <Part p={[0.2, 2.5, -0.7]} s={[bw - 0.6, 1.4, bd - 1.6]} c="#f4efe6" />
        <Part p={[0.2, 3.25, -0.7]} s={[bw - 0.4, 0.1, bd - 1.4]} c="#4a5568" />
        <Part p={[0, 1.9, -0.5]} s={[bw + 0.1, 0.1, bd - 0.8]} c="#4a5568" />
        {[-0.6, 0.6].map((x) => <Part key={x} p={[x, 1.1, (bd - 1) / 2 - 0.48]} s={[0.5, 0.6, 0.05]} m={windowMat} cast={false} />)}
        <Part p={[0, 0.07, d / 2 - 1.2]} s={[bw - 0.4, 0.06, 1.1]} c="#4fc3e8" rough={0.1} cast={false} />
        <Part g="cyl" p={[-bw / 2 + 0.2, 0.9, d / 2 - 0.5]} s={[0.07, 1.8, 0.07]} c="#7a4e2d" />
        <Part g="ico" p={[-bw / 2 + 0.2, 1.9, d / 2 - 0.5]} s={0.45} c="#2e7d4f" />
      </>
    )
  if (project === 'apartments')
    return (
      <>
        <Part p={[0, 2.6, -0.2]} s={[bw, 5.2, bd]} c="#e8dcc6" />
        {[0, 1, 2, 3].map((f) => (
          <group key={f}>
            <Part p={[0, 0.9 + f * 1.25, bd / 2 - 0.15]} s={[bw + 0.1, 0.08, 0.35]} c="#9aa4ae" />
            {[-0.55, 0.55].map((x) => <Part key={x} p={[x, 1.35 + f * 1.25, bd / 2 - 0.18]} s={[0.45, 0.5, 0.04]} m={windowMat} cast={false} />)}
          </group>
        ))}
        <Part p={[0, 5.27, -0.2]} s={[bw + 0.1, 0.1, bd + 0.1]} c="#4a5568" />
        <Part g="cyl" p={[0.6, 5.6, -0.6]} s={[0.25, 0.5, 0.25]} c="#2e86de" />
      </>
    )
  if (project === 'plaza')
    return (
      <>
        <Part p={[0, 1.0, -0.2]} s={[bw, 2.0, bd]} c="#f4efe6" />
        <Part p={[0, 2.05, -0.2]} s={[bw + 0.2, 0.1, bd + 0.2]} c="#7d6b5d" />
        {[-0.9, 0, 0.9].map((zOff, i) => (
          <group key={i}>
            <Part p={[bw / 2 + 0.02, 0.65, zOff - 0.2]} s={[0.05, 1.1, 0.75]} c={['#e0524a', '#2fa866', '#2e86de'][i]} cast={false} />
            <Part p={[bw / 2 + 0.03, 1.55, zOff - 0.2]} s={[0.05, 0.3, 0.8]} c="#fcd116" cast={false} />
          </group>
        ))}
        <Part p={[0, 0.65, bd / 2 - 0.18]} s={[bw - 0.4, 1.1, 0.05]} c="#e0524a" cast={false} />
        <Part p={[0, 1.6, bd / 2 - 0.17]} s={[bw - 0.2, 0.35, 0.05]} c="#1f2d45" cast={false} />
      </>
    )
  // guesthouse
  return (
    <>
      <Part p={[0, 1.3, -0.2]} s={[bw, 2.6, bd]} c="#f6e7c9" />
      <Part p={[0, 2.68, -0.2]} s={[bw + 0.2, 0.14, bd + 0.2]} c="#8e5bd0" />
      {[0.45, 1.75].map((y) =>
        [-0.6, 0.6].map((x) => <Part key={`${x}${y}`} p={[x, y + 0.35, bd / 2 - 0.18]} s={[0.42, 0.45, 0.04]} m={windowMat} cast={false} />),
      )}
      <Part p={[0, 0.5, bd / 2 - 0.17]} s={[0.5, 1.0, 0.05]} c="#5b3a29" cast={false} />
      <Part p={[0, 2.35, bd / 2 - 0.15]} s={[bw - 0.3, 0.3, 0.05]} c="#8e5bd0" cast={false} />
      <Part p={[0, 2.35, bd / 2 - 0.12]} s={[bw - 0.5, 0.18, 0.02]} c="#ffffff" cast={false} />
    </>
  )
}

export function Hotel({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.6
  const bd = d - 0.6
  const floors = 6
  return (
    <>
      <Part p={[0, 0.9, 0]} s={[bw + 0.3, 1.8, bd + 0.3]} c={accent} />
      <Part p={[0, 1.8 + floors * 0.7, -0.2]} s={[bw - 1, floors * 1.4, bd - 1.2]} c={color} />
      <Windows bw={bw - 1} bd={bd - 1.2} rows={floors * 2 - 1} cols={6} y0={2.4} dy={0.7} doorX={99} sz={0.36} />
      <Part p={[0, 1.8 + floors * 1.4 + 0.1, -0.2]} s={[bw - 0.6, 0.2, bd - 0.8]} c={accent} />
      <Part p={[0.6, 1.8 + floors * 1.4 + 0.25, -0.2]} s={[1.6, 0.08, 1.4]} c="#4fc3e8" rough={0.1} />
      <Part p={[doorX, 2.0, bd / 2 + 0.4]} s={[2.4, 0.12, 1.0]} c="#2b2b2b" />
      <Door x={doorX} z={bd / 2 + 0.15} w={1.2} h={1.6} c="#bfe5f5" />
      {[-bw / 2 + 0.4, bw / 2 - 0.4].map((x) => (
        <group key={x}>
          <Part g="cyl" p={[x, 1.2, bd / 2 + 0.5]} s={[0.07, 2.4, 0.07]} c="#a67c52" />
          <Part g="cone" p={[x, 2.5, bd / 2 + 0.5]} s={[0.8, 0.3, 0.8]} c="#3aa655" />
        </group>
      ))}
    </>
  )
}

export function Stadium({ w, d, accent }: MP) {
  const rx = w / 2 - 0.3
  const rz = d / 2 - 0.3
  const segs = 16
  return (
    <>
      <Part p={[0, 0.08, 0]} s={[rx * 1.2, 0.08, rz * 1.1]} c="#3f9f4a" />
      {Array.from({ length: segs }).map((_, i) => {
        const a = (i / segs) * Math.PI * 2
        return (
          <Part key={i} p={[Math.cos(a) * rx, 1.2, Math.sin(a) * rz]} r={[0, -a + Math.PI / 2, 0]} s={[2 * Math.PI * Math.max(rx, rz) / segs * 0.85, 2.4, 0.8]} c={i % 2 ? '#d9dde3' : accent} />
        )
      })}
      {[[-rx, -rz], [rx, -rz], [-rx, rz], [rx, rz]].map(([x, z], i) => (
        <group key={i}>
          <Part g="cyl" p={[x * 0.95, 2.6, z * 0.95]} s={[0.06, 5.2, 0.06]} c="#9aa4ae" />
          <Part p={[x * 0.95, 5.3, z * 0.95]} s={[0.6, 0.3, 0.1]} m={bulbMat} cast={false} />
        </group>
      ))}
      <Part p={[0, 0.13, 0]} s={[0.05, 0.02, rz * 1.0]} c="#ffffff" cast={false} />
    </>
  )
}

export function Square({ w, d }: MP) {
  return (
    <>
      <Part p={[0, 0.06, 0]} s={[w - 0.2, 0.1, d - 0.2]} c="#e8e2d6" />
      {/* Black Star Gate */}
      <Part p={[-1.6, 2.2, -0.6]} s={[0.9, 4.4, 0.9]} c="#f4f1ea" />
      <Part p={[1.6, 2.2, -0.6]} s={[0.9, 4.4, 0.9]} c="#f4f1ea" />
      <Part p={[0, 4.6, -0.6]} s={[4.3, 0.8, 1.0]} c="#f4f1ea" />
      <Part p={[0, 5.4, -0.6]} s={[0.55, 0.55, 0.12]} r={[0, 0, Math.PI / 4]} c="#000000" />
      {[-2.6, -1.3, 0, 1.3, 2.6].map((x, i) => (
        <group key={x} position={[x, 0, d / 2 - 1]}>
          <Part g="cyl" p={[0, 1.2, 0]} s={[0.03, 2.4, 0.03]} c="#cfd8dc" />
          <Part p={[0.25, 2.2, 0]} s={[0.5, 0.3, 0.02]} c={['#ce1126', '#fcd116', '#006b3f', '#fcd116', '#ce1126'][i]} />
        </group>
      ))}
    </>
  )
}

/** Accra International Conference Centre: low hall, tiered pyramid roof, colonnade. Stays inside its footprint. */
export function Arena({ w, d, color, accent, doorX }: MP) {
  const glow = useRef<THREE.Mesh>(null)
  useFrame((st) => {
    const m = glow.current?.material as THREE.MeshStandardMaterial | undefined
    if (m) m.emissiveIntensity = 0.5 + Math.sin(st.clock.elapsedTime * 2.5) * 0.35
  })
  const bw = w - 1.2
  const bd = d - 1.4
  const cols: number[] = []
  for (let x = -bw / 2 + 0.3; x <= bw / 2 - 0.3 + 1e-6; x += (bw - 0.6) / 7) cols.push(x)
  return (
    <>
      <Part p={[0, 0.06, 0]} s={[w - 0.3, 0.1, d - 0.3]} c="#c9c2b2" cast={false} />
      {/* main hall on a podium */}
      <Part p={[0, 0.2, -0.2]} s={[bw + 0.4, 0.3, bd + 0.4]} c="#e8e2d6" />
      <Part p={[0, 1.35, -0.4]} s={[bw - 0.6, 2.0, bd - 1.0]} c={color} />
      <Part p={[0, 1.35, -0.4 + (bd - 1.0) / 2 + 0.02]} s={[bw - 1.0, 1.4, 0.05]} m={windowMat} cast={false} />
      {/* colonnade */}
      {cols.map((x) => <Part key={x} g="cyl" p={[x, 1.35, bd / 2 - 0.35]} s={[0.12, 2.0, 0.12]} c="#f4f1ea" />)}
      <Part p={[0, 2.45, -0.2]} s={[bw, 0.2, bd]} c="#f4f1ea" />
      {/* tiered pyramid roof (square, flat sides on the footprint axes) */}
      <Part p={[0, 2.85, -0.2]} s={[bw - 0.6, 0.6, bd - 0.6]} c={accent} />
      <Part p={[0, 3.4, -0.2]} s={[bw - 1.8, 0.5, bd - 1.8]} c="#7a3b2e" />
      <Part p={[0, 3.85, -0.2]} s={[Math.max(1, bw - 3.2), 0.4, Math.max(1, bd - 3.2)]} c={accent} />
      <Part g="cone" p={[0, 4.55, -0.2]} s={[Math.max(0.8, (bw - 3.6) * 0.7), 1.0, Math.max(0.8, (bd - 3.6) * 0.7)]} r={[0, Math.PI / 4, 0]} c="#7a3b2e" />
      {/* entrance canopy and sign */}
      <Part p={[doorX, 0.95, bd / 2 + 0.1]} s={[2.6, 0.12, 0.9]} c="#f4f1ea" />
      <Door x={doorX} z={bd / 2 - 0.55} w={1.6} h={1.5} c="#2b2d42" />
      <mesh ref={glow} position={[doorX, 2.05, bd / 2 - 0.3]} userData={{ noMerge: true }}>
        <boxGeometry args={[3.2, 0.32, 0.05]} />
        <meshStandardMaterial color="#111" emissive="#ff2d95" emissiveIntensity={0.6} />
      </mesh>
      {/* flag poles inside the forecourt */}
      {[-w / 2 + 0.45, w / 2 - 0.45].map((x) => (
        <group key={x}>
          <Part g="cyl" p={[x, 1.6, d / 2 - 0.4]} s={[0.04, 3.2, 0.04]} c="#999" />
          <Part p={[x + 0.25, 2.95, d / 2 - 0.4]} s={[0.5, 0.12, 0.02]} c="#ce1126" cast={false} />
          <Part p={[x + 0.25, 2.83, d / 2 - 0.4]} s={[0.5, 0.12, 0.02]} c="#fcd116" cast={false} />
          <Part p={[x + 0.25, 2.71, d / 2 - 0.4]} s={[0.5, 0.12, 0.02]} c="#006b3f" cast={false} />
        </group>
      ))}
    </>
  )
}

/* ------------------------------ trotro stations ------------------------------ */
/** A parked trotro (minibus), about 0.7 x 1.5. */
function Trotro({ x, z, rot = 0, c = '#f0ede6', stripe = '#2e86de' }: { x: number; z: number; rot?: number; c?: string; stripe?: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <Part p={[0, 0.38, 0]} s={[0.62, 0.52, 1.5]} c={c} />
      <Part p={[0, 0.34, 0]} s={[0.64, 0.08, 1.52]} c={stripe} />
      <Part p={[0, 0.52, 0.02]} s={[0.64, 0.16, 1.3]} c="#9fd3f0" cast={false} />
      <Part p={[0, 0.7, -0.1]} s={[0.5, 0.08, 1.0]} c="#555" />
      {[[0.3, 0.5], [-0.3, 0.5], [0.3, -0.5], [-0.3, -0.5]].map(([wx, wz], i) => <Part key={i} g="cyl" p={[wx, 0.12, wz]} s={[0.12, 0.07, 0.12]} r={[0, 0, Math.PI / 2]} c="#222" />)}
    </group>
  )
}
function Shed({ x, z, len, depth = 1.1, h = 2.1, roof, post = '#4a4a4a' }: { x: number; z: number; len: number; depth?: number; h?: number; roof: string; post?: string }) {
  const n = Math.max(2, Math.round(len / 1.6) + 1)
  return (
    <group position={[x, 0, z]}>
      <Part p={[0, h, 0]} s={[len, 0.08, depth]} r={[0.08, 0, 0]} c={roof} />
      {Array.from({ length: n }).map((_, i) => {
        const px = -len / 2 + 0.1 + (i * (len - 0.2)) / (n - 1)
        return <Part key={i} p={[px, h / 2, 0]} s={[0.06, h, 0.06]} c={post} />
      })}
    </group>
  )
}
function Bench({ x, z, len = 1.2, rot = 0 }: { x: number; z: number; len?: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <Part p={[0, 0.38, 0]} s={[len, 0.06, 0.3]} c="#8a5a2b" />
      <Part p={[-len / 2 + 0.1, 0.19, 0]} s={[0.05, 0.38, 0.25]} c="#4a4a4a" />
      <Part p={[len / 2 - 0.1, 0.19, 0]} s={[0.05, 0.38, 0.25]} c="#4a4a4a" />
    </group>
  )
}
function Kiosk({ x, z, c, roof }: { x: number; z: number; c: string; roof: string }) {
  return (
    <group position={[x, 0, z]}>
      <Part p={[0, 0.55, 0]} s={[0.7, 1.1, 0.6]} c={c} />
      <Part p={[0, 1.15, 0.05]} s={[0.85, 0.08, 0.8]} c={roof} />
      <Part p={[0, 0.7, 0.31]} s={[0.5, 0.3, 0.02]} c="#222" cast={false} />
    </group>
  )
}
function Umbrella({ x, z, c }: { x: number; z: number; c: string }) {
  return (
    <group position={[x, 0, z]}>
      <Part g="cyl" p={[0, 0.7, 0]} s={[0.025, 1.4, 0.025]} c="#666" />
      <Part g="cone" p={[0, 1.5, 0]} s={[0.55, 0.3, 0.55]} c={c} />
      <Part p={[0, 0.4, 0]} s={[0.5, 0.06, 0.4]} c="#8a5a2b" />
    </group>
  )
}
/** Each trotro station gets its own look (picked by destination id). */
export function Station({ w, d, id }: MP & { id: string }) {
  const hw = w / 2 - 0.2
  const hd = d / 2 - 0.2
  switch (id) {
    case 'stop_com': // Circle: big lorry park, long sheds, footbridge, rows of trotros
      return (
        <>
          <Part p={[0, 0.06, 0]} s={[w - 0.2, 0.1, d - 0.2]} c="#59606e" cast={false} />
          {[-hd + 0.7, 0.2].map((z, r) => (
            <group key={z}>
              <Shed x={0} z={z} len={w - 1.0} depth={1.3} h={1.9} roof={r ? '#c8553d' : '#2e86de'} />
              {Array.from({ length: Math.floor((w - 1.4) / 0.9) }).map((_, i) => <Trotro key={i} x={-hw + 0.9 + i * 0.9} z={z} rot={0} c={['#f0ede6', '#f5c518', '#e8eef4'][i % 3]} stripe={['#2e86de', '#ce1126', '#2fa866'][i % 3]} />)}
            </group>
          ))}
          {/* footbridge across the front */}
          <Part p={[-hw + 0.35, 1.3, hd - 0.35]} s={[0.5, 2.6, 0.5]} c="#9aa4ae" />
          <Part p={[hw - 0.35, 1.3, hd - 0.35]} s={[0.5, 2.6, 0.5]} c="#9aa4ae" />
          <Part p={[0, 2.7, hd - 0.35]} s={[w - 0.6, 0.18, 0.55]} c="#b8c2cc" />
          <Part p={[0, 2.95, hd - 0.1]} s={[w - 0.6, 0.3, 0.04]} c="#fcd116" />
          <Part p={[0, 2.95, hd - 0.12]} s={[2.2, 0.2, 0.02]} c="#ce1126" cast={false} />
          <Part p={[0, 3.3, hd - 0.35]} s={[0.04, 0.4, 0.04]} c="#555" />
        </>
      )
    case 'stop_kaneshie': // multi-storey terminal with market stalls in front
      return (
        <>
          <Part p={[0, 0.06, 0]} s={[w - 0.2, 0.1, d - 0.2]} c="#6b6f78" cast={false} />
          <Part p={[0, 1.6, -hd + 0.75]} s={[w - 0.6, 3.2, 1.3]} c="#d9c9a8" />
          {[0.9, 1.9, 2.9].map((y) => <Part key={y} p={[0, y, -hd + 1.42]} s={[w - 0.9, 0.35, 0.04]} m={windowMat} cast={false} />)}
          <Part p={[0, 3.3, -hd + 0.75]} s={[w - 0.4, 0.15, 1.5]} c="#8a5a2b" />
          <Part p={[0, 3.6, -hd + 1.45]} s={[2.6, 0.4, 0.05]} c="#006b3f" />
          <Part p={[0, 3.6, -hd + 1.48]} s={[2.2, 0.12, 0.02]} c="#fcd116" cast={false} />
          {[-hw + 1.0, 0, hw - 1.0].map((x, i) => <Trotro key={x} x={x} z={0.3} rot={Math.PI / 2} c={i === 1 ? '#f5c518' : '#f0ede6'} stripe="#ce1126" />)}
          {[-hw + 0.5, -hw + 1.5, hw - 1.5, hw - 0.5].map((x, i) => <Umbrella key={x} x={x} z={hd - 0.5} c={['#e0524a', '#2fa866', '#f1b82d', '#8e5bd0'][i]} />)}
        </>
      )
    case 'stop_madina': // roundabout island with kiosks and umbrellas
      return (
        <>
          <Part p={[0, 0.06, 0]} s={[w - 0.2, 0.1, d - 0.2]} c="#5a6170" cast={false} />
          <Part g="cyl" p={[0, 0.14, 0]} s={[Math.min(hw, hd) * 0.55, 0.12, Math.min(hw, hd) * 0.55]} c="#7cc26a" />
          <Part g="cyl" p={[0, 0.9, 0]} s={[0.18, 1.6, 0.18]} c="#f4f1ea" />
          <Part g="sphere" p={[0, 1.85, 0]} s={0.28} c="#fcd116" />
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4
            return <Trotro key={i} x={Math.cos(a) * (hw - 0.9)} z={Math.sin(a) * (hd - 0.9)} rot={-a} c={i % 2 ? '#f0ede6' : '#e8d9b0'} stripe="#2fa866" />
          })}
          <Kiosk x={-hw + 0.45} z={hd - 0.4} c="#fcd116" roof="#ce1126" />
          <Kiosk x={hw - 0.45} z={hd - 0.4} c="#2e86de" roof="#f4f1ea" />
          <Kiosk x={hw - 0.45} z={-hd + 0.4} c="#2fa866" roof="#fcd116" />
          <Umbrella x={-hw + 0.5} z={-hd + 0.5} c="#e0524a" />
          <Umbrella x={0} z={hd - 0.45} c="#8e5bd0" />
        </>
      )
    case 'stop_wf': // Labadi: colourful beach shelter with palms
      return (
        <>
          <Part p={[0, 0.06, 0]} s={[w - 0.2, 0.1, d - 0.2]} c="#e9d8a6" cast={false} />
          {['#ce1126', '#fcd116', '#006b3f'].map((c, i) => <Part key={c} p={[-0.6 + i * 0.6, 1.7, -hd + 0.6]} s={[0.6, 0.1, 1.0]} c={c} />)}
          {[-0.9, 0.9].map((x) => <Part key={x} p={[x, 0.85, -hd + 0.25]} s={[0.08, 1.7, 0.08]} c="#2e86de" />)}
          <Part p={[0, 0.85, -hd + 0.15]} s={[1.8, 1.0, 0.05]} c="#ff9f43" />
          <Bench x={0} z={-hd + 0.45} len={1.5} />
          {[-hw + 0.3, hw - 0.3].map((x) => (
            <group key={x}>
              <Part g="cyl" p={[x, 1.1, hd - 0.35]} s={[0.07, 2.2, 0.07]} r={[0, 0, x > 0 ? -0.12 : 0.12]} c="#8a5a2b" />
              <Part g="ico" p={[x * 0.95, 2.25, hd - 0.35]} s={[0.55, 0.18, 0.55]} c="#2f9e44" />
            </group>
          ))}
          <Trotro x={hw - 1.0} z={0.25} rot={Math.PI / 2} c="#4ecdc4" stripe="#fcd116" />
        </>
      )
    case 'stop_teshie': // fish-market stop: drying racks, canoe, blue shelter
      return (
        <>
          <Part p={[0, 0.06, 0]} s={[w - 0.2, 0.1, d - 0.2]} c="#cdbb94" cast={false} />
          <Shed x={-hw / 2} z={-hd + 0.6} len={hw} depth={1.0} h={1.8} roof="#1f6f8b" post="#6b4423" />
          <Bench x={-hw / 2} z={-hd + 0.5} len={hw - 0.4} />
          {[0.6, 1.5, 2.4].filter((x) => x < hw - 0.3).map((x) => (
            <group key={x}>
              <Part p={[x, 0.65, -0.2]} s={[0.7, 0.05, 1.0]} c="#6b4423" />
              {[-0.3, 0, 0.3].map((z) => <Part key={z} p={[x, 0.71, -0.2 + z]} s={[0.5, 0.04, 0.12]} c="#9aa4ae" cast={false} />)}
              <Part p={[x, 0.32, -0.2]} s={[0.05, 0.64, 0.9]} c="#4a3220" />
            </group>
          ))}
          <group position={[-hw / 2, 0.15, hd - 0.4]} rotation={[0, Math.PI / 2, 0]}>
            <Part p={[0, 0.12, 0]} s={[0.5, 0.25, Math.min(2.4, w - 1.2)]} c="#e0524a" />
            <Part p={[0, 0.25, 0]} s={[0.38, 0.05, Math.min(2.2, w - 1.4)]} c="#fcd116" />
          </group>
          <Trotro x={hw - 0.6} z={hd - 0.9} rot={0} c="#f0ede6" stripe="#1f6f8b" />
        </>
      )
    default: // Nima: small roadside shelter, top-up kiosk and benches
      return (
        <>
          <Part p={[0, 0.06, 0]} s={[w - 0.2, 0.1, d - 0.2]} c="#cfc8b8" cast={false} />
          <Part p={[-0.3, 1.9, -hd + 0.55]} s={[w - 1.2, 0.07, 1.0]} r={[0.12, 0, 0]} c="#9e9e9e" />
          {[-hw + 0.3, hw - 1.2].map((x) => <Part key={x} p={[x, 0.95, -hd + 0.2]} s={[0.06, 1.9, 0.06]} c="#4a4a4a" />)}
          <Bench x={-0.3} z={-hd + 0.4} len={w - 1.6} />
          <Kiosk x={hw - 0.4} z={-hd + 0.4} c="#fcd116" roof="#2e86de" />
          <Bench x={-hw + 0.8} z={hd - 0.3} len={0.9} />
          <Trotro x={0.2} z={0.35} rot={Math.PI / 2} c="#f0ede6" stripe="#2e86de" />
        </>
      )
  }
}

export function Mine({ w, d }: MP) {
  return (
    <>
      <Part p={[0, 0.05, 0]} s={[w - 0.1, 0.06, d - 0.1]} c="#7d5130" cast={false} />
      {[[-1.5, -0.8, 1.6], [1.2, 0.6, 1.2], [-0.2, 1.4, 0.9]].map(([x, z, r], i) => <Part key={i} g="cyl" p={[x, 0.09, z]} s={[r, 0.04, r]} c={i === 1 ? '#9a6b3a' : '#3d2a1a'} cast={false} />)}
      {[[-2, 1.5], [2, -1.6], [0.5, -1.8]].map(([x, z], i) => <Part key={i} g="sphere" p={[x, 0.3, z]} s={[0.9, 0.5, 0.7]} c="#a87a4a" />)}
      <group position={[1.8, 0, 0.8]} rotation={[0, 0.6, 0]}>
        <Part p={[0, 0.3, 0]} s={[1.1, 0.3, 0.8]} c="#2b2b2b" />
        <Part p={[0, 0.65, 0]} s={[0.9, 0.5, 0.7]} c="#f1b82d" />
        <Part p={[-0.85, 0.85, 0]} r={[0, 0, 0.6]} s={[1.1, 0.14, 0.14]} c="#f1b82d" />
      </group>
      <Part p={[-1.8, 1.0, -1.5]} s={[1.4, 0.04, 1.0]} c="#2e86de" />
      {[[-2.4, -1.9], [-1.2, -1.9], [-2.4, -1.1], [-1.2, -1.1]].map(([x, z], i) => <Part key={i} g="cyl" p={[x, 0.5, z]} s={[0.05, 1, 0.05]} c="#6b4423" />)}
    </>
  )
}

export function Cafe({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.6
  return (
    <>
      <Part p={[0, 1.0, -0.2]} s={[bw, 2.0, bd]} c={color} />
      <Part p={[0, 2.05, -0.2]} s={[bw + 0.2, 0.12, bd + 0.2]} c="#7d6b5d" />
      <Part p={[0, 1.65, bd / 2 - 0.15]} s={[bw - 0.4, 0.45, 0.06]} c={accent} />
      <Part p={[-bw / 4, 0.95, bd / 2 - 0.17]} s={[bw / 2.6, 0.8, 0.04]} m={windowMat} cast={false} />
      <Door x={doorX} z={bd / 2 - 0.2} w={0.8} h={1.4} c="#2a3a55" />
      <Part p={[bw / 2 - 0.5, 0.6, bd / 2 + 0.4]} s={[0.7, 1.2, 0.1]} c="#fcd116" />
      <Part g="cyl" p={[bw / 2 - 0.3, 2.4, -0.4]} s={[0.04, 0.8, 0.04]} c="#999" />
      <Part p={[bw / 2 - 0.3, 2.8, -0.4]} s={[0.5, 0.05, 0.05]} c="#999" />
    </>
  )
}

/** Tema Port: quay, gantry cranes, container stacks and a warehouse (inside its footprint). */
export function TemaPort({ w, d }: MP) {
  const crane = useRef<THREE.Group>(null)
  useFrame((st) => {
    if (crane.current) crane.current.position.x = Math.sin(st.clock.elapsedTime * 0.3) * 1.2
  })
  const colors = ['#e0524a', '#2e86de', '#2fa866', '#f1b82d', '#8e5bd0', '#ee7d2d']
  const stacks: React.ReactNode[] = []
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      const h = 1 + ((r * 5 + c * 3) % 3)
      for (let k = 0; k < h; k++) stacks.push(<Part key={`${r}${c}${k}`} p={[-w / 2 + 1.2 + c * 1.35, 0.35 + k * 0.6, -d / 2 + 1.2 + r * 0.75]} s={[1.2, 0.56, 0.62]} c={colors[(r * 4 + c + k) % colors.length]} />)
    }
  return (
    <>
      <Part p={[0, 0.06, 0]} s={[w - 0.1, 0.1, d - 0.1]} c="#8f969e" cast={false} />
      {/* quay edge on the sea side (south) */}
      <Part p={[0, 0.2, d / 2 - 0.3]} s={[w - 0.2, 0.3, 0.4]} c="#5a6170" />
      {[-w / 2 + 1, 0, w / 2 - 1].map((x) => <Part key={x} g="cyl" p={[x, 0.45, d / 2 - 0.3]} s={[0.12, 0.2, 0.12]} c="#222" />)}
      {stacks}
      {/* two gantry cranes */}
      <group ref={crane} userData={{ noMerge: true }}>
        {[-w / 4, w / 4].map((x) => (
          <group key={x} position={[x, 0, d / 2 - 1.4]}>
            {[-0.7, 0.7].map((dx) => [-0.5, 0.5].map((dz) => <Part key={`${dx}${dz}`} p={[dx, 2.2, dz]} s={[0.14, 4.4, 0.14]} c="#e0524a" />))}
            <Part p={[0, 4.4, 0.2]} s={[1.7, 0.22, 2.6]} c="#e0524a" />
            <Part p={[0, 4.2, 1.3]} s={[0.4, 0.3, 0.4]} c="#f4f1ea" />
            <Part p={[0, 3.2, 1.2]} s={[0.03, 2.0, 0.03]} c="#333" />
          </group>
        ))}
      </group>
      {/* warehouse and sign */}
      <Part p={[w / 2 - 1.6, 1.0, -d / 2 + 1.6]} s={[2.6, 2.0, 2.8]} c="#c9d1d9" />
      <Part p={[w / 2 - 1.6, 2.1, -d / 2 + 1.6]} s={[2.8, 0.2, 3.0]} c="#2e5f8a" />
      <Part p={[w / 2 - 1.6, 1.5, -d / 2 + 3.02]} s={[2.0, 0.4, 0.04]} c="#2e5f8a" cast={false} />
      <Part p={[w / 2 - 1.6, 1.5, -d / 2 + 3.05]} s={[1.8, 0.2, 0.02]} c="#ffffff" cast={false} />
    </>
  )
}

export function Harbour({ w, d }: MP) {
  return (
    <>
      <Part p={[0, 0.07, 0]} s={[w - 0.1, 0.1, d - 0.1]} c="#7a5634" cast={false} />
      {[[-1, -0.6], [-0.4, -0.6], [-0.7, 0.0]].map(([x, z], i) => <Part key={i} p={[x, 0.42, z]} s={[0.5, 0.5, 0.5]} c={i % 2 ? '#8a6a3f' : '#a07a4a'} />)}
      <Part g="cyl" p={[0.9, 0.4, -0.5]} s={[0.25, 0.7, 0.25]} c="#2e5f8a" />
      <Part g="cyl" p={[1.4, 1.2, 0.6]} s={[0.08, 2.4, 0.08]} c="#ffffff" />
      <Part p={[1.4, 2.3, 0.6]} s={[0.3, 0.2, 0.05]} c="#2a9d8f" />
      <group position={[0.3, 0.15, 0.9]} rotation={[0, 0.2, 0]}>
        <Part p={[0, 0.12, 0]} s={[2.6, 0.28, 0.6]} c="#2fa866" />
        <Part p={[0, 0.25, 0]} s={[2.4, 0.06, 0.45]} c="#f1b82d" />
      </group>
    </>
  )
}

export function Zoo({ w, d, color, accent }: MP) {
  const posts: React.ReactNode[] = []
  for (let x = -w / 2; x <= w / 2; x += 0.8) {
    posts.push(<Part key={`a${x}`} p={[x, 0.45, -d / 2 + 0.1]} s={[0.06, 0.9, 0.06]} c={accent} />)
    posts.push(<Part key={`b${x}`} p={[x, 0.45, d / 2 - 0.1]} s={[0.06, 0.9, 0.06]} c={accent} />)
  }
  return (
    <>
      <Part p={[0, 0.06, 0]} s={[w - 0.1, 0.08, d - 0.1]} c={color} cast={false} />
      {posts}
      {[[-2, -1.5], [1.5, -2], [2.5, 1], [-2.5, 1.5]].map(([x, z], i) => (
        <group key={i}><Part g="cyl" p={[x, 0.6, z]} s={[0.1, 1.2, 0.1]} c="#7a4e2d" /><Part g="ico" p={[x, 1.5, z]} s={0.7} c="#3f9f4a" /></group>
      ))}
      {/* giraffe */}
      <group position={[0, 0, 0]}>
        <Part p={[0, 1.0, 0]} s={[0.5, 0.45, 0.9]} c="#e1a95f" />
        <Part p={[0, 1.8, 0.4]} s={[0.15, 1.3, 0.15]} r={[0.25, 0, 0]} c="#e1a95f" />
        <Part p={[0, 2.45, 0.6]} s={[0.2, 0.2, 0.35]} c="#e1a95f" />
        {[[0.18, 0.3], [-0.18, 0.3], [0.18, -0.3], [-0.18, -0.3]].map(([x, z], i) => <Part key={i} p={[x, 0.4, z]} s={[0.08, 0.8, 0.08]} c="#c48a45" />)}
      </group>
      <Part p={[0, 1.4, d / 2 - 0.1]} s={[2.2, 0.5, 0.1]} c={accent} />
    </>
  )
}

export function GovOffice({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  const bd = d - 0.4
  return (
    <>
      <Part p={[0, 1.6, 0]} s={[bw, 3.2, bd]} c={color} />
      <Part p={[0, 3.3, 0]} s={[bw + 0.3, 0.2, bd + 0.3]} c={accent} />
      <Windows bw={bw} bd={bd} rows={2} cols={4} y0={1.1} dy={1.3} doorX={doorX} />
      <Door x={doorX} z={bd / 2} w={1} h={1.6} c="#3a2a22" />
      <Part p={[doorX, 2.3, bd / 2 + 0.05]} s={[2, 0.35, 0.05]} c="#ffffff" cast={false} />
      <Part g="cyl" p={[-bw / 2 + 0.3, 2.2, bd / 2 + 0.4]} s={[0.04, 4.4, 0.04]} c="#cfd8dc" />
      <group position={[-bw / 2 + 0.75, 4.0, bd / 2 + 0.4]}>
        <Part p={[0, 0.2, 0]} s={[0.8, 0.18, 0.03]} c="#ce1126" cast={false} />
        <Part p={[0, 0.02, 0]} s={[0.8, 0.18, 0.03]} c="#fcd116" cast={false} />
        <Part p={[0, -0.16, 0]} s={[0.8, 0.18, 0.03]} c="#006b3f" cast={false} />
      </group>
      {[1, 2, 3].map((i) => <Part key={i} p={[doorX + 1.2 + i * 0.4, 0.55, bd / 2 + 0.6]} s={[0.22, 1.1, 0.22]} c={['#2e86de', '#e0524a', '#f1b82d'][i - 1]} />)}
    </>
  )
}

export function Dealer({ w, d, color, accent, doorX }: MP) {
  const bw = w - 0.4
  return (
    <>
      <Part p={[0, 0.06, 0]} s={[w - 0.1, 0.08, d - 0.1]} c="#9aa4ae" />
      <Part p={[0, 1.5, -d / 2 + 1.6]} s={[bw, 3, 2.8]} c={color} />
      <Part p={[0, 1.4, -d / 2 + 3.02]} s={[bw - 0.6, 2.2, 0.05]} c="#9fd3f0" m={windowMat} cast={false} />
      <Part p={[0, 3.1, -d / 2 + 1.6]} s={[bw + 0.3, 0.3, 3.2]} c={accent} />
      <Door x={doorX} z={-d / 2 + 3.0} w={1.4} h={1.8} c="#bfe5f5" />
      {[[-2.6, 1.2, '#e0524a'], [-0.4, 1.4, '#2e86de'], [2.2, 1.2, '#f1b82d']].map(([x, z, c], i) => (
        <group key={i} position={[x as number, 0.08, z as number]} rotation={[0, 0.4, 0]}>
          <Part p={[0, 0.35, 0]} s={[0.78, 0.4, 1.7]} c={c as string} />
          <Part p={[0, 0.7, -0.1]} s={[0.68, 0.32, 0.9]} c={c as string} />
        </group>
      ))}
      {[-1.6, 3.6].map((x) => (
        <group key={x} position={[x, 0.08, -0.4]} rotation={[0, -0.3, 0]}>
          <Part p={[0, 0.38, 0]} s={[0.16, 0.18, 0.7]} c="#e0524a" />
          <Part g="cyl" p={[0, 0.2, 0.42]} s={[0.2, 0.06, 0.2]} r={[0, 0, Math.PI / 2]} c="#1b1b1b" />
          <Part g="cyl" p={[0, 0.2, -0.42]} s={[0.2, 0.06, 0.2]} r={[0, 0, Math.PI / 2]} c="#1b1b1b" />
        </group>
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <Part key={i} g="cone" p={[-bw / 2 + i * (bw / 7), 3.6, -d / 2 + 3.1]} s={[0.12, 0.3, 0.12]} r={[Math.PI, 0, 0]} c={['#ce1126', '#fcd116', '#006b3f'][i % 3]} />
      ))}
    </>
  )
}
