'use client'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { FURNITURE, HOMES, isBed } from '@/game/content'
import { PAINTS, canPlace, extCount, footprint, homeLayout, itemsInHome, type HomeItem, nextRot } from '@/game/home'
import { keyVector, runtime } from '@/game/runtime'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import type { FurnitureType, HomeTier } from '@/game/types'
import { DEFAULT_APPEARANCE } from '@/game/content'
import { Character, type Motion, type Pose, type Prop } from './Character'
import { furnitureUse } from './poses'
import { Merged, Part, Walls, actionFocus, bulbMat, windowMat, type WallSkin } from './shared'
import { Label } from './Label'
import { PetFollower } from './PetFollower'

export const INTERIOR_ORIGIN = new THREE.Vector3(300, 0, 300)
const NONE: string[] = []

function Bed({ w, d, kind }: { w: number; d: number; kind: FurnitureType }) {
  const color = kind === 'bed_basic' ? '#9db8d9' : kind === 'bed_comfy' ? '#e9a86f' : kind === 'bed_king' ? '#7e5bb0' : '#6aa8d8'
  if (kind === 'bed_luxury') return <CanopyBed w={w} d={d} />
  return (
    <>
      <Part p={[0, 0.15, 0]} s={[w - 0.08, 0.25, d - 0.08]} c={kind === 'bed_basic' ? '#a77b52' : '#7a4e2d'} />
      <Part p={[0, 0.33, 0]} s={[w - 0.2, 0.2, d - 0.2]} c="#f4f1ea" />
      <Part p={[0.25, 0.45, 0]} s={[w - 0.8, 0.08, d - 0.18]} c={color} />
      <Part p={[-w / 2 + 0.3, 0.46, d > 1.5 ? -0.4 : 0]} s={[0.4, 0.12, 0.5]} c="#ffffff" />
      {d > 1.5 && <Part p={[-w / 2 + 0.3, 0.46, 0.4]} s={[0.4, 0.12, 0.5]} c="#ffffff" />}
      {kind !== 'bed_basic' && <Part p={[-w / 2 + 0.04, 0.6, 0]} s={[0.08, 0.7, d - 0.04]} c="#5b3a29" />}
    </>
  )
}

const GOLD = '#d4af37'
const WALNUT = '#5a3a22'
const MARBLE = '#f1efea'

function CanopyBed({ w, d }: { w: number; d: number }) {
  const hx = w / 2 - 0.08
  const hz = d / 2 - 0.08
  return (
    <>
      <Part p={[0, 0.18, 0]} s={[w - 0.06, 0.3, d - 0.06]} c={WALNUT} rough={0.4} />
      <Part p={[0.05, 0.4, 0]} s={[w - 0.3, 0.22, d - 0.22]} c="#fbf8f2" />
      <Part p={[0.3, 0.53, 0]} s={[w - 0.85, 0.07, d - 0.2]} c="#efe2c4" />
      <Part p={[0.3, 0.57, 0]} s={[0.25, 0.02, d - 0.18]} c={GOLD} rough={0.35} />
      {[-0.45, 0, 0.45].map((z) => <Part key={z} p={[-w / 2 + 0.38, 0.6, z]} s={[0.32, 0.16, 0.38]} c={z === 0 ? '#c9a24a' : '#ffffff'} />)}
      <Part p={[-w / 2 + 0.06, 0.9, 0]} s={[0.12, 1.2, d - 0.1]} c="#3e2a1d" rough={0.4} />
      <Part p={[-w / 2 + 0.13, 0.95, 0]} s={[0.03, 0.9, d - 0.4]} c="#e9dcc0" />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <group key={i}>
          <Part g="cyl" p={[sx * hx, 1.15, sz * hz]} s={[0.05, 2.3, 0.05]} c={WALNUT} rough={0.4} />
          <Part g="sphere" p={[sx * hx, 2.33, sz * hz]} s={0.07} c={GOLD} rough={0.35} />
        </group>
      ))}
      <Part p={[0, 2.28, hz]} s={[w - 0.1, 0.06, 0.06]} c={WALNUT} />
      <Part p={[0, 2.28, -hz]} s={[w - 0.1, 0.06, 0.06]} c={WALNUT} />
      <Part p={[hx, 2.28, 0]} s={[0.06, 0.06, d - 0.1]} c={WALNUT} />
      <Part p={[-hx, 2.28, 0]} s={[0.06, 0.06, d - 0.1]} c={WALNUT} />
      <Part p={[0, 2.31, 0]} s={[w - 0.1, 0.02, d - 0.1]} c="#fff7e8" opacity={0.6} cast={false} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Part key={i} p={[sx * (hx - 0.1), 1.3, sz * (hz - 0.02)]} s={[0.22, 1.9, 0.05]} c="#f5ead6" opacity={0.75} cast={false} />
      ))}
    </>
  )
}

/** Glowing lamp shade that follows the night lighting. */
function Glow({ p, s }: { p: [number, number, number]; s: [number, number, number] | number }) {
  return <Part g="sphere" p={p} s={s} m={bulbMat} cast={false} />
}

