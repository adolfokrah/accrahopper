'use client'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { sfx } from '@/game/audio'
import { friendIndex, friendName, friendPoints, isOpen, levelFromXp } from '@/game/activities'
import { BALANCE, GAME_CONFIG, dayOf, formatClock, formatMoney, hourOf } from '@/game/config'
import { AREAS, AREA_BY_ID, CAREERS, CAREER_IDS, DESTINATIONS, DEST_BY_ID, HOMES, NPCS, SKILLS } from '@/game/content'
import { walkToDest } from '@/game/nav'
import { canRentOut, cleanCash, launderCap, loanLimit, missingRequirements, rentOutRange, useGame } from '@/game/store'
import { LAUNDER, BIZ, HOME_SELL_BACK, SELL_BACK, PROJECTS, projectStages, BUSINESSES, BUSINESS_BY_ID, DRIVING, FINANCE, LOAN, PLOTS, STOCKS, VEHICLES, WORK_VEHICLES, homeDestId } from '@/game/content'
import { plotValue } from '@/game/property'
import { GOALS, TASK_BY_ID, taskProgress } from '@/game/life'
import { DreamCard, LifeGoalsList } from './LifeUI'
import { CityMap } from './CityMap'
import { useUI, type PhoneTab } from '@/game/ui'
import { useAccount } from '@/game/net/account'
import { useRemoteIds } from '@/game/net/remotes'
import { NEARBY_THREAD, friendAction, loadConversations, loadFriends, openPlayer, openThread, say, sendDm, socialLive, useSocial } from '@/game/net/social'
import { SKILL_IDS, type TxCategory } from '@/game/types'

interface AppDef {
  id: PhoneTab | 'settings' | 'homeapp'
  name: string
  glyph: string
  bg: string
}
const APPS: AppDef[] = [
  { id: 'jobs', name: 'Jobs', glyph: '💼', bg: 'linear-gradient(160deg,#4f8cff,#1d5fd6)' },
  { id: 'assets', name: 'Assets', glyph: '🏘️', bg: 'linear-gradient(160deg,#7ee2b8,#0f9d6b)' },
  { id: 'goals', name: 'Goals', glyph: '🎯', bg: 'linear-gradient(160deg,#ffd36b,#ff9f0a)' },
  { id: 'bank', name: 'Bank', glyph: '🏦', bg: 'linear-gradient(160deg,#f4d06f,#b8860b)' },
  { id: 'drive', name: 'Drive', glyph: '🚖', bg: 'linear-gradient(160deg,#34d399,#047857)' },
  { id: 'calendar', name: 'Calendar', glyph: '', bg: '#ffffff' },
  { id: 'skills', name: 'Skills', glyph: '📈', bg: 'linear-gradient(160deg,#5fdc8a,#1f9d55)' },
  { id: 'messages', name: 'Alerts', glyph: '🔔', bg: 'linear-gradient(160deg,#ff6961,#e0352b)' },
  { id: 'music', name: 'Music', glyph: '🎵', bg: 'linear-gradient(160deg,#ff6b81,#f0274d)' },
  { id: 'homeapp', name: 'Home', glyph: '🏠', bg: 'linear-gradient(160deg,#ffb257,#ff7a1a)' },
  { id: 'settings', name: 'Settings', glyph: '⚙️', bg: 'linear-gradient(160deg,#b9bec6,#7c8490)' },
]
const DOCK: AppDef[] = [
  { id: 'chat', name: 'Chat', glyph: '💬', bg: 'linear-gradient(160deg,#6ef08a,#21c24a)' },
  { id: 'maps', name: 'Maps', glyph: '🧭', bg: 'linear-gradient(160deg,#9ee8b0,#3fb6d9)' },
  { id: 'wallet', name: 'MoMo', glyph: '📲', bg: 'linear-gradient(160deg,#ffd51a,#ffbf00)' },
  { id: 'contacts', name: 'Contacts', glyph: '👤', bg: 'linear-gradient(160deg,#d7dbe0,#a6adb6)' },
]
const TITLES: Record<string, string> = { assets: 'Assets', jobs: 'Jobs', skills: 'Skills', maps: 'Maps', wallet: 'MoMo', contacts: 'Contacts', messages: 'Alerts', calendar: 'Calendar', music: 'Music' }

const open = (id: AppDef['id']) => {
  sfx('click')
  if (id === 'settings') return useUI.getState().setPanel('settings')
  if (id === 'homeapp') return useUI.getState().setPanel('home')
  useUI.setState({ phoneTab: id, ...(id === 'messages' ? { unread: 0 } : {}) })
}
const closePhone = () => useUI.setState({ panel: 'none' })
const goHome = () => useUI.setState({ phoneTab: 'home' })
const directions = (id: string) => {
  useUI.setState({ trackedDest: id, panel: 'none' })
  walkToDest(id)
}
const clock24 = (m: number) => {
  const mm = Math.floor(m % 1440)
  return `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, '0')}`
}

/* --------------------------------- chrome --------------------------------- */
function StatusBar({ dark }: { dark: boolean }) {
  const minutes = useGame((s) => s.minutes)
  return (
    <div className={`ios-status ${dark ? 'dark' : ''}`}>
      <span className="ios-time">{clock24(minutes)}</span>
      <span className="ios-island" aria-hidden />
      <span className="ios-icons" aria-hidden>
        <i className="sig"><b /><b /><b /><b /></i>
        <span className="net">5G</span>
        <i className="batt"><b /></i>
      </span>
    </div>
  )
}

function Icon({ app, badge }: { app: AppDef; badge?: number }) {
  const minutes = useGame((s) => s.minutes)
  return (
    <button className="ios-app" onClick={() => open(app.id)} aria-label={app.name}>
      <span className="ios-icon" style={{ background: app.bg }}>
        {app.id === 'calendar' ? (
          <span className="cal-glyph"><small>DAY</small><b>{dayOf(minutes)}</b></span>
        ) : app.id === 'wallet' ? (
          <span className="momo-glyph" aria-hidden><b>MoMo</b><i>●</i></span>
        ) : (
          <span className="glyph">{app.glyph}</span>
        )}
        {!!badge && <span className="ios-badge">{badge > 99 ? '99+' : badge}</span>}
      </span>
      <span className="ios-label">{app.name}</span>
    </button>
  )
}

function HomeScreen() {
  const minutes = useGame((s) => s.minutes)
  const money = useGame((s) => s.money)
  const housing = useGame((s) => s.housing)
  const unread = useUI((s) => s.unread)
  const requests = useSocial((s) => s.friends.filter((f) => f.status === 'received').length)
  const chatUnread = useSocial((s) => s.unread)
  const h = hourOf(minutes)
  const night = h < 6 || h >= 19
  const rentIn = Math.max(0, housing.nextRentDue - minutes)
  return (
    <div className="ios-home">
      <div className="ios-widgets">
        <div className="widget weather">
          <small>{GAME_CONFIG.cityName}</small>
          <b>{night ? '26°' : h < 11 ? '29°' : '32°'}</b>
          <span>{night ? '🌙 Clear night' : h >= 17 ? '🌇 Golden hour' : '☀️ Sunny'}</span>
          <small>Day {dayOf(minutes)} · {formatClock(minutes)}</small>
        </div>
        <button className="widget wallet-w" onClick={() => open('wallet')}>
          <small>MoMo Wallet</small>
          <b>{formatMoney(money)}</b>
          <span>{housing.overdueSince !== null ? '⚠️ Rent overdue' : `Rent in ${rentIn >= 1440 ? `${Math.floor(rentIn / 1440)}d` : `${Math.floor(rentIn / 60)}h`}`}</span>
        </button>
      </div>
      <div className="ios-grid">
        {APPS.map((a) => <Icon key={a.id + a.name} app={a} badge={a.id === 'messages' ? unread : undefined} />)}
      </div>
      <div className="ios-dots" aria-hidden><i className="on" /><i /></div>
      <div className="ios-dock">
        {DOCK.map((a) => <Icon key={a.id} app={a} badge={a.id === 'chat' ? chatUnread : a.id === 'contacts' ? requests : undefined} />)}
      </div>
    </div>
  )
}

