'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '@/game/audio'
import { isOpen } from '@/game/activities'
import { GAME_CONFIG, formatMoney, hourOf } from '@/game/config'
import { AREA_BY_ID, DESTINATIONS, DEST_BY_ID, NPCS, RIDES, type RideMode } from '@/game/content'
import { rideQuote, trotroPlan, walkMinutes } from '@/game/life'
import { poiColor } from '@/game/poi'
import { takeTrotro, walkToDest } from '@/game/nav'
import { runtime } from '@/game/runtime'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import { AREA_LABELS, G, MAP_H, MAP_W, ROAD_NAMES, fillers, footbridges, ground, roadClassAt, roadRoute, type RoadClass } from '@/game/world'

/* --------------------------- base map (drawn once) --------------------------- */
const PX = 6 // pixels per tile in the base image
const LAND: Record<number, string> = {
  [G.GRASS]: '#d6ecc6',
  [G.SIDEWALK]: '#f2efe9',
  [G.PLAZA]: '#efece6',
  [G.BOARDWALK]: '#e9dcc4',
  [G.SAND]: '#f6ecca',
  [G.WATER]: '#a7d8f5',
  [G.DIRT]: '#f2ede4',
  [G.FOREST]: '#bfe2b0',
  [G.CONCRETE]: '#e6e4e0',
}
const ROAD_FILL: Record<RoadClass, string> = { motorway: '#f6b84a', highway: '#fbd96b', avenue: '#ffffff', street: '#ffffff', dirt: '#e6d3b3' }
const ROAD_EDGE: Record<RoadClass, string> = { motorway: '#d8892a', highway: '#e2b545', avenue: '#cfd3d9', street: '#d9dce1', dirt: '#d6bf97' }

let baseCache: HTMLCanvasElement | null = null
function baseMap(): HTMLCanvasElement {
  if (baseCache) return baseCache
  const c = document.createElement('canvas')
  c.width = MAP_W * PX
  c.height = MAP_H * PX
  const g = c.getContext('2d')!
  for (let z = 0; z < MAP_H; z++)
    for (let x = 0; x < MAP_W; x++) {
      const t = ground[z * MAP_W + x]
      if (t === G.ROAD) continue
      g.fillStyle = LAND[t] ?? '#f2efe9'
      g.fillRect(x * PX, z * PX, PX, PX)
    }
  // roads: casing first, then fill, so edges read like a real map
  const road = (pass: 'edge' | 'fill') => {
    for (let z = 0; z < MAP_H; z++)
      for (let x = 0; x < MAP_W; x++) {
        if (ground[z * MAP_W + x] !== G.ROAD) continue
        const rc = roadClassAt(x, z)
        g.fillStyle = pass === 'edge' ? ROAD_EDGE[rc] : ROAD_FILL[rc]
        const o = pass === 'edge' ? 1 : 0
        g.fillRect(x * PX - o, z * PX - o, PX + o * 2, PX + o * 2)
      }
  }
  road('edge')
  road('fill')
  // buildings
  g.fillStyle = '#e4dfd7'
  g.strokeStyle = '#d3cdc3'
  g.lineWidth = 1
  for (const f of fillers) {
    g.fillRect(f.x * PX + 1, f.z * PX + 1, f.w * PX - 2, f.d * PX - 2)
    g.strokeRect(f.x * PX + 1.5, f.z * PX + 1.5, f.w * PX - 3, f.d * PX - 3)
  }
  for (const d of DESTINATIONS) {
    g.fillStyle = d.kind === 'park' || d.kind === 'beach' || d.kind === 'plot' ? '#c6e7b5' : '#ddd5ec'
    g.fillRect(d.x * PX + 1, d.z * PX + 1, d.w * PX - 2, d.d * PX - 2)
    g.strokeStyle = '#c4b8dc'
    g.strokeRect(d.x * PX + 1.5, d.z * PX + 1.5, d.w * PX - 3, d.d * PX - 3)
  }
  // footbridges
  g.strokeStyle = '#5f7f8f'
  g.lineWidth = 2
  for (const b of footbridges) {
    g.beginPath()
    if (b.axis === 'h') { g.moveTo((b.at + 0.5) * PX, (b.lo - 1) * PX); g.lineTo((b.at + 0.5) * PX, (b.hi + 2) * PX) }
    else { g.moveTo((b.lo - 1) * PX, (b.at + 0.5) * PX); g.lineTo((b.hi + 2) * PX, (b.at + 0.5) * PX) }
    g.stroke()
  }
  baseCache = c
  return c
}

