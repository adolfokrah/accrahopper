'use client'
import dynamic from 'next/dynamic'
import { Component, useEffect, type ReactNode } from 'react'
import { armAudioUnlock, setMood, syncMusic } from '@/game/audio'
import { hourOf } from '@/game/config'
import { BALANCE } from '@/game/config'
import { enterHere, findMyCharacter } from '@/game/nav'
import { crosswalkAt } from '@/game/lanes'
import { placeOnRide, rideShouldHold, rotateCam, runtime, stepMovement } from '@/game/runtime'
import { isRoad, junctionCenter, junctionId, junctions, lightFor, nearestJunction, vStreetAt } from '@/game/world'
import { areaAt } from '@/game/content'
import { saveNow } from '@/game/save'
import { restoreSession, useAccount } from '@/game/net/account'
import { getNetAdapter, pruneStale } from '@/game/net/remotes'
import { useGame } from '@/game/store'
import { hydrateSettings, useUI } from '@/game/ui'
import { Creator } from './Creator'
import { HUD } from './HUD'
import { Menu } from './Menu'

const LabelLayer = dynamic(() => import('./three/Label').then((m) => m.LabelLayer), { ssr: false })

const World3D = dynamic(() => import('./three/World3D'), {
  ssr: false,
  loading: () => <div className="boot">Loading the city…</div>,
})

/** Catches crashes in the 3D view. Retries once by itself, then offers a reload button.
 *  A render error is not a missing-WebGL problem, so it never shows the "unavailable" card. */
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  private retried = false
  private timer: ReturnType<typeof setTimeout> | null = null
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('[City Stories] 3D view crashed:', error)
    if (!this.retried) {
      this.retried = true
      this.timer = setTimeout(() => this.reload(), 1000)
    }
  }
  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer)
  }
  reload = () => {
    useUI.setState((s) => ({ viewKey: s.viewKey + 1 }))
    this.setState({ error: null })
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="boot nowebgl">
        <div className="card">
          <h2>Something went wrong drawing the city</h2>
          <p><code>{this.state.error.message || String(this.state.error)}</code></p>
          <button className="btn" onClick={this.reload}>Reload view</button>
        </div>
      </div>
    )
  }
}

function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    // free the probe context so it does not count against the browser's context limit
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

const KEYMAP: Record<string, keyof typeof runtime.keys> = {
  w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right',
}