function AppShell({ title, children, back, onBack }: { title: string; children: ReactNode; back?: string; onBack?: () => void }) {
  return (
    <div className="ios-app-view">
      <div className="ios-nav">
        <button className="ios-back" onClick={() => { sfx('click'); (onBack ?? goHome)() }}>‹ {back ?? 'Home'}</button>
      </div>
      <div className="ios-scroll">
        <h1 className="ios-large">{title}</h1>
        {children}
      </div>
    </div>
  )
}

const Group = ({ header, footer, children }: { header?: string; footer?: ReactNode; children: ReactNode }) => (
  <section className="ios-section">
    {header && <h4>{header}</h4>}
    <div className="ios-group">{children}</div>
    {footer && <p className="ios-foot">{footer}</p>}
  </section>
)
const Row = ({ icon, iconBg, title, sub, detail, chevron, onClick, tone }: { icon?: string; iconBg?: string; title: ReactNode; sub?: ReactNode; detail?: ReactNode; chevron?: boolean; onClick?: () => void; tone?: 'blue' | 'red' | 'green' }) => {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`ios-row ${tone ?? ''}`} onClick={onClick}>
      {icon && <span className="ios-row-icon" style={{ background: iconBg ?? '#e5e5ea' }}>{icon}</span>}
      <span className="ios-row-main">
        <span className="ios-row-title">{title}</span>
        {sub && <span className="ios-row-sub">{sub}</span>}
      </span>
      {detail !== undefined && <span className="ios-row-detail">{detail}</span>}
      {chevron && <span className="ios-chev">›</span>}
    </Tag>
  )
}
const Bar = ({ v, max, color = '#0a84ff' }: { v: number; max: number; color?: string }) => (
  <span className="ios-bar"><i style={{ width: `${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100))}%`, background: color }} /></span>
)

/* ---------------------------------- apps ---------------------------------- */
/** Rent a property out to tenants, or end the lease. */
function RentChip({ k }: { k: string }) {
  const s = useGame()
  const let_ = s.rentedOut.includes(k)
  if (!let_ && !canRentOut(s, k)) return null
  const [lo, hi] = rentOutRange(s, k)
  return (
    <button className="ios-chip amount" onClick={(e) => { e.stopPropagation(); sfx(let_ ? 'click' : 'coin'); useGame.getState().toggleRentOut(k) }}>
      {let_ ? '🔑 End lease' : `🏠 Rent out ${lo === hi ? formatMoney(lo) : `${formatMoney(lo)}–${formatMoney(hi)}`}/day`}
    </button>
  )
}

