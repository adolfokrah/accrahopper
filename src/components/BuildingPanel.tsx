'use client'
import { useState } from 'react'
import { sfx } from '@/game/audio'
import {
  activitiesForDest,
  describeEffects,
  friendIndex,
  friendName,
  friendPoints,
  isOpen,
  priceMultiplier,
  skillLevel,
  travelDef,
  type Resolved,
} from '@/game/activities'
import { BALANCE, formatDuration, formatMoney, hourOf } from '@/game/config'
import { plotValue } from '@/game/property'
import { rideQuote } from '@/game/life'
import {
  AREA_BY_ID,
  PLOTS,
  VEHICLES,
  VEHICLE_IDS,
  BUILD_STAGES,
  PROJECTS,
  PROJECT_IDS,
  HOME_SELL_BACK,
  SELL_BACK,
  projectStages,
  ROMANCE,
  UPGRADES,
  BUSINESSES,
  CAREERS,
  CHARGES,
  careersAt,
  DESTINATIONS,
  DEST_BY_ID,
  DISTRICTS,
  FARES,
  FURNITURE,
  HOMES,
  HOME_DEST,
  NPC_BY_ID,
  SHOP_FURNITURE,
  SKILLS,
  STOPS,
} from '@/game/content'
import { canEnter, walkToDest } from '@/game/nav'
import { resolve } from '@/game/activities'
import { canRentOut, missingRequirements, rentOutRange, useGame, type GameState } from '@/game/store'
import { useUI } from '@/game/ui'
import { Btn, Chip, Meter, Sheet } from './kit'

const fmtHour = (h: number) => (h === 24 ? 'midnight' : `${h % 12 === 0 ? 12 : h % 12}${h >= 12 && h < 24 ? 'pm' : 'am'}`)

export function ActivityRow({ r, open, onToggle }: { r: Resolved; open: boolean; onToggle: () => void }) {
  const effects = describeEffects(r)
  const confirm = () => {
    if (r.def.kind === 'travel') {
      useGame.getState().startRide('trotro', r.def.id.slice(7))
    } else {
      const res = useGame.getState().startActivity(r.def.id, r.ctx)
      if (res.ok) sfx(r.cost ? 'coin' : 'start')
    }
    onToggle()
  }
  return (
    <div className={`act ${open ? 'open' : ''} ${r.ok ? '' : 'blocked'}`}>
      <button className="act-head" onClick={onToggle} aria-expanded={open}>
        <span className="act-icon">{r.def.icon}</span>
        <span className="act-text">
          <b>{r.def.label}</b>
          <small>{r.def.blurb}</small>
        </span>
        <span className="act-meta">
          <Chip tone={r.cost ? 'gold' : 'neutral'}>{r.cost ? formatMoney(r.cost) : 'Free'}</Chip>
          <Chip tone="blue">{formatDuration(r.minutes)}</Chip>
        </span>
      </button>
      {open && (
        <div className="act-detail">
          <div className="chips">
            <Chip tone="gold">Cost: {r.cost ? formatMoney(r.cost) : 'Free'}</Chip>
            <Chip tone="blue">Time: {formatDuration(r.minutes)}</Chip>
            {effects.map((e, i) => (
              <Chip key={i} tone={e.tone}>{e.label}</Chip>
            ))}
          </div>
          {r.reason && <p className="reason">⚠️ {r.reason}</p>}
          <Btn disabled={!r.ok} onClick={confirm}>
            {r.def.kind === 'travel' ? 'Board and ride' : r.def.kind === 'work' ? 'Start shift' : 'Confirm'}
          </Btn>
        </div>
      )}
    </div>
  )
}

function ActivityList({ list }: { list: Resolved[] }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="act-list">
      {list.map((r) => (
        <ActivityRow key={r.def.id} r={r} open={open === r.def.id} onToggle={() => setOpen(open === r.def.id ? null : r.def.id)} />
      ))}
    </div>
  )
}