/* --------------------------------- search --------------------------------- */
type Hit = { kind: 'place'; id: string; label: string; sub: string; icon: string } | { kind: 'spot'; label: string; sub: string; icon: string; x: number; z: number }
function search(q: string): Hit[] {
  const t = q.trim().toLowerCase()
  if (!t) return []
  const out: Hit[] = []
  for (const d of DESTINATIONS) {
    const area = AREA_BY_ID[d.area]?.name ?? ''
    if (`${d.name} ${d.kind} ${area}`.toLowerCase().includes(t)) out.push({ kind: 'place', id: d.id, label: d.name, sub: `${area} · ${d.kind}`, icon: d.emoji })
  }
  for (const a of AREA_LABELS) if (a.name.toLowerCase().includes(t)) out.push({ kind: 'spot', label: a.name, sub: 'Neighbourhood', icon: '🏘️', x: a.x, z: a.z })
  const seen = new Set<string>()
  for (const r of ROAD_NAMES) {
    if (seen.has(r.name) || !r.name.toLowerCase().includes(t)) continue
    seen.add(r.name)
    out.push({ kind: 'spot', label: r.name, sub: 'Road', icon: '🛣️', x: r.x, z: r.z })
  }
  // names starting with the query first
  return out.sort((a, b) => Number(!a.label.toLowerCase().startsWith(t)) - Number(!b.label.toLowerCase().startsWith(t))).slice(0, 12)
}

const KM_PER_TILE = 0.012
const fmtDist = (tiles: number) => {
  const m = Math.round((tiles * KM_PER_TILE * 1000) / 10) * 10
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
}