/** Everything you own: home, houses, land, businesses, vehicles and savings. */
function Assets() {
  const s = useGame()
  const plots = PLOTS.filter((p) => s.plots[p.id]?.owned)
  const bizIds = Object.keys(s.businesses).filter((id) => BUSINESS_BY_ID[id])
  const landValue = plots.reduce((a, p) => a + plotValue(s, p.id), 0)
  const bizValue = bizIds.reduce((a, id) => a + Math.round(s.businesses[id].paid * BIZ.sellBack), 0)
  const carValue = s.vehicles.reduce((a, v) => a + Math.round(VEHICLES[v].price * SELL_BACK.vehicle), 0)
  const homeValue = s.owned.filter((t) => t !== 'house').reduce((a, t) => a + (HOMES[t].buy ?? 0), 0)
  const stocks = Object.entries(s.invest.shares).reduce((a, [id, n]) => a + n * (s.invest.prices[id]?.slice(-1)[0] ?? 0), 0)
  const tbills = s.invest.tbills.reduce((a, t) => a + t.amount, 0)
  const worth = s.money + s.bank.balance + landValue + bizValue + carValue + homeValue + stocks + tbills - (s.loan?.owed ?? 0)
  const home = HOMES[s.housing.tier]
  const ownsHome = s.owned.includes(s.housing.tier)
  return (
    <AppShell title="Assets">
      <div className="ios-hero green">
        <small>Net worth</small>
        <b>{formatMoney(worth)}</b>
        <span>Cash {formatMoney(s.money)} · Bank {formatMoney(s.bank.balance)}{s.loan ? ` · Loan −${formatMoney(s.loan.owed)}` : ''}</span>
      </div>
      <Group header="Where you live">
        <Row icon="🏠" iconBg="#ffe2c2" title={home.name} sub={ownsHome || s.housing.tier === 'house' ? 'You own this home. You can extend and decorate it.' : `Renting · ${formatMoney(home.rent)} per week`} chevron onClick={() => directions(homeDestId(s))} />
      </Group>
      <Group header={`Houses you own (${s.owned.length})`} footer="Buy homes at Accra Realty, or build a house on your own land.">
        {s.owned.length === 0 && <Row title={<span className="muted-t">No houses yet</span>} />}
        {s.owned.filter((t) => t !== 'house').map((t) => (
          <Row
            key={t}
            icon="🏡"
            iconBg="#e8f5e9"
            title={HOMES[t].name}
            sub={
              <>
                {t === s.housing.tier ? 'Living here. Move out to sell or rent it out.' : s.rentedOut.includes(t) ? `Rented out · ${formatMoney(rentOutRange(s, t)[0])}/day` : 'Empty. Move in, rent it out or sell it.'}
                {t !== s.housing.tier && HOMES[t].buy > 0 && (
                  <span className="ios-chips tight">
                    <RentChip k={t} />
                    <button className="ios-chip" onClick={() => { sfx('coin'); useGame.getState().sellHome(t) }}>Sell for {formatMoney(Math.round(HOMES[t].buy * HOME_SELL_BACK))}</button>
                  </span>
                )}
              </>
            }
            detail={HOMES[t].buy ? formatMoney(HOMES[t].buy) : undefined}
          />
        ))}
      </Group>
      <Group header={`Land (${plots.length})`} footer="Build in stages on your land. Get a permit at the Lands Commission first, or risk demolition.">
        {plots.length === 0 && <Row title={<span className="muted-t">No land yet</span>} sub="Plots are sold at Accra Realty." chevron onClick={() => directions('realty')} />}
        {plots.map((p) => {
          const st = s.plots[p.id]!
          const stages = projectStages(st.project)
          const proj = st.project ? PROJECTS[st.project] : null
          const done = !!proj && st.stage >= stages.length
          return (
            <Row
              key={p.id}
              icon={proj?.emoji ?? '🏗️'}
              iconBg="#f4e3cf"
              title={DEST_BY_ID[p.id].name}
              sub={<>{!proj ? 'Empty land · choose a project on the plot' : done ? `${proj.name} complete${proj.income ? ` · earns ${formatMoney(proj.income[0])}–${formatMoney(proj.income[1])}/day` : ''}` : `${proj.name}: ${st.stage}/${stages.length} stages`} · Permit {st.permit === 'approved' ? '✅' : st.permit === 'pending' && st.permitReady !== null ? `⏳ ready in ${untilText(st.permitReady - s.minutes)}` : '❌ apply at the Lands Commission'}{st.guards === 'active' ? ' · ⚠️ Land guards' : ''}<Bar v={st.stage} max={stages.length} color="#34c759" />
                {s.rentedOut.includes(`plot:${p.id}`) && <> · 🔑 Rented out</>}
                {!(s.housing.tier === 'house' && s.housing.plotId === p.id) && st.until === null && (
                  <span className="ios-chips tight">
                    <RentChip k={`plot:${p.id}`} />
                    <button className="ios-chip" onClick={(e) => { e.stopPropagation(); sfx('coin'); useGame.getState().sellPlot(p.id) }}>Sell for {formatMoney(plotValue(s, p.id))}</button>
                  </span>
                )}</>}
              detail={formatMoney(plotValue(s, p.id))}
              chevron
              onClick={() => directions(p.id)}
            />
          )
        })}
      </Group>
      <Group header={`Businesses (${bizIds.length})`} footer="Profit is paid into your wallet every morning. Buy businesses at Accra Realty.">
        {bizIds.length === 0 && <Row title={<span className="muted-t">No businesses yet</span>} sub="From a GH₵2,500 kiosk to a student hostel." chevron onClick={() => directions('realty')} />}
        {bizIds.map((id) => {
          const b = BUSINESS_BY_ID[id]
          const own = s.businesses[id]
          const mult = 1 + (own.level - 1) * BIZ.upgradeIncome
          const up = Math.round(b.price * BIZ.upgradeCost)
          return (
            <Row
              key={id}
              icon={b.emoji}
              iconBg="#fff4d6"
              title={<>{b.name} <small className="muted-t">Lv {own.level}</small></>}
              sub={
                <>
                  {b.area} · {formatMoney(Math.round(b.income[0] * mult))}–{formatMoney(Math.round(b.income[1] * mult))}/day{own.lastProfit ? ` · yesterday ${own.lastProfit >= 0 ? '+' : ''}${formatMoney(own.lastProfit)}` : ''}
                  <span className="ios-chips tight">
                    {own.level < BIZ.maxLevel && <button className="ios-chip amount" onClick={() => { sfx('coin'); useGame.getState().upgradeBusiness(id) }}>⬆️ Upgrade {formatMoney(up)}</button>}
                    <button className="ios-chip" onClick={() => { sfx('click'); useGame.getState().sellBusiness(id) }}>Sell {formatMoney(Math.round(own.paid * BIZ.sellBack))}</button>
                  </span>
                </>
              }
            />
          )
        })}
      </Group>
      <Group header={`Vehicles (${s.vehicles.length})`} footer="Buy at Spintex Motors. Use the Drive app to work as a driver.">
        {s.vehicles.length === 0 && <Row title={<span className="muted-t">No vehicles yet</span>} />}
        {s.vehicles.map((v, i) => (
          <Row
            key={`${v}${i}`}
            icon={VEHICLES[v].emoji}
            iconBg="#e3f2fd"
            title={VEHICLES[v].name}
            sub={
              <>
                {VEHICLES[v].job}
                <span className="ios-chips tight">
                  <button className="ios-chip" disabled={s.drive?.vehicle === v} onClick={() => { sfx('coin'); useGame.getState().sellVehicle(v) }}>Sell for {formatMoney(Math.round(VEHICLES[v].price * SELL_BACK.vehicle))}</button>
                </span>
              </>
            }
            detail={formatMoney(Math.round(VEHICLES[v].price * SELL_BACK.vehicle))}
          />
        ))}
      </Group>
      <Group header="Savings & investments">
        <Row icon="🏦" iconBg="#fff4d6" title="Bank account" detail={s.bank.open ? formatMoney(s.bank.balance) : 'Not open'} chevron onClick={() => useUI.setState({ phoneTab: 'bank' })} />
        <Row icon="📈" iconBg="#e8f5e9" title="Stocks" detail={formatMoney(stocks)} />
        <Row icon="🧾" iconBg="#eef2ff" title="Treasury bills" detail={formatMoney(tbills)} />
      </Group>
      <Group header="Businesses you could buy">
        {BUSINESSES.filter((b) => !s.businesses[b.id]).map((b) => <Row key={b.id} icon={b.emoji} iconBg="#f2f2f7" title={b.name} sub={`${b.area} · ${formatMoney(b.income[0])}–${formatMoney(b.income[1])}/day`} detail={formatMoney(b.price)} />)}
      </Group>
    </AppShell>
  )
}


function Jobs() {
  const s = useGame()
  return (
    <AppShell title="Jobs">
      {s.employment ? (
        <div className="ios-hero blue">
          <small>Current job</small>
          <b>{CAREERS[s.employment].emoji} {CAREERS[s.employment].levels[(s.careers[s.employment]?.level ?? 1) - 1].title}</b>
          <span>{DEST_BY_ID[CAREERS[s.employment].workplace].name} · {s.careers[s.employment]?.shifts ?? 0} shifts worked{s.careers[s.employment]?.warns ? ` · ⚠️ ${s.careers[s.employment]?.warns}/3 warnings` : ''}</span>
          <button className="ios-chip amount" onClick={() => directions(CAREERS[s.employment!].workplace)}>🚶 Go to work</button>
        </div>
      ) : (
        <div className="ios-hero"><b>Looking for work</b><span>Walk into a workplace and apply in person. Many jobs need no experience.</span></div>
      )}
      <Group header="How to make money" footer="At work, tasks pop up during your shift. Tap them (or press 1, 2, 3) to do them. Each task pays, customers tip, and your boss rates you.">
        <Row icon="1" iconBg="#34c759" title="Get a job and work shifts" sub="Apply at the workplace, then press ▶ Start shift there." />
        <Row icon="2" iconBg="#0a84ff" title="Hustles" sub="One-off gigs at markets, the stadium, hotels and Jamestown." />
        <Row icon="3" iconBg="#ff9f0a" title="Drive trotro, Uber or okada" sub="Rent or buy a vehicle at Spintex Motors, then use the Drive app." />
        <Row icon="4" iconBg="#5e5ce6" title="Bank, T-bills and stocks" sub="Grow savings from the Bank app." />
        <Row icon="5" iconBg="#ff3b30" title="Illegal work" sub="Galamsey, sakawa and smuggling pay big. Raids, court and prison." />
      </Group>
      {CAREER_IDS.map((id) => {
        const c = CAREERS[id]
        const prog = s.careers[id]
        const lvl = (prog?.level ?? 1) - 1
        const missing = missingRequirements(s, id, lvl)
        const next = c.levels[lvl + 1]
        return (
          <Group key={id} header={`${c.emoji} ${c.name} · ${DEST_BY_ID[c.workplace].name}`} footer={`${c.blurb} Tasks: ${c.tasks.map((t) => t.label.toLowerCase()).join(', ')}.`}>
            {c.levels.map((l, i) => (
              <Row
                key={l.title}
                icon={prog && prog.level > i ? '✓' : String(i + 1)}
                iconBg={prog && prog.level === i + 1 ? '#34c759' : prog && prog.level > i ? '#8e8e93' : '#c7c7cc'}
                title={l.title}
                sub={`${l.minutes / 60}h shift${l.promoteAt ? ` · ${l.promoteAt} XP` : ''}${Object.keys(l.requires).length ? ` · ${Object.entries(l.requires).map(([k, v]) => `${SKILLS[k as keyof typeof SKILLS].name} ${v}`).join(', ')}` : ''}`}
                detail={formatMoney(l.pay)}
              />
            ))}
            {s.employment === id && prog && next && (
              <Row title="Promotion progress" sub={<Bar v={prog.xp} max={next.promoteAt} color="#34c759" />} detail={`${Math.min(prog.xp, next.promoteAt)}/${next.promoteAt}`} />
            )}
            {s.employment !== id && missing.length > 0 && <Row title={<span className="red-t">Locked</span>} sub={`Needs ${missing.join(', ')}`} />}
            <Row tone="blue" title={`Directions to ${DEST_BY_ID[c.workplace].name}`} chevron onClick={() => directions(c.workplace)} />
          </Group>
        )
      })}
    </AppShell>
  )
}