function LuxuryModel({ type }: { type: FurnitureType }) {
  const fish = useRef<THREE.Group>(null)
  const bubbles = useRef<THREE.Group>(null)
  useFrame((st) => {
    const t = st.clock.elapsedTime
    if (fish.current) fish.current.children.forEach((c, i) => { c.position.x = Math.sin(t * (0.6 + i * 0.2) + i * 2) * 0.7 })
    if (bubbles.current) bubbles.current.children.forEach((c, i) => { c.position.y = 0.42 + ((t * 0.4 + i * 0.13) % 0.12) })
  })
  switch (type) {
    case 'armchair':
      return (
        <>
          <Part p={[0, 0.3, 0.05]} s={[0.78, 0.22, 0.7]} c="#1f6b52" />
          <Part p={[0, 0.66, -0.28]} s={[0.78, 0.6, 0.16]} c="#1a5c46" />
          <Part p={[-0.36, 0.5, 0.05]} s={[0.12, 0.3, 0.7]} c="#17523f" />
          <Part p={[0.36, 0.5, 0.05]} s={[0.12, 0.3, 0.7]} c="#17523f" />
          {[[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.32], [0.3, 0.32]].map(([x, z], i) => <Part key={i} g="cyl" p={[x, 0.09, z]} s={[0.03, 0.18, 0.03]} c={GOLD} rough={0.35} />)}
        </>
      )
    case 'coffee_table':
      return (
        <>
          <Part p={[0, 0.4, 0]} s={[1.5, 0.05, 0.7]} c={MARBLE} rough={0.25} />
          <Part p={[0.3, 0.405, 0.1]} s={[0.6, 0.051, 0.02]} c="#c9c4ba" cast={false} />
          <Part p={[0, 0.2, 0]} s={[1.3, 0.03, 0.55]} c={GOLD} rough={0.35} />
          {[[-0.68, -0.3], [0.68, -0.3], [-0.68, 0.3], [0.68, 0.3]].map(([x, z], i) => <Part key={i} p={[x, 0.2, z]} s={[0.03, 0.38, 0.03]} c={GOLD} rough={0.35} />)}
          <Part g="cyl" p={[-0.35, 0.5, 0]} s={[0.08, 0.15, 0.08]} c="#2b3a55" />
          <Part p={[0.35, 0.45, -0.05]} s={[0.3, 0.05, 0.22]} c="#c0392b" />
        </>
      )
    case 'sectional': {
      const leather = '#3b2a20'
      return (
        <>
          <Part p={[0, 0.2, -0.45]} s={[2.9, 0.34, 0.95]} c={leather} rough={0.5} />
          <Part p={[0.98, 0.2, 0.45]} s={[0.95, 0.34, 0.95]} c={leather} rough={0.5} />
          <Part p={[0, 0.62, -0.88]} s={[2.9, 0.55, 0.2]} c="#2f2119" rough={0.5} />
          <Part p={[1.38, 0.62, 0.1]} s={[0.2, 0.55, 1.7]} c="#2f2119" rough={0.5} />
          <Part p={[-1.4, 0.45, -0.45]} s={[0.12, 0.38, 0.95]} c="#2f2119" rough={0.5} />
          {[-1.0, -0.2, 0.6].map((x) => <Part key={x} p={[x, 0.4, -0.45]} s={[0.75, 0.08, 0.8]} c="#4a3529" rough={0.45} />)}
          <Part p={[-0.9, 0.55, -0.7]} s={[0.4, 0.3, 0.12]} c={GOLD} r={[0.2, 0, 0]} />
          <Part p={[0.9, 0.55, -0.7]} s={[0.4, 0.3, 0.12]} c="#f4ecd8" r={[0.2, 0, 0]} />
          {[-1.38, 1.38].map((x) => <Part key={x} p={[x, 0.02, 0.9]} s={[0.04, 0.04, 0.04]} c={GOLD} />)}
        </>
      )
    }
    case 'rug':
      return (
        <>
          <Part p={[0, 0.005, 0]} s={[1.9, 0.02, 1.9]} c="#7b1e2b" cast={false} />
          <Part p={[0, 0.012, 0]} s={[1.6, 0.02, 1.6]} c="#1f3a5f" cast={false} />
          <Part p={[0, 0.018, 0]} s={[1.2, 0.02, 1.2]} c="#a8323e" cast={false} />
          <Part p={[0, 0.024, 0]} s={[0.55, 0.02, 0.55]} c="#e0b85a" r={[0, Math.PI / 4, 0]} cast={false} />
          {[-0.75, 0.75].map((x) => <Part key={x} p={[x, 0.022, 0]} s={[0.08, 0.02, 1.4]} c="#e0b85a" cast={false} />)}
        </>
      )
    case 'floor_lamp':
      return (
        <>
          <Part g="cyl" p={[0, 0.03, -0.25]} s={[0.2, 0.06, 0.2]} c="#20242b" rough={0.3} />
          <Part g="cyl" p={[0, 0.85, -0.25]} s={[0.025, 1.7, 0.025]} c={GOLD} rough={0.35} />
          <Part p={[0, 1.72, -0.02]} s={[0.025, 0.025, 0.5]} c={GOLD} rough={0.35} />
          <Part g="hemi" p={[0, 1.55, 0.22]} s={[0.22, 0.18, 0.22]} r={[0, 0, 0]} c="#f2e6c9" />
          <Glow p={[0, 1.55, 0.22]} s={0.08} />
          <pointLight position={[0, 1.4, 0.25]} intensity={1.6} distance={4} color="#ffd9a0" />
        </>
      )
    case 'dining_set':
      return (
        <>
          <Part p={[0, 0.74, 0]} s={[1.5, 0.06, 0.95]} c={WALNUT} rough={0.35} />
          {[[-0.65, -0.38], [0.65, -0.38], [-0.65, 0.38], [0.65, 0.38]].map(([x, z], i) => <Part key={i} p={[x, 0.37, z]} s={[0.07, 0.72, 0.07]} c="#3e2a1d" />)}
          <Part p={[0, 0.775, 0]} s={[1.2, 0.01, 0.3]} c="#e9dcc0" cast={false} />
          <Part g="cyl" p={[0, 0.88, 0]} s={[0.05, 0.22, 0.05]} c={GOLD} />
          <Glow p={[0, 1.01, 0]} s={0.03} />
          {[-0.45, 0, 0.45].flatMap((x) => [-1, 1].map((sz) => (
            <group key={`${x}${sz}`} position={[x, 0, sz * 0.72]} rotation={[0, sz > 0 ? Math.PI : 0, 0]}>
              <Part p={[0, 0.45, 0]} s={[0.4, 0.08, 0.38]} c="#d8c7a3" />
              <Part p={[0, 0.78, 0.18]} s={[0.4, 0.6, 0.06]} c="#cdb991" />
              <Part p={[0, 0.2, 0]} s={[0.32, 0.4, 0.3]} c="#3e2a1d" opacity={0.9} />
            </group>
          )))}
        </>
      )
    case 'wardrobe':
      return (
        <>
          <Part p={[0, 1.05, -0.05]} s={[1.9, 2.1, 0.6]} c="#efe9df" rough={0.4} />
          <Part p={[-0.48, 1.05, 0.26]} s={[0.88, 1.95, 0.02]} c="#cfe0ea" m={windowMat} cast={false} />
          <Part p={[0.48, 1.05, 0.26]} s={[0.88, 1.95, 0.02]} c="#d9cdb8" />
          {[-0.06, 0.06].map((x) => <Part key={x} p={[x, 1.05, 0.29]} s={[0.025, 0.5, 0.03]} c={GOLD} />)}
          <Part p={[0, 2.12, -0.05]} s={[1.95, 0.06, 0.64]} c={GOLD} rough={0.35} />
        </>
      )
    case 'vanity':
      return (
        <>
          <Part p={[0, 0.72, -0.15]} s={[0.9, 0.05, 0.45]} c="#fbf6ee" rough={0.3} />
          <Part p={[0, 0.48, -0.15]} s={[0.84, 0.42, 0.4]} c="#f0e3d0" />
          <Part p={[0, 1.25, -0.37]} s={[0.75, 0.95, 0.04]} c="#ffffff" rough={0.1} />
          <Part p={[0, 1.25, -0.35]} s={[0.62, 0.82, 0.02]} c="#cfe0ea" m={windowMat} cast={false} />
          {[0.95, 1.25, 1.55].flatMap((y) => [-0.34, 0.34].map((x) => <Glow key={`${x}${y}`} p={[x, y, -0.32]} s={0.04} />))}
          <Part g="cyl" p={[0, 0.25, 0.3]} s={[0.17, 0.05, 0.17]} c="#e9b8c4" />
          <Part g="cyl" p={[0, 0.12, 0.3]} s={[0.02, 0.24, 0.02]} c={GOLD} />
          <Part g="cyl" p={[0.25, 0.79, -0.1]} s={[0.04, 0.1, 0.04]} c="#e9b8c4" />
        </>
      )
    case 'espresso':
      return (
        <>
          <Part p={[0, 0.45, -0.1]} s={[0.85, 0.9, 0.6]} c="#2a2f36" rough={0.35} />
          <Part p={[0, 0.92, -0.1]} s={[0.9, 0.04, 0.65]} c={MARBLE} rough={0.25} />
          <Part p={[0, 1.13, -0.2]} s={[0.5, 0.38, 0.32]} c="#c7ccd2" rough={0.25} />
          <Part p={[0, 1.08, -0.02]} s={[0.36, 0.05, 0.06]} c="#20242b" />
          <Part g="cyl" p={[0, 0.98, 0.0]} s={[0.04, 0.07, 0.04]} c="#fff" />
          <Part g="cyl" p={[0.22, 1.36, -0.2]} s={[0.07, 0.07, 0.07]} c="#3b2a20" />
        </>
      )
    case 'kitchen_island':
      return (
        <>
          <Part p={[0, 0.44, 0]} s={[1.8, 0.86, 0.75]} c="#1f2a37" rough={0.4} />
          <Part p={[0, 0.9, 0]} s={[1.95, 0.06, 0.88]} c={MARBLE} rough={0.2} />
          <Part p={[-0.45, 0.935, 0]} s={[0.6, 0.01, 0.45]} c="#111" rough={0.15} cast={false} />
          {[[-0.6, -0.1], [-0.3, 0.1]].map(([x, z], i) => <Part key={i} g="cyl" p={[x, 0.94, z]} s={[0.1, 0.005, 0.1]} c="#ff5a2e" m={bulbMat} cast={false} />)}
          <Part g="cyl" p={[0.45, 0.98, -0.1]} s={[0.16, 0.1, 0.16]} c="#b0b8c4" rough={0.2} />
          <Part p={[0.5, 0.94, 0.2]} s={[0.35, 0.03, 0.22]} c="#a0703f" />
          {[-0.6, 0, 0.6].map((x) => <Part key={x} p={[x, 0.75, 0.39]} s={[0.4, 0.02, 0.02]} c={GOLD} />)}
          {[-0.5, 0.5].map((x) => (
            <group key={x}>
              <Part g="cyl" p={[x, 0.65, 0.75]} s={[0.17, 0.06, 0.17]} c="#2a2f36" />
              <Part g="cyl" p={[x, 0.32, 0.75]} s={[0.025, 0.62, 0.025]} c={GOLD} />
            </group>
          ))}
        </>
      )
    case 'bathtub':
      return (
        <>
          <Part p={[0, 0.32, 0]} s={[1.75, 0.5, 0.8]} c="#fbfbfb" rough={0.15} />
          <Part p={[0, 0.5, 0]} s={[1.55, 0.16, 0.6]} c="#9fd3ea" opacity={0.85} cast={false} />
          {[[-0.75, -0.3], [0.75, -0.3], [-0.75, 0.3], [0.75, 0.3]].map(([x, z], i) => <Part key={i} g="sphere" p={[x, 0.06, z]} s={0.07} c={GOLD} rough={0.35} />)}
          <Part g="cyl" p={[0.82, 0.75, 0]} s={[0.025, 0.5, 0.025]} c={GOLD} />
          <Part p={[0.72, 0.98, 0]} s={[0.2, 0.025, 0.025]} c={GOLD} />
          {[-0.4, -0.2, 0.1, 0.35].map((x, i) => <Part key={i} g="sphere" p={[x, 0.59, (i % 2 ? 0.12 : -0.1)]} s={0.08} c="#ffffff" />)}
        </>
      )
    case 'jacuzzi':
      return (
        <>
          <Part p={[0, 0.25, 0]} s={[1.95, 0.5, 1.95]} c="#e9e3d6" rough={0.3} />
          <Part p={[0, 0.51, 0]} s={[1.95, 0.04, 1.95]} c="#8a7a64" rough={0.3} />
          <Part p={[0, 0.4, 0]} s={[1.65, 0.2, 1.65]} c="#38b6e8" opacity={0.8} cast={false} />
          <Part p={[0, 0.31, 0]} s={[1.6, 0.02, 1.6]} c="#5fd0ff" m={windowMat} cast={false} />
          <group ref={bubbles} userData={{ noMerge: true }}>
            {Array.from({ length: 10 }, (_, i) => <Part key={i} g="sphere" p={[Math.cos(i * 2.4) * 0.6, 0.45, Math.sin(i * 2.4) * 0.6]} s={0.045} c="#ffffff" cast={false} />)}
          </group>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => <Glow key={i} p={[sx * 0.85, 0.53, sz * 0.85]} s={0.035} />)}
          <Part p={[0, 0.06, 1.05]} s={[1.2, 0.12, 0.2]} c="#8a7a64" />
          <pointLight position={[0, 0.8, 0]} intensity={1.2} distance={3.5} color="#7fd8ff" />
        </>
      )
    case 'orchid':
      return (
        <>
          <Part g="cyl" p={[0, 0.35, 0]} s={[0.22, 0.7, 0.22]} c={MARBLE} rough={0.25} />
          <Part g="cyl" p={[0, 0.82, 0]} s={[0.12, 0.24, 0.12]} c={GOLD} rough={0.35} />
          {[0, 1, 2].map((i) => <Part key={i} g="cyl" p={[Math.cos(i * 2.1) * 0.05, 1.15, Math.sin(i * 2.1) * 0.05]} s={[0.012, 0.45, 0.012]} r={[Math.sin(i * 2.1) * 0.25, 0, -Math.cos(i * 2.1) * 0.25]} c="#3e7d3a" />)}
          {[0, 1, 2, 3, 4, 5].map((i) => <Part key={i} g="sphere" p={[Math.cos(i * 1.05) * 0.12, 1.25 + (i % 3) * 0.08, Math.sin(i * 1.05) * 0.12]} s={0.055} c={i % 2 ? '#f7d6e8' : '#e88cc0'} />)}
          {[-1, 1].map((x) => <Part key={x} p={[x * 0.1, 0.96, 0]} s={[0.2, 0.02, 0.08]} r={[0, 0, x * 0.3]} c="#2f6b33" />)}
        </>
      )
    case 'gold_mirror':
      return (
        <>
          <Part p={[0, 1.0, -0.3]} s={[0.8, 1.9, 0.08]} c={GOLD} rough={0.3} />
          <Part p={[0, 1.0, -0.25]} s={[0.62, 1.7, 0.02]} c="#dfeef5" m={windowMat} cast={false} />
          <Part g="sphere" p={[0, 2.0, -0.3]} s={[0.18, 0.12, 0.05]} c={GOLD} rough={0.3} />
          <Part p={[0, 0.05, -0.1]} s={[0.6, 0.06, 0.4]} c={GOLD} rough={0.3} />
        </>
      )
    case 'sculpture':
      return (
        <>
          <Part p={[0, 0.45, 0]} s={[0.45, 0.9, 0.45]} c={MARBLE} rough={0.25} />
          <Part p={[0, 0.92, 0]} s={[0.5, 0.04, 0.5]} c="#c9c4ba" />
          <Part g="sphere" p={[0, 1.18, 0]} s={[0.13, 0.22, 0.11]} c="#8c5a2b" rough={0.35} />
          <Part g="sphere" p={[0, 1.48, 0]} s={[0.09, 0.12, 0.09]} c="#8c5a2b" rough={0.35} />
          <Part g="torus" p={[0, 1.33, 0]} s={[0.11, 0.11, 0.11]} r={[Math.PI / 2, 0, 0]} c={GOLD} />
          <Part g="cone" p={[0, 1.63, 0]} s={[0.08, 0.14, 0.08]} c="#8c5a2b" rough={0.35} />
        </>
      )
    case 'aquarium':
      return (
        <>
          <Part p={[0, 0.35, 0]} s={[1.85, 0.7, 0.7]} c="#1b1f26" rough={0.35} />
          <Part p={[0, 1.08, 0]} s={[1.8, 0.75, 0.62]} c="#5fc9f0" opacity={0.45} cast={false} />
          <Part p={[0, 0.74, 0]} s={[1.75, 0.04, 0.58]} c="#e6d3a3" cast={false} />
          <Part p={[0, 1.48, 0]} s={[1.85, 0.06, 0.7]} c="#1b1f26" />
          <Glow p={[0, 1.44, 0]} s={[0.8, 0.02, 0.2]} />
          {[-0.6, -0.1, 0.5].map((x, i) => <Part key={i} g="cone" p={[x, 0.95, -0.1 + i * 0.08]} s={[0.05, 0.35 + i * 0.1, 0.05]} c="#2fa866" cast={false} />)}
          <Part g="ico" p={[0.2, 0.82, 0.1]} s={0.1} c="#e86a5f" cast={false} />
          <group ref={fish} userData={{ noMerge: true }}>
            {['#ff8c1a', '#ffd23f', '#2e86de', '#ff5a8a'].map((c, i) => <Part key={i} g="sphere" p={[0, 0.9 + i * 0.12, -0.15 + (i % 2) * 0.25]} s={[0.07, 0.045, 0.025]} c={c} cast={false} />)}
          </group>
          <pointLight position={[0, 1.2, 0.5]} intensity={0.8} distance={3} color="#6fd0ff" />
        </>
      )
    case 'bar_cabinet':
      return (
        <>
          <Part p={[0, 0.5, -0.1]} s={[1.9, 1.0, 0.55]} c="#2a1c14" rough={0.35} />
          <Part p={[0, 1.02, -0.1]} s={[1.95, 0.05, 0.6]} c={MARBLE} rough={0.2} />
          <Part p={[0, 1.55, -0.33]} s={[1.9, 1.0, 0.1]} c="#1a120d" />
          {[1.25, 1.65].map((y) => <Part key={y} p={[0, y, -0.25]} s={[1.8, 0.03, 0.18]} c={GOLD} rough={0.35} />)}
          <Glow p={[0, 2.03, -0.25]} s={[0.85, 0.02, 0.05]} />
          {[1.27, 1.67].flatMap((y) => [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].map((x, i) => (
            <Part key={`${x}${y}`} g="cyl" p={[x, y + 0.13, -0.25]} s={[0.05, 0.24, 0.05]} c={['#2e7d32', '#6d4c41', '#f9a825', '#b71c1c', '#ecf0f1', '#4a148c'][(i + (y > 1.5 ? 2 : 0)) % 6]} rough={0.2} />
          )))}
          {[-0.5, 0.5].map((x) => <Part key={x} p={[x, 0.55, 0.18]} s={[0.8, 0.85, 0.02]} c="#3a2618" />)}
          {[-0.12, 0.12].map((x) => <Part key={x} p={[x, 0.6, 0.2]} s={[0.025, 0.3, 0.03]} c={GOLD} />)}
          <Part g="cone" p={[0.6, 1.12, 0]} s={[0.05, 0.12, 0.05]} r={[Math.PI, 0, 0]} c="#ffffff" opacity={0.6} />
        </>
      )
    case 'piano':
      return (
        <>
          <Part p={[-0.2, 0.82, -0.1]} s={[1.3, 0.3, 1.5]} c="#0c0c0e" rough={0.12} />
          <Part p={[0.55, 0.82, -0.35]} s={[0.6, 0.3, 1.0]} c="#0c0c0e" rough={0.12} />
          <Part p={[-0.05, 1.25, -0.35]} s={[1.3, 0.03, 1.2]} r={[0.6, 0, 0]} c="#0c0c0e" rough={0.12} />
          <Part p={[0, 0.72, 0.7]} s={[1.45, 0.06, 0.22]} c="#f8f8f4" />
          {Array.from({ length: 12 }, (_, i) => <Part key={i} p={[-0.62 + i * 0.115, 0.765, 0.65]} s={[0.05, 0.03, 0.12]} c="#0c0c0e" />)}
          {[[-0.75, -0.7], [0.7, -0.7], [-0.75, 0.55]].map(([x, z], i) => <Part key={i} g="cyl" p={[x, 0.35, z]} s={[0.05, 0.7, 0.05]} c="#0c0c0e" />)}
          <Part p={[0, 0.45, 0.95]} s={[0.7, 0.08, 0.3]} c="#0c0c0e" rough={0.12} />
          <Part p={[0, 0.95, 0.62]} s={[0.5, 0.25, 0.02]} c="#f4ecd8" r={[-0.2, 0, 0]} />
        </>
      )
    case 'console':
      return (
        <>
          <Part p={[0, 0.22, -0.15]} s={[0.9, 0.44, 0.5]} c="#1b1f26" />
          <Part p={[0, 0.5, -0.2]} s={[0.12, 0.3, 0.3]} c="#f4f4f4" rough={0.2} />
          <Part p={[0.04, 0.5, -0.2]} s={[0.01, 0.28, 0.2]} c="#3a7bff" m={windowMat} cast={false} />
          {[-0.25, 0.25].map((x) => <Part key={x} p={[x, 0.46, 0.0]} s={[0.16, 0.04, 0.1]} c="#2b2b2b" />)}
          <Part g="sphere" p={[0, 0.25, 0.3]} s={[0.28, 0.2, 0.28]} c="#c0392b" />
        </>
      )
    case 'home_cinema':
      return (
        <>
          <Part p={[0, 0.2, -0.15]} s={[2.9, 0.4, 0.5]} c="#1b1f26" rough={0.3} />
          <Part p={[0, 0.41, -0.15]} s={[2.9, 0.02, 0.5]} c={GOLD} rough={0.35} />
          <Part p={[0, 1.35, -0.38]} s={[2.8, 1.5, 0.06]} c="#0a0a0c" rough={0.15} />
          <Part p={[0, 1.35, -0.34]} s={[2.68, 1.38, 0.02]} c="#4aa3ff" m={windowMat} cast={false} />
          {[-1.35, 1.35].map((x) => (
            <group key={x}>
              <Part p={[x, 0.6, 0.05]} s={[0.22, 1.2, 0.26]} c="#20242b" />
              {[0.4, 0.75, 1.05].map((y) => <Part key={y} g="cyl" p={[x, y, 0.19]} s={[0.07, 0.01, 0.07]} r={[Math.PI / 2, 0, 0]} c="#555" />)}
            </group>
          ))}
          <Part p={[0, 0.47, -0.1]} s={[1.0, 0.1, 0.2]} c="#20242b" />
          <Glow p={[0, 0.02, -0.4]} s={[1.4, 0.01, 0.02]} />
        </>
      )
    case 'treadmill':
      return (
        <>
          <Part p={[0, 0.1, 0.15]} s={[0.75, 0.16, 1.6]} c="#2a2f36" />
          <Part p={[0, 0.19, 0.2]} s={[0.55, 0.02, 1.4]} c="#111" cast={false} />
          {[-0.35, 0.35].map((x) => <Part key={x} p={[x, 0.65, -0.55]} s={[0.05, 1.1, 0.05]} c="#b0b8c4" r={[0.15, 0, 0]} />)}
          <Part p={[0, 1.2, -0.62]} s={[0.75, 0.05, 0.25]} c="#b0b8c4" />
          <Part p={[0, 1.3, -0.65]} s={[0.4, 0.25, 0.05]} c="#1b2433" r={[-0.4, 0, 0]} />
          <Part p={[0, 1.31, -0.63]} s={[0.34, 0.2, 0.01]} c="#35d07f" m={windowMat} r={[-0.4, 0, 0]} cast={false} />
        </>
      )
    case 'massage_chair':
      return (
        <>
          <Part p={[0, 0.22, 0.05]} s={[0.8, 0.3, 0.6]} c="#20242b" />
          <Part p={[0, 0.48, 0.05]} s={[0.66, 0.18, 0.6]} c="#3a3f47" rough={0.45} />
          <Part p={[0, 0.85, -0.25]} s={[0.66, 0.85, 0.22]} r={[-0.35, 0, 0]} c="#3a3f47" rough={0.45} />
          <Part p={[0, 0.25, 0.48]} s={[0.5, 0.35, 0.2]} r={[0.4, 0, 0]} c="#3a3f47" rough={0.45} />
          {[-0.38, 0.38].map((x) => <Part key={x} p={[x, 0.55, 0.0]} s={[0.12, 0.3, 0.7]} c="#20242b" />)}
          {[-0.38, 0.38].map((x) => <Part key={x} p={[x, 0.71, 0.05]} s={[0.1, 0.02, 0.5]} c={GOLD} />)}
          <Glow p={[0.38, 0.72, 0.3]} s={0.025} />
        </>
      )
    default:
      return null
  }
}