export default function GameRoot() {
  const screen = useGame((s) => s.screen)
  const webgl = useUI((s) => s.webgl)
  const viewKey = useUI((s) => s.viewKey)
  const gfx = useUI((s) => s.gfx)
  const settings = useUI((s) => s.settings)

  // boot: settings + WebGL capability
  useEffect(() => {
    hydrateSettings()
    useUI.setState({ webgl: detectWebGL() ? 'ok' : 'failed' })
    void restoreSession()
  }, [])

  useEffect(() => {
    syncMusic()
  }, [settings.music, settings.master, settings.musicVolume])
  useEffect(() => armAudioUnlock(), [])
  // music mood follows the time of day and where you are
  const inClub = useGame((s) => s.view === 'inside' && s.insideDest === 'lounge')
  const night = useGame((s) => { const h = hourOf(s.minutes); return h >= 19 || h < 6 })
  useEffect(() => setMood(inClub ? 'club' : night ? 'night' : 'day'), [inClub, night])

  // main loop: movement every frame, simulation at 10 Hz
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    let sync = 0
    let wasOnRoad = false
    let warnedJaywalk = false
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.25, (t - last) / 1000)
      last = t
      const g = useGame.getState()
      const ui = useUI.getState()
      const frozen = g.screen !== 'game' || ui.panel === 'settings' || !!g.event || !!ui.dialog
      const busy = frozen || !!g.activity || g.view !== 'world'
      stepMovement(dt, !busy)
      runtime.lightT += dt
      if (g.activity?.kind === 'travel' && runtime.ride) {
        const frac = g.activity.done / g.activity.total
        runtime.ride.holding = !frozen && rideShouldHold(frac, (j, axis) => lightFor(j, axis, runtime.lightT), junctionId)
        // forget a red light we ran once we are clear of that junction
        if (runtime.runRedAt >= 0) {
          const j = junctions[runtime.runRedAt]
          if (j && Math.hypot(runtime.player.x - junctionCenter(j).x, runtime.player.z - junctionCenter(j).z) > 3 && junctionId(Math.floor(runtime.player.x), Math.floor(runtime.player.z)) < 0) runtime.runRedAt = -1
        }
        placeOnRide(frac)
      }
      if (g.screen !== 'game') return
      // the shared world clock never stops, even with a panel or dialog open
      acc += dt
      if (acc >= 0.1) {
        g.tick()
        acc = 0
      }
      // jaywalking: stepping onto a road while its traffic has green, near police, can get you stopped
      if (g.view === 'world' && !g.activity && !frozen) {
        const tx = Math.floor(runtime.player.x)
        const tz = Math.floor(runtime.player.z)
        const onRoad = isRoad(tx, tz)
        if (onRoad && !wasOnRoad) {
          const cw = crosswalkAt(tx, tz)
          const j = cw ? cw.j : nearestJunction(tx, tz, 8)
          // only signalised junctions have a light to break
          if (j >= 0 && junctions[j]?.signal) {
            // on a zebra crossing the relevant traffic is the one being crossed
            const axis = cw ? cw.axis : vStreetAt(tx) >= 0 ? 'ns' : 'ew'
            if (lightFor(j, axis, runtime.lightT) === 'green') {
              const style = areaAt(tx, tz).style
              const policed = style === 'business' || areaAt(tx, tz).id === 'circle'
              if (!warnedJaywalk) {
                warnedJaywalk = true
                useUI.getState().toast('🚦 Cars have green here. Cross when their light is red, or police may stop you.', 'warn')
              } else if (policed && Math.random() < 0.15) g.policeStop('jaywalking')
            }
          }
        }
        wasOnRoad = onRoad
      }
      sync += dt
      if (sync >= 0.2) {
        sync = 0
        useGame.getState().syncPlayer()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // multiplayer presence: up to 5x/second while moving, plus a heartbeat so idle players stay visible
  useEffect(() => {
    let last = { x: 0, z: 0, view: '', action: '' as string | null, at: 0 }
    const id = setInterval(() => {
      pruneStale()
      const net = getNetAdapter()
      const g = useGame.getState()
      const selfId = useAccount.getState().user?.id
      if (!net.online || !selfId || g.screen !== 'game' || !g.profile) return
      const p = runtime.player
      const action = g.activity?.defId ?? null
      const still = Math.abs(p.x - last.x) < 0.05 && Math.abs(p.z - last.z) < 0.05 && last.view === g.view && last.action === action
      if (still && Date.now() - last.at < 5000) return
      last = { x: p.x, z: p.z, view: g.view, action, at: Date.now() }
      net.publish({ id: selfId, name: g.profile.name, appearance: g.profile.appearance, x: p.x, z: p.z, rot: p.rot, moving: p.moving, action, view: g.view, place: g.insideDest, ts: Date.now() })
    }, 200)
    return () => clearInterval(id)
  }, [])

  // keyboard
  useEffect(() => {
    const typing = (e: KeyboardEvent) => ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey) return
      const k = e.key.toLowerCase()
      if (KEYMAP[k]) {
        runtime.keys[KEYMAP[k]] = true
        if (k.startsWith('arrow')) e.preventDefault()
        return
      }
      const g = useGame.getState()
      if (g.screen !== 'game') return
      if (k === 'escape') {
        const ui = useUI.getState()
        if (ui.holdingUid) useUI.setState({ holdingUid: null })
        else if (ui.panel !== 'none') useUI.setState({ panel: 'none', selectedDest: null })
        else ui.setPanel('settings')
      } else if (k === 'f') findMyCharacter()
      else if (k === 'q') rotateCam(-1)
      else if (k === 'e' && e.shiftKey) rotateCam(1)
      else if (k === 'r' && !useUI.getState().holdingUid && !useUI.getState().dragUid) rotateCam(1)
      else if (k === 'e' && !g.activity) {
        if (g.view === 'inside') g.exitBuilding()
        else if (g.view === 'home') g.exitHome()
        else if (g.nearDest) enterHere(g.nearDest)
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (KEYMAP[k]) runtime.keys[KEYMAP[k]] = false
    }
    const blur = () => {
      runtime.keys.up = runtime.keys.down = runtime.keys.left = runtime.keys.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // autosave: interval, tab hide, after results
  useEffect(() => {
    const auto = () => { if (useUI.getState().settings.autosave) void saveNow() }
    const leave = () => { if (useUI.getState().settings.autosave) void saveNow(true) }
    const id = setInterval(auto, BALANCE.autosaveSeconds * 1000)
    const vis = () => document.hidden && leave()
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', leave)
    const unsub = useGame.subscribe((s, prev) => {
      if (s.result && s.result !== prev.result) auto()
    })
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', leave)
      unsub()
    }
  }, [])


  return (
    <div className="app" data-large={settings.largeText} data-contrast={settings.highContrast} data-reduce={settings.reduceMotion} data-screen={screen}>
      <div className="stage">
        {webgl === 'unknown' ? (
          <div className="boot">Loading…</div>
        ) : webgl === 'failed' ? (
          <div className="boot nowebgl">
            <div className="card">
              <h2>3D graphics unavailable</h2>
              <p>City Stories needs WebGL. Turn on hardware acceleration in your browser settings, or try an up-to-date Chrome, Safari, Edge or Firefox.</p>
            </div>
          </div>
        ) : (
          <Boundary>
            <World3D key={viewKey} onFail={() => useUI.setState({ webgl: 'failed' })} />
            {gfx === 'lost' && <div className="boot gfx-lost">Graphics paused… restoring</div>}
            <LabelLayer />
          </Boundary>
        )}
      </div>
      {webgl !== 'failed' && screen === 'menu' && <Menu />}
      {webgl !== 'failed' && screen === 'create' && <Creator />}
      {webgl !== 'failed' && screen === 'game' && <HUD />}
    </div>
  )
}