function Skills() {
  const s = useGame()
  return (
    <AppShell title="Skills">
      <Group footer="Train at Bright Future Institute, at the gym, on your home computer or bookshelf, or simply by working.">
        {SKILL_IDS.map((id) => {
          const xp = s.skills[id]
          const lvl = levelFromXp(xp)
          const prev = lvl === 0 ? 0 : BALANCE.skillLevelXp[lvl - 1]
          const next = BALANCE.skillLevelXp[lvl]
          return (
            <Row key={id} icon={SKILLS[id].emoji} iconBg="#eef4ff" title={`${SKILLS[id].name}`} sub={<><Bar v={next ? xp - prev : 1} max={next ? next - prev : 1} />{SKILLS[id].blurb}</>} detail={`Lv ${lvl}`} />
          )
        })}
      </Group>
    </AppShell>
  )
}

function Maps() {
  return <CityMap onBack={goHome} />
}

const CAT: Record<TxCategory, [string, string]> = {
  wage: ['💼', '#34c759'], food: ['🍲', '#ff9500'], transport: ['🚐', '#0a84ff'], rent: ['🏠', '#af52de'], purchase: ['🛍️', '#ff2d55'], service: ['🎟️', '#5ac8fa'], bonus: ['🎁', '#ffcc00'], fee: ['⚠️', '#ff3b30'], transfer: ['🔁', '#5856d6'],
}
function Wallet() {
  const s = useGame()
  const home = HOMES[s.housing.tier]
  const dueIn = s.housing.nextRentDue - s.minutes
  const week = s.transactions.filter((t) => t.minute >= s.minutes - 7 * 1440)
  const earned = week.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0)
  const spent = -week.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0)
  const overdue = s.housing.overdueSince !== null
  return (
    <AppShell title="Wallet">
      <div className="pay-card">
        <div className="pc-top"><b>MoMo</b><span>Mobile Money Wallet</span></div>
        <div className="pc-bal"><small>Balance</small><b>{formatMoney(s.money)}</b>{s.dirty > 0 && <small className="pc-split">{formatMoney(cleanCash(s))} clean · {formatMoney(s.dirty)} dirty</small>}</div>
        <div className="pc-bot"><span>{s.profile?.name?.toUpperCase()}</span><span>•••• 2333</span></div>
      </div>
      <p className="ios-foot center">Fictional {GAME_CONFIG.currency.name} ({GAME_CONFIG.currency.code}). Saved to your account. Send to real players from 👥 Players.</p>
      <Laundering />
      <SendMoney />
      <QuickLoan />
      <Group header="Last 7 days">
        <Row icon="↓" iconBg="#34c759" title="Money in" detail={<span className="green-t">{formatMoney(earned)}</span>} />
        <Row icon="↑" iconBg="#ff3b30" title="Money out" detail={formatMoney(spent)} />
      </Group>
      <Group header="Rent" footer={overdue
        ? `Overdue. Paid automatically once you have ${formatMoney(home.rent + BALANCE.lateFee)} (incl. late fee). After ${BALANCE.rentGraceHours}h unpaid ${s.housing.tier !== 'room' ? 'you move back to the basic room' : 'your landlady loses patience'}. Quick cash: carry goods at Makola Market or wash dishes at the chop bar.`
        : s.money < home.rent ? `You need ${formatMoney(home.rent - s.money)} more before rent day. Work shifts or odd jobs to catch up.` : 'Rent is paid automatically from this wallet on rent day.'}>
        <Row icon="🏠" iconBg="#af52de" title={home.name} sub={overdue ? <span className="red-t">Overdue</span> : `Due Day ${dayOf(s.housing.nextRentDue)}, ${formatClock(s.housing.nextRentDue)} · in ${dueIn >= 1440 ? `${Math.floor(dueIn / 1440)}d ${Math.floor((dueIn % 1440) / 60)}h` : `${Math.max(0, Math.floor(dueIn / 60))}h`}`} detail={formatMoney(home.rent)} />
        <Row title="Rent fund" sub={<Bar v={s.money} max={home.rent + (overdue ? BALANCE.lateFee : 0)} color={s.money >= home.rent ? '#34c759' : '#ff9500'} />} />
      </Group>
      <Group header="Transactions" footer={s.transactions.length ? undefined : 'No transactions yet.'}>
        {s.transactions.slice(0, 40).map((t) => (
          <Row key={t.id} icon={CAT[t.category][0]} iconBg={CAT[t.category][1]} title={t.label} sub={`Day ${dayOf(t.minute)} · ${formatClock(t.minute)}`} detail={<span className={t.amount >= 0 ? 'green-t' : ''}>{t.amount >= 0 ? '+' : ''}{formatMoney(t.amount)}</span>} />
        ))}
      </Group>
    </AppShell>
  )
}

