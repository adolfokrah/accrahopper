'use client'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '@/game/audio'
import { BALANCE, GAME_CONFIG, dayOf, formatClock, formatDuration, formatMoney, hourOf } from '@/game/config'
import { CAREERS, DEST_BY_ID, EVENTS, HOMES, NPC_BY_ID, OFFICERS, TRAITS } from '@/game/content'
import { NEED_META, friendName } from '@/game/activities'
import { canEnter, enterHere, findMyCharacter, walkToDest } from '@/game/nav'
import { getObjective } from '@/game/objectives'
import { rotateCam, runtime, zoomBy } from '@/game/runtime'
import { saveNow } from '@/game/save'
import { useGame } from '@/game/store'
import { useUI, type PanelId } from '@/game/ui'
import { NEED_IDS, type NeedId } from '@/game/types'
import { BuildingPanel } from './BuildingPanel'
import { CharacterPanel } from './CharacterPanel'
import { DecoBar, HomePanel } from './HomePanel'
import { Btn, Chip, Meter, Modal } from './kit'
import { RobPrompt } from './RobPrompt'
import { PhonePanel } from './Phone'
import { SettingsPanel } from './SettingsPanel'
import { CourtModal, StatusChips, TaskList, TravelSheet } from './LifeUI'
import { GoalDock, LeftStack, NavBar, TopPill } from './HudChrome'

/* ---------------------------- journal ---------------------------- */
/** One tidy card: current goal, today's tasks and status, with tabs. Collapsible. */
function Journal() {
  const gs = useGame()
  const o = getObjective(gs)
  const tasks = gs.tasks
  const tutorialDone = useGame((s) => s.tutorial.done)
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<'goal' | 'today'>('goal')
  const tag = o.kind === 'tutorial' ? `Step ${o.step}/${o.steps}` : o.kind === 'urgent' ? 'Urgent' : 'Goal'
  return (
    <div className={`card journal objective ${o.kind} ${open ? '' : 'collapsed'}`}>
      <button className="obj-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="obj-tag">{tab === 'today' && open ? 'Today' : tag}</span>
        <b>{tab === 'today' && open ? `Daily tasks ${tasks.done.length}/${tasks.ids.length}` : o.title}</b>
        <span className="chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <>
          {tutorialDone && (
            <div className="j-tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'goal'} className={tab === 'goal' ? 'on' : ''} onClick={() => setTab('goal')}>🎯 Goal</button>
              <button role="tab" aria-selected={tab === 'today'} className={tab === 'today' ? 'on' : ''} onClick={() => setTab('today')}>✅ Today {tasks.done.length}/{tasks.ids.length}</button>
            </div>
          )}
          {tab === 'goal' || !tutorialDone ? <ObjectiveCard /> : <TaskList />}
        </>
      )}
      <StatusChips />
    </div>
  )
}

