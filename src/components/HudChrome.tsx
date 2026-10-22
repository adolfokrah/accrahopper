'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { sfx } from '@/game/audio'
import { BALANCE, dayOf, formatClock, formatMoney, hourOf } from '@/game/config'
import { NEED_META } from '@/game/activities'
import { HOMES } from '@/game/content'
import { getObjective } from '@/game/objectives'
import { useGame } from '@/game/store'
import { NEED_IDS, type NeedId } from '@/game/types'
import { useUI } from '@/game/ui'

/* ------------------------------ line icons ------------------------------ */
const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
export const Icons = {
  world: <Svg><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Svg>,
  home: <Svg><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></Svg>,
  map: <Svg><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></Svg>,
  phone: <Svg><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></Svg>,
  me: <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></Svg>,
  gear: <Svg><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Svg>,
  plus: <Svg><path d="M12 5v14M5 12h14" /></Svg>,
  minus: <Svg><path d="M5 12h14" /></Svg>,
  pause: <Svg><path d="M9 5v14M15 5v14" /></Svg>,
  play: <Svg><path d="m7 4 13 8-13 8V4Z" /></Svg>,
}

/* -------------------------------- mood -------------------------------- */
/** One word for how the character feels, from their needs. */
export function moodOf(needs: Record<NeedId, number>): { emoji: string; label: string; tone: 'good' | 'ok' | 'bad' } {
  const worst = NEED_IDS.reduce((a, b) => (needs[a] <= needs[b] ? a : b))
  if (needs[worst] < BALANCE.lowNeed) {
    const words: Record<NeedId, string> = { hunger: 'Hungry', energy: 'Exhausted', hygiene: 'Smelly', bladder: 'Bursting', fun: 'Bored', social: 'Lonely' }
    return { emoji: '😣', label: words[worst], tone: 'bad' }
  }
  const avg = NEED_IDS.reduce((a, k) => a + needs[k], 0) / NEED_IDS.length
  if (avg >= 70) return { emoji: '🙂', label: 'Happy', tone: 'good' }
  if (avg >= 45) return { emoji: '😐', label: 'Okay', tone: 'ok' }
  return { emoji: '😩', label: 'Tired', tone: 'bad' }
}

/* ------------------------------- top bar ------------------------------- */
export function TopPill() {
  const money = useGame((s) => s.money)
  const dirty = useGame((s) => s.dirty)
  const minutes = useGame((s) => s.minutes)
  const needs = useGame((s) => s.needs)
  const housing = useGame((s) => s.housing)
  const prev = useRef(money)
  const [delta, setDelta] = useState<{ v: number; k: number } | null>(null)
  useEffect(() => {
    if (money === prev.current) return
    setDelta({ v: money - prev.current, k: Date.now() })
    prev.current = money
    const t = setTimeout(() => setDelta(null), 1800)
    return () => clearTimeout(t)
  }, [money])
  const h = hourOf(minutes)
  const night = h < 6 || h >= 19
  const mood = moodOf(needs)
  const wallet = () => { sfx('click'); useUI.setState({ phoneTab: 'wallet' }); useUI.getState().setPanel('phone') }
  const rentIn = housing.nextRentDue - minutes
  const rent = HOMES[housing.tier].rent
  const rentChip = housing.homeless ? '🧳 Homeless' : housing.overdueSince !== null ? '📜 Notice to quit' : rentIn < 48 * 60 ? `🏠 Rent in ${Math.max(1, Math.ceil(rentIn / 1440))}d` : null
  return (
    <div className="hb-top">
      <div className="hb-pill">
        <span className="hb-clock" title={`Day ${dayOf(minutes)}`}>
          <span aria-hidden>{night ? '🌙' : '☀️'}</span>
          <b>{formatClock(minutes)}</b>
          <small>D{dayOf(minutes)}</small>
        </span>
        <span className="hb-sep" />
        <button className={`hb-mood ${mood.tone}`} onClick={() => { sfx('click'); useUI.setState((u) => ({ needsOpen: !u.needsOpen, clean: false })) }} aria-label={`Mood: ${mood.label}`}>
          <span aria-hidden>{mood.emoji}</span>
          <b>{mood.label}</b>
        </button>
        <span className="hb-grow" />
        <button className="hb-icon" onClick={() => { sfx('click'); useUI.getState().setPanel('settings') }} aria-label="Settings">{Icons.gear}</button>
        <button className="hb-money" onClick={wallet} aria-label="Wallet">
          <b>{formatMoney(money)}</b>
          <span className="hb-plus" aria-hidden>{Icons.plus}</span>
          {delta && <i key={delta.k} className={`delta ${delta.v >= 0 ? 'up' : 'down'}`}>{delta.v >= 0 ? '+' : ''}{formatMoney(delta.v)}</i>}
        </button>
      </div>
      {(rentChip || dirty > 0) && (
        <div className="hb-chips">
          {rentChip && (
            <button className={`hb-chip ${housing.homeless || housing.overdueSince !== null || money < rent ? 'bad' : ''}`} onClick={() => (housing.homeless ? useUI.getState().setPanel('home') : wallet())}>
              {rentChip}
            </button>
          )}
          {dirty > 0 && <button className="hb-chip dirty" onClick={wallet}>💸 {formatMoney(dirty)} dirty</button>}
        </div>
      )}
    </div>
  )
}

