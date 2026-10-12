'use client'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { ADS, billboards } from '@/game/world'
import { GEO, getMat, viewCenter } from './shared'

/** Ad artwork per ADS entry: [background, accent, text]. */
const STYLE: [string, string, string][] = [
  ['#0e7a3a', '#fcd116', '#ffffff'],
  ['#1b1b1b', '#f2b134', '#f2b134'],
  ['#1f3a8a', '#ff5a5f', '#ffffff'],
  ['#e0524a', '#ffffff', '#ffffff'],
  ['#ffd166', '#ce1126', '#4a2511'],
  ['#2d1b4e', '#ff2d95', '#ffffff'],
  ['#e3f1e8', '#2f8a5a', '#1d4d33'],
  ['#ffffff', '#ce1126', '#1b1b1b'],
  ['#ce1126', '#fcd116', '#ffffff'],
  ['#006b3f', '#ce1126', '#fcd116'],
]

/** One shared canvas texture per ad, so many billboards cost a handful of textures. */
const texCache = new Map<number, THREE.CanvasTexture>()
function adTexture(ad: number): THREE.CanvasTexture {
  const hit = texCache.get(ad)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 272
  const g = c.getContext('2d')!
  const [bg, accent, fg] = STYLE[ad % STYLE.length]
  g.fillStyle = bg
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = accent
  g.fillRect(0, c.height - 34, c.width, 34)
  g.beginPath()
  g.arc(c.width - 40, 40, 70, 0, Math.PI * 2)
  g.fill()
  const [head, tail] = ADS[ad].split(' — ')
  g.fillStyle = fg
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const fit = (t: string, max: number) => Math.min(max, (c.width * 1.7) / Math.max(6, t.length))
  g.font = `900 ${fit(head, 64)}px ui-rounded, system-ui, sans-serif`
  g.fillText(head, c.width / 2, tail ? 100 : 120)
  if (tail) {
    g.font = `700 ${fit(tail, 40)}px ui-rounded, system-ui, sans-serif`
    g.fillText(tail, c.width / 2, 170)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  texCache.set(ad, t)
  return t
}

const matCache = new Map<number, THREE.MeshBasicMaterial>()
const adMat = (ad: number) => {
  let m = matCache.get(ad)
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: adTexture(ad), toneMapped: false })
    matCache.set(ad, m)
  }
  return m
}

const PANEL_W = 3
const PANEL_H = 1.6
const PANEL_Y = 2.2 + PANEL_H / 2

/** Roadside ad hoardings on two steel legs, hidden when far from the camera. */
export function Billboards() {
  const refs = useRef<(THREE.Group | null)[]>([])
  const timer = useRef(1)
  useFrame((_, dt) => {
    timer.current += dt
    if (timer.current < 0.3) return
    timer.current = 0
    billboards.forEach((b, i) => {
      const g = refs.current[i]
      if (g) g.visible = Math.hypot(b.x - viewCenter.x, b.z - viewCenter.z) < 60
    })
  })
  const steel = getMat('#59606b')
  return (
    <>
      {billboards.map((b, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }} position={[b.x, 0.1, b.z]} rotation={[0, b.rot, 0]}>
          {[-0.9, 0.9].map((x) => (
            <mesh key={x} geometry={GEO.cyl} material={steel} position={[x, 1.25, 0]} scale={[0.09, 2.5, 0.09]} castShadow />
          ))}
          <mesh geometry={GEO.box} material={steel} position={[0, PANEL_Y, -0.04]} scale={[PANEL_W + 0.16, PANEL_H + 0.16, 0.08]} castShadow />
          <mesh geometry={GEO.box} material={steel} position={[0, 2.12, 0.18]} scale={[PANEL_W, 0.04, 0.36]} />
          <mesh material={adMat(b.ad)} position={[0, PANEL_Y, 0.005]}>
            <planeGeometry args={[PANEL_W, PANEL_H]} />
          </mesh>
          <mesh material={adMat((b.ad + 3) % ADS.length)} position={[0, PANEL_Y, -0.085]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[PANEL_W, PANEL_H]} />
          </mesh>
        </group>
      ))}
    </>
  )
}
