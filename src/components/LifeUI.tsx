'use client'
import { useState } from 'react'
import { sfx } from '@/game/audio'
import { dayOf, formatClock, formatDuration, formatMoney } from '@/game/config'
import { DEST_BY_ID, ILLNESSES, LEGAL, RIDES, type RideMode } from '@/game/content'
import { GOALS, TASK_BY_ID, rideQuote, taskProgress, walkMinutes } from '@/game/life'
import { walkToDest } from '@/game/nav'
import { useGame } from '@/game/store'
import { useUI } from '@/game/ui'
import { Btn, Meter, Modal } from './kit'

/** Choose how to get somewhere: walk, trotro, taxi (dropping) or a ride app. */
export function TravelSheet() {
  const to = useUI((s) => s.travelTo)
  const s = useGame()
  if (!to) return null
  const d = DEST_BY_ID[to]
  const close = () => useUI.setState({ travelTo: null })
  const modes: RideMode[] = ['okada', 'pragia', 'trotro', 'taxi', 'ride']
  return (
    <Modal label={`Travel to ${d.name}`}>
      <div className="travel-head">
        <span className="modal-ico">{d.emoji}</span>
        <div>
          <small className="muted">Get to</small>
          <h2>{d.name}</h2>
        </div>
      </div>
      <div className="choices">
        <button className="choice travel" onClick={() => { sfx('click'); close(); walkToDest(to, true, true) }}>
          <span className="t-ico">🚶</span>
          <span className="t-main"><b>Walk</b><small>Free · exercise and fresh air</small></span>
          <span className="t-meta"><b>Free</b><small>~{formatDuration(walkMinutes(s, to))}</small></span>
        </button>
        {modes.map((m) => {
          const q = rideQuote(s, m, to)
          const cant = s.money < q.fare
          return (
            <button key={m} className="choice travel" disabled={cant || !!s.activity} onClick={() => { sfx('coin'); useGame.getState().startRide(m, to) }}>
              <span className="t-ico">{RIDES[m].emoji}</span>
              <span className="t-main"><b>{RIDES[m].name}{q.surge ? ' · surge' : ''}</b><small>{cant ? `Need ${formatMoney(q.fare - s.money)} more` : RIDES[m].blurb}</small></span>
              <span className="t-meta"><b>{formatMoney(q.fare)}</b><small>~{formatDuration(q.minutes)}</small></span>
            </button>
          )
        })}
      </div>
      <small className="muted">{(rideQuote(s, 'taxi', to).km).toFixed(1)} km away. Fares are paid from your MoMo wallet.</small>
      <Btn kind="ghost" onClick={close}>Cancel</Btn>
    </Modal>
  )
}