/* ---------------------------------- map ---------------------------------- */
export function CityMap({ onBack }: { onBack: () => void }) {
  const s = useGame()
  const wrap = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const meView = s.view === 'world' ? runtime.player : s.player
  /** Centre of the view in tiles and zoom in screen px per tile. */
  const view = useRef({ x: meView.x, z: meView.z, k: 5 })
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [route, setRoute] = useState<{ x: number; z: number }[] | null>(null)
  const hits = useMemo(() => search(q), [q])
  const selRef = useRef(sel)
  selRef.current = sel
  const routeRef = useRef(route)
  routeRef.current = route

  // draw loop
  useEffect(() => {
    let raf = 0
    const base = baseMap()
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const c = cv.current
      const box = wrap.current
      if (!c || !box) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = box.clientWidth
      const H = box.clientHeight
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr) }
      const g = c.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const v = view.current
      const sx = (x: number) => (x - v.x) * v.k + W / 2
      const sz = (z: number) => (z - v.z) * v.k + H / 2
      g.fillStyle = '#a7d8f5'
      g.fillRect(0, 0, W, H)
      g.imageSmoothingEnabled = v.k < PX
      g.drawImage(base, sx(0), sz(0), MAP_W * v.k, MAP_H * v.k)
      // route
      const rt = routeRef.current
      if (rt && rt.length > 1) {
        for (const [col, wd] of [['#ffffff', 7], ['#4285f4', 4.5]] as const) {
          g.strokeStyle = col
          g.lineWidth = wd
          g.lineJoin = 'round'
          g.lineCap = 'round'
          g.beginPath()
          rt.forEach((p, i) => (i ? g.lineTo(sx(p.x), sz(p.z)) : g.moveTo(sx(p.x), sz(p.z))))
          g.stroke()
        }
      }
      // labels
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      const text = (t: string, x: number, y: number, font: string, fill: string) => {
        g.font = font
        g.lineWidth = 3
        g.strokeStyle = 'rgba(255,255,255,0.9)'
        g.strokeText(t, x, y)
        g.fillStyle = fill
        g.fillText(t, x, y)
      }
      if (v.k < 9) for (const a of AREA_LABELS) text(a.name.toUpperCase(), sx(a.x), sz(a.z), `700 ${v.k < 3.5 ? 9 : 11}px system-ui`, '#5b6470')
      if (v.k >= 4) {
        const seen = new Set<string>()
        for (const r of ROAD_NAMES) if (!seen.has(r.name + Math.round(r.x / 60))) { seen.add(r.name + Math.round(r.x / 60)); text(r.name, sx(r.x), sz(r.z), 'italic 600 10px system-ui', '#7a6a4a') }
      }
      // pins
      const selId = selRef.current
      for (const d of DESTINATIONS) {
        const px = sx(d.door.x + 0.5)
        const py = sz(d.door.z + 0.5)
        if (px < -20 || py < -30 || px > W + 20 || py > H + 20) continue
        const on = d.id === selId
        const col = poiColor(d.kind)
        if (!on && v.k < 3.2) {
          // zoomed out: small category dots with a white ring
          g.fillStyle = '#ffffff'
          g.beginPath(); g.arc(px, py, 3.6, 0, Math.PI * 2); g.fill()
          g.fillStyle = col
          g.beginPath(); g.arc(px, py, 2.6, 0, Math.PI * 2); g.fill()
          continue
        }
        if (on) {
          // selected: big red teardrop pin standing on the door
          const r = 15
          const cy = py - r - 9
          g.save()
          g.shadowColor = 'rgba(0,0,0,0.35)'
          g.shadowBlur = 6
          g.shadowOffsetY = 2
          g.fillStyle = '#ea4335'
          g.beginPath()
          g.arc(px, cy, r, Math.PI * 0.78, Math.PI * 2.22)
          g.quadraticCurveTo(px + r * 0.35, cy + r * 1.05, px, py)
          g.quadraticCurveTo(px - r * 0.35, cy + r * 1.05, px - r * Math.cos(Math.PI * 0.22), cy + r * Math.sin(Math.PI * 0.22))
          g.fill()
          g.restore()
          g.strokeStyle = '#b3261e'
          g.lineWidth = 1
          g.stroke()
          g.fillStyle = '#ffffff'
          g.beginPath(); g.arc(px, cy, r - 3.5, 0, Math.PI * 2); g.fill()
          g.font = '15px system-ui'
          g.fillText(d.emoji, px, cy + 1)
          text(d.name, px, py + 9, '700 12.5px system-ui', '#b3261e')
          continue
        }
        // round category badge with a white ring, like Google Maps POIs
        const r = v.k >= 7 ? 10 : 8.5
        g.save()
        g.shadowColor = 'rgba(0,0,0,0.3)'
        g.shadowBlur = 3
        g.shadowOffsetY = 1
        g.fillStyle = '#ffffff'
        g.beginPath(); g.arc(px, py - r, r + 1.6, 0, Math.PI * 2); g.fill()
        g.restore()
        g.fillStyle = col
        g.beginPath(); g.arc(px, py - r, r, 0, Math.PI * 2); g.fill()
        g.font = `${Math.round(r * 1.15)}px system-ui`
        g.fillText(d.emoji, px, py - r + 1)
        if (v.k >= 6) {
          // name beside the badge in the category colour, white halo
          g.textAlign = 'left'
          text(d.name, px + r + 4, py - r, `600 ${v.k >= 9 ? 11 : 10}px system-ui`, col)
          g.textAlign = 'center'
        }
      }
      // you
      const me = useGame.getState().view === 'world' ? runtime.player : useGame.getState().player
      const mx = sx(me.x)
      const my = sz(me.z)
      const pulse = 10 + 4 * Math.sin(performance.now() / 300)
      g.fillStyle = 'rgba(66,133,244,0.2)'
      g.beginPath(); g.arc(mx, my, pulse, 0, Math.PI * 2); g.fill()
      g.fillStyle = '#ffffff'
      g.beginPath(); g.arc(mx, my, 7, 0, Math.PI * 2); g.fill()
      g.fillStyle = '#4285f4'
      g.beginPath(); g.arc(mx, my, 5, 0, Math.PI * 2); g.fill()
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  const flyTo = (x: number, z: number, k = Math.max(view.current.k, 7)) => {
    const v = view.current
    const from = { ...v }
    const t0 = performance.now()
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / 450)
      const e = 1 - (1 - t) ** 3
      v.x = from.x + (x - from.x) * e
      v.z = from.z + (z - from.z) * e
      v.k = from.k + (k - from.k) * e
      if (t < 1) requestAnimationFrame(step)
    }
    step()
  }
  const zoomAt = (f: number, cx?: number, cy?: number) => {
    const v = view.current
    const box = wrap.current
    if (!box) return
    const W = box.clientWidth
    const H = box.clientHeight
    const px = cx ?? W / 2
    const py = cy ?? H / 2
    // keep the point under the cursor fixed
    const wx = v.x + (px - W / 2) / v.k
    const wz = v.z + (py - H / 2) / v.k
    v.k = Math.min(22, Math.max(1.6, v.k * f))
    v.x = wx - (px - W / 2) / v.k
    v.z = wz - (py - H / 2) / v.k
  }
  const pick = (id: string) => {
    const d = DEST_BY_ID[id]
    setSel(id)
    setRoute(null)
    setFocus(false)
    setQ(d.name)
    flyTo(d.door.x + 0.5, d.door.z + 0.5)
    sfx('click')
  }

  // gestures: drag to pan, pinch / wheel to zoom, tap a pin to select
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(0)
  const pinch = useRef(0)
  const onDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = 0
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const onMove = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId)
    if (!p) return
    const v = view.current
    if (ptrs.current.size === 1) {
      v.x -= (e.clientX - p.x) / v.k
      v.z -= (e.clientY - p.y) / v.k
      moved.current += Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y)
    }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current) zoomAt(dist / pinch.current)
      pinch.current = dist
      moved.current = 99
    }
  }
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size < 2) pinch.current = 0
    if (moved.current > 6 || !wrap.current) return
    // tap: nearest pin within reach
    const r = wrap.current.getBoundingClientRect()
    const v = view.current
    const wx = v.x + (e.clientX - r.left - r.width / 2) / v.k
    const wz = v.z + (e.clientY - r.top - r.height / 2) / v.k
    let best: string | null = null
    let bd = 22 / v.k
    for (const d of DESTINATIONS) {
      const dd = Math.hypot(d.door.x + 0.5 - wx, d.door.z + 0.5 - (wz + 14 / v.k))
      if (dd < bd) { bd = dd; best = d.id }
    }
    if (best) pick(best)
    else { setSel(null); setRoute(null) }
  }
  const onWheel = (e: React.WheelEvent) => {
    const r = wrap.current!.getBoundingClientRect()
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top)
  }

  const d = sel ? DEST_BY_ID[sel] : null
  const h = hourOf(s.minutes)
  const open = d ? (d.hours[0] === 0 && d.hours[1] === 24) || isOpen(d.hours, h) : false
  const me = s.view === 'world' ? runtime.player : s.player
  const showRoute = () => {
    if (!d) return
    setRoute(roadRoute(me.x, me.z, d.door.x + 0.5, d.door.z + 0.5))
    sfx('click')
  }
  const go = () => {
    if (!d) return
    useUI.setState({ trackedDest: d.id, panel: 'none' })
    walkToDest(d.id)
  }
  const ride = (mode: RideMode) => {
    if (!d) return
    sfx('start')
    useUI.setState({ trackedDest: d.id })
    useGame.getState().startRide(mode, d.id)
  }

  return (
    <div className="ios-app-view gmap-view">
      <div className="gmap" ref={wrap} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
        <canvas ref={cv} />
      </div>

      <div className="gmap-top">
        <div className={`gmap-search ${focus && hits.length ? 'open' : ''}`}>
          <button className="gmap-back" aria-label="Back" onClick={() => { sfx('click'); onBack() }}>‹</button>
          <input
            placeholder={`Search ${GAME_CONFIG.cityName}`}
            value={q}
            onFocus={() => setFocus(true)}
            onChange={(e) => { setQ(e.target.value); setFocus(true) }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !hits[0]) return
              const h0 = hits[0]
              if (h0.kind === 'place') pick(h0.id)
              else { flyTo(h0.x, h0.z, 6); setFocus(false) }
            }}
          />
          {q && <button className="gmap-clear" aria-label="Clear search" onClick={() => { setQ(''); setSel(null); setRoute(null) }}>✕</button>}
        </div>
        {focus && hits.length > 0 && (
          <ul className="gmap-results">
            {hits.map((hit, i) => (
              <li key={i}>
                <button onClick={() => (hit.kind === 'place' ? pick(hit.id) : (flyTo(hit.x, hit.z, 6), setFocus(false), setQ(hit.label)))}>
                  <span className="gmap-ico">{hit.icon}</span>
                  <span><b>{hit.label}</b><small>{hit.sub}</small></span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!focus && !d && (
          <div className="gmap-chips">
            {[['🍲', 'Food', 'chop'], ['🏥', 'Hospital', 'hospital'], ['🛍️', 'Market', 'market'], ['🏖️', 'Beach', 'beach'], ['🏦', 'Bank', 'bank']].map(([ic, label, kw]) => (
              <button key={label} onClick={() => { setQ(kw); setFocus(true) }}>{ic} {label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="gmap-ctrl">
        <button aria-label="Zoom in" onClick={() => zoomAt(1.4)}>＋</button>
        <button aria-label="Zoom out" onClick={() => zoomAt(1 / 1.4)}>－</button>
        <button aria-label="My location" className="loc" onClick={() => flyTo(me.x, me.z)}>◎</button>
      </div>

      {!d && (
        <div className="gmap-legend">
          <span><i style={{ background: ROAD_FILL.motorway, borderColor: ROAD_EDGE.motorway }} />Motorway</span>
          <span><i style={{ background: ROAD_FILL.highway, borderColor: ROAD_EDGE.highway }} />Highway</span>
          <span><i style={{ background: '#fff', borderColor: '#cfd3d9' }} />Road</span>
          <span><i style={{ background: ROAD_FILL.dirt, borderColor: ROAD_EDGE.dirt }} />Dirt road</span>
          <span><i className="fb" />Footbridge</span>
        </div>
      )}

      {d && (
        <div className="gmap-card">
          <div className="gmap-card-head">
            <span className="gmap-card-ico" style={{ background: poiColor(d.kind) }}>{d.emoji}</span>
            <div>
              <b>{d.name}</b>
              <small>{AREA_BY_ID[d.area]?.name} · <span className={open ? 'green-t' : 'red-t'}>{open ? 'Open' : 'Closed'}</span> · {d.hours[0] === 0 && d.hours[1] === 24 ? '24 hours' : `${d.hours[0]}:00–${d.hours[1] === 24 ? '00' : d.hours[1]}:00`}</small>
            </div>
            <button className="gmap-x" aria-label="Close" onClick={() => { setSel(null); setRoute(null); setQ('') }}>✕</button>
          </div>
          <small className="gmap-blurb">{d.blurb}{d.npcs.length ? ` People: ${d.npcs.map((n) => NPCS.find((x) => x.id === n)?.name).join(', ')}.` : ''}</small>
          <div className="gmap-btns">
            <button className="primary" disabled={!!s.activity} onClick={go}>🧭 Go</button>
            <button onClick={showRoute}>↱ Directions</button>
            <button onClick={() => { useUI.setState({ trackedDest: d.id }); sfx('click') }}>📍 Track</button>
          </div>
          {route && (
            <div className="gmap-modes">
              <button disabled={!!s.activity} onClick={() => { useUI.setState({ trackedDest: d.id, panel: 'none' }); walkToDest(d.id, true, true) }}>
                🚶<b>{walkMinutes(s, d.id)} min</b><small>{fmtDist(Math.hypot(me.x - d.door.x, me.z - d.door.z))}</small>
              </button>
              {(() => {
                const tro = trotroPlan({ player: me, minutes: s.minutes }, d.id)
                return tro ? (
                  <button disabled={!!s.activity || s.money < tro.ride.fare} title={`Walk to ${DEST_BY_ID[tro.from].name}, ride to ${DEST_BY_ID[tro.to].name}`} onClick={() => { sfx('coin'); takeTrotro(d.id) }}>
                    🚐<b>{tro.total} min</b><small>{formatMoney(tro.ride.fare)}</small>
                  </button>
                ) : null
              })()}
              {(['okada', 'taxi', 'ride'] as RideMode[]).map((m) => {
                const qt = rideQuote({ player: me, minutes: s.minutes }, m, d.id)
                return (
                  <button key={m} disabled={!!s.activity || s.money < qt.fare} onClick={() => ride(m)}>
                    {RIDES[m].emoji}<b>{qt.minutes} min</b><small>{formatMoney(qt.fare)}</small>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