function ObjectiveCard() {
  const s = useGame()
  const o = getObjective(s)
  useEffect(() => {
    useUI.setState({ trackedDest: o.destId ?? null })
  }, [o.destId, o.title])
  return (
    <>
      {(
        <div className="obj-body">
          <p>{o.detail}</p>
          {o.progress && (
            <div className="obj-progress">
              <Meter value={o.progress.cur} max={o.progress.total} tone="blue" label={o.progress.label} />
              <small>
                {o.progress.label}: {['Net worth', 'Laundered', 'Savings', 'Rent fund', 'Move-in cost'].includes(o.progress.label) ? `${formatMoney(o.progress.cur)} / ${formatMoney(o.progress.total)}` : `${Math.round(o.progress.cur)}/${o.progress.total}`}
              </small>
            </div>
          )}
          <div className="obj-actions">
            {o.destId && s.view === 'world' && !s.activity && (
              <Btn small kind="soft" onClick={() => walkToDest(o.destId!)}>
                🧭 Take me there
              </Btn>
            )}
            {o.kind === 'tutorial' && (
              <Btn small kind="ghost" onClick={() => useGame.getState().skipTutorial()}>
                Skip tutorial
              </Btn>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* --------------------------- activity bar --------------------------- */
function RideControls({ drive }: { drive: boolean }) {
  const cam = useUI((s) => s.rideCam)
  const [held, setHeld] = useState(false)
  useEffect(() => {
    const id = setInterval(() => setHeld(!!runtime.ride?.holding), 250)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="ride-ctrls">
      <Btn small kind="soft" onClick={() => useUI.setState({ rideCam: cam === 'inside' ? 'chase' : 'inside' })}>🎥 {cam === 'inside' ? 'Outside view' : 'Inside view'} (V)</Btn>
      {held && <span className="redlight">🔴 Waiting at red light</span>}
      {held && drive && <Btn small kind="danger" onClick={() => useGame.getState().runRedLight()}>🚦 Run the red light</Btn>}
    </div>
  )
}

/** Sims-style task board during a work shift. Keys 1-3 start a task. */
function ShiftBoard() {
  const a = useGame((s) => s.activity)
  const sh = a?.shift
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const n = Number(e.key)
      const q = useGame.getState().activity?.shift?.queue
      if (!q || !(n >= 1 && n <= 3) || !q[n - 1]) return
      sfx('click')
      useGame.getState().doShiftTask(q[n - 1].id)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  if (!a || !sh) return null
  const c = a.ctx.career ? CAREERS[a.ctx.career] : null
  const total = sh.done + sh.missed
  const perf = total ? Math.round((sh.done / total) * 100) : 100
  return (
    <div className="card shift-board" role="region" aria-label="Shift tasks">
      <div className="row between">
        <b>{c?.emoji} Shift tasks</b>
        <span className="shift-stats">✅ {sh.done} · ⌛ {sh.missed} · <span className={perf < 50 ? 'bad' : perf >= 85 ? 'good' : ''}>{perf}%</span> · 💰 {formatMoney(sh.earned + sh.tips)}</span>
      </div>
      {c?.illegal && <small className="shift-warn">🚨 Illegal work. Police raids happen. Heat rises every shift.</small>}
      {sh.current && (
        <div className="shift-task doing">
          <span className="st-ico">{sh.current.icon}</span>
          <div className="st-main">
            <b>{sh.current.label}</b>
            <Meter value={Math.min(100, ((a.done - sh.current.startedAt) / Math.max(1e-6, sh.current.until - sh.current.startedAt)) * 100)} tone="green" label="Task progress" />
          </div>
          <span className="st-tag">Doing…</span>
        </div>
      )}
      {sh.queue.length === 0 && !sh.current && <small className="muted">Waiting for the next task… walk around or chat while you wait.</small>}
      {sh.queue.map((t, i) => {
        const left = Math.max(0, (t.expires - a.done) / Math.max(1e-6, t.expires - t.born)) * 100
        return (
          <button key={t.id} className="shift-task" disabled={!!sh.current} onClick={() => { sfx('click'); useGame.getState().doShiftTask(t.id) }}>
            <span className="st-ico">{t.icon}</span>
            <div className="st-main">
              <b>{t.label}</b>
              <Meter value={left} tone={left < 30 ? 'red' : 'blue'} label="Time left" />
            </div>
            <span className="st-tag"><kbd>{i + 1}</kbd> +{formatMoney(t.pay)}</span>
          </button>
        )
      })}
    </div>
  )
}

function ActivityBar() {
  const a = useGame((s) => s.activity)
  if (!a) return null
  const pct = (a.done / a.total) * 100
  return (
    <>
    {a.shift && <ShiftBoard />}
    <div className="card activity" role="status">
      <span className="act-ico">{a.icon}</span>
      <div className="act-main">
        <b>{a.label}</b>
        <Meter value={pct} tone="blue" label="Activity progress" />
        <small>
          {Math.round(pct)}% · {formatDuration(Math.max(0, a.total - a.done))} left
        </small>
        {a.kind === 'travel' && a.ctx.ride && <RideControls drive={!!a.ctx.drive} />}
      </div>
      {!['travel', 'collapse', 'custody', 'jail', 'hospital'].includes(a.kind) && (
        <Btn small kind="ghost" onClick={() => useGame.getState().cancelActivity()}>
          Stop
        </Btn>
      )}
    </div>
    </>
  )
}

/** Compass: the needle shows where north is; tap to turn the map north-up. */
function Compass() {
  const [yaw, setYaw] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setYaw((globalThis as unknown as { __camYaw?: number }).__camYaw ?? 0), 120)
    return () => clearInterval(id)
  }, [])
  return (
    <button className="card compass" onClick={() => { sfx('click'); runtime.cam.yawTarget = Math.round(runtime.cam.yawTarget / (Math.PI * 2)) * Math.PI * 2 }} aria-label="Compass: tap to face north" title="Tap to face north">
      <span className="needle" style={{ transform: `rotate(${(yaw * 180) / Math.PI}deg)` }}>
        <b className="n">N</b><b className="e">E</b><b className="s">S</b><b className="w">W</b>
      </span>
      <span aria-hidden>🧭</span>
    </button>
  )
}

function ViewControls() {
  const view = useGame((s) => s.view)
  return (
    <div className="view-controls">
      {/* phones keep only zoom; rotate, compass and find-me are desktop extras */}
      {view === 'world' && <span className="vc-extra"><Compass /></span>}
      <button className="card icon-btn vc-zoom" onClick={() => zoomBy(1.25)} aria-label="Zoom in" title="Zoom in (mouse wheel)">＋</button>
      <button className="card icon-btn vc-zoom" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out" title="Zoom out (mouse wheel)">－</button>
      <button className="card icon-btn vc-extra" onClick={() => { sfx('click'); rotateCam(-1) }} aria-label="Rotate view left" title="Rotate left (Q)">⟲</button>
      <button className="card icon-btn vc-extra" onClick={() => { sfx('click'); rotateCam(1) }} aria-label="Rotate view right" title="Rotate right (R)">⟳</button>
      {view === 'world' && <button className="card icon-btn find vc-extra" onClick={() => { sfx('click'); findMyCharacter() }} aria-label="Find my character" title="Find my character (F)">🎯</button>}
    </div>
  )
}

/* ------------------------- toasts, result, modals ------------------------- */
function Toasts() {
  const toasts = useUI((s) => s.toasts)
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`toast ${t.kind}`} onClick={() => useUI.getState().dismissToast(t.id)}>
          {t.msg}
        </button>
      ))}
    </div>
  )
}