function CareerCard({ careerId }: { careerId: keyof typeof CAREERS }) {
  const s = useGame()
  const c = CAREERS[careerId]
  const prog = s.careers[careerId]
  const levelIdx = (prog?.level ?? 1) - 1
  const lvl = c.levels[levelIdx]
  const employed = s.employment === careerId
  const missing = missingRequirements(s, careerId, levelIdx)
  const next = c.levels[levelIdx + 1]
  return (
    <div className="card-inner career">
      <div className="row between">
        <b>{c.emoji} {c.name}: {lvl.title}</b>
        {employed ? <Chip tone="plus">Your job</Chip> : prog ? <Chip tone="blue">Lvl {prog.level}</Chip> : null}
      </div>
      <div className="chips">
        <Chip tone="gold">{formatMoney(lvl.pay)} / shift</Chip>
        <Chip tone="blue">{formatDuration(lvl.minutes)}</Chip>
        {Object.entries(lvl.requires).map(([k, v]) => (
          <Chip key={k} tone={skillLevel(s, k as never) >= (v as number) ? 'plus' : 'warn'}>{SKILLS[k as keyof typeof SKILLS].name} {v}+</Chip>
        ))}
        {Object.keys(lvl.requires).length === 0 && <Chip>No experience needed</Chip>}
      </div>
      {employed && next && prog && <small className="muted">Promotion to {next.title}: {Math.min(prog.xp, next.promoteAt)}/{next.promoteAt} career XP{Object.keys(next.requires).length ? ` · needs ${Object.entries(next.requires).map(([k, v]) => `${SKILLS[k as keyof typeof SKILLS].name} ${v}`).join(', ')}` : ''}</small>}
      {employed && !next && <small className="muted">You have reached the top of this career. 🎉</small>}
      {c.illegal && <p className="reason">🚨 Illegal. Pays big, but police raid {Math.round(c.illegal.raid * 100)}% of shifts and heat rises. Charge: {CHARGES[c.illegal.charge].name}.</p>}
      {employed && (
        <>
          <small className="muted">During a shift, tasks pop up: {c.tasks.map((t) => `${t.icon} ${t.label}`).join(' · ')}. Do them to earn task pay and tips. Miss too many and you get warned, then fired.</small>
          {s.nearDest === c.workplace && (
            <Btn disabled={!!s.activity} onClick={() => { sfx('click'); useGame.getState().startActivity(`work:${careerId}`, { dest: c.workplace, career: careerId }) }}>
              ▶ Start shift ({formatDuration(lvl.minutes)})
            </Btn>
          )}
          <Btn small kind="ghost" onClick={() => useGame.getState().quitJob()} disabled={!!s.activity}>Quit job</Btn>
        </>
      )}
      {!employed && (
        <>
          {missing.length > 0 && <p className="reason">⚠️ Not eligible yet: needs {missing.join(', ')}</p>}
          <Btn disabled={missing.length > 0 || s.nearDest !== c.workplace || !!s.activity} onClick={() => { useGame.getState().applyForJob(careerId); sfx('success') }}>
            Apply as {lvl.title}
          </Btn>
          {s.nearDest !== c.workplace && <small className="muted">Applications are made in person at the workplace.</small>}
        </>
      )}
    </div>
  )
}

function NpcCard({ npcId }: { npcId: string }) {
  const s = useGame()
  const npc = NPC_BY_ID[npcId]
  const pts = friendPoints(s, npcId)
  const idx = friendIndex(pts)
  const lv = BALANCE.friendship.levels
  const nextAt = lv[idx + 1]?.at
  const f = s.friendships[npcId]
  const talksToday = f && f.talkDay === Math.floor(s.minutes / 1440) + 1 ? f.talks : 0
  const left = BALANCE.friendship.talksPerDay - talksToday
  return (
    <div className="card-inner npc">
      <div className="row between">
        <b>{npc.emoji} {npc.name} <i className="npc-badge">NPC</i></b>
        <Chip tone="blue">{friendName(pts)}</Chip>
      </div>
      <small className="muted">{npc.role} · {npc.personality}</small>
      <Meter value={nextAt ? pts - lv[idx].at : 1} max={nextAt ? nextAt - lv[idx].at : 1} tone="gold" label="Friendship" />
      <small className="muted">
        {nextAt ? `${Math.round(pts)}/${nextAt} to ${lv[idx + 1].name}` : 'Max friendship'} · Perk at Friend: {npc.perk.text}
      </small>
      <Btn small disabled={!!s.activity || s.nearDest !== npc.destId || left <= 0} onClick={() => useGame.getState().startTalk(npcId)}>
        💬 Chat (20 min){left <= 0 ? ' · come back tomorrow' : ''}
      </Btn>
      <Romance npcId={npcId} />
    </div>
  )
}