function Contacts() {
  const s = useGame()
  const [sel, setSel] = useState<string | null>(null)
  const sorted = useMemo(() => [...NPCS].sort((a, b) => a.name.localeCompare(b.name)), [])
  if (sel) {
    const n = NPCS.find((x) => x.id === sel)!
    const pts = friendPoints(s, n.id)
    const idx = friendIndex(pts)
    const lv = BALANCE.friendship.levels
    const next = lv[idx + 1]
    return (
      <AppShell title="" back="Contacts" onBack={() => setSel(null)}>
        <div className="ios-contact-hero">
          <span className="avatar-xl">{n.emoji}</span>
          <h2>{n.name}</h2>
          <small>{n.role} · <i className="npc-badge">NPC</i></small>
        </div>
        <div className="ios-actions">
          <button className="ios-pill-btn primary" onClick={() => directions(n.destId)}>📍 Find</button>
        </div>
        <Group header="Friendship" footer={`Perk at Friend: ${n.perk.text}`}>
          <Row title={friendName(pts)} sub={<Bar v={next ? pts - lv[idx].at : 1} max={next ? next.at - lv[idx].at : 1} color="#ff9500" />} detail={next ? `${Math.round(pts)}/${next.at}` : 'Max'} />
        </Group>
        <Group header="Info">
          <Row title="Personality" sub={n.personality} />
          <Row title="Usually at" detail={DEST_BY_ID[n.destId].name} />
        </Group>
        <p className="ios-foot">{n.name} is a character run by the game, not a real player.</p>
      </AppShell>
    )
  }
  return (
    <AppShell title="Contacts">
      <PlayerContacts />
      <Group header="People in Accra" footer="NPCs are characters run by the game. Visit them in person to chat and grow friendships.">
        {sorted.map((n) => (
          <Row key={n.id} icon={n.emoji} iconBg="#f2f2f7" title={<>{n.name} <i className="npc-badge">NPC</i></>} sub={`${n.role} · ${friendName(friendPoints(s, n.id))}`} chevron onClick={() => setSel(n.id)} />
        ))}
      </Group>
    </AppShell>
  )
}