const LUXURY_MODELS = new Set<FurnitureType>(['armchair', 'coffee_table', 'sectional', 'rug', 'floor_lamp', 'dining_set', 'wardrobe', 'vanity', 'espresso', 'kitchen_island', 'bathtub', 'jacuzzi', 'orchid', 'gold_mirror', 'sculpture', 'aquarium', 'bar_cabinet', 'piano', 'console', 'home_cinema', 'treadmill', 'massage_chair'])

export function FurnitureModel({ type }: { type: FurnitureType }) {
  const f = FURNITURE[type]
  const fan = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (fan.current) fan.current.rotation.z += dt * 12
  })
  if (isBed(type)) return <Bed w={f.w} d={f.d} kind={type} />
  if (f.build) return <WallPiece type={type} w={f.w} />
  if (LUXURY_MODELS.has(type)) return <LuxuryModel type={type} />
  switch (type) {
    case 'toilet':
      return (
        <>
          <Part p={[0, 0.2, 0.05]} s={[0.4, 0.4, 0.45]} c="#f7f7f7" />
          <Part p={[0, 0.55, -0.25]} s={[0.4, 0.5, 0.14]} c="#f0f0f0" />
          <Part p={[0, 0.42, 0.05]} s={[0.36, 0.05, 0.4]} c="#dfe8ee" />
        </>
      )
    case 'shower':
    case 'shower_rain':
      return (
        <>
          <Part p={[0, 0.04, 0]} s={[0.9, 0.08, 0.9]} c="#cfd8dc" />
          <Part p={[0.44, 0.9, 0]} s={[0.04, 1.8, 0.9]} c="#bfe5f5" opacity={0.35} />
          <Part p={[0, 0.9, 0.44]} s={[0.9, 1.8, 0.04]} c="#bfe5f5" opacity={0.35} />
          <Part g="cyl" p={[-0.4, 1.0, -0.4]} s={[0.03, 2, 0.03]} c="#b0b8c4" />
          {type === 'shower_rain' ? <Part g="cyl" p={[-0.2, 1.95, -0.2]} s={[0.3, 0.03, 0.3]} c="#b0b8c4" /> : <Part p={[-0.3, 1.8, -0.3]} s={[0.2, 0.08, 0.2]} c="#b0b8c4" />}
        </>
      )
    case 'fridge':
      return (
        <>
          <Part p={[0, 0.8, 0]} s={[0.72, 1.6, 0.7]} c="#f2f4f6" />
          <Part p={[0, 1.1, 0.36]} s={[0.66, 0.02, 0.02]} c="#9aa4ae" />
          <Part p={[0.28, 1.3, 0.37]} s={[0.04, 0.3, 0.04]} c="#7b8794" />
          <Part p={[0.28, 0.6, 0.37]} s={[0.04, 0.4, 0.04]} c="#7b8794" />
        </>
      )
    case 'sofa':
      return (
        <>
          <Part p={[0, 0.22, 0.05]} s={[1.9, 0.4, 0.8]} c="#d4684f" />
          <Part p={[0, 0.6, -0.3]} s={[1.9, 0.5, 0.2]} c="#c25a43" />
          <Part p={[-0.88, 0.4, 0.05]} s={[0.16, 0.5, 0.8]} c="#b84f3a" />
          <Part p={[0.88, 0.4, 0.05]} s={[0.16, 0.5, 0.8]} c="#b84f3a" />
          <Part p={[-0.4, 0.5, 0.1]} s={[0.4, 0.1, 0.4]} c="#f6d365" />
        </>
      )
    case 'computer':
      return (
        <>
          <Part p={[0, 0.72, 0]} s={[1.9, 0.07, 0.8]} c="#8a5a2b" />
          <Part p={[-0.85, 0.35, 0]} s={[0.07, 0.7, 0.7]} c="#6b4423" />
          <Part p={[0.85, 0.35, 0]} s={[0.07, 0.7, 0.7]} c="#6b4423" />
          <Part p={[0, 1.05, -0.2]} s={[0.75, 0.45, 0.05]} c="#1b2433" />
          <Part p={[0, 1.05, -0.17]} s={[0.67, 0.37, 0.02]} c="#5fb4ff" m={windowMat} cast={false} />
          <Part p={[0, 0.86, -0.2]} s={[0.12, 0.2, 0.08]} c="#333" />
          <Part p={[0, 0.77, 0.15]} s={[0.5, 0.03, 0.18]} c="#2b2b2b" />
          <Part p={[0.6, 0.76, 0.1]} s={[0.1, 0.04, 0.14]} c="#eee" />
          <Part p={[0, 0.42, 0.62]} s={[0.5, 0.07, 0.5]} c="#2b3a55" />
          <Part p={[0, 0.72, 0.86]} s={[0.5, 0.55, 0.07]} c="#2b3a55" />
          <Part g="cyl" p={[0, 0.2, 0.62]} s={[0.04, 0.4, 0.04]} c="#555" />
        </>
      )
    case 'tv':
      return (
        <>
          <Part p={[0, 0.2, 0]} s={[1.8, 0.4, 0.6]} c="#6b4423" />
          <Part p={[0, 0.95, 0]} s={[1.4, 0.8, 0.07]} c="#111" />
          <Part p={[0, 0.95, 0.04]} s={[1.3, 0.7, 0.02]} c="#4aa3ff" m={windowMat} cast={false} />
          <Part p={[0, 0.5, 0]} s={[0.2, 0.2, 0.1]} c="#222" />
        </>
      )
    case 'bookshelf':
      return (
        <>
          <Part p={[0, 0.8, 0]} s={[0.85, 1.6, 0.35]} c="#7a4e2d" />
          {[0.3, 0.7, 1.1, 1.5].map((y, i) => (
            <group key={i}>
              <Part p={[0, y - 0.1, 0.02]} s={[0.78, 0.03, 0.32]} c="#5b3a29" />
              {[-0.25, -0.1, 0.05, 0.2].map((x, j) => (
                <Part key={j} p={[x, y + 0.02, 0.04]} s={[0.1, 0.28, 0.2]} c={['#e0524a', '#2e86de', '#f1b82d', '#2fa866', '#8e5bd0'][(i + j) % 5]} />
              ))}
            </group>
          ))}
        </>
      )
    case 'plant':
      return (
        <>
          <Part g="cyl" p={[0, 0.2, 0]} s={[0.22, 0.4, 0.22]} c="#c8553d" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Part key={i} g="cone" p={[Math.cos(i * 1.26) * 0.15, 0.75, Math.sin(i * 1.26) * 0.15]} r={[Math.sin(i * 1.26) * 0.5, 0, -Math.cos(i * 1.26) * 0.5]} s={[0.1, 0.6, 0.1]} c="#3aa655" />
          ))}
        </>
      )
    case 'coalpot':
      return (
        <>
          <Part g="cyl" p={[0, 0.16, 0]} s={[0.34, 0.32, 0.34]} c="#5b5f66" />
          <Part g="cyl" p={[0, 0.34, 0]} s={[0.4, 0.06, 0.4]} c="#3d4046" />
          {[[-0.08, 0], [0.08, 0.04], [0, -0.08]].map(([x, z], i) => <Part key={i} g="sphere" p={[x, 0.38, z]} s={0.06} c="#ff7a2e" />)}
          <Part g="cyl" p={[0, 0.5, 0]} s={[0.28, 0.2, 0.28]} c="#b8bcc4" />
        </>
      )
    case 'stove':
      return (
        <>
          <Part p={[0, 0.42, 0]} s={[1.6, 0.84, 0.66]} c="#e8eaee" />
          <Part p={[0, 0.86, 0]} s={[1.62, 0.04, 0.68]} c="#2b2f36" />
          {[-0.4, 0.4].map((x) => <Part key={x} g="cyl" p={[x, 0.9, 0]} s={[0.22, 0.03, 0.22]} c="#16181c" />)}
          <Part g="cyl" p={[0.4, 0.97, 0]} s={[0.24, 0.12, 0.24]} c="#9aa4ae" />
          <Part p={[0, 0.42, 0.34]} s={[1.1, 0.5, 0.02]} c="#20242b" />
          <Part p={[0, 0.72, 0.35]} s={[0.9, 0.04, 0.04]} c="#b0b8c4" />
        </>
      )
    case 'fan':
      return (
        <>
          <Part g="cyl" p={[0, 0.03, 0]} s={[0.25, 0.06, 0.25]} c="#444" />
          <Part g="cyl" p={[0, 0.6, 0]} s={[0.03, 1.2, 0.03]} c="#bbb" />
          <group position={[0, 1.2, 0.08]} ref={fan} userData={{ noMerge: true }}>
            <Part p={[0, 0, 0]} s={[0.5, 0.06, 0.02]} c="#7ec8f0" />
            <Part p={[0, 0, 0]} s={[0.06, 0.5, 0.02]} c="#7ec8f0" />
          </group>
        </>
      )
    default:
      return <Part p={[0, 0.4, 0]} s={[f.w * 0.8, 0.8, f.d * 0.8]} c="#999" />
  }
}

