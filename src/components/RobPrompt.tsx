'use client'
import { useEffect, useState } from 'react'
import { resolve } from '@/game/activities'
import { formatMoney, hourOf } from '@/game/config'
import { COP_RANGE, STREET_CRIMES } from '@/game/content'
import { walkToPoint } from '@/game/nav'
import { runtime } from '@/game/runtime'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import { sfx } from '@/game/audio'

/** Card shown after tapping a passer-by: walk up to them, then pick a crime. Patrol officers nearby cut your odds. */
export function RobPrompt() {
  const target = useUI((u) => u.robTarget)
  const view = useGame((s) => s.view)
  const activity = useGame((s) => s.activity)
  const event = useGame((s) => s.event)
  const [, tick] = useState(0)

  // the victim walks on once the crime (and any arrest) is over
  const busy = !!activity?.ctx.street || event?.id === 'arrest_offer'
  const [wasBusy, setWasBusy] = useState(false)
  useEffect(() => {
    if (busy) setWasBusy(true)
    else if (wasBusy) { setWasBusy(false); useUI.setState({ robTarget: null }) }
  }, [busy, wasBusy])

  useEffect(() => {
    if (target === null) return
    const id = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [target])

  if (view !== 'world' || busy) return null
  if (target === null) {
    if (activity) return null
    return (
      <button className="rob-fab" title="Pick the nearest passer-by" onClick={() => {
        sfx('click')
        const me = runtime.player
        let best = -1
        let bestD = 10
        runtime.peds.forEach((p, i) => {
          if (!p || p.cop || p.x < -100) return
          const d = Math.hypot(p.x - me.x, p.z - me.z)
          if (d < bestD) { bestD = d; best = i }
        })
        if (best < 0) useUI.getState().toast('Nobody close enough. Walk to a busier street.', 'warn')
        else useUI.setState({ robTarget: best })
      }}>🫳 Rob someone</button>
    )
  }
  const ped = runtime.peds[target]
  if (!ped) return null
  const me = runtime.player
  const dist = Math.hypot(ped.x - me.x, ped.z - me.z)
  const cops = runtime.cops.filter((c) => Math.hypot(c.x - me.x, c.z - me.z) < COP_RANGE).length
  const s = useGame.getState()
  const hr = hourOf(s.minutes)
  const dark = hr >= 20 || hr < 5
  const close = () => useUI.setState({ robTarget: null })

  return (
    <div className="rob-card" role="dialog" aria-label="Passer-by">
      <div className="rob-head">
        <span className="rob-ico">🧍</span>
        <div>
          <b>Passer-by</b>
          <small>{dark ? '🌙 Dark street: easier to get away' : '☀️ Daylight: people are watching'}</small>
        </div>
        <button className="icon-btn" onClick={close} aria-label="Close">✕</button>
      </div>
      {cops > 0 ? (
        <p className="rob-warn">👮 {cops === 1 ? 'A police officer is' : `${cops} police officers are`} patrolling nearby. You will very likely be caught.</p>
      ) : (
        <p className="rob-ok">No police in sight.</p>
      )}
      {dist > 2.4 ? (
        <button className="btn primary small" disabled={!!s.activity} onClick={() => { sfx('click'); walkToPoint(ped.x, ped.z) }}>🚶 Walk up to them</button>
      ) : (
        <div className="rob-list">
          {STREET_CRIMES.map((def) => {
            const ctx = { street: true, cops }
            const r = resolve(def, ctx, s)
            const odds = Math.max(5, Math.min(95, Math.round((def.crime!.chance - s.legal.heat / 400 + (dark ? 0.1 : 0) - cops * 0.3) * 100)))
            return (
              <button
                key={def.id}
                className="choice"
                disabled={!r.ok}
                onClick={() => { sfx('click'); useGame.getState().startActivity(def.id, ctx) }}
              >
                <b>{def.icon} {def.label}</b>
                <small>{r.ok ? `~${odds}% to get away · ${formatMoney(def.crime!.min)}–${formatMoney(def.crime!.max)} · ${def.id === 'streetrob' ? 'armed robbery charge' : 'theft charge'}` : r.reason}</small>
              </button>
            )
          })}
        </div>
      )}
      <small className="muted">If caught: arrest, custody, then court. Guilty can mean prison.</small>
    </div>
  )
}