function Messages() {
  const inbox = useUI((s) => s.inbox)
  useEffect(() => { useUI.setState({ unread: 0 }) }, [inbox.length])
  return (
    <AppShell title="Messages">
      <div className="ios-thread-head"><span className="avatar-sm">🏙️</span><b>City Alerts</b><small>Notifications from around {GAME_CONFIG.cityName}</small></div>
      <div className="ios-thread">
        {inbox.length === 0 && <p className="ios-foot center">No messages yet.</p>}
        {inbox.map((m, i) => (
          <div key={m.id}>
            {(i === 0 || dayOf(inbox[i - 1].at) !== dayOf(m.at)) && <div className="ios-stamp">Day {dayOf(m.at)}</div>}
            <div className={`bubble-in ${m.kind}`}>{m.msg}<small>{formatClock(m.at)}</small></div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}

/** "1d 4h", "5h 20m" or "a few minutes" until a game minute. */
function untilText(mins: number) {
  if (mins <= 10) return 'a few minutes'
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = Math.floor(mins % 60)
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
}

function Calendar() {
  const s = useGame()
  const today = dayOf(s.minutes)
  const rentDay = dayOf(s.housing.nextRentDue)
  const days = Array.from({ length: 14 }, (_, i) => today - (today - 1) % 7 + i)
  const h = hourOf(s.minutes)
  // permits being processed and builders at work, soonest first
  const permits = Object.entries(s.plots).filter(([, p]) => p.owned && p.permit === 'pending' && p.permitReady !== null).sort((a, b) => a[1].permitReady! - b[1].permitReady!)
  const builds = Object.entries(s.plots).filter(([, p]) => p.owned && p.until !== null).sort((a, b) => a[1].until! - b[1].until!)
  const permitDays = new Set(permits.map(([, p]) => dayOf(p.permitReady!)))
  return (
    <AppShell title="Calendar">
      <div className="ios-cal">
        {['W1', 'W2'].map((w, wi) => (
          <div key={w} className="ios-cal-row">
            {days.slice(wi * 7, wi * 7 + 7).map((d) => (
              <span key={d} className={`${d === today ? 'today' : ''} ${d === rentDay ? 'rent' : ''} ${permitDays.has(d) ? 'permit' : ''}`}><small>Day</small>{d}</span>
            ))}
          </div>
        ))}
      </div>
      <Group header="Upcoming">
        {permits.map(([id, p]) => (
          <Row key={`p${id}`} icon="📜" iconBg="#ff9500" title="Building permit ready" sub={`${DEST_BY_ID[id].name} · in ${untilText(p.permitReady! - s.minutes)}`} detail={`Day ${dayOf(p.permitReady!)}, ${formatClock(p.permitReady!)}`} />
        ))}
        {builds.map(([id, p]) => (
          <Row key={`b${id}`} icon="👷" iconBg="#34c759" title="Builders finish" sub={`${DEST_BY_ID[id].name} · in ${untilText(p.until! - s.minutes)}`} detail={`Day ${dayOf(p.until!)}, ${formatClock(p.until!)}`} />
        ))}
        {s.legal.caseDeadline !== null && <Row icon="⚖️" iconBg="#ff3b30" title="Court hearing deadline" sub="Accra High Court, or pay the fine" detail={`Day ${dayOf(s.legal.caseDeadline)}, ${formatClock(s.legal.caseDeadline)}`} />}
        <Row icon="🏠" iconBg="#af52de" title="Rent due" sub={`${HOMES[s.housing.tier].name} · ${formatMoney(HOMES[s.housing.tier].rent)}`} detail={`Day ${rentDay}`} />
        {s.employment && <Row icon={CAREERS[s.employment].emoji} iconBg="#0a84ff" title="Work shifts" sub={`${DEST_BY_ID[CAREERS[s.employment].workplace].name}`} detail={`${DEST_BY_ID[CAREERS[s.employment].workplace].hours[0]}:00–${DEST_BY_ID[CAREERS[s.employment].workplace].hours[1]}:00`} />}
        <Row icon="🎷" iconBg="#ff2d55" title="Live highlife night" sub="Labadi Beach Club" detail="Daily 18:00" />
      </Group>
      <Group header="Open now">
        {DESTINATIONS.filter((d) => d.kind !== 'home' && d.kind !== 'stop').map((d) => {
          const o = isOpen(d.hours, h)
          return <Row key={d.id} icon={d.emoji} iconBg="#f2f2f7" title={d.name} detail={<span className={o ? 'green-t' : 'red-t'}>{o ? `until ${d.hours[1] === 24 ? '00' : d.hours[1]}:00` : `opens ${d.hours[0]}:00`}</span>} />
        })}
      </Group>
    </AppShell>
  )
}

function Music() {
  const st = useUI((s) => s.settings)
  const set = (p: Partial<typeof st>) => {
    useUI.getState().setSettings(p)
    import('@/game/audio').then((m) => m.syncMusic())
  }
  return (
    <AppShell title="Music">
      <div className={`now-playing ${st.music ? 'on' : ''}`}>
        <div className="art">🎶</div>
        <b>Accra Nights</b>
        <small>Highlife by day, Afrobeats after dark</small>
        <div className="np-controls">
          <button aria-label="Previous">⏮</button>
          <button className="play" aria-label={st.music ? 'Pause' : 'Play'} onClick={() => set({ music: !st.music })}>{st.music ? '⏸' : '▶'}</button>
          <button aria-label="Next">⏭</button>
        </div>
        <label className="np-vol">🔈<input type="range" min={0} max={1} step={0.05} value={st.musicVolume} onChange={(e) => set({ musicVolume: Number(e.target.value) })} aria-label="Volume" />🔊</label>
      </div>
      <Group>
        <Row title="Sound effects" detail={<button className={`ios-switch ${st.sfx ? 'on' : ''}`} onClick={() => set({ sfx: !st.sfx })} aria-label="Sound effects"><i /></button>} />
      </Group>
    </AppShell>
  )
}

function SendMoney() {
  const s = useGame()
  const momoTo = useUI((u) => u.momoTo)
  const contacts = NPCS.filter((n) => !!s.friendships[n.id] || s.romance.partner === n.id)
  return (
    <Group header="Send money" footer={`1% E-levy applies to MoMo transfers. Gifts grow friendships.`}>
      {contacts.length === 0 && <Row title={<span className="muted-t">Meet people to add MoMo contacts</span>} />}
      {contacts.length > 0 && (
        <div className="ios-chips">
          {contacts.map((n) => (
            <button key={n.id} className={`ios-chip ${momoTo === n.id ? 'on' : ''}`} onClick={() => useUI.setState({ momoTo: momoTo === n.id ? null : n.id })}>{n.emoji} {n.name.split(' ').slice(-1)[0]}</button>
          ))}
        </div>
      )}
      {momoTo && (
        <div className="ios-chips">
          {[10, 20, 50, 100, 200].map((a) => (
            <button key={a} className="ios-chip amount" disabled={s.money < a * 1.01} onClick={() => { useGame.getState().sendMomo(momoTo, a); sfx('coin') }}>{formatMoney(a)}</button>
          ))}
        </div>
      )}
    </Group>
  )
}

/** Turn crime cash into money the bank and sellers accept. */
function Laundering() {
  const s = useGame()
  if (s.dirty <= 0) return null
  const owned = Object.keys(s.businesses).filter((id) => BUSINESS_BY_ID[id])
  const here = s.view === 'inside' ? s.insideDest : s.nearDest
  const atForex = here === LAUNDER.forex.dest
  const forexRate = s.rep.street >= 40 ? LAUNDER.forex.streetFee : LAUNDER.forex.fee
  const forexAmt = Math.min(s.dirty, LAUNDER.forex.max)
  return (
    <Group header="Dirty cash" footer={`Crime pays in dirty cash. Big buys (GH₵1,000+) and bank deposits need clean money, and police keep any unexplained cash they find on you.`}>
      <Row icon="💸" iconBg="#ff3b30" title="Dirty cash in your wallet" detail={formatMoney(s.dirty)} />
      {owned.map((id) => {
        const b = BUSINESS_BY_ID[id]
        const cap = launderCap(s, id)
        const amt = Math.min(cap, s.dirty)
        return (
          <Row key={id} icon={b.emoji} iconBg="#34c759" title={`Book it as ${b.name} sales`} sub={cap > 0 ? `${Math.round(LAUNDER.business.fee * 100)}% fee · up to ${formatMoney(cap)} more today · small risk of a tax audit` : 'The till is full for today'}
            detail={cap > 0 ? <button className="ios-chip amount" onClick={() => { sfx('coin'); useGame.getState().launder('business', amt, id) }}>Launder {formatMoney(amt)}</button> : undefined} />
        )
      })}
      {!owned.length && <Row icon="🏪" iconBg="#8e8e93" title="Own a business to launder cheaply" sub="Buy one in the Assets app: its till can absorb dirty cash every day." />}
      <Row icon="💱" iconBg="#ff9500" title="Makola forex boys" sub={atForex ? `${Math.round(forexRate * 100)}% commission · up to ${formatMoney(LAUNDER.forex.max)} a time · police stings happen` : 'Go to Makola Market to swap cash with the forex boys.'}
        detail={atForex ? <button className="ios-chip amount" onClick={() => { sfx('coin'); useGame.getState().launder('forex', forexAmt) }}>Swap {formatMoney(forexAmt)}</button> : <button className="ios-chip amount" onClick={() => directions(LAUNDER.forex.dest)}>📍 Go</button>} />
    </Group>
  )
}

function QuickLoan() {
  const s = useGame()
  const limit = loanLimit(s)
  const L = s.loan
  return (
    <Group header="QwikCash loan" footer={`Instant MoMo loans. ${Math.round(LOAN.fee * 1000) / 10}% fee, repay within ${LOAN.days} days. Late loans grow 1% a day and hurt your credit score.`}>
      <Row icon="📈" iconBg={s.credit >= 60 ? '#34c759' : s.credit >= LOAN.minCredit ? '#ff9500' : '#ff3b30'} title="Credit score" sub={<Bar v={s.credit} max={100} color={s.credit >= 60 ? '#34c759' : '#ff9500'} />} detail={`${Math.round(s.credit)}/100`} />
      {L ? (
        <>
          <Row icon="🧾" iconBg={s.minutes > L.due ? '#ff3b30' : '#5856d6'} title={s.minutes > L.due ? 'Overdue loan' : 'Current loan'} sub={`Due Day ${dayOf(L.due)}, ${formatClock(L.due)}`} detail={formatMoney(L.owed)} />
          <Row tone="blue" title={`Repay ${formatMoney(L.owed)} now`} chevron onClick={() => { sfx('coin'); useGame.getState().repayLoan() }} />
        </>
      ) : (
        <Row title={`Borrow (limit ${formatMoney(limit)})`} sub={<span className="ios-chips tight">{[100, 250, 500, limit].filter((a, i, arr) => a <= limit && arr.indexOf(a) === i).map((a) => <button key={a} className="ios-chip amount" disabled={s.credit < LOAN.minCredit} onClick={() => { sfx('coin'); useGame.getState().takeLoan(a) }}>{formatMoney(a)}</button>)}</span>} />
      )}
    </Group>
  )
}

const GROUP_EMOJIS = ['👥', '🇬🇭', '🎉', '⚽', '💼', '🍛']

/** Real players in Contacts: friend requests and friends (online or not; never where they are). */
function PlayerContacts() {
  const friends = useSocial((s) => s.friends)
  const online = useRemoteIds((s) => s.ids)
  const live = useAccount((s) => s.live)
  useEffect(() => { void loadFriends() }, [])
  const requests = friends.filter((f) => f.status === 'received')
  const mine = friends.filter((f) => f.status !== 'received')
  return (
    <>
      {requests.length > 0 && (
        <Group header="Friend requests">
          {requests.map((f) => (
            <div key={f.id} className="ios-row">
              <span className="ios-row-icon" style={{ background: '#dbeafe' }}>🌐</span>
              <span className="ios-row-main"><span className="ios-row-title">{f.name}</span><span className="ios-row-sub">@{f.username}</span></span>
              <span className="row-actions">
                <button className="ios-chip" onClick={() => void friendAction(f.id, 'accept')}>Accept</button>
                <button className="ios-chip" onClick={() => void friendAction(f.id, 'remove')}>Decline</button>
              </span>
            </div>
          ))}
        </Group>
      )}
      <Group header="Player friends" footer={live ? 'Real players. Tap someone in the city to add them as a friend.' : 'Live play is off right now.'}>
        {!mine.length && <Row icon="🌐" iconBg="#e5e5ea" title={<span className="muted-t">No player friends yet</span>} />}
        {mine.map((f) => (
          <Row key={f.id} icon="🌐" iconBg="#dbeafe" title={f.name}
            sub={f.status === 'sent' ? 'Request sent' : <><i className={`dot ${online.includes(f.id) ? 'on' : ''}`} /> {online.includes(f.id) ? 'Online' : 'Offline'}</>}
            chevron onClick={() => openPlayer(f.id)} />
        ))}
      </Group>
    </>
  )
}

/** Chat thread with a real player, or the 📍 Nearby thread (said out loud to people around you). */
function PlayerThread({ id }: { id: string }) {
  const nearby = id === NEARBY_THREAD
  const msgs = useSocial((s) => s.threads[id])
  const lines = useSocial((s) => s.nearby)
  const name = useSocial((s) => s.conversations.find((c) => c.other === id)?.name ?? s.friends.find((f) => f.id === id)?.name) ?? 'Player'
  const meId = useAccount((s) => s.user?.id)
  const view = useGame((s) => s.view)
  const [text, setText] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const count = nearby ? lines.length : msgs?.length ?? 0
  useEffect(() => { if (!nearby && !msgs) void openThread(id) }, [id, nearby, msgs])
  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight }, [count])
  const blocked = nearby && (view === 'home' || !socialLive())
  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || blocked) return
    sfx('click')
    setText('')
    if (nearby) say(t)
    else setErr(await sendDm(id, t))
  }
  return (
    <div className="ios-app-view wa">
      <div className="wa-head">
        <button className="ios-back" onClick={() => useSocial.setState({ thread: null })} aria-label="Back to chats">‹</button>
        <button className="wa-head-btn" onClick={() => !nearby && openPlayer(id)} disabled={nearby}>
          <span className="avatar-sm">{nearby ? '📍' : '🌐'}</span>
          <div><b>{nearby ? 'Nearby' : name}</b><small>{nearby ? (view === 'inside' ? 'Everyone in this place hears you' : 'People around you hear you') : 'Player'}</small></div>
        </button>
      </div>
      <div className="wa-body" ref={bodyRef}>
        {nearby
          ? <>{!lines.length && <div className="ios-stamp">Talk to players near you. Your words pop up over your head.</div>}
              {lines.map((l) => <div key={l.id} className={`wa-msg ${l.from === meId ? 'me' : ''}`}>{l.from !== meId && <b className="wa-from">{l.name}</b>}{l.text}</div>)}</>
          : <>{!msgs && <div className="ios-stamp">Loading…</div>}
              {msgs?.length === 0 && <div className="ios-stamp">Say hello 👋</div>}
              {msgs?.map((m) => <div key={m.id} className={`wa-msg ${m.from_user === meId ? 'me' : ''}`}>{m.body}</div>)}</>}
        {err && <div className="wa-sys">{err}</div>}
      </div>
      <div className="wa-foot">
        {!nearby && (
          <div className="wa-quick">
            <button className="ios-chip amount" onClick={() => openPlayer(id)}>💸 Send MoMo</button>
          </div>
        )}
        <form className="wa-input" onSubmit={send}>
          <input value={text} maxLength={nearby ? 140 : 300} placeholder={blocked ? (view === 'home' ? 'Step out of your home to talk' : 'Live play is off') : 'Message'} disabled={blocked}
            onChange={(e) => setText(e.target.value)} aria-label={nearby ? 'Say to people nearby' : `Message ${name}`} />
          <button type="submit" className="wa-send" disabled={!text.trim() || blocked} aria-label="Send">➤</button>
        </form>
      </div>
    </div>
  )
}