const WALL_H = 2.1
const WALL_T = 0.18
/** Interior walls, half walls and doorways; they take the home's paint colour. */
function WallPiece({ type, w }: { type: FurnitureType; w: number }) {
  const wall = useGame((s) => s.homeStyle[s.housing.tier]?.wall) ?? PAINTS[0].wall
  if (type === 'wall_half')
    return (
      <>
        <Part p={[0, 0.5, 0]} s={[w, 1.0, WALL_T + 0.1]} c={wall} />
        <Part p={[0, 1.03, 0]} s={[w + 0.04, 0.06, WALL_T + 0.3]} c="#8a5a2b" />
      </>
    )
  if (type === 'doorway')
    return (
      <>
        <Part p={[-0.43, WALL_H / 2, 0]} s={[0.14, WALL_H, WALL_T]} c={wall} />
        <Part p={[0.43, WALL_H / 2, 0]} s={[0.14, WALL_H, WALL_T]} c={wall} />
        <Part p={[0, WALL_H - 0.2, 0]} s={[1, 0.4, WALL_T]} c={wall} />
        <Part p={[0, 0.95, 0]} s={[0.04, 1.9, 0.04]} c="#7a4e2d" cast={false} />
        <group position={[-0.36, 0, 0.03]} rotation={[0, -1.1, 0]}>
          <Part p={[0.36, 0.95, 0]} s={[0.72, 1.85, 0.05]} c="#8a5a2b" />
          <Part p={[0.62, 0.95, 0.05]} s={[0.05, 0.05, 0.06]} c="#f1b82d" />
        </group>
      </>
    )
  return (
    <>
      <Part p={[0, WALL_H / 2, 0]} s={[w, WALL_H, WALL_T]} c={wall} />
      <Part p={[0, WALL_H + 0.03, 0]} s={[w + 0.02, 0.06, WALL_T + 0.04]} c="#e8e2d6" />
      <Part p={[0, 0.06, 0]} s={[w + 0.01, 0.12, WALL_T + 0.04]} c="#7a6a58" cast={false} />
    </>
  )
}