function Romance({ npcId }: { npcId: string }) {
  const s = useGame()
  const npc = NPC_BY_ID[npcId]
  if (!npc.datable) return null
  const pts = friendPoints(s, npcId)
  const mine = s.romance.partner === npcId
  if (mine) {
    const st = s.romance.stage
    return (
      <div className="romance">
        <small>💕 {st === 'married' ? 'Your spouse' : st === 'engaged' ? 'Your fiancé(e)' : 'Your partner'} · {s.romance.dates} dates</small>
        {st === 'dating' && (
          <Btn small kind="soft" disabled={!s.romance.ring || pts < ROMANCE.proposeAt || s.romance.dates < ROMANCE.datesToPropose} onClick={() => useGame.getState().propose()}>
            💍 Propose{!s.romance.ring ? ' (buy a ring at Accra Mall)' : pts < ROMANCE.proposeAt || s.romance.dates < ROMANCE.datesToPropose ? ` (needs ${ROMANCE.proposeAt} love, ${ROMANCE.datesToPropose} dates)` : ''}
          </Btn>
        )}
        {st === 'engaged' && <small className="muted">Book the wedding at Osu Community Church.</small>}
        {st !== 'married' && <Btn small kind="ghost" onClick={() => useGame.getState().breakUp()}>Break up</Btn>}
      </div>
    )
  }
  if (s.romance.partner) return null
  return (
    <Btn small kind="soft" disabled={pts < ROMANCE.askAt || s.nearDest !== npc.destId} onClick={() => useGame.getState().askOut(npcId)}>
      💕 Ask on a date{pts < ROMANCE.askAt ? ` (friendship ${ROMANCE.askAt}+)` : ''}
    </Btn>
  )
}

function CourtCard() {
  const s = useGame()
  if (s.legal.caseDeadline === null) return <small className="muted">You have no pending case. Lucky you.</small>
  return (
    <div className="card-inner bad">
      <b>⚖️ Your case: theft</b>
      <small>Hearing deadline: Day {Math.floor(s.legal.caseDeadline / 1440) + 1}. Missing it means a bench warrant and {5} days in prison.</small>
      <Btn disabled={s.nearDest !== 'court' || !!s.activity} onClick={() => useUI.setState({ court: true })}>⚖️ Attend your hearing</Btn>
    </div>
  )
}

function RealtyCard() {
  const s = useGame()
  const near = s.nearDest === 'realty'
  return (
    <>
      <b>🏪 Businesses for sale</b>
      <small className="muted">Own a business and its profit lands in your wallet every morning. Upgrade for more customers.</small>
      {BUSINESSES.map((b) => {
        const own = s.businesses[b.id]
        return (
          <div key={b.id} className="card-inner">
            <div className="row between"><b>{b.emoji} {b.name}</b>{own ? <Chip tone="plus">Owned · Lv {own.level}</Chip> : <Chip tone="gold">{formatMoney(b.price)}</Chip>}</div>
            <small className="muted">{b.area} · {b.blurb} Profit {formatMoney(b.income[0])}–{formatMoney(b.income[1])}/day.</small>
            {!own && <Btn small disabled={!near || s.money < b.price} onClick={() => { sfx('coin'); useGame.getState().buyBusiness(b.id) }}>Buy for {formatMoney(b.price)}</Btn>}
          </div>
        )
      })}
      <b>🗺️ Land for sale</b>
      {PLOTS.map((p) => {
        const d = DEST_BY_ID[p.id]
        const st = s.plots[p.id]
        const value = plotValue(s, p.id)
        return (
          <div key={p.id} className="card-inner">
            <div className="row between"><b>{d.name}</b>{st?.owned ? <Chip tone="plus">Owned</Chip> : <Chip tone="gold">{formatMoney(value)}</Chip>}</div>
            <small className="muted">{AREA_BY_ID[d.area].name} · grows ~{(p.growth * 100).toFixed(1)}%/day · land-guard risk {p.guardRisk >= 0.5 ? 'high' : p.guardRisk >= 0.3 ? 'medium' : 'low'}</small>
            <div className="row">
              {!st?.owned && <Btn small disabled={!near || s.money < value} onClick={() => { useGame.getState().buyPlot(p.id); sfx('success') }}>Buy {formatMoney(value)}</Btn>}
              {st?.owned && <Btn small kind="soft" onClick={() => useGame.getState().sellPlot(p.id)}>Sell for {formatMoney(value)}</Btn>}
              <Btn small kind="ghost" onClick={() => walkToDest(p.id)}>📍 Visit</Btn>
            </div>
          </div>
        )
      })}
      {(['apartment', 'premium'] as const).map((t) => {
        const h = HOMES[t]
        const owned = s.owned.includes(t)
        return (
          <div key={t} className="card-inner">
            <div className="row between"><b>🏡 Buy the {h.name}</b>{owned ? <Chip tone="plus">Owned</Chip> : <Chip tone="gold">{formatMoney(h.buy)}</Chip>}</div>
            <small className="muted">{DEST_BY_ID[h.destId].name}. Own it outright: no rent. Rent instead: {formatMoney(h.rent)}/week.</small>
            {!owned && <Btn small disabled={!near || s.money < h.buy} onClick={() => useGame.getState().buyHome(t)}>Buy for {formatMoney(h.buy)}</Btn>}
            {owned && <Btn small kind="soft" disabled={s.housing.tier === t} onClick={() => { sfx('coin'); useGame.getState().sellHome(t) }}>Sell for {formatMoney(Math.round(h.buy * HOME_SELL_BACK))}</Btn>}
            {owned && <RentOutBtn k={t} />}
            {owned && s.housing.tier === t && <small className="muted">You live here. Move to another home before selling or renting it out.</small>}
          </div>
        )
      })}
      <UpgradesCard />
    </>
  )
}