/** Sims-style daily wants. */
/** Today's daily tasks as a plain list (used inside the Journal). */
export function TaskList() {
  const tasks = useGame((s) => s.tasks)
  const today = useGame((s) => s.today)
  return (
    <ul className="task-list">
      {tasks.ids.map((id) => {
        const t = TASK_BY_ID[id]
        if (!t) return null
        const done = tasks.done.includes(id)
        const p = taskProgress({ today }, t)
        return (
          <li key={id} className={done ? 'done' : ''}>
            <span className="task-check">{done ? '✓' : t.icon}</span>
            <span className="task-text">
              {t.text}
              {t.target > 1 && !done && <small> {t.target >= 50 ? `${formatMoney(p)}/${formatMoney(t.target)}` : `${p}/${t.target}`}</small>}
            </span>
            <span className="task-reward">+{formatMoney(t.reward)}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function TasksCard() {
  const tasks = useGame((s) => s.tasks)
  const today = useGame((s) => s.today)
  const tutorialDone = useGame((s) => s.tutorial.done)
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 760)
  if (!tutorialDone) return null
  const doneCount = tasks.done.length
  return (
    <div className={`card tasks ${open ? '' : 'collapsed'}`}>
      <button className="obj-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="obj-tag task-tag">Today</span>
        <b>Daily tasks {doneCount}/{tasks.ids.length}</b>
        <span className="chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <ul className="task-list">
          {tasks.ids.map((id) => {
            const t = TASK_BY_ID[id]
            if (!t) return null
            const done = tasks.done.includes(id)
            const p = taskProgress({ today }, t)
            return (
              <li key={id} className={done ? 'done' : ''}>
                <span className="task-check">{done ? '✓' : t.icon}</span>
                <span className="task-text">
                  {t.text}
                  {t.target > 1 && !done && <small> {t.target >= 50 ? `${formatMoney(p)}/${formatMoney(t.target)}` : `${p}/${t.target}`}</small>}
                </span>
                <span className="task-reward">+{formatMoney(t.reward)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function LifeGoalsList() {
  const s = useGame()
  return (
    <ul className="goal-list">
      {GOALS.map((g) => {
        const done = s.goals.includes(g.id)
        return (
          <li key={g.id} className={done ? 'done' : ''}>
            <span>{done ? '🏆' : g.icon}</span>
            <b>{g.name}</b>
            <small>{done ? 'Achieved' : `+${formatMoney(g.reward)}`}</small>
          </li>
        )
      })}
    </ul>
  )
}

/** Courtroom hearing. */
export function CourtModal() {
  const open = useUI((s) => s.court)
  const money = useGame((s) => s.money)
  const deadline = useGame((s) => s.legal.caseDeadline)
  const charge = useGame((s) => s.legal.charge ?? 'theft')
  const fine = useGame((s) => s.legal.fine ?? LEGAL.fine)
  if (!open || deadline === null) return null
  const plea = (p: 'guilty' | 'notguilty' | 'lawyer') => {
    sfx('click')
    useGame.getState().courtPlea(p)
  }
  return (
    <Modal label="Court hearing">
      <div className="modal-ico">⚖️</div>
      <h2>The Republic vs. you</h2>
      <p>“You are charged with {charge}. How do you plead?” The judge peers over her glasses.</p>
      <div className="choices">
        <button className="choice" onClick={() => plea('guilty')}>
          <b>Plead guilty</b>
          <small>Pay a {formatMoney(fine)} fine. If you cannot pay: {LEGAL.jailGuilty} days in prison.</small>
        </button>
        <button className="choice" onClick={() => plea('notguilty')}>
          <b>Plead not guilty</b>
          <small>45% chance to walk free. Otherwise {LEGAL.jailConvicted} days in prison.</small>
        </button>
        <button className="choice" disabled={money < LEGAL.lawyer} onClick={() => plea('lawyer')}>
          <b>Hire a lawyer ({formatMoney(LEGAL.lawyer)})</b>
          <small>{money < LEGAL.lawyer ? `Need ${formatMoney(LEGAL.lawyer - money)} more` : '80% chance to walk free. Otherwise a fine.'}</small>
        </button>
      </div>
      <Btn kind="ghost" onClick={() => useUI.setState({ court: false })}>Not now</Btn>
    </Modal>
  )
}

export function StatusChips() {
  const illness = useGame((s) => s.health.illness)
  const mild = useGame((s) => s.health.mild)
  const deadline = useGame((s) => s.legal.caseDeadline)
  const heat = useGame((s) => s.legal.heat)
  const partner = useGame((s) => s.romance.partner)
  const stage = useGame((s) => s.romance.stage)
  return (
    <div className="status-chips">
      {illness && <span className="schip bad" title={ILLNESSES[illness].blurb}>{ILLNESSES[illness].emoji} {ILLNESSES[illness].name}{mild ? '' : ' (serious)'}</span>}
      {deadline !== null && <span className="schip bad">⚖️ Court by Day {dayOf(deadline)}, {formatClock(deadline)}</span>}
      {heat >= 30 && <span className="schip warn">🚨 Police heat {Math.round(heat)}</span>}
      {partner && <span className="schip love">💕 {stage === 'married' ? 'Married' : stage === 'engaged' ? 'Engaged' : 'Dating'}</span>}
    </div>
  )
}

export { Meter }