/** White mosquito net canopy over a bed. */
function MosquitoNet({ w, d }: { w: number; d: number }) {
  return (
    <>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Part key={i} g="cyl" p={[(sx * (w - 0.1)) / 2, 1.0, (sz * (d - 0.1)) / 2]} s={[0.025, 2.0, 0.025]} c="#e8e8e8" cast={false} />
      ))}
      <Part p={[0, 1.15, 0]} s={[w - 0.08, 1.5, d - 0.08]} c="#ffffff" opacity={0.22} cast={false} />
      <Part p={[0, 1.92, 0]} s={[w - 0.04, 0.04, d - 0.04]} c="#ffffff" opacity={0.5} cast={false} />
    </>
  )
}

/** Something fixed to whichever back wall the camera can currently see (walls facing the camera are hidden). */
function WallMounted({ w, d, t, y, children }: { w: number; d: number; t: number; y: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!g.current) return
    const yaw = (globalThis as unknown as { __camYaw?: number }).__camYaw ?? Math.PI / 4
    const sx = Math.sin(yaw)
    const cz = Math.cos(yaw)
    // prefer the wall seen most squarely
    if (Math.abs(cz) >= Math.abs(sx)) {
      if (cz > 0) { g.current.position.set(w * t, y, 0.02); g.current.rotation.y = 0 }
      else { g.current.position.set(w * (1 - t), y, d - 0.02); g.current.rotation.y = Math.PI }
    } else if (sx > 0) { g.current.position.set(0.02, y, d * (1 - t)); g.current.rotation.y = Math.PI / 2 }
    else { g.current.position.set(w - 0.02, y, d * t); g.current.rotation.y = -Math.PI / 2 }
  })
  return <group ref={g} userData={{ noMerge: true }}>{children}</group>
}

function AirCon() {
  const flap = useRef<THREE.Group>(null)
  useFrame((st) => { if (flap.current) flap.current.rotation.x = 0.3 + Math.sin(st.clock.elapsedTime * 1.5) * 0.15 })
  return (
    <>
      <Part p={[0, 0, 0.13]} s={[1.1, 0.34, 0.24]} c="#f7f8fa" />
      <Part p={[0, 0.06, 0.255]} s={[1.0, 0.03, 0.01]} c="#d5dbe2" cast={false} />
      <group ref={flap} position={[0, -0.13, 0.25]}><Part p={[0, 0, 0]} s={[0.95, 0.02, 0.06]} c="#dfe4ea" cast={false} /></group>
      <Part p={[0.45, 0.08, 0.256]} s={[0.04, 0.04, 0.01]} c="#35d07f" m={bulbMat} cast={false} />
    </>
  )
}

function SolarInverter() {
  return (
    <>
      <Part p={[0, 0, 0.09]} s={[0.5, 0.65, 0.16]} c="#2b3a55" />
      <Part p={[0, 0.12, 0.175]} s={[0.3, 0.18, 0.01]} c="#5fb4ff" m={windowMat} cast={false} />
      <Part p={[-0.12, -0.15, 0.175]} s={[0.05, 0.05, 0.01]} c="#35d07f" m={bulbMat} cast={false} />
      <Part p={[0, -0.75, 0.2]} s={[0.55, 0.5, 0.36]} c="#3a3f47" />
      <Part p={[0, -0.48, 0.2]} s={[0.2, 0.05, 0.1]} c="#f1b82d" cast={false} />
    </>
  )
}

/* ------------------------------ per-tier interior finish ------------------------------ */
type FloorKind = 'cement' | 'planks' | 'marble' | 'parquet'
interface TierLook {
  wall: string
  floor: string
  kind: FloorKind
  grout: string
  skin: WallSkin
  light: { color: string; intensity: number }
}
const TIER_LOOK: Record<HomeTier, TierLook> = {
  room: { wall: '#d9c4a3', floor: '#8f8a80', kind: 'cement', grout: '#6b665e', skin: { grime: '#b49c7c', bars: true }, light: { color: '#ffd08a', intensity: 7 } },
  apartment: { wall: '#cfe6e4', floor: '#b98a5a', kind: 'planks', grout: '#8a6440', skin: { base: '#ffffff', curtain: '#5c7fa8', rail: '#8a8f98' }, light: { color: '#ffe2b0', intensity: 11 } },
  premium: {
    wall: '#efe9dc', floor: '#f1efea', kind: 'marble', grout: '#c9a24a',
    skin: { panel: '#e4dccb', inset: '#f3ede0', panelH: 1.1, rail: '#c9a24a', crown: '#fbf8f2', base: '#3e2a1d', curtain: '#7a1f3d', winScale: 1.6 },
    light: { color: '#fff1d6', intensity: 15 },
  },
  house: {
    wall: '#f3e6cf', floor: '#8a5a34', kind: 'parquet', grout: '#5a3a22',
    skin: { base: '#5a3a22', crown: '#ffffff', curtain: '#2f6b52', rail: '#5a3a22', winScale: 1.3 },
    light: { color: '#ffe6bf', intensity: 13 },
  },
}
/** Basic rooms differ by compound house: plaster and cement shades. */
const ROOM_VARIANTS = [
  { wall: '#d9c4a3', floor: '#8f8a80', grime: '#b49c7c' },
  { wall: '#c9d6c2', floor: '#9a8f7e', grime: '#9fae94' },
  { wall: '#e3c1a8', floor: '#857e74', grime: '#bf9a80' },
  { wall: '#cbd3dc', floor: '#94918a', grime: '#a3abb5' },
  { wall: '#e8d8a8', floor: '#8a8070', grime: '#c4b07c' },
]
const strHash = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
const hash = (x: number, z: number) => {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/** Floor laid per home tier: bare cement, wood planks, gold-grouted marble or parquet. */
function Floor({ w, d, kind, base, grout }: { w: number; d: number; kind: FloorKind; base: string; grout: string }) {
  const parts = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number]; c: string; r?: [number, number, number] }[] = []
    if (kind === 'cement') {
      for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) out.push({ p: [x + 0.5, 0.05, z + 0.5], s: [1, 0.1, 1], c: shade(base, 0.9 + hash(x, z) * 0.14) })
      for (let i = 0; i < Math.max(2, Math.floor((w * d) / 12)); i++) out.push({ p: [hash(i, 3) * w, 0.102, hash(7, i) * d], s: [0.4 + hash(i, i) * 0.8, 0.005, 0.03], r: [0, hash(i, 9) * 3, 0], c: grout })
    } else if (kind === 'planks') {
      for (let z = 0; z < d * 4; z++) {
        const off = hash(z, 1) * 2
        let x = -off
        while (x < w) {
          const len = 1.6 + hash(z, x) * 1.4
          const a = Math.max(0, x)
          const b = Math.min(w, x + len)
          if (b > a) out.push({ p: [(a + b) / 2, 0.05, z * 0.25 + 0.125], s: [b - a - 0.02, 0.1, 0.235], c: shade(base, 0.86 + hash(z, x + 3) * 0.2) })
          x += len
        }
      }
    } else if (kind === 'marble') {
      for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
        out.push({ p: [x + 0.5, 0.05, z + 0.5], s: [0.95, 0.1, 0.95], c: (x + z) % 2 ? base : shade(base, 0.95) })
        if (hash(x, z) > 0.45) out.push({ p: [x + 0.5, 0.101, z + 0.5], s: [0.7, 0.004, 0.015], r: [0, hash(z, x) * 3, 0], c: '#b9b4ab' })
      }
    } else {
      for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
        const along = (x + z) % 2 === 0
        for (let k = 0; k < 3; k++) {
          const o = -0.33 + k * 0.33
          out.push({ p: along ? [x + 0.5, 0.05, z + 0.5 + o] : [x + 0.5 + o, 0.05, z + 0.5], s: along ? [0.97, 0.1, 0.31] : [0.31, 0.1, 0.97], c: shade(base, 0.88 + hash(x * 3 + k, z) * 0.2) })
        }
      }
    }
    return out
  }, [w, d, kind, base, grout])
  return (
    <>
      <Part p={[w / 2, 0.04, d / 2]} s={[w, 0.08, d]} c={grout} cast={false} />
      {parts.map((t, i) => <Part key={i} p={t.p} s={t.s} r={t.r} c={t.c} cast={false} rough={kind === 'marble' ? 0.15 : kind === 'cement' ? 0.95 : 0.55} />)}
    </>
  )
}