export function UpgradesCard() {
  const s = useGame()
  const have = s.upgrades[s.housing.tier] ?? []
  return (
    <div className="card-inner">
      <b>🔧 Upgrade your {HOMES[s.housing.tier].name.toLowerCase()}</b>
      {UPGRADES.map((u) => (
        <div key={u.id} className="row between upg">
          <span>{u.emoji} {u.name}<small className="muted block">{u.blurb}</small></span>
          {have.includes(u.id) ? <Chip tone="plus">Installed</Chip> : <Btn small disabled={s.money < u.price} onClick={() => { useGame.getState().buyUpgrade(u.id); sfx('coin') }}>{formatMoney(u.price)}</Btn>}
        </div>
      ))}
    </div>
  )
}

function PlotCard({ id }: { id: string }) {
  const s = useGame()
  const near = s.nearDest === id
  const p = s.plots[id]
  const value = plotValue(s, id)
  if (!p?.owned) {
    return (
      <div className="card-inner">
        <div className="row between"><b>For sale</b><Chip tone="gold">{formatMoney(value)}</Chip></div>
        <small className="muted">Buy here or at Accra Realty. Then get a permit at the Lands Commission.</small>
        <Btn disabled={!near || s.money < value} onClick={() => useGame.getState().buyPlot(id)}>Buy this land</Btn>
      </div>
    )
  }
  const stages = projectStages(p.project)
  const proj = p.project ? PROJECTS[p.project] : null
  const done = !!proj && p.stage >= stages.length
  const next = stages[p.stage]
  const living = s.housing.tier === 'house' && s.housing.plotId === id
  const canPick = p.stage === 0 && p.until === null
  return (
    <div className="card-inner">
      <div className="row between"><b>🏗️ Your land</b><Chip tone="plus">Worth {formatMoney(value)}</Chip></div>
      <div className="chips">
        <Chip tone={p.permit === 'approved' ? 'plus' : p.permit === 'pending' ? 'blue' : 'warn'}>📜 Permit: {p.permit}</Chip>
        <Chip tone={p.guards === 'active' ? 'minus' : 'plus'}>🪓 Land guards: {p.guards === 'active' ? 'on site!' : p.guards === 'settled' ? 'settled' : 'none'}</Chip>
        {p.noPermit && p.permit !== 'approved' && <Chip tone="minus">Unpermitted build</Chip>}
      </div>
      {canPick && (
        <div className="project-pick">
          <b>{proj ? `Project: ${proj.emoji} ${proj.name}` : 'What do you want to build?'}</b>
          {PROJECT_IDS.map((pid) => {
            const def = PROJECTS[pid]
            const total = projectStages(pid).reduce((a, b) => a + b.price, 0)
            return (
              <button key={pid} className={`project-opt ${p.project === pid ? 'on' : ''}`} onClick={() => { sfx('click'); useGame.getState().chooseProject(id, pid) }}>
                <span className="po-ico">{def.emoji}</span>
                <span className="po-main"><b>{def.name}</b><small>{def.blurb}</small><small>{def.livable ? '🏡 You can live here' : `💰 Earns ${formatMoney(def.income![0])}–${formatMoney(def.income![1])} a day`} · {projectStages(pid).length} stages</small></span>
                <span className="po-price">{formatMoney(total)}</span>
              </button>
            )
          })}
        </div>
      )}
      {proj && !canPick && <small className="muted">Project: {proj.emoji} {proj.name}{proj.income ? ` · earns ${formatMoney(proj.income[0])}–${formatMoney(proj.income[1])}/day when finished` : ''}</small>}
      {proj && <ol className="levels">
        {stages.map((b, i) => (
          <li key={b.name} className={i < p.stage ? 'done' : i === p.stage ? 'on' : ''}>
            <span>{b.emoji} {b.name}</span>
            <span>{i < p.stage ? 'Complete' : `${formatMoney(b.price)} · ${b.days} day`}</span>
          </li>
        ))}
      </ol>}
      {p.until !== null && <small>👷 Builders at work. Ready Day {Math.floor(p.until / 1440) + 1}.</small>}
      {p.guards === 'active' && <Btn kind="danger" disabled={!near} onClick={() => useGame.getState().buildNext(id)}>🪓 Deal with the land guards</Btn>}
      {proj && !done && p.until === null && next && p.guards !== 'active' && (
        <>
          <Btn disabled={!near || s.money < next.price || !!s.activity || p.permit !== 'approved'} onClick={() => { useGame.getState().buildNext(id); sfx('coin') }}>
            Start {next.name.toLowerCase()} · {formatMoney(next.price)}
          </Btn>
          {p.permit !== 'approved' && (
            <Btn small kind="ghost" disabled={!near || s.money < next.price} onClick={() => useGame.getState().buildNext(id, true)}>⚠️ Build without a permit (risk of demolition)</Btn>
          )}
        </>
      )}
      {done && proj?.livable && !living && <Btn onClick={() => useGame.getState().moveHome('house', id)}>🏡 Move in (moving fee only)</Btn>}
      {done && proj?.livable && <RentOutBtn k={`plot:${id}`} />}
      {done && proj?.livable && living && <small className="muted">Living here? Add a boys’ quarters flat from Home › Upgrades and rent that out instead.</small>}
      {done && proj?.livable && living && <Btn disabled={!near} onClick={() => useGame.getState().enterHome()}>🚪 Enter your house</Btn>}
      {done && proj?.income && <small className="muted">✅ Open for business. Income lands in your wallet every morning.</small>}
      {!living && <Btn small kind="soft" disabled={p.until !== null} onClick={() => useGame.getState().sellPlot(id)}>Sell for {formatMoney(value)}</Btn>}
    </div>
  )
}