/* ----------------------------- left stack ----------------------------- */
/** The current goal, docked just above the tab bar where it catches the eye. Tap for details. */
export function GoalDock({ journal }: { journal: ReactNode }) {
  const gs = useGame()
  const o = getObjective(gs)
  const clean = useUI((s) => s.clean)
  const [open, setOpen] = useState(false)
  if (clean) return null
  const icon = o.kind === 'urgent' ? '⚠️' : o.kind === 'tutorial' ? '🎓' : '🎯'
  return (
    <div className="hb-goal-dock">
      {open && <div className="hb-journal">{journal}</div>}
      <button className={`hb-card hb-goal ${o.kind}`} onClick={() => { sfx('click'); setOpen(!open) }} aria-expanded={open}>
        <span className="hb-goal-ico" aria-hidden>{icon}</span>
        <span className="hb-goal-text">
          <b>{o.title}</b>
          <small>{o.detail}</small>
        </span>
        <span className="hb-goal-chev" aria-hidden>{open ? '⌄' : '⌃'}</span>
      </button>
    </div>
  )
}

/** Needs pill and the "Clean screen" toggle under the top bar. */
export function LeftStack() {
  const gs = useGame()
  const clean = useUI((s) => s.clean)
  const needsOpen = useUI((s) => s.needsOpen)
  return (
    <div className="hb-left">
      {!clean && (
        <>
          <button className="hb-card hb-needs" onClick={() => { sfx('click'); useUI.setState({ needsOpen: !needsOpen }) }} aria-expanded={needsOpen} aria-label="Needs">
            {NEED_IDS.map((k) => {
              const v = gs.needs[k]
              const tone = v < BALANCE.lowNeed ? 'red' : v < 45 ? 'gold' : 'green'
              return (
                <span key={k} className={`hb-need ${tone}`} title={`${NEED_META[k].label}: ${Math.round(v)}`}>
                  <span aria-hidden>{NEED_META[k].emoji}</span>
                  {needsOpen && <small>{NEED_META[k].label}</small>}
                  <i><em style={{ width: `${Math.max(6, v)}%` }} /></i>
                </span>
              )
            })}
          </button>
        </>
      )}
      <button className="hb-clean" onClick={() => { sfx('click'); useUI.setState({ clean: !clean, needsOpen: false }) }}>
        {clean ? '⌄ Show info' : '⌃ Clean screen'}
      </button>
    </div>
  )
}

/* ----------------------------- bottom nav ----------------------------- */
export function NavBar() {
  const panel = useUI((s) => s.panel)
  const phoneTab = useUI((s) => s.phoneTab)
  const view = useGame((s) => s.view)
  const toggle = (p: 'home' | 'character') => { sfx('click'); useUI.getState().setPanel(panel === p ? 'none' : p) }
  const phone = (tab: 'home' | 'maps') => {
    sfx('click')
    const open = panel === 'phone' && (tab === 'maps' ? phoneTab === 'maps' : phoneTab !== 'maps')
    useUI.setState({ phoneTab: tab })
    useUI.getState().setPanel(open ? 'none' : 'phone')
  }
  const tabs = [
    {
      id: 'world', label: 'World', icon: Icons.world, active: panel === 'none' || panel === 'building',
      onClick: () => {
        sfx('click')
        if (view === 'home') useGame.getState().exitHome()
        else if (view === 'inside') useGame.getState().exitBuilding()
        else useUI.setState({ panel: 'none', selectedDest: null })
      },
    },
    { id: 'home', label: 'Home', icon: Icons.home, active: panel === 'home', onClick: () => toggle('home') },
    { id: 'map', label: 'Map', icon: Icons.map, active: panel === 'phone' && phoneTab === 'maps', onClick: () => phone('maps') },
    { id: 'phone', label: 'Phone', icon: Icons.phone, active: panel === 'phone' && phoneTab !== 'maps', onClick: () => phone('home') },
    { id: 'me', label: 'Me', icon: Icons.me, active: panel === 'character', onClick: () => toggle('character') },
  ]
  return (
    <nav className="hb-nav" aria-label="Main navigation">
      {tabs.map((t) => (
        <button key={t.id} className={`hb-tab ${t.active ? 'on' : ''}`} onClick={t.onClick} aria-current={t.active ? 'page' : undefined}>
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