/** Built-in fittings that set each home apart: a bare bulb and calendar in a compound room, a chandelier and art in a premium villa. */
function TierDressing({ tier, w, d, on }: { tier: HomeTier; w: number; d: number; on: boolean }) {
  const cx = w / 2
  const cz = d / 2
  if (tier === 'room')
    return (
      <>
        <Part g="cyl" p={[cx, 2.7, cz]} s={[0.01, 0.6, 0.01]} c="#222" cast={false} />
        <Part g="sphere" p={[cx, 2.38, cz]} s={0.08} m={bulbMat} cast={false} />
        <WallMounted w={w} d={d} t={0.2} y={1.7}>
          <Part p={[0, 0, 0.02]} s={[0.5, 0.7, 0.01]} c="#f4f1ea" cast={false} />
          <Part p={[0, 0.25, 0.03]} s={[0.5, 0.18, 0.01]} c="#c0392b" cast={false} />
          <Part p={[0, -0.08, 0.03]} s={[0.4, 0.35, 0.01]} c="#d9d4c8" cast={false} />
        </WallMounted>
        <WallMounted w={w} d={d} t={0.82} y={1.6}>
          <Part p={[0, 0, 0.02]} s={[0.3, 0.4, 0.02]} c="#cfe0ea" m={windowMat} cast={false} />
          <Part p={[0, 0.5, 0.05]} s={[0.9, 0.02, 0.02]} c="#6b5a4a" cast={false} />
          {[-0.3, 0.05, 0.3].map((x, i) => <Part key={i} p={[x, 0.25, 0.06]} s={[0.22, 0.45, 0.03]} c={['#e0524a', '#2e86de', '#f1b82d'][i]} cast={false} />)}
        </WallMounted>
      </>
    )
  if (tier === 'apartment')
    return (
      <>
        <Part g="cyl" p={[cx, 2.85, cz]} s={[0.015, 0.3, 0.015]} c="#333" cast={false} />
        <Part g="cyl" p={[cx, 2.62, cz]} s={[0.32, 0.22, 0.32]} c="#f4ecd8" cast={false} opacity={0.9} />
        <Part g="sphere" p={[cx, 2.55, cz]} s={0.07} m={bulbMat} cast={false} />
        <WallMounted w={w} d={d} t={0.22} y={1.8}>
          <Part g="cyl" p={[0, 0, 0.03]} r={[Math.PI / 2, 0, 0]} s={[0.22, 0.04, 0.22]} c="#ffffff" cast={false} />
          <Part p={[0, 0.06, 0.06]} s={[0.02, 0.14, 0.01]} c="#222" cast={false} />
          <Part p={[0.05, 0, 0.06]} s={[0.1, 0.02, 0.01]} c="#222" cast={false} />
        </WallMounted>
        <WallMounted w={w} d={d} t={0.8} y={1.7}>
          <Part p={[0, 0, 0.02]} s={[0.9, 0.65, 0.04]} c="#2b2b2b" cast={false} />
          <Part p={[0, 0, 0.045]} s={[0.78, 0.53, 0.01]} c="#7fb3d5" cast={false} />
          <Part p={[0.15, -0.1, 0.05]} s={[0.4, 0.2, 0.01]} c="#f1b82d" cast={false} />
        </WallMounted>
      </>
    )
  const lux = tier === 'premium'
  return (
    <>
      {lux ? (
        <group position={[cx, 0, cz]}>
          <Part g="cyl" p={[0, 2.85, 0]} s={[0.02, 0.3, 0.02]} c="#c9a24a" cast={false} />
          <Part g="torus" p={[0, 2.55, 0]} r={[Math.PI / 2, 0, 0]} s={[0.45, 0.45, 0.45]} c="#c9a24a" cast={false} />
          <Part g="torus" p={[0, 2.38, 0]} r={[Math.PI / 2, 0, 0]} s={[0.28, 0.28, 0.28]} c="#c9a24a" cast={false} />
          {Array.from({ length: 10 }, (_, i) => <Part key={i} g="ico" p={[Math.cos(i * 0.63) * 0.45, 2.42, Math.sin(i * 0.63) * 0.45]} s={[0.04, 0.09, 0.04]} c="#eaf6ff" opacity={0.75} cast={false} />)}
          {Array.from({ length: 6 }, (_, i) => <Part key={i} g="sphere" p={[Math.cos(i * 1.05) * 0.45, 2.6, Math.sin(i * 1.05) * 0.45]} s={0.05} m={bulbMat} cast={false} />)}
          <Part g="sphere" p={[0, 2.3, 0]} s={[0.12, 0.18, 0.12]} c="#eaf6ff" opacity={0.7} cast={false} />
        </group>
      ) : (
        <group position={[cx, 2.75, cz]}>
          <Part g="cyl" p={[0, 0.12, 0]} s={[0.04, 0.25, 0.04]} c="#5a3a22" cast={false} />
          <Part g="cyl" p={[0, 0, 0]} s={[0.16, 0.1, 0.16]} c="#5a3a22" cast={false} />
          {[0, 1, 2, 3].map((i) => <Part key={i} p={[Math.cos(i * 1.57) * 0.45, -0.02, Math.sin(i * 1.57) * 0.45]} r={[0, -i * 1.57, 0]} s={[0.7, 0.02, 0.16]} c="#7a5232" cast={false} />)}
          <Part g="sphere" p={[0, -0.12, 0]} s={0.09} m={bulbMat} cast={false} />
        </group>
      )}
      {lux && [[w * 0.25, d * 0.25], [w * 0.75, d * 0.25], [w * 0.25, d * 0.75], [w * 0.75, d * 0.75]].map(([x, z], i) => (
        <Part key={i} g="cyl" p={[x, 2.98, z]} s={[0.1, 0.02, 0.1]} m={bulbMat} cast={false} />
      ))}
      {lux && <pointLight position={[w * 0.25, 2.6, d * 0.75]} intensity={on ? 4 : 0} distance={8} color="#fff4e0" />}
      <WallMounted w={w} d={d} t={0.2} y={1.75}>
        {lux ? (
          <>
            <Part p={[0, 0, 0.03]} s={[1.3, 0.95, 0.06]} c="#c9a24a" rough={0.35} cast={false} />
            <Part p={[0, 0, 0.065]} s={[1.15, 0.8, 0.01]} c="#1f3a5f" cast={false} />
            <Part g="sphere" p={[-0.2, 0.08, 0.07]} s={[0.25, 0.25, 0.01]} c="#e0b85a" cast={false} />
            <Part p={[0.25, -0.12, 0.072]} s={[0.35, 0.3, 0.01]} c="#a8323e" cast={false} />
          </>
        ) : (
          <>
            <Part p={[0, 0, 0.02]} s={[0.9, 1.2, 0.02]} c="#f1b82d" cast={false} />
            {[0, 1, 2, 3, 4, 5].map((i) => <Part key={i} p={[0, -0.5 + i * 0.2, 0.035]} s={[0.9, 0.08, 0.01]} c={['#2fa866', '#c0392b', '#1b1b1b', '#2fa866', '#c0392b', '#1b1b1b'][i]} cast={false} />)}
          </>
        )}
      </WallMounted>
      <WallMounted w={w} d={d} t={0.82} y={lux ? 1.9 : 1.65}>
        {lux ? (
          [-0.45, 0.45].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <Part p={[0, 0, 0.03]} s={[0.08, 0.25, 0.05]} c="#c9a24a" cast={false} />
              <Part g="cone" p={[0, 0.17, 0.09]} s={[0.09, 0.14, 0.09]} r={[Math.PI, 0, 0]} c="#fff4dc" opacity={0.85} cast={false} />
              <Part g="sphere" p={[0, 0.14, 0.09]} s={0.035} m={bulbMat} cast={false} />
            </group>
          ))
        ) : (
          [[-0.35, 0.1, 0.35, 0.45], [0.1, -0.05, 0.3, 0.3], [0.45, 0.15, 0.25, 0.35]].map(([x, y, fw, fh], i) => (
            <group key={i} position={[x, y, 0]}>
              <Part p={[0, 0, 0.02]} s={[fw, fh, 0.03]} c="#5a3a22" cast={false} />
              <Part p={[0, 0, 0.037]} s={[fw - 0.06, fh - 0.06, 0.01]} c={['#e9c9a8', '#a9cce3', '#d5e8c9'][i]} cast={false} />
            </group>
          ))
        )}
      </WallMounted>
    </>
  )
}