/** Let a home you own (and do not live in) to tenants, or end the lease. */
export function RentOutBtn({ k }: { k: string }) {
  const s = useGame()
  const let_ = s.rentedOut.includes(k)
  if (!let_ && !canRentOut(s, k)) return null
  const [lo, hi] = rentOutRange(s, k)
  const range = lo === hi ? formatMoney(lo) : `${formatMoney(lo)}–${formatMoney(hi)}`
  return (
    <Btn small kind={let_ ? 'ghost' : 'soft'} onClick={() => { sfx(let_ ? 'click' : 'coin'); useGame.getState().toggleRentOut(k) }}>
      {let_ ? `🔑 Rented out · ${range}/day · end lease` : `🏠 Rent it out · ${range}/day`}
    </Btn>
  )
}

function DealerCard() {
  const s = useGame()
  const near = s.nearDest === 'dealer'
  return (
    <>
      {VEHICLE_IDS.map((v) => {
        const d = VEHICLES[v]
        const owned = s.vehicles.includes(v)
        return (
          <div key={v} className="card-inner">
            <div className="row between"><b>{d.emoji} {d.name}</b>{owned ? <Chip tone="plus">Owned</Chip> : <Chip tone="gold">{formatMoney(d.price)}</Chip>}</div>
            <small className="muted">{d.job}. {d.blurb} Or rent daily for {formatMoney(d.rent)} (“work and pay”).</small>
            {!owned && <Btn small disabled={!near || s.money < d.price} onClick={() => { useGame.getState().buyVehicle(v); sfx('success') }}>Buy {formatMoney(d.price)}</Btn>}
            {owned && <Btn small kind="soft" disabled={s.drive?.vehicle === v} onClick={() => { useGame.getState().sellVehicle(v); sfx('coin') }}>Sell for {formatMoney(Math.round(d.price * SELL_BACK.vehicle))}</Btn>}
          </div>
        )
      })}
      <small className="muted">Start shifts from the Drive app on your phone. Licences come from the DVLA.</small>
    </>
  )
}