function ResultCard() {
  const r = useGame((s) => s.result)
  useEffect(() => {
    if (r) sfx(r.tone === 'bad' ? 'warn' : r.tone === 'good' ? 'success' : 'click')
  }, [r?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return null
  return (
    <div className={`card result ${r.tone}`} role="status">
      <div className="result-head">
        <span>{r.icon}</span>
        <b>{r.title}</b>
      </div>
      <ul>
        {r.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <Btn small onClick={() => useGame.getState().dismissResult()}>Got it</Btn>
    </div>
  )
}

function EventModal() {
  const ev = useGame((s) => s.event)
  const money = useGame((s) => s.money)
  if (!ev) return null
  const def = EVENTS[ev.id]
  return (
    <Modal label={def.title}>
      <div className="modal-ico">{def.emoji}</div>
      <h2>{def.title}</h2>
      <p>{def.body}{ev.ctx.offence ? ` Offence: ${ev.ctx.offence}.` : ''}</p>
      {ev.ctx.officer && <p className="officer-note">👮 <b>{OFFICERS[ev.ctx.officer].name}</b> {OFFICERS[ev.ctx.officer].note}</p>}
      <div className="choices">
        {def.choices.map((c, i) => {
          const cant = !!c.cost && money < c.cost
          return (
            <button key={i} className="choice" disabled={cant} onClick={() => { sfx('click'); useGame.getState().chooseEvent(i) }}>
              <b>{c.label}</b>
              <small>{cant ? `Need ${formatMoney((c.cost ?? 0) - money)} more` : c.hint}</small>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

function DialogModal() {
  const dlg = useUI((s) => s.dialog)
  const fr = useGame((s) => (dlg ? s.friendships[dlg.npcId] : undefined))
  if (!dlg) return null
  const npc = NPC_BY_ID[dlg.npcId]
  const topic = npc.topics.find((t) => t.id === dlg.topicId)!
  return (
    <Modal label={`Chat with ${npc.name}`}>
      <div className="npc-head">
        <span className="modal-ico">{npc.emoji}</span>
        <div>
          <h2>{npc.name} <i className="npc-badge">NPC</i></h2>
          <small>{npc.role} · {friendName(fr?.points ?? 0)}</small>
        </div>
      </div>
      {dlg.phase === 'prompt' ? (
        <>
          <p className="speech">{topic.prompt}</p>
          <div className="choices">
            {topic.choices.map((c, i) => (
              <button key={i} className="choice" onClick={() => { sfx('click'); useGame.getState().chooseDialog(i) }}>
                <b>{c.text}</b>
              </button>
            ))}
          </div>
          <small className="muted">A chat takes about 20 minutes. {npc.name} is a demo character, not a real player.</small>
        </>
      ) : (
        <>
          <p className="speech">{dlg.reply}</p>
          <p className="gain">{(dlg.gained ?? 0) > 0 ? `🤝 Friendship +${dlg.gained}` : 'No change in friendship'}</p>
          <Btn onClick={() => useUI.setState({ dialog: null })}>Done</Btn>
        </>
      )}
    </Modal>
  )
}

function IntimacyOverlay() {
  const a = useGame((s) => (s.activity && (s.activity.effect === 'intimate' || s.activity.defId === 'nightwork') ? s.activity : null))
  if (!a) return null
  const pct = Math.round((a.done / a.total) * 100)
  return (
    <div className="intimacy" aria-live="polite">
      <div className="hearts" aria-hidden>💞</div>
      <b>{a.defId === 'nightwork' ? 'The night goes on…' : 'Some time later…'}</b>
      <small>{a.label} · {pct}%</small>
    </div>
  )
}

function PausedBanner() {
  const paused = useUI((s) => s.paused)
  if (!paused) return null
  return (
    <div className="paused" role="status">
      <div className="card">⏸ Paused <Btn small onClick={() => useUI.setState({ paused: false })}>Resume</Btn></div>
    </div>
  )
}

function LowFundsHelp() {
  const money = useGame((s) => s.money)
  const activity = useGame((s) => s.activity)
  const employment = useGame((s) => s.employment)
  const tutorialDone = useGame((s) => s.tutorial.done)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => { if (money > BALANCE.recoveryThreshold * 2) setDismissed(false) }, [money])
  if (money >= BALANCE.recoveryThreshold || activity || dismissed || !tutorialDone) return null
  return (
    <div className="card recovery" role="status">
      <b>Running low on money</b>
      <p>
        You have {formatMoney(money)}. Earn a little fast: <button className="link" onClick={() => walkToDest('market')}>carry goods at the market</button> (+GH₵45) or{' '}
        <button className="link" onClick={() => walkToDest('foodstall')}>wash dishes at the chop bar</button> (+GH₵30 and a snack).
        {employment ? ' Your next shift also pays.' : ' Or apply for a job in your phone.'}
      </p>
      <Btn small kind="ghost" onClick={() => setDismissed(true)}>Dismiss</Btn>
    </div>
  )
}

function EnterPrompt() {
  const near = useGame((s) => (s.view === 'world' && !s.activity ? s.nearDest : null))
  const panel = useUI((s) => s.panel)
  const tier = useGame((s) => s.housing.tier)
  if (!near || panel === 'building') return null
  const d = DEST_BY_ID[near]
  const enter = canEnter(near)
  void tier
  return (
    <button className="card enter-prompt" onClick={() => { sfx('click'); enterHere(near) }}>
      <span className="ep-ico">{d.emoji}</span>
      <span>
        <b>{enter ? `Enter ${d.name}` : d.kind === 'stop' ? `Catch a trotro` : `View ${d.name}`}</b>
        <small>{enter ? 'Tap or press E' : 'Tap or press E for details'}</small>
      </span>
    </button>
  )
}

/** Inside a building (or at home) the place panel never closes: it folds down to this bar. Tap to open it again. */
function MinimizedPanel() {
  const view = useGame((s) => s.view)
  const inside = useGame((s) => s.insideDest)
  const viewing = useGame((s) => s.viewing)
  const tier = useGame((s) => s.housing.tier)
  const panel = useUI((s) => s.panel)
  if (panel !== 'none') return null
  let icon = ''
  let title = ''
  let open: (() => void) | null = null
  if (view === 'inside' && inside && DEST_BY_ID[inside]) {
    icon = DEST_BY_ID[inside].emoji
    title = DEST_BY_ID[inside].name
    open = () => useUI.getState().selectDest(inside, true)
  } else if (view === 'home') {
    icon = viewing ? '🔑' : '🏠'
    title = viewing ? `Viewing: ${HOMES[viewing].name}` : HOMES[tier].name
    open = () => useUI.getState().setPanel('home')
  }
  if (!open) return null
  const go = open
  return (
    <div className="panel-slot min">
      <button className="sheet sheet-min" onClick={() => { sfx('click'); go() }} aria-label={`Open ${title}`}>
        <span className="sheet-icon">{icon}</span>
        <span className="sheet-title"><b>{title}</b><small>Tap for things to do here</small></span>
        <span className="icon-btn" aria-hidden>▴</span>
      </button>
    </div>
  )
}

/* ----------------------------- party effects ----------------------------- */
type FxKind = 'money' | 'bottle'
interface FxBit { id: number; kind: 'note' | 'drop' | 'spark' | 'bottle'; x: number; up: number; fall: number; r: number; d: number; delay: number; val?: number }
let fxSeq = 0
/** Which party effect the current activity calls for. */
function fxFor(a: { uid: number; defId: string; shift?: { current?: { key: string } | null } | null } | null): { kind: FxKind; key: string } | null {
  if (!a) return null
  const id = a.defId.split(':')[0]
  if (id === 'spray') return { kind: 'money', key: `${a.uid}` }
  if (id === 'popbottle') return { kind: 'bottle', key: `${a.uid}` }
  const cur = a.shift?.current
  if (cur && cur.key === 'bottle') return { kind: 'bottle', key: `${a.uid}:${cur.key}:${(cur as { startedAt?: number }).startedAt ?? ''}` }
  return null
}
/** Cedi notes flying when you spray money, champagne and sparklers when a bottle is popped. */
function PartyFX() {
  // select a string, not an object: a fresh object every render loops forever
  const key = useGame((s) => {
    const fx = fxFor(s.activity as never)
    return fx ? `${fx.kind}|${fx.key}` : ''
  })
  const reduce = useUI((s) => s.settings.reduceMotion)
  const [bits, setBits] = useState<FxBit[]>([])
  useEffect(() => {
    if (!key) return
    const kind = key.split('|')[0] as FxKind
    const scale = reduce ? 0.35 : 1
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    const burst = () => {
      const now: FxBit[] = []
      if (kind === 'money') {
        for (let i = 0; i < Math.round(14 * scale); i++)
          now.push({ id: fxSeq++, kind: 'note', x: rnd(-260, 260), up: rnd(-320, -160), fall: rnd(120, 360), r: rnd(-540, 540), d: rnd(1.8, 2.8), delay: rnd(0, 0.5), val: [5, 10, 20, 50][Math.floor(Math.random() * 4)] })
      } else {
        now.push({ id: fxSeq++, kind: 'bottle', x: 0, up: -40, fall: 0, r: rnd(-20, 20), d: 1.4, delay: 0 })
        for (let i = 0; i < Math.round(22 * scale); i++) now.push({ id: fxSeq++, kind: 'drop', x: rnd(-120, 120), up: rnd(-340, -200), fall: rnd(40, 200), r: 0, d: rnd(1.1, 1.8), delay: rnd(0, 0.25) })
        for (let i = 0; i < Math.round(16 * scale); i++) now.push({ id: fxSeq++, kind: 'spark', x: rnd(-200, 200), up: rnd(-260, -80), fall: rnd(-60, 60), r: rnd(0, 360), d: rnd(0.8, 1.4), delay: rnd(0, 0.6) })
      }
      const cutoff = fxSeq - 400
      setBits((cur) => [...cur.filter((b) => b.id > cutoff), ...now])
    }
    burst()
    // keep it going for a few seconds even if the activity itself is quick
    const every = setInterval(burst, kind === 'money' ? 650 : 1200)
    const stop = setTimeout(() => clearInterval(every), kind === 'money' ? 5000 : 3600)
    const clear = setTimeout(() => setBits([]), 8500)
    return () => { clearInterval(every); clearTimeout(stop); clearTimeout(clear) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduce])
  if (!bits.length) return null
  return (
    <div className="party-fx" aria-hidden>
      {bits.map((b) => (
        <span
          key={b.id}
          className={`fx-${b.kind}`}
          style={{ '--x': `${b.x}px`, '--up': `${b.up}px`, '--fall': `${b.fall}px`, '--r': `${b.r}deg`, animationDuration: `${b.d}s`, animationDelay: `${b.delay}s` } as React.CSSProperties}
        >
          {b.kind === 'note' ? `₵${b.val}` : b.kind === 'bottle' ? '🍾' : b.kind === 'spark' ? '✨' : ''}
        </span>
      ))}
    </div>
  )
}

function Fade() {
  const view = useGame((s) => s.view)
  const inside = useGame((s) => s.insideDest)
  const [k, setK] = useState(0)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setK((x) => x + 1)
  }, [view, inside])
  return k ? <div key={k} className="fade" aria-hidden /> : null
}

/* -------------------------------- root -------------------------------- */
export function HUD() {
  const panel = useUI((s) => s.panel)
  const view = useGame((s) => s.view)
  const selectedDest = useUI((s) => s.selectedDest)
  useEffect(() => {
    const mobile = window.innerWidth < 760
    // phones: lift the scene above an open sheet (rooms more, so furniture stays reachable)
    runtime.uiShift = panel !== 'none' && panel !== 'phone' && mobile ? window.innerHeight * (view === 'world' ? 0.2 : 0.24) : 0
    return () => { runtime.uiShift = 0 }
  }, [panel, view])
  return (
    <div className="hud hud2">
      <div className="hb-head">
        <TopPill />
        <LeftStack />
      </div>
      <ViewControls />
      {/* stacked right above the bottom navigation: alerts, activity, the door you are at, then your goal */}
      <div className="bottom-stack">
        <LowFundsHelp />
        <ResultCard />
        <ActivityBar />
        <EnterPrompt />
        <GoalDock journal={<Journal />} />
      </div>
      <NavBar />
      {panel === 'phone' && <PhonePanel />}
      <div className={`panel-slot panel-${panel} ${panel !== 'none' && panel !== 'phone' ? 'open' : ''}`}>
        {panel === 'building' && selectedDest && <BuildingPanel key={selectedDest} />}
        {panel === 'character' && <CharacterPanel />}
        {panel === 'home' && <HomePanel />}
        {panel === 'settings' && <SettingsPanel />}
      </div>
      <MinimizedPanel />
      <DecoBar />
      <PartyFX />
      <Fade />
      <Toasts />
      <EventModal />
      <RobPrompt />
      <DialogModal />
      <TravelSheet />
      <IntimacyOverlay />
      <CourtModal />
      <PausedBanner />
    </div>
  )
}

export { DEST_BY_ID, TRAITS, Chip, saveNow }