function Item({ item, onClick, selected, dragging, onDragStart, net }: { item: HomeItem; onClick: () => void; selected: boolean; dragging: boolean; onDragStart: () => boolean; net: boolean }) {
  const f = footprint(item.type, item.rot)
  const raw = FURNITURE[item.type]
  return (
    <group
      position={[item.x + f.w / 2, 0.12, item.y + f.d / 2]}
      visible={!dragging}
      onPointerDown={(e) => {
        if (onDragStart()) e.stopPropagation()
      }}
      onClick={(e) => {
        if (e.delta > 6) return
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = useUI.getState().editMode ? 'grab' : 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      <group rotation={[0, (-item.rot * Math.PI) / 2, 0]}>
        {raw.build ? <FurnitureModel type={item.type} /> : <Merged k={item.type}><FurnitureModel type={item.type} /></Merged>}
        {net && isBed(item.type) && <MosquitoNet w={raw.w} d={raw.d} />}
      </group>
      {selected && (
        <mesh position={[0, 0.03, 0]} scale={[f.w + 0.15, 0.04, f.d + 0.15]}>
          <boxGeometry />
          <meshBasicMaterial color="#ffd23f" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}

/** Projects the selected piece's top to the screen so the HUD can float its toolbar there. */
function SelectionAnchor({ items }: { items: HomeItem[] }) {
  const { camera, gl } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const ui = useUI.getState()
    const it = ui.selectedFurniture !== null && ui.holdingUid === null && ui.dragUid === null ? items.find((i) => i.id === ui.selectedFurniture) : undefined
    if (!it) { runtime.selAnchor = null; return }
    const fp = footprint(it.type, it.rot)
    v.set(INTERIOR_ORIGIN.x + it.x + fp.w / 2, 1.5, INTERIOR_ORIGIN.z + it.y + fp.d / 2).project(camera)
    const r = gl.domElement.getBoundingClientRect()
    runtime.selAnchor = { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }
  })
  useEffect(() => () => { runtime.selAnchor = null }, [])
  return null
}

export function Interior({ visible }: { visible: boolean }) {
  const tier = useGame((s) => s.viewing ?? s.housing.tier)
  const viewing = useGame((s) => s.viewing)
  const ownInventory = useGame((s) => s.inventory)
  const ext = useGame((s) => (s.viewing ? 0 : extCount(s.upgrades[s.housing.tier])))
  const upg = useGame((s) => (s.viewing ? NONE : s.upgrades[s.housing.tier] ?? NONE))
  const style = useGame((s) => (s.viewing ? undefined : s.homeStyle[s.housing.tier]))
  const inventory = useMemo(() => (viewing ? [] : ownInventory), [viewing, ownInventory])
  const activity = useGame((s) => s.activity)
  const hookup = useGame((s) => s.hookup)
  const profile = useGame((s) => s.profile)
  const lay = homeLayout(tier, ext)
  // style is a dependency: moved fixtures live in homeStyle
  const items = useMemo(() => itemsInHome(tier, inventory), [tier, inventory, style]) // eslint-disable-line react-hooks/exhaustive-deps
  const painted = upg.includes('paint')
  const selected = useUI((s) => s.selectedFurniture)
  const holdingUid = useUI((s) => s.holdingUid)
  const dragUid = useUI((s) => s.dragUid)
  const holdRot = useUI((s) => s.holdRot)
  const editMode = useUI((s) => s.editMode)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const { w, d } = lay
  const movingUid = dragUid ?? holdingUid
  const moving = movingUid === null ? undefined : items.find((o) => o.id === movingUid) ?? inventory.map((o) => ({ id: o.uid, type: o.type })).find((o) => o.id === movingUid) ?? (movingUid < 0 && HOMES[tier].fixtures[-movingUid - 1] ? { id: movingUid, type: HOMES[tier].fixtures[-movingUid - 1].type } : undefined)
  const ghost = useMemo(() => {
    if (!moving || !cursor) return null
    const fp = footprint(moving.type, holdRot)
    const x = cursor.x - Math.floor((fp.w - 1) / 2)
    const y = cursor.y - Math.floor((fp.d - 1) / 2)
    return { x, y, fp, ok: canPlace(tier, inventory, moving.type, x, y, holdRot, moving.id, ext).ok }
  }, [moving, cursor, holdRot, tier, inventory, ext])
  const ghostRef = useRef(ghost)
  ghostRef.current = ghost
  /** Latest tile under the pointer, updated straight away (a quick drop can beat the re-render). */
  const cursorRef = useRef<{ x: number; y: number } | null>(null)

  // finish a drag wherever the pointer is released
  useEffect(() => {
    if (dragUid === null) return
    const up = () => {
      const ui = useUI.getState()
      const c = cursorRef.current
      const st = useGame.getState()
      const type = ui.dragUid !== null ? (ui.dragUid < 0 ? HOMES[st.housing.tier].fixtures[-ui.dragUid - 1]?.type : st.inventory.find((o) => o.uid === ui.dragUid)?.type) : undefined
      if (c && type && ui.dragUid !== null) {
        const fp = footprint(type, ui.holdRot)
        const x = c.x - Math.floor((fp.w - 1) / 2)
        const y = c.y - Math.floor((fp.d - 1) / 2)
        if (canPlace(st.housing.tier, st.inventory, type, x, y, ui.holdRot, ui.dragUid, extCount(st.upgrades[st.housing.tier])).ok) st.placeFurniture(ui.dragUid, x, y, ui.holdRot)
      }
      useUI.setState({ dragUid: null })
      cursorRef.current = null
      setCursor(null)
    }
    const cancel = () => { useUI.setState({ dragUid: null }); setCursor(null) }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') useUI.setState((u) => ({ holdRot: nextRot(u.holdRot) }))
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key)
    }
  }, [dragUid])

  const player = useRef<THREE.Group>(null)
  const cur = useRef({ x: lay.door.x + 0.5, z: lay.door.y + 0.3, y: 0 })
  const motion = useRef<Motion>({ moving: false, speed: 0, action: null, prop: null })
  const lastSel = useRef<number | null>(null)
  // put the player at the door whenever they come in, change home, or the room grows
  useEffect(() => {
    if (!visible) return
    cur.current = { x: lay.door.x + 0.5, z: lay.door.y + 0.3, y: 0 }
    runtime.insideTarget = null
    if (player.current) player.current.position.set(cur.current.x, 0.12, cur.current.z)
  }, [visible, tier, ext, lay.door.x, lay.door.y])

  /** Furniture cells block walking (the door cell never does). */
  const blockedAt = (x: number, z: number) => {
    for (const it of items) {
      if (FURNITURE[it.type].walkable) continue
      const fp = footprint(it.type, it.rot)
      if (x > it.x - 0.15 && x < it.x + fp.w + 0.15 && z > it.y - 0.15 && z < it.y + fp.d + 0.15) return true
    }
    return false
  }

  /** Grid route around walls and furniture (through doorways) to a point; waypoints exclude the point itself. */
  const route = useRef<{ key: string; pts: { x: number; z: number }[] } | null>(null)
  const planRoute = (fx: number, fz: number, tx: number, tz: number) => {
    const cell = (x: number, z: number) => Math.min(d - 1, Math.max(0, Math.floor(z))) * w + Math.min(w - 1, Math.max(0, Math.floor(x)))
    const solid = new Uint8Array(w * d)
    for (const it of items) {
      if (FURNITURE[it.type].walkable) continue
      const fp = footprint(it.type, it.rot)
      for (let z = it.y; z < it.y + fp.d; z++) for (let x = it.x; x < it.x + fp.w; x++) if (x >= 0 && z >= 0 && x < w && z < d) solid[z * w + x] = 1
    }
    const start = cell(fx, fz)
    const goal = cell(tx, tz)
    solid[start] = 0
    solid[goal] = 0
    const prev = new Int32Array(w * d).fill(-1)
    prev[start] = start
    const queue = [start]
    while (queue.length) {
      const i = queue.shift()!
      if (i === goal) break
      const x = i % w
      const z = (i - x) / w
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        if (nx < 0 || nz < 0 || nx >= w || nz >= d) continue
        const j = nz * w + nx
        if (solid[j] || prev[j] >= 0) continue
        prev[j] = i
        queue.push(j)
      }
    }
    if (prev[goal] < 0) return []
    const cells: { x: number; z: number }[] = []
    for (let i = goal; i !== start; i = prev[i]) cells.unshift({ x: (i % w) + 0.5, z: Math.floor(i / w) + 0.5 })
    cells.pop()
    // drop waypoints you can walk straight past
    const clear = (a: { x: number; z: number }, b: { x: number; z: number }) => {
      const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.15)
      for (let k = 1; k < n; k++) if (blockedAt(a.x + ((b.x - a.x) * k) / n, a.z + ((b.z - a.z) * k) / n)) return false
      return true
    }
    const out: { x: number; z: number }[] = []
    let from = { x: fx, z: fz }
    for (let k = 0; k < cells.length; k++) {
      const next = cells[k + 1] ?? { x: tx, z: tz }
      if (!clear(from, next)) { out.push(cells[k]); from = cells[k] }
    }
    return out
  }
  /** Next point to head for on the way to (tx, tz). */
  const nextStep = (tx: number, tz: number) => {
    const c = cur.current
    const key = `${tx.toFixed(2)},${tz.toFixed(2)}`
    if (route.current?.key !== key) route.current = { key, pts: planRoute(c.x, c.z, tx, tz) }
    const pts = route.current.pts
    while (pts.length && Math.hypot(pts[0].x - c.x, pts[0].z - c.z) < 0.12) pts.shift()
    return pts[0] ?? null
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    if (!visible || !player.current) return
    const c = cur.current
    let target: { x: number; z: number; face?: number; y?: number; pose?: Pose | null; prop?: Prop | null; perform: boolean } | null = null
    const approach = (id: number, actId: string, perform: boolean) => {
      const it = items.find((i) => i.id === id)
      if (!it) return null
      const fp = footprint(it.type, it.rot)
      const cx = it.x + fp.w / 2
      const cz = it.y + fp.d / 2
      const u = furnitureUse(it.type, actId)
      const fr = (-it.rot * Math.PI) / 2
      const ux = perform ? u.dx : 0
      const uz = perform ? u.dz : Math.max(u.dz, FURNITURE[it.type].d / 2 + 0.45)
      return { x: cx + ux * Math.cos(fr) + uz * Math.sin(fr), z: cz - ux * Math.sin(fr) + uz * Math.cos(fr), face: fr + (perform ? u.face : Math.PI), y: perform ? u.y ?? 0 : 0, pose: perform ? u.pose : null, prop: perform ? u.prop ?? null : null, perform }
    }
    if (activity && activity.ctx.furnitureUid !== undefined) target = approach(activity.ctx.furnitureUid, activity.defId, true)
    else if (selected !== null && selected !== lastSel.current && !editMode) {
      const a = approach(selected, '', false)
      if (a && !runtime.frozen) runtime.insideTarget = { x: a.x, z: a.z }
    }
    lastSel.current = selected

    if (target) {
      const via = nextStep(target.x, target.z)
      const dx = (via ?? target).x - c.x
      const dz = (via ?? target).z - c.z
      const dist = Math.hypot(dx, dz)
      if (via || dist > 0.03) {
        const k = Math.min(1, (3.0 * dt) / dist)
        c.x += dx * k
        c.z += dz * k
        c.y += (0 - c.y) * Math.min(1, dt * 10)
        player.current.rotation.y = Math.atan2(dx, dz)
        motion.current = { moving: true, speed: 2.4, action: null, prop: null }
      } else {
        let diff = (target.face ?? 0) - player.current.rotation.y
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        player.current.rotation.y += diff * Math.min(1, dt * 8)
        c.y += ((target.y ?? 0) - c.y) * Math.min(1, dt * 8)
        motion.current = { moving: false, speed: 0, action: target.pose ?? null, prop: target.prop ?? null }
      }
    } else {
      // free walking: WASD or click the floor
      c.y += (0 - c.y) * Math.min(1, dt * 10)
      const kv = keyVector()
      let vx = 0
      let vz = 0
      if (kv.x || kv.z) {
        runtime.insideTarget = null
        route.current = null
        vx = kv.x
        vz = kv.z
      } else if (runtime.insideTarget) {
        const t = runtime.insideTarget
        const via = nextStep(t.x, t.z) ?? t
        const fx = via.x - c.x
        const fz = via.z - c.z
        const fd = Math.hypot(fx, fz)
        if (via === t && fd < 0.06) runtime.insideTarget = null
        else if (fd > 1e-4) { vx = fx / fd; vz = fz / fd }
      }
      if (vx || vz) {
        const step = 3.0 * dt
        const nx = Math.min(w - 0.25, Math.max(0.25, c.x + vx * step))
        const nz = Math.min(d - 0.05, Math.max(0.25, c.z + vz * step))
        const goingTo = runtime.insideTarget
        const intoTarget = (x: number, z: number) => goingTo && Math.hypot(goingTo.x - x, goingTo.z - z) < 0.6
        // standing inside furniture (e.g. something was placed on you): let them walk out freely
        const stuck = blockedAt(c.x, c.z)
        const ox = c.x
        const oz = c.z
        if (stuck || !blockedAt(nx, c.z) || intoTarget(nx, c.z)) c.x = nx
        if (stuck || !blockedAt(c.x, nz) || intoTarget(c.x, nz)) c.z = nz
        // can't get any closer to a clicked spot: stop instead of pushing against furniture forever
        if (goingTo && c.x === ox && c.z === oz) runtime.insideTarget = null
        player.current.rotation.y = Math.atan2(vx, vz)
        motion.current = { moving: true, speed: 2.4, action: null, prop: null }
      } else motion.current = { moving: false, speed: 0, action: null, prop: null }
    }
    player.current.position.set(c.x, 0.12 + c.y, c.z)
    actionFocus.active = !!activity
    actionFocus.x = INTERIOR_ORIGIN.x + c.x
    actionFocus.z = INTERIOR_ORIGIN.z + c.z
  })

  const roomDest = useGame((s) => (s.viewing ? null : s.housing.roomDest ?? null))
  const look = useMemo(() => {
    const base = TIER_LOOK[tier]
    if (tier !== 'room' || !roomDest) return base
    const v = ROOM_VARIANTS[strHash(roomDest) % ROOM_VARIANTS.length]
    return { ...base, wall: v.wall, floor: v.floor, skin: { ...base.skin, grime: v.grime } }
  }, [tier, roomDest])
  const wallColor = painted ? style?.wall ?? PAINTS[0].wall : look.wall
  // paint changes the colour; each tier keeps its own floor material
  const floorBase = painted && look.kind !== 'marble' ? style?.floor ?? PAINTS[0].floor : look.floor
  const pctShown = activity && activity.ctx.furnitureUid !== undefined ? Math.round((activity.done / activity.total) * 100) : null

  const setC = (e: ThreeEvent<PointerEvent>) => {
    const x = Math.floor(e.point.x - INTERIOR_ORIGIN.x)
    const y = Math.floor(e.point.z - INTERIOR_ORIGIN.z)
    cursorRef.current = { x, y }
    setCursor((c) => (c && c.x === x && c.y === y ? c : { x, y }))
  }

  return (
    <group position={INTERIOR_ORIGIN} visible={visible}>
      <Merged k={`${w}x${d}${look.kind}${floorBase}`}>
        <Floor w={w} d={d} kind={look.kind} base={floorBase} grout={look.grout} />
      </Merged>
      <Part p={[w / 2, -0.3, d / 2]} s={[w + 0.5, 0.6, d + 0.5]} c={tier === 'premium' ? '#d8d2c4' : painted ? '#bdb6aa' : '#6b5a4a'} cast={false} />
      <TierDressing tier={tier} w={w} d={d} on={visible} />
      {upg.includes('ac') && <WallMounted w={w} d={d} t={0.72} y={2.35}><AirCon /></WallMounted>}
      {upg.includes('generator') && (
        <>
          <WallMounted w={w} d={d} t={0.12} y={1.5}><SolarInverter /></WallMounted>
          <Part g="sphere" p={[w / 4, 2.8, d / 4]} s={0.1} m={bulbMat} cast={false} />
          <Part g="sphere" p={[(3 * w) / 4, 2.8, (3 * d) / 4]} s={0.1} m={bulbMat} cast={false} />
          <pointLight position={[w / 4, 2.5, d / 4]} intensity={visible ? 5 : 0} distance={10} color="#fff4dc" />
        </>
      )}
      <Walls w={w} d={d} color={wallColor} h={3} skin={look.skin} />
      <pointLight position={[w / 2, 2.4, d / 2]} intensity={visible ? look.light.intensity : 0} distance={18} color={look.light.color} />

      <group
        position={[lay.door.x + 0.5, 0.11, lay.door.y + 0.5]}
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta > 6) return
          if (!useUI.getState().holdingUid && !useUI.getState().dragUid) useGame.getState().exitHome()
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}
      >
        <Part p={[0, 0, 0]} s={[0.9, 0.04, 0.9]} c="#35d07f" />
        <Label id="home-exit" y={0.6} cls="loc-label sel" text="🚪 Exit" />
      </group>

      {/* floor: walk, place or drop */}
      <mesh
        position={[w / 2, 0.11, d / 2]}
        rotation-x={-Math.PI / 2}
        onPointerMove={(e) => { const u = useUI.getState(); if (u.dragUid !== null || u.holdingUid !== null) setC(e) }}
        onPointerDown={(e) => { const u = useUI.getState(); if (u.dragUid !== null || u.holdingUid !== null) setC(e) }}
        onClick={(e) => {
          if (e.delta > 6) return
          const ui = useUI.getState()
          if (ui.holdingUid !== null && moving) {
            // compute from the tap itself (on touch there is no hover to place the ghost first)
            const fp = footprint(moving.type, ui.holdRot)
            const x = Math.floor(e.point.x - INTERIOR_ORIGIN.x) - Math.floor((fp.w - 1) / 2)
            const y = Math.floor(e.point.z - INTERIOR_ORIGIN.z) - Math.floor((fp.d - 1) / 2)
            setC(e as unknown as ThreeEvent<PointerEvent>)
            if (useGame.getState().placeFurniture(ui.holdingUid, x, y, ui.holdRot)) {
              useUI.setState({ holdingUid: null })
              setCursor(null)
            }
            return
          }
          useUI.setState({ selectedFurniture: null })
          if (!runtime.frozen) runtime.insideTarget = { x: e.point.x - INTERIOR_ORIGIN.x, z: e.point.z - INTERIOR_ORIGIN.z }
        }}
      >
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {items.map((it) => (
        <Item
          key={it.id}
          item={it}
          selected={selected === it.id}
          dragging={dragUid === it.id || holdingUid === it.id}
          net={upg.includes('net')}
          onDragStart={() => {
            const ui = useUI.getState()
            // drag in Move & decorate, or in Use mode once the piece is selected
            if ((!ui.editMode && ui.selectedFurniture !== it.id) || ui.holdingUid) return false
            useUI.setState({ dragUid: it.id, holdRot: it.rot, selectedFurniture: it.id })
            setCursor({ x: it.x + Math.floor((footprint(it.type, it.rot).w - 1) / 2), y: it.y + Math.floor((footprint(it.type, it.rot).d - 1) / 2) })
            return true
          }}
          onClick={() => {
            const ui = useUI.getState()
            if (ui.holdingUid || ui.dragUid) return
            useUI.setState({ selectedFurniture: it.id, panel: 'home' })
          }}
        />
      ))}

      <SelectionAnchor items={items} />
      {ghost && moving && (
        <group position={[ghost.x + ghost.fp.w / 2, 0.12, ghost.y + ghost.fp.d / 2]}>
          <group rotation={[0, (-holdRot * Math.PI) / 2, 0]}>
            <FurnitureModel type={moving.type} />
          </group>
          <mesh position={[0, 0.03, 0]} scale={[ghost.fp.w - 0.05, 0.05, ghost.fp.d - 0.05]}>
            <boxGeometry />
            <meshBasicMaterial color={ghost.ok ? '#35d07f' : '#e0524a'} transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      <PetFollower getTarget={() => ({ x: cur.current.x, z: cur.current.z, rot: player.current?.rotation.y ?? 0, moving: motion.current.moving })} />
      <group ref={player} position={[lay.door.x + 0.5, 0.12, lay.door.y + 0.3]}>
        <Character appearance={profile?.appearance ?? DEFAULT_APPEARANCE} getMotion={() => motion.current} />
        {hookup && activity?.defId === 'intimate' && (
          <group position={[0.5, 0, 0.05]}>
            <Character appearance={hookup.look} getMotion={() => motion.current} />
            <Label id="home-hookup" y={1.6} cls="npc-tag" text={`💞 ${hookup.name}`} />
          </group>
        )}
        {pctShown !== null && activity && <Label id="home-bubble" y={1.9} cls="bubble" text={`${activity.icon} ${pctShown}%`} />}
      </group>
    </group>
  )
}

function shade(hex: string, k = 0.93) {
  const c = new THREE.Color(hex)
  c.multiplyScalar(k)
  return `#${c.getHexString()}`
}