function BankCard() {
  const s = useGame()
  if (!s.bank.open) return null
  return (
    <div className="card-inner">
      <div className="row between"><b>🏦 Your savings</b><Chip tone="plus">{formatMoney(s.bank.balance)}</Chip></div>
      <small className="muted">Deposit, withdraw and invest from the Bank app on your phone.</small>
      <Btn small kind="soft" onClick={() => { useUI.setState({ phoneTab: 'bank', panel: 'phone' }) }}>Open Bank app</Btn>
    </div>
  )
}

function HousingCard({ tier }: { tier: keyof typeof HOMES }) {
  const s = useGame()
  const h = HOMES[tier]
  const current = s.housing.tier === tier
  const total = h.rent + BALANCE.movingFee
  return (
    <div className={`card-inner housing ${current ? 'current' : ''}`}>
      <div className="row between">
        <b>{h.name}</b>
        {current ? <Chip tone="plus">Your home</Chip> : <Chip tone="gold">{formatMoney(h.rent)}/week</Chip>}
      </div>
      <ul className="amenities">
        {h.amenities.map((a) => <li key={a}>{a}</li>)}
      </ul>
      <div className="chips">
        <Chip tone="blue">Comfort {h.comfort}+</Chip>
        <Chip>{h.grid.w}×{h.grid.d} grid</Chip>
      </div>
      {current ? (
        <Btn disabled={s.nearDest !== h.destId || !!s.activity} onClick={() => useGame.getState().enterHome()}>🚪 Enter home</Btn>
      ) : (
        <>
          <Btn kind="soft" disabled={s.money < total || !!s.activity} onClick={() => { useGame.getState().moveHome(tier); sfx('success') }}>
            Move in · {formatMoney(total)}
          </Btn>
          <small className="muted">First week ({formatMoney(h.rent)}) + {formatMoney(BALANCE.movingFee)} moving fee. {s.money < total ? `Need ${formatMoney(total - s.money)} more.` : ''}</small>
        </>
      )}
    </div>
  )
}

function Transport({ stopId }: { stopId: string }) {
  const s = useGame()
  const stops = DESTINATIONS.filter((d) => d.kind === 'stop' && d.id !== stopId)
  return (
    <div className="act-list">
      <small className="muted">Trotros leave when full. Fares depend on distance.</small>
      {stops.map((st) => {
        const q = rideQuote(s, 'trotro', st.id)
        return (
          <div key={st.id} className="shop-item">
            <span className="shop-ico">🚐</span>
            <div className="shop-text"><b>To {st.name}</b><small>{AREA_BY_ID[st.area].name} · {q.km.toFixed(1)} km · ~{q.minutes} min</small></div>
            <Btn small disabled={s.money < q.fare || !!s.activity} onClick={() => { useGame.getState().startRide('trotro', st.id); sfx('coin') }}>{formatMoney(q.fare)}</Btn>
          </div>
        )
      })}
    </div>
  )
}

function Shop({ dest }: { dest: string }) {
  const s = useGame()
  const pm = priceMultiplier(s, dest)
  return (
    <div className="shop">
      {SHOP_FURNITURE.map((t) => {
        const f = FURNITURE[t]
        const price = Math.round(f.price * pm)
        const owned = s.inventory.filter((o) => o.type === t).length
        return (
          <div key={t} className="shop-item">
            <span className="shop-ico">{f.emoji}</span>
            <div className="shop-text">
              <b>{f.name}{owned ? ` · owned ${owned}` : ''}</b>
              <small>{f.blurb} · Comfort +{f.comfort}</small>
            </div>
            <Btn small disabled={s.money < price || s.nearDest !== dest || !!s.activity} onClick={() => { useGame.getState().buyFurniture(t); sfx('coin') }}>
              {formatMoney(price)}
            </Btn>
          </div>
        )
      })}
      <small className="muted">Bought items go to your inventory. Place them in Home → Decorate.</small>
    </div>
  )
}