/** Chats with real players only: talk out loud to people nearby, or message players directly. */
function Chat() {
  const pthread = useSocial((p) => p.thread)
  const convos = useSocial((p) => p.conversations)
  const live = useAccount((a) => a.live)
  useEffect(() => { void loadConversations() }, [])
  if (pthread) return <PlayerThread id={pthread} />
  return (
    <AppShell title="Chats">
      <Group footer="Chats are with real players only. Tap someone in the city, then 💬 Message.">
        {live && <Row icon="📍" iconBg="#ffe8b3" title="Nearby" sub="Talk out loud to players around you" chevron onClick={() => useSocial.setState({ thread: NEARBY_THREAD })} />}
        {convos.map((c) => (
          <Row key={c.other} icon="🌐" iconBg="#dbeafe" title={c.name} sub={c.last_body} detail={c.unread > 0 ? <span className="wa-badge">{c.unread}</span> : undefined} chevron onClick={() => useSocial.setState({ thread: c.other })} />
        ))}
        {!convos.length && <Row icon="🌐" iconBg="#e5e5ea" title={<span className="muted-t">No chats yet</span>} sub="Meet players around Accra" />}
      </Group>
    </AppShell>
  )
}

function Spark({ data }: { data: number[] }) {
  if (data.length < 2) return <svg className="spark" viewBox="0 0 60 20" />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 60},${18 - ((v - min) / Math.max(0.0001, max - min)) * 16}`).join(' ')
  const up = data[data.length - 1] >= data[0]
  return (
    <svg className="spark" viewBox="0 0 60 20" aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? '#34c759' : '#ff3b30'} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function BankApp() {
  const s = useGame()
  if (!s.bank.open) {
    return (
      <AppShell title="Bank">
        <div className="ios-hero"><b>🏦 No account yet</b><span>Open a free savings account at Gold Coast Bank (Labadi). Money in the bank earns interest and cannot be stolen by robbers.</span></div>
        <div className="ios-actions"><button className="ios-pill-btn primary" onClick={() => directions('bank')}>📍 Directions to the bank</button></div>
      </AppShell>
    )
  }
  const move = (amt: number, dir: 'in' | 'out') => { sfx('coin'); useGame.getState().bankMove(amt, dir) }
  const portfolio = STOCKS.reduce((a, st) => a + (s.invest.shares[st.id] ?? 0) * (s.invest.prices[st.id]?.slice(-1)[0] ?? st.start), 0)
  const tb = s.invest.tbills.reduce((a, t) => a + t.amount, 0)
  return (
    <AppShell title="Bank">
      <div className="pay-card bankcard">
        <div className="pc-top"><b>Gold Coast</b><span>Savings · ~15% p.a.</span></div>
        <div className="pc-bal"><small>Account balance</small><b>{formatMoney(s.bank.balance)}</b></div>
        <div className="pc-bot"><span>Invested {formatMoney(portfolio + tb)}</span><span>Wallet {formatMoney(s.money)}</span></div>
      </div>
      <Group header="Move money">
        <Row title="Deposit from MoMo" sub={<span className="ios-chips tight">{[50, 100, 500].map((a) => <button key={a} className="ios-chip" disabled={s.money < a} onClick={() => move(a, 'in')}>{formatMoney(a)}</button>)}<button className="ios-chip" disabled={s.money <= 0} onClick={() => move(Math.floor(s.money), 'in')}>All</button></span>} />
        <Row title="Withdraw to MoMo" sub={<span className="ios-chips tight">{[50, 100, 500].map((a) => <button key={a} className="ios-chip" disabled={s.bank.balance < a} onClick={() => move(a, 'out')}>{formatMoney(a)}</button>)}<button className="ios-chip" disabled={s.bank.balance <= 0} onClick={() => move(Math.floor(s.bank.balance), 'out')}>All</button></span>} />
      </Group>
      <Group header={`Treasury bills · ${FINANCE.tbillDays} days · +${Math.round(FINANCE.tbillReturn * 100)}%`} footer="Locked until maturity, then paid back into your account with interest.">
        {s.invest.tbills.map((t) => <Row key={t.id} icon="📜" iconBg="#5856d6" title={formatMoney(t.amount)} sub={`Matures Day ${dayOf(t.matures)}`} detail={<span className="green-t">+{formatMoney(t.amount * FINANCE.tbillReturn)}</span>} />)}
        <Row title="Buy T-bill" sub={<span className="ios-chips tight">{[100, 500, 1000].map((a) => <button key={a} className="ios-chip" disabled={s.bank.balance < a} onClick={() => { useGame.getState().buyTbill(a); sfx('coin') }}>{formatMoney(a)}</button>)}</span>} />
      </Group>
      <Group header="Ghana Stock Exchange" footer="Prices move once a day. Stocks can fall as well as rise. Trades use your bank balance.">
        {STOCKS.map((st) => {
          const hist = s.invest.prices[st.id] ?? [st.start]
          const price = hist[hist.length - 1]
          const prev = hist[hist.length - 2] ?? price
          const ch = ((price - prev) / prev) * 100
          const own = s.invest.shares[st.id] ?? 0
          return (
            <Row key={st.id} title={<><b>{st.id}</b> <small className="muted-t">{st.name}</small></>}
              sub={<><span className="stock-line"><Spark data={hist} /> {own ? `You own ${own} (${formatMoney(own * price)})` : 'No shares'}</span>
                <span className="ios-chips tight">
                  <button className="ios-chip" disabled={s.bank.balance < price} onClick={() => useGame.getState().trade(st.id, 1)}>Buy 1</button>
                  <button className="ios-chip" disabled={s.bank.balance < price * 10} onClick={() => useGame.getState().trade(st.id, 10)}>Buy 10</button>
                  <button className="ios-chip" disabled={own < 1} onClick={() => useGame.getState().trade(st.id, -1)}>Sell 1</button>
                  <button className="ios-chip" disabled={own < 1} onClick={() => useGame.getState().trade(st.id, -own)}>Sell all</button>
                </span></>}
              detail={<span>{formatMoney(price)}<br /><small className={ch >= 0 ? 'green-t' : 'red-t'}>{ch >= 0 ? '▲' : '▼'} {Math.abs(ch).toFixed(1)}%</small></span>} />
          )
        })}
      </Group>
    </AppShell>
  )
}

function Goals() {
  const s = useGame()
  return (
    <AppShell title="Goals">
      <Group header={`Today · Day ${dayOf(s.minutes)}`} footer="New tasks every morning. Complete them for cash and a mood boost.">
        {s.tasks.ids.map((id) => {
          const t = TASK_BY_ID[id]
          if (!t) return null
          const done = s.tasks.done.includes(id)
          const p = taskProgress(s, t)
          return <Row key={id} icon={done ? '✓' : t.icon} iconBg={done ? '#34c759' : '#f2f2f7'} title={<span className={done ? 'muted-t' : ''}>{t.text}</span>} sub={t.target > 1 && !done ? <Bar v={p} max={t.target} color="#ff9f0a" /> : undefined} detail={`+${formatMoney(t.reward)}`} />
        })}
      </Group>
      <section className="ios-section">
        <h4>Life goals · {s.goalsActive.length} active · {s.goals.length} achieved</h4>
        <div className="ios-group pad"><DreamCard /></div>
        <div className="ios-group pad"><LifeGoalsList /></div>
      </section>
    </AppShell>
  )
}

function DriveApp() {
  const s = useGame()
  const today = dayOf(s.minutes)
  return (
    <AppShell title="Drive">
      {s.drive ? (
        <div className="ios-hero blue">
          <small>On shift · {VEHICLES[s.drive.vehicle].job}</small>
          <b>{VEHICLES[s.drive.vehicle].emoji} {s.drive.trips} trip{s.drive.trips === 1 ? '' : 's'} left</b>
          <span>Earned so far: {formatMoney(s.drive.earned)}</span>
        </div>
      ) : (
        <div className="ios-hero"><b>Earn on the road</b><span>Carry passengers across Accra. Each shift is {DRIVING.tripsPerShift} trips. You keep the fares.</span></div>
      )}
      {s.drive && <div className="ios-actions"><button className="ios-pill-btn" onClick={() => useGame.getState().stopDriving()}>End after this trip</button></div>}
      <Group header="Licence">
        <Row icon="🪪" iconBg={s.license ? '#34c759' : '#ff9500'} title={s.license ? 'Driving licence' : 'No licence yet'} sub={s.license ? 'Valid for cars and trotros' : 'Take the test at the DVLA office in Ridge'} chevron={!s.license} onClick={s.license ? undefined : () => directions('dvla')} />
      </Group>
      <Group header="Jobs" footer="Not your vehicle? Pay the owner a daily “work and pay” rental when you start. Buy your own at Spintex Motors.">
        {WORK_VEHICLES.map((v) => {
          const d = VEHICLES[v]
          const owned = s.vehicles.includes(v)
          const rented = s.rentedDay[v] === today
          const block = !!s.drive || !!s.activity ? 'Busy' : d.license && !s.license ? 'Needs licence' : !owned && !rented && s.money < d.rent ? `Rent ${formatMoney(d.rent)}` : null
          return (
            <Row key={v} icon={d.emoji} iconBg="#eef4ff" title={d.job}
              sub={<>{owned ? 'Your vehicle' : rented ? 'Rented for today' : `Rent ${formatMoney(d.rent)}/day`} · ~{formatMoney(d.base + d.payPerKm * 6)} per trip{v === 'okada' ? ' · police hassle' : ''}
                <span className="ios-chips tight"><button className="ios-chip" disabled={!!block} onClick={() => { sfx('start'); useGame.getState().startDriving(v) }}>{block ?? 'Start shift'}</button></span></>} />
          )
        })}
      </Group>
    </AppShell>
  )
}

/* ---------------------------------- root ---------------------------------- */
export function PhonePanel() {
  const tab = useUI((s) => s.phoneTab)
  const app = tab === 'home' ? null : tab
  return (
    <div className="phone-wrap" role="dialog" aria-label="Phone" onClick={(e) => { if (e.target === e.currentTarget) closePhone() }}>
      <div className="iphone">
        <span className="btn-side power" onClick={closePhone} title="Lock (close phone)" />
        <span className="btn-side vol1" aria-hidden />
        <span className="btn-side vol2" aria-hidden />
        <div className={`iphone-screen ${app ? 'in-app' : ''}`}>
          <StatusBar dark={!!app} />
          <div className="iphone-content" key={tab}>
            {!app && <HomeScreen />}
            {app === 'jobs' && <Jobs />}
            {app === 'assets' && <Assets />}
            {app === 'skills' && <Skills />}
            {app === 'maps' && <Maps />}
            {app === 'wallet' && <Wallet />}
            {app === 'contacts' && <Contacts />}
            {app === 'messages' && <Messages />}
            {app === 'calendar' && <Calendar />}
            {app === 'music' && <Music />}
            {app === 'chat' && <Chat />}
            {app === 'bank' && <BankApp />}
            {app === 'goals' && <Goals />}
            {app === 'drive' && <DriveApp />}
          </div>
          <button className="home-indicator" onClick={() => (app ? goHome() : closePhone())} aria-label={app ? 'Go to home screen' : 'Close phone'} />
        </div>
      </div>
      <button className="phone-close" onClick={closePhone} aria-label="Close phone">✕</button>
    </div>
  )
}

export { TITLES }
