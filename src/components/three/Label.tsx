'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { create } from 'zustand'
import { labelScale, viewCenter } from './shared'

/**
 * Lightweight screen-space labels. 3D code places <Label> anchors; a single DOM layer
 * (<LabelLayer>, outside the canvas) renders them and <LabelProjector> moves them each frame.
 */
interface LabelEntry {
  text: string
  cls: string
  /** Map-pin style: category glyph and colour shown in a badge before the text. */
  icon?: string
  color?: string
  tappable?: boolean
}
export const useLabels = create<{ items: Record<string, LabelEntry> }>(() => ({ items: {} }))
const anchors = new Map<string, THREE.Object3D>()
const ranges = new Map<string, number>()
const els = new Map<string, HTMLDivElement>()
const taps = new Map<string, () => void>()

export function Label({ id, text, cls = 'loc-label', y = 0, range = 55, icon, color, onTap }: { id: string; text: string; cls?: string; y?: number; range?: number; icon?: string; color?: string; onTap?: () => void }) {
  const ref = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    if (ref.current) anchors.set(id, ref.current)
    ranges.set(id, range)
    return () => {
      anchors.delete(id)
      ranges.delete(id)
      useLabels.setState((s) => {
        const items = { ...s.items }
        delete items[id]
        return { items }
      })
    }
  }, [id])
  useEffect(() => {
    if (onTap) taps.set(id, onTap)
    else taps.delete(id)
    return () => { taps.delete(id) }
  }, [id, onTap])
  useEffect(() => {
    useLabels.setState((s) => ({ items: { ...s.items, [id]: { text, cls, icon, color, tappable: !!onTap } } }))
  }, [id, text, cls, icon, color, onTap])
  return <group ref={ref} position={[0, y, 0]} />
}

const v = new THREE.Vector3()
const lastTf = new Map<string, string>()
export function LabelProjector() {
  const { camera, size } = useThree()
  useFrame(() => {
    anchors.forEach((obj, id) => {
      const el = els.get(id)
      if (!el) return
      // cheap distance test first (world matrices are already current), then walk up for hidden parents
      v.setFromMatrixPosition(obj.matrixWorld)
      let vis = Math.hypot(v.x - viewCenter.x, v.z - viewCenter.z) <= (ranges.get(id) ?? 55) * labelScale.v
      let o: THREE.Object3D | null = vis ? obj : null
      while (o) {
        if (!o.visible) {
          vis = false
          break
        }
        o = o.parent
      }
      if (vis) {
        v.project(camera)
        vis = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15
      }
      if (!vis) {
        if (el.style.display !== 'none') el.style.display = 'none'
        return
      }
      if (el.style.display === 'none') el.style.display = ''
      const tf = `translate3d(${Math.round(((v.x + 1) / 2) * size.width)}px, ${Math.round(((1 - v.y) / 2) * size.height)}px, 0) translate(-50%, -100%)`
      // browsers normalise style strings, so compare against what we last wrote
      if (lastTf.get(id) !== tf) {
        lastTf.set(id, tf)
        el.style.transform = tf
        el.style.zIndex = String(Math.round((1 - v.z) * 1000))
      }
    })
  })
  return null
}

export function LabelLayer() {
  const items = useLabels((s) => s.items)
  return (
    <div className="label-layer" aria-hidden>
      {Object.entries(items).map(([id, it]) => (
        <div
          key={id}
          ref={(el) => {
            if (el) els.set(id, el)
            else els.delete(id)
          }}
          className={`lbl3d ${it.cls}${it.tappable ? ' tappable' : ''}`}
          style={{ display: 'none', ...(it.color ? { ['--poi' as string]: it.color } : null) }}
          onClick={it.tappable ? () => taps.get(id)?.() : undefined}
        >
          {it.icon ? (
            <>
              <span className="poi-badge"><i>{it.icon}</i></span>
              <span className="poi-name">{it.text}</span>
            </>
          ) : (
            it.text
          )}
        </div>
      ))}
    </div>
  )
}

/** Text painted onto a plane (signs, boards, neon). */
export function TextPlane({ w, h, title, lines = [], bg, color, neon }: { w: number; h: number; title: string; lines?: string[]; bg?: string; color: string; neon?: string }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = Math.round((1024 * h) / w)
    const g = c.getContext('2d')!
    if (bg) {
      g.fillStyle = bg
      g.fillRect(0, 0, c.width, c.height)
    }
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = color
    if (neon) {
      g.shadowColor = neon
      g.shadowBlur = 30
    }
    const rows = [title, ...lines]
    const lh = c.height / (rows.length + 0.6)
    rows.forEach((r, i) => {
      g.font = `${i === 0 ? 800 : 600} ${Math.min(lh * (i === 0 ? 0.75 : 0.6), (c.width / Math.max(8, r.length)) * 1.7)}px ui-rounded, 'Chalkboard SE', system-ui, sans-serif`
      g.fillText(r, c.width / 2, lh * (i + 0.8))
      if (neon) g.fillText(r, c.width / 2, lh * (i + 0.8))
    })
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [w, h, title, lines, bg, color, neon])
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  )
}