export function BuildingPanel() {
  const id = useUI((s) => s.selectedDest)!
  const dest = DEST_BY_ID[id]
  const s = useGame()
  const [tab, setTab] = useState<'do' | 'shop'>('do')
  const near = s.nearDest === id
  const open = dest.hours[0] === 0 && dest.hours[1] === 24 ? true : isOpen(dest.hours, hourOf(s.minutes))
  const dist = Math.round(Math.hypot(s.player.x - (dest.door.x + 0.5), s.player.z - (dest.door.z + 0.5)))
  const acts = dest.kind === 'stop' || dest.kind === 'home' || dest.kind === 'plot' ? [] : activitiesForDest(s, id)
  const closeIt = () => useUI.setState({ panel: 'none', selectedDest: s.view === 'inside' ? id : null })
  return (
    <Sheet
      title={dest.name}
      icon={dest.emoji}
      onClose={closeIt}
      footer={s.view === 'inside' && s.insideDest === id ? <Btn kind="ghost" onClick={() => useGame.getState().exitBuilding()} disabled={!!s.activity}>🚪 Leave building</Btn> : undefined}
      subtitle={
        <>
          {AREA_BY_ID[dest.area]?.name} · {open ? <span className="ok">Open</span> : <span className="bad">Closed</span>}
          {dest.hours[0] !== 0 || dest.hours[1] !== 24 ? ` · ${fmtHour(dest.hours[0])}–${fmtHour(dest.hours[1])}` : ' · 24h'}
        </>
      }
    >
      <p className="blurb">{dest.blurb}</p>
      {!near && s.view === 'world' && (
        <Btn onClick={() => walkToDest(id)} disabled={!!s.activity}>
          🚶 {canEnter(id) ? 'Go there' : 'Walk here'} ({dist} tiles)
        </Btn>
      )}
      {near && s.view === 'world' && canEnter(id) && (
        <Btn onClick={() => useGame.getState().enterBuilding(id)} disabled={!!s.activity}>
          🚪 Go inside{dest.kind === 'home' ? '' : open ? '' : ' (closed)'}
        </Btn>
      )}
      {near && s.view === 'world' && !canEnter(id) && <div className="here">📍 You are here</div>}
      {s.view === 'inside' && s.insideDest === id && <div className="here">📍 You are inside. Tap staff to chat, or pick an activity.</div>}

      {dest.npcs.map((n) => <NpcCard key={n} npcId={n} />)}
      {careersAt(dest.id).map((c) => <CareerCard key={c} careerId={c} />)}
      {dest.homeTier && dest.kind === 'home' && (
        <>
          <HousingCard tier={dest.homeTier} />
          {dest.homeTier !== s.housing.tier && (
            <small className="muted">You currently live in the {HOMES[s.housing.tier].name.toLowerCase()} (rent {formatMoney(HOMES[s.housing.tier].rent)}/week).</small>
          )}
        </>
      )}
      {dest.kind === 'stop' && <Transport stopId={id} />}
      {dest.kind === 'court' && <CourtCard />}
      {dest.kind === 'realty' && <RealtyCard />}
      {dest.kind === 'plot' && <PlotCard id={id} />}
      {dest.kind === 'dealer' && <DealerCard />}
      {dest.kind === 'bank' && <BankCard />}
      {dest.kind === 'market' && (
        <div className="tabs">
          <button className={tab === 'do' ? 'on' : ''} onClick={() => setTab('do')}>Stalls</button>
          <button className={tab === 'shop' ? 'on' : ''} onClick={() => setTab('shop')}>Furniture</button>
        </div>
      )}
      {(dest.kind !== 'market' || tab === 'do') && acts.length > 0 && <ActivityList list={acts} />}
      {dest.kind === 'market' && tab === 'shop' && <Shop dest={id} />}

    </Sheet>
  )
}

export { DESTINATIONS }
export type { GameState }
