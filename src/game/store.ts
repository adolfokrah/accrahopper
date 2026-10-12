'use client'
import { create } from 'zustand'
import {
  activitiesForDest,
  dailyUsed,
  efficiency,
  findDef,
  isOpen,
  friendPoints,
  levelFromXp,
  NEED_META,
  priceMultiplier,
  resolve,
  skillLevel,
  travelDef,
  type Resolved,
} from './activities'
import { BALANCE, clamp, dayOf, formatMoney, hourOf } from './config'
import {
  CAREERS,
  BUILD_STAGES,
  CLASSES_TO_GRADUATE,
  DEST_BY_ID,
  EVENTS,
  FINANCE,
  HEALTH,
  ILLNESSES,
  PERMIT,
  GUARDS,
  PLOTS,
  PLOT_BY_ID,
  VEHICLES,
  DRIVING,
  homeDestId,
  type VehicleId,
  LOAN,
  OFFICERS,
  CHARGES,
  LAUNDER,
  RESPECT_ACTS,
  RESPECT_REQ,
  STREET_REQ,
  STREET_CHARGE,
  LEGAL,
  NPCS,
  OUTDOOR_KINDS,
  PROGRAMS,
  RIDES,
  ROMANCE,
  STOCKS,
  UPGRADES,
  type IllnessId,
  type ProgramId,
  type RideMode,
  FURNITURE,
  HOMES,
  HOME_DEST,
  NPC_BY_ID,
  SKILLS,
  TRAITS,
  type EventEffect,
  PROJECTS,
  projectStages,
  HOME_SELL_BACK,
  type ProjectId,
  BUSINESS_BY_ID,
  BIZ,
  shiftTaskDef,
  showOn,
  LIFESTYLES,
  ROOM_HOMES,
  ROOM_HOMES_ALL,
  ROOM_LANDLORD,
  AREA_BY_ID,
  type Lifestyle,
  RENT_OUT,
  SELL_BACK,
} from './content'
import { EXTENSIONS, autoPlace, canExtend, canPlace, extCount, homeRuntime, isBed, itemsInHome, type HomeStyleMap } from './home'
import { cancelPath, defaultZoom, runtime, teleport } from './runtime'
import { nearestJunction, roadRoute } from './world'
import { plotValue } from './property'
import { clockRef, useUI } from './ui'
import { GOALS, GOAL_BY_ID, TASK_BY_ID, goalFits, pickTasks, rideQuote, taskProgress, isSunday } from './life'
import { PLAYER_START, districtAt } from './world'
import type {
  ShiftState,
  ShiftTask,
  ActiveActivity,
  ActiveEvent,
  ActivityContext,
  ActivityResult,
  Appearance,
  CareerId,
  CareerProgress,
  Friendship,
  FurnitureType,
  HomeTier,
  NeedId,
  Needs,
  Officer,
  OwnedFurniture,
  Profile,
  SkillId,
  Stats,
  Tx,
  TxCategory,
} from './types'

export interface GameState {
  screen: 'menu' | 'create' | 'game'
  profile: Profile | null
  minutes: number
  money: number
  needs: Needs
  skills: Record<SkillId, number>
  careers: Partial<Record<CareerId, CareerProgress>>
  employment: CareerId | null
  housing: { tier: HomeTier; nextRentDue: number; overdueSince: number | null; plotId?: string | null; /** Which compound house your basic room is in. */ roomDest?: string | null; /** Evicted from the basic room with nowhere to live. */ homeless?: boolean }
  inventory: OwnedFurniture[]
  friendships: Record<string, Friendship>
  transactions: Tx[]
  player: { x: number; z: number; rot: number }
  view: 'world' | 'home' | 'inside'
  insideDest: string | null
  /** Touring a home you do not live in. */
  viewing: HomeTier | null
  tutorial: { step: number; done: boolean }
  stats: Stats
  daily: Record<string, { day: number; n: number }>
  activity: ActiveActivity | null
  event: ActiveEvent | null
  result: ActivityResult | null
  eventCooldownUntil: number
  rentWarnedFor: number
  lowFlags: Partial<Record<NeedId, boolean>>
  nearDest: string | null
  nextId: number
  health: { illness: IllnessId | null; mild: boolean; since: number; nhis: boolean; protectedUntil: number }
  legal: { heat: number; caseDeadline: number | null; record: number; charge?: string; fine?: number }
  /** Part of the wallet that came from crime. Big legal purchases and bank deposits need clean cash. */
  dirty: number
  /** Street cred (respect among hustlers and criminals) and respect (standing with ordinary people), 0–100. */
  rep: { street: number; respect: number }
  /** Cash laundered through each business today (business id: { day, amount }). */
  laundered: Record<string, { day: number; amount: number }>
  romance: { partner: string | null; stage: 'dating' | 'engaged' | 'married' | null; dates: number; ring: boolean; askedDay: number }
  edu: { program: ProgramId | null; credits: number; degrees: ProgramId[] }
  owned: HomeTier[]
  plots: Record<string, PlotState>
  license: boolean
  vehicles: VehicleId[]
  rentedDay: Partial<Record<VehicleId, number>>
  drive: { vehicle: VehicleId; trips: number; earned: number } | null
  loan: { owed: number; due: number; principal: number } | null
  credit: number
  items: { condoms: number }
  hookup: { name: string; look: Appearance } | null
  /** Show ticket held for AICC (valid on that day). */
  ticket: { day: number; vip: boolean } | null
  /** Businesses you own: id -> level and price paid. */
  businesses: Record<string, { level: number; paid: number; since: number; lastProfit: number }>
  upgrades: Partial<Record<HomeTier, string[]>>
  /** Property let to tenants: home tiers you bought, or `plot:<id>` for a house you built. */
  rentedOut: string[]
  /** Trouble with tenants per let property: unpaid rent, a move-out date, a court case. */
  tenants: Record<string, { owed?: number; until?: number; court?: boolean }>
  /** Paint colours and moved built-in furniture per home. */
  homeStyle: HomeStyleMap
  bank: { open: boolean; balance: number }
  invest: { tbills: { id: number; amount: number; matures: number }[]; shares: Record<string, number>; prices: Record<string, number[]> }
  tasks: { day: number; ids: string[]; done: string[] }
  today: Record<string, number>
  goals: string[]
  /** Life goals you are working toward right now (they come and go with your life). */
  goalsActive: string[]
  /** When big life events last happened (fired, breakup, evicted, trouble): game minute. */
  lifeFlags: Record<string, number>
  visited: string[]
  chats: Record<string, ChatMsg[]>
  chatUnread: Record<string, number>
  chatDay: Record<string, number>
  groups: Record<string, ChatGroup>

  startNewGame: (p: Profile, start?: { lifestyle: Lifestyle; area: string }) => void
  loadFromSave: (saved: SavedGame) => void
  toMenu: () => void
  updateAppearance: (a: Appearance) => void
  tick: (dt: number) => void
  syncPlayer: () => void
  startActivity: (defId: string, ctx: ActivityContext) => { ok: boolean; reason?: string }
  cancelActivity: () => void
  /** Start doing one of the pop-up tasks during a work shift. */
  doShiftTask: (taskId: number) => void
  buyBusiness: (id: string) => void
  upgradeBusiness: (id: string) => void
  sellBusiness: (id: string) => void
  dismissResult: () => void
  applyForJob: (career: CareerId) => void
  /** Turn dirty cash clean through a business you own or the Makola forex boys. */
  launder: (method: 'business' | 'forex', amount: number, bizId?: string) => void
  quitJob: () => void
  requestTravel: (fromDest: string, toDest: string) => void
  chooseEvent: (i: number) => void
  startTalk: (npcId: string) => void
  chooseDialog: (i: number) => void
  enterHome: () => void
  exitHome: () => void
  enterBuilding: (destId: string) => void
  exitBuilding: () => void
  buyFurniture: (type: FurnitureType, delivered?: boolean, hold?: boolean) => void
  placeFurniture: (uid: number, x: number, y: number, rot: 0 | 1) => boolean
  /** Repaint the current home (needs the paint upgrade). */
  setPaint: (wall: string, floor: string) => void
  storeFurniture: (uid: number) => void
  moveHome: (tier: HomeTier, plotId?: string) => void
  skipTutorial: () => void
  startRide: (mode: RideMode, destId: string) => void
  courtPlea: (plea: 'guilty' | 'notguilty' | 'lawyer') => void
  askOut: (npcId: string) => void
  propose: () => void
  breakUp: () => void
  sendChat: (chatId: string, text: string) => void
  readChat: (chatId: string) => void
  createGroup: (name: string, emoji: string, members: string[]) => string | null
  addToGroup: (groupId: string, npcId: string) => void
  leaveGroup: (groupId: string) => void
  sendMomo: (npcId: string, amount: number) => void
  bankMove: (amount: number, dir: 'in' | 'out') => void
  buyTbill: (amount: number) => void
  trade: (stock: string, qty: number) => void
  buyPlot: (plotId: string) => void
  sellPlot: (plotId: string) => void
  buildNext: (plotId: string, withoutPermit?: boolean) => void
  buyVehicle: (v: VehicleId) => void
  startDriving: (v: VehicleId) => void
  stopDriving: () => void
  policeStop: (offence: string) => void
  takeLoan: (amount: number) => void
  repayLoan: () => void
  runRedLight: () => void
  buyHome: (tier: HomeTier) => void
  sellHome: (tier: HomeTier) => void
  toggleRentOut: (key: string) => void
  sellVehicle: (v: VehicleId) => void
  sellFurniture: (uid: number) => void
  chooseProject: (plotId: string, project: ProjectId) => void
  buyUpgrade: (id: string) => void
}

export interface PlotState {
  owned: boolean
  boughtFor: number
  permit: 'none' | 'pending' | 'approved'
  permitReady: number | null
  noPermit: boolean
  stage: number
  until: number | null
  guards: 'none' | 'active' | 'settled'
  /** What you are building (chosen before the foundation). */
  project?: ProjectId | null
}

export interface ChatMsg {
  id: number
  /** 'me', an NPC id, or 'system' for centred notices. */
  from: string
  text: string
  at: number
}
export interface ChatGroup {
  id: string
  name: string
  emoji: string
  members: string[]
  createdAt: number
}

type FnKeys<T> = { [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never }[keyof T]

/** The subset of GameState that is persisted. */
export type SavedGame = Omit<GameState, FnKeys<GameState> | 'screen' | 'nearDest'>

const emptyStats = (): Stats => ({ mealsEaten: 0, shiftsCompleted: 0, sleeps: 0, moneyEarned: 0, moneySpent: 0, tripsTaken: 0, conversations: 0 })

export const freshGame = (profile: Profile | null): SavedGame => ({
  profile,
  minutes: BALANCE.startMinute,
  money: BALANCE.startMoney,
  needs: { ...BALANCE.startNeeds },
  skills: { communication: 0, cooking: 0, technology: 0, fitness: 0 },
  careers: {},
  employment: null,
  housing: { tier: 'room', nextRentDue: BALANCE.startMinute + BALANCE.rentDays * 1440, overdueSince: null },
  inventory: [],
  friendships: {},
  transactions: [],
  player: { x: PLAYER_START.x, z: PLAYER_START.z, rot: 0 },
  view: 'world',
  insideDest: null,
  viewing: null,
  tutorial: { step: 0, done: false },
  stats: emptyStats(),
  daily: {},
  activity: null,
  event: null,
  result: null,
  eventCooldownUntil: BALANCE.startMinute + 6 * 60,
  rentWarnedFor: 0,
  lowFlags: {},
  nextId: 1,
  health: { illness: null, mild: true, since: 0, nhis: false, protectedUntil: 0 },
  legal: { heat: 0, caseDeadline: null, record: 0 },
  dirty: 0,
  rep: { street: 0, respect: 30 },
  laundered: {},
  romance: { partner: null, stage: null, dates: 0, ring: false, askedDay: 0 },
  edu: { program: null, credits: 0, degrees: [] },
  owned: [],
  plots: {},
  license: false,
  vehicles: [],
  rentedDay: {},
  drive: null,
  loan: null,
  credit: 50,
  items: { condoms: 0 },
  hookup: null,
  ticket: null,
  businesses: {},
  upgrades: {},
  rentedOut: [],
  tenants: {},
  homeStyle: {},
  bank: { open: false, balance: 0 },
  invest: { tbills: [], shares: {}, prices: Object.fromEntries(STOCKS.map((st) => [st.id, [st.start]])) },
  tasks: { day: 1, ids: pickTasks({ employment: null, romance: { partner: null }, bank: { open: false } } as never, 1), done: [] },
  today: {},
  goals: [],
  goalsActive: [],
  lifeFlags: {},
  visited: [],
  chats: {},
  chatUnread: {},
  chatDay: {},
  groups: {},
})

const toast = (msg: string, kind: 'info' | 'good' | 'warn' | 'bad' = 'info') => useUI.getState().toast(msg, kind)

/* ---------------- draft helpers (operate on a shallow-cloned state) ---------------- */
function draft(s: GameState): GameState {
  return {
    ...s,
    needs: { ...s.needs },
    skills: { ...s.skills },
    careers: { ...s.careers },
    friendships: { ...s.friendships },
    stats: { ...s.stats },
    daily: { ...s.daily },
    housing: { ...s.housing },
    tutorial: { ...s.tutorial },
    lowFlags: { ...s.lowFlags },
    health: { ...s.health },
    legal: { ...s.legal },
    rep: { ...s.rep },
    laundered: { ...s.laundered },
    romance: { ...s.romance },
    edu: { ...s.edu },
    plots: { ...s.plots },
    rentedDay: { ...s.rentedDay },
    tenants: { ...s.tenants },
    items: { ...s.items },
    bank: { ...s.bank },
    invest: { ...s.invest, shares: { ...s.invest.shares } },
    tasks: { ...s.tasks },
    today: { ...s.today },
    chats: { ...s.chats },
    chatUnread: { ...s.chatUnread },
    chatDay: { ...s.chatDay },
    groups: { ...s.groups },
  }
}

function pushTx(d: GameState, label: string, amount: number, category: TxCategory) {
  const tx: Tx = { id: d.nextId++, minute: d.minutes, label, amount, category }
  d.transactions = [tx, ...d.transactions].slice(0, BALANCE.maxTransactions)
}
function earn(d: GameState, amount: number, label: string, cat: TxCategory) {
  if (amount <= 0) return
  if (cat === 'wage' || cat === 'bonus') track(d, 'earn', amount)
  d.money += amount
  d.stats.moneyEarned += amount
  pushTx(d, label, amount, cat)
}
/** `clean`: paid from clean cash only (big legal purchases); otherwise dirty cash is spent first, like any street cash. */
function spend(d: GameState, amount: number, label: string, cat: TxCategory, clean = false) {
  if (amount <= 0) return
  d.money -= amount
  d.dirty = clean ? Math.min(d.dirty, Math.max(0, d.money)) : Math.max(0, Math.min(d.dirty - amount, d.money))
  d.stats.moneySpent += amount
  pushTx(d, label, -amount, cat)
}
/** Crime proceeds: cash that has to be laundered before the bank or a seller will take it. */
function earnDirty(d: GameState, amount: number, label: string) {
  if (amount <= 0) return
  earn(d, amount, label, 'bonus')
  d.dirty += amount
}
/** Cash you can show the bank or a seller. */
export const cleanCash = (s: Pick<GameState, 'money' | 'dirty'>) => Math.max(0, s.money - s.dirty)
/** Purchases at or above this need clean cash. */
export const CLEAN_MIN = 1000
/** Why a big legal payment cannot be made with this wallet, or null. */
export function needClean(s: Pick<GameState, 'money' | 'dirty'>, amount: number): string | null {
  if (amount < CLEAN_MIN || cleanCash(s) >= amount) return null
  return `💸 ${formatMoney(s.dirty)} of your cash is dirty and they ask where it came from. Launder it first (Phone → Wallet).`
}
/** Dirty cash a business till can still absorb today: three good days of takings per level. */
export function launderCap(s: Pick<GameState, 'businesses' | 'laundered' | 'minutes'>, bizId: string): number {
  const b = BUSINESS_BY_ID[bizId]
  const own = s.businesses[bizId]
  if (!b || !own) return 0
  const used = s.laundered[bizId]?.day === dayOf(s.minutes) ? s.laundered[bizId].amount : 0
  return Math.max(0, Math.round(b.income[1] * own.level * LAUNDER.business.capDays) - used)
}
/** Change reputation: street cred and respect, each 0–100. */
function addRep(d: GameState, street: number, respect: number) {
  d.rep = { street: clamp(d.rep.street + street), respect: clamp(d.rep.respect + respect) }
}
/** Legal wages scale with respect: 0.9× at 0, 1.0× at 50, 1.1× at 100. */
export const respectPay = (s: Pick<GameState, 'rep'>) => 0.9 + s.rep.respect / 500
/** Police find unexplained cash on you and keep it. */
function seizeDirty(d: GameState, share: number, lines?: string[]) {
  const take = Math.round(d.dirty * share)
  if (take <= 0) return 0
  d.money -= take
  d.dirty -= take
  d.stats.moneySpent += take
  pushTx(d, 'Seized by police', -take, 'fee')
  const msg = `👮 Police seized ${formatMoney(take)} of unexplained cash.`
  if (lines) lines.push(msg)
  else toast(msg, 'bad')
  return take
}

function applyNeeds(d: GameState, delta: Partial<Needs>, factor = 1) {
  for (const [k, v] of Object.entries(delta) as [NeedId, number][]) d.needs[k] = clamp(d.needs[k] + v * factor)
}
function addXp(d: GameState, skill: SkillId, xp: number, notes?: string[]) {
  const before = levelFromXp(d.skills[skill])
  d.skills[skill] += xp
  const after = levelFromXp(d.skills[skill])
  if (after > before) {
    const msg = `${SKILLS[skill].name} reached level ${after}!`
    toast(`${SKILLS[skill].emoji} ${msg}`, 'good')
    notes?.push(`🎉 ${msg}`)
  }
}
function addFriendship(d: GameState, npc: string, pts: number) {
  const f = d.friendships[npc] ?? { points: 0, talkDay: 0, talks: 0 }
  let gain = pts
  if (gain > 0 && d.profile?.traits.includes('charming')) gain = Math.ceil(gain * 1.25)
  const before = Math.floor(f.points)
  d.friendships[npc] = { ...f, points: Math.max(0, f.points + gain) }
  const names = BALANCE.friendship.levels
  const lvl = (p: number) => names.filter((l) => p >= l.at).length - 1
  if (lvl(d.friendships[npc].points) > lvl(before)) toast(`🤝 You and ${NPC_BY_ID[npc].name} are now ${names[lvl(d.friendships[npc].points)].name.toLowerCase()}s!`, 'good')
}

function decayNeeds(d: GameState, minutes: number) {
  const traits = (d.profile?.traits ?? []).map((t) => TRAITS[t])
  const h = hourOf(d.minutes)
  for (const k of Object.keys(BALANCE.decayPerHour) as NeedId[]) {
    let rate = (BALANCE.decayPerHour[k] / 60) * minutes
    if (d.health.illness && (k === 'energy' || k === 'fun')) rate *= k === 'energy' ? (d.health.mild ? 1.4 : 1.9) : 1.3
    if (k === 'social' && d.romance.stage === 'married') rate *= 0.6
    for (const t of traits) {
      rate *= t.decay?.[k] ?? 1
      if (k === 'energy' && t.nightEnergy && (h >= 20 || h < 6)) rate *= t.nightEnergy
    }
    d.needs[k] = clamp(d.needs[k] - rate)
  }
  if (d.needs.hunger <= 0) d.needs.energy = clamp(d.needs.energy - (BALANCE.starvingEnergyDrain / 60) * minutes)
}

function advance(d: GameState, minutes: number, decay = true) {
  if (decay) decayNeeds(d, minutes)
  d.minutes += minutes
}

function missingRequirements(d: Pick<GameState, 'skills'>, career: CareerId, levelIdx: number): string[] {
  const req = CAREERS[career].levels[levelIdx].requires
  const out: string[] = []
  for (const [k, v] of Object.entries(req) as [SkillId, number][]) if (levelFromXp(d.skills[k]) < v) out.push(`${SKILLS[k].name} level ${v}`)
  return out
}
export { missingRequirements }

function repositionFurniture(d: GameState) {
  const inv = d.inventory.map((o) => ({ ...o, placed: null as OwnedFurniture['placed'] }))
  for (const o of inv) {
    const spot = autoPlace(d.housing.tier, inv, o.type, o.uid, extCount(d.upgrades[d.housing.tier]))
    if (spot) o.placed = spot
  }
  d.inventory = inv
}

function makeActivity(d: GameState, def: ReturnType<typeof findDef> & object, ctx: ActivityContext, r: Resolved): ActiveActivity {
  return {
    uid: d.nextId++,
    defId: def.id,
    label: def.label,
    icon: def.icon,
    kind: def.kind,
    ctx,
    total: r.minutes,
    done: 0,
    scale: r.scale,
    needs: r.needs,
    appliedFrac: 0,
    reward: r.reward,
    skillXp: r.skillXp,
    careerXp: r.careerXp,
    cost: r.cost,
    travelTo: def.kind === 'travel' ? def.id.slice(7) : undefined,
    startedAt: d.minutes,
    effect: def.effect,
    crime: def.crime,
    shift: def.kind === 'work' && ctx.career ? { queue: [], current: null, done: 0, missed: 0, earned: 0, tips: 0, nextAt: r.scale * 2 } : undefined,
  }
}

/* ------------------------------ work shift tasks ------------------------------ */
/** Real seconds a task stays on the board, takes to do, and between new tasks. */
const SHIFT = { window: 16, doing: 3.5, gapMin: 5, gapMax: 9, perShift: 10 }

function stepShift(d: GameState, a: ActiveActivity): ActiveActivity | null {
  const sh = a.shift
  const career = a.ctx.career
  if (!sh || !career) return a
  const c = CAREERS[career]
  const next: ShiftState = { ...sh, queue: [...sh.queue] }
  const perTask = Math.round((a.reward * 0.5) / SHIFT.perShift)
  // finish the task being done
  if (next.current && a.done >= next.current.until) {
    const t = next.current
    const def = shiftTaskDef(career, t.key)
    const tip = def?.tip ? Math.round(def.tip[0] + Math.random() * (def.tip[1] - def.tip[0])) : 0
    next.done++
    next.earned += t.pay
    next.tips += tip
    next.current = null
    toast(`${t.icon} ${t.label} ✓ +${formatMoney(t.pay + tip)}${tip ? ' (incl. tip)' : ''}`, 'good')
  }
  // tasks left too long are missed
  const expired = next.queue.filter((t) => t.expires <= a.done)
  if (expired.length) {
    next.queue = next.queue.filter((t) => t.expires > a.done)
    next.missed += expired.length
    toast(`⌛ Missed: ${expired[0].label}. Your boss noticed.`, 'warn')
  }
  // new task pops up
  const room = a.total - a.done > (SHIFT.doing + 2) * a.scale
  if (room && a.done >= next.nextAt && next.queue.length < 3) {
    const last = next.queue[next.queue.length - 1]?.key ?? next.current?.key
    const pool = c.tasks.filter((t) => t.key !== last)
    const def = pool[Math.floor(Math.random() * pool.length)] ?? c.tasks[0]
    const task: ShiftTask = { id: d.nextId++, key: def.key, label: def.label, icon: def.icon, pay: perTask, born: a.done, expires: a.done + SHIFT.window * a.scale }
    next.queue.push(task)
    next.nextAt = a.done + (SHIFT.gapMin + Math.random() * (SHIFT.gapMax - SHIFT.gapMin)) * a.scale
  }
  // illegal work: one raid roll per shift, a third of the way in
  if (c.illegal && !next.raided && a.done > a.total * 0.35) {
    next.raided = true
    const lookout = next.queue.length === 0 && next.done > 0 ? 0.03 : 0
    const chance = c.illegal.raid + d.legal.heat / 500 - lookout
    if (Math.random() < chance) {
      d.legal.heat = Math.min(100, d.legal.heat + 25)
      const escape = 0.25 + levelFromXp(d.skills.fitness) * 0.06
      if (Math.random() < escape) {
        showResult(d, 'Raid! You escaped', '🏃🏾', ['🚨 The task force stormed in.', '🌳 You ran into the bush and got away.', `💸 You lost the takings (${formatMoney(next.earned + next.tips)}).`], 'bad')
      } else {
        showResult(d, 'Police raid!', '🚨', ['🚨 The task force stormed in.', `👮 You were caught red-handed: ${CHARGES[c.illegal.charge].name}.`], 'bad')
        d.event = { id: 'arrest_offer', ctx: { officer: rollOfficer(), offence: c.illegal.charge } }
      }
      return null
    }
  }
  return { ...a, shift: next }
}

function beginTravel(d: GameState, fromDest: string, toDest: string, extra: number, payFare: boolean) {
  const def = travelDef(fromDest, toDest)
  if (!def) return
  const r = resolve(def, { dest: fromDest }, d)
  if (payFare) spend(d, r.cost, `Fare to ${DEST_BY_ID[toDest].name}`, 'transport')
  const act = makeActivity(d, def, { dest: fromDest }, { ...r, minutes: r.minutes + extra, cost: payFare ? r.cost : 0 })
  d.activity = act
  cancelPath()
}

function showResult(d: GameState, title: string, icon: string, lines: string[], tone: ActivityResult['tone'] = 'good') {
  d.result = { id: d.nextId++, title, icon, lines, tone }
}

function checkTutorial(d: GameState) {
  if (d.tutorial.done) return
  for (let guard = 0; guard < 6; guard++) {
    const t = d.tutorial
    const cond =
      t.step === 0 ? d.nearDest === 'foodstall' :
      t.step === 1 ? d.stats.mealsEaten >= 1 :
      t.step === 2 ? d.employment !== null :
      t.step === 3 ? d.stats.shiftsCompleted >= 1 :
      t.step === 4 ? d.view === 'home' :
      t.step === 5 ? d.stats.sleeps >= 1 : false
    if (!cond) return
    if (t.step === 5) {
      d.tutorial = { step: 6, done: true }
      earn(d, BALANCE.tutorialBonus, 'Welcome bonus', 'bonus')
      toast(`🎓 Tutorial complete! Bonus ${formatMoney(BALANCE.tutorialBonus)}. The city is yours.`, 'good')
      return
    }
    d.tutorial = { step: t.step + 1, done: false }
  }
}

function finishActivity(d: GameState) {
  const a = d.activity
  if (!a) return
  d.activity = null // clear first: guarantees the reward is only applied once
  const lines: string[] = []
  // remaining need change (the rest was applied gradually)
  applyNeeds(d, a.needs, 1 - a.appliedFrac)
  for (const [k, v] of Object.entries(a.needs) as [NeedId, number][]) if (v) lines.push(`${NEED_META[k].emoji} ${NEED_META[k].label} ${v > 0 ? '+' : ''}${v}`)
  if (a.cost) lines.push(`💸 Paid ${formatMoney(a.cost)}`)
  let perf = 1
  if (a.kind === 'work' && a.shift) {
    // base pay is half the shift wage; the rest comes from tasks you actually do
    const sh = a.shift
    const total = sh.done + sh.missed
    perf = total ? sh.done / total : 0.5
    const base = Math.round(a.reward * 0.5)
    const bonus = perf >= 0.85 && sh.done >= 4 ? Math.round(a.reward * 0.1) : 0
    const illegal = !!(a.ctx.career && CAREERS[a.ctx.career]?.illegal)
    const pay = Math.round((base + sh.earned + bonus) * (illegal ? 1 : respectPay(d)))
    if (illegal) {
      earnDirty(d, pay + sh.tips, `Cut: ${a.label.replace('Work shift: ', '')}`)
      addRep(d, 2, -1)
      lines.push('💸 Paid in dirty cash. Launder it before banking or big buys.')
    } else {
      earn(d, pay, `Wages: ${a.label.replace('Work shift: ', '')}`, 'wage')
      if (sh.tips) earn(d, sh.tips, 'Tips', 'bonus')
      addRep(d, 0, 1)
    }
    lines.push(`💰 Base pay ${formatMoney(base)} + tasks ${formatMoney(sh.earned)}${bonus ? ` + star bonus ${formatMoney(bonus)}` : ''}`)
    if (sh.tips) lines.push(`🪙 Tips ${formatMoney(sh.tips)}`)
    lines.push(`📋 Tasks done ${sh.done}, missed ${sh.missed} · performance ${Math.round(perf * 100)}%`)
  } else if (a.reward > 0) {
    const label = a.kind === 'work' ? `Wages: ${a.label.replace('Work shift: ', '')}` : a.label
    earn(d, a.reward, label, a.kind === 'work' ? 'wage' : 'bonus')
    lines.push(`💰 Earned ${formatMoney(a.reward)}`)
  }
  const respectGain = RESPECT_ACTS[a.defId.split(':')[0]]
  if (respectGain) {
    addRep(d, 0, respectGain)
    lines.push(`🤝 Respect +${respectGain}`)
  }
  for (const [k, v] of Object.entries(a.skillXp) as [SkillId, number][]) {
    addXp(d, k, v, lines)
    lines.push(`${SKILLS[k].emoji} ${SKILLS[k].name} +${v} XP`)
  }
  if (a.kind === 'meal') d.stats.mealsEaten++
  if (a.kind === 'sleep' && a.defId === 'sleep') d.stats.sleeps++
  if (a.kind === 'collapse') d.stats.sleeps += 0
  if (a.kind === 'travel') d.stats.tripsTaken++

  let title = `${a.label} complete`
  if (a.kind === 'work' && a.ctx.career) {
    d.stats.shiftsCompleted++
    const prog = { ...(d.careers[a.ctx.career] ?? { level: 1, xp: 0, shifts: 0 }) }
    prog.xp += Math.round(a.careerXp * (0.5 + perf))
    if (CAREERS[a.ctx.career].illegal) d.legal.heat = Math.min(100, d.legal.heat + 8)
    if (a.shift && perf < 0.4) {
      prog.warns = (prog.warns ?? 0) + 1
      if (prog.warns >= 3) {
        lines.push('🚪 Too many bad shifts. You were sacked.')
        toast(`😞 You were fired from ${CAREERS[a.ctx.career].name}. Do more tasks next time.`, 'bad')
        d.employment = null
        lifeEvent(d, 'fired')
        prog.warns = 0
      } else lines.push(`⚠️ Warning ${prog.warns}/3 from your boss: do more tasks during your shift.`)
    } else if (a.shift && perf >= 0.85) {
      prog.warns = 0
      lines.push('⭐ Great shift! Your boss is impressed.')
    }
    prog.shifts++
    const levels = CAREERS[a.ctx.career].levels
    const next = levels[prog.level]
    if (next && prog.xp >= next.promoteAt) {
      const missing = missingRequirements(d, a.ctx.career, prog.level)
      if (!missing.length) {
        prog.level++
        lines.push(`🏅 Promoted to ${next.title}! New pay ${formatMoney(next.pay)}`)
        toast(`🏅 Promoted to ${next.title}!`, 'good')
        title = `Shift complete. Promoted!`
      } else {
        lines.push(`⭐ Promotion ready. You need ${missing.join(', ')}.`)
      }
    } else if (next) {
      lines.push(`⭐ Career XP ${prog.xp}/${next.promoteAt} for ${next.title}`)
    }
    d.careers[a.ctx.career] = prog
  }
  if (a.ctx.npc && a.defId.startsWith('npc_hangout')) {
    addFriendship(d, a.ctx.npc, 8)
    lines.push(`🤝 Friendship with ${NPC_BY_ID[a.ctx.npc].name} +8`)
  }
  if (a.kind === 'travel' && a.travelTo) {
    runtime.ride = null
    d.view = 'world'
    d.insideDest = null
    useUI.setState({ panel: 'none', selectedDest: null })
    const to = DEST_BY_ID[a.travelTo]
    d.player = { x: to.door.x + 0.5, z: to.door.z + 0.5, rot: 0 }
    teleport(d.player.x, d.player.z)
    d.nearDest = to.id
    title = `Arrived at ${to.name}`
  }
  if (a.kind === 'collapse') title = 'You passed out'
  let tone: ActivityResult['tone'] = a.kind === 'collapse' ? 'bad' : 'good'

  // ---- tracking for tasks
  track(d, `act:${a.defId.split(':')[0]}`)
  track(d, `kind:${a.kind}`)
  if (a.ctx.dest) {
    track(d, `dest:${a.ctx.dest}`)
    if (!d.visited.includes(a.ctx.dest)) d.visited = [...d.visited, a.ctx.dest]
  }
  if (a.ctx.ride) track(d, `ride:${a.ctx.ride}`)

  // ---- rides arrive at the door, then go straight in
  if (a.ctx.ride && a.travelTo && !a.ctx.drive) {
    const next = runtime.onRideEnd
    runtime.onRideEnd = null
    if (next) setTimeout(next, 600)
    const to = DEST_BY_ID[a.travelTo]
    if (a.meta?.note) lines.push(String(a.meta.note))
    if (a.ctx.ride === 'okada' && Math.random() < DRIVING.okadaRideRisk && !d.health.illness) {
      d.health = { ...d.health, illness: 'injury', mild: true, since: d.minutes }
      lines.push('🤕 The okada skidded at a corner. You scraped your knee.')
    }
    if (to.homeTier) {
      if (to.id === homeDestId(d)) d.view = 'home'
    } else if (!OUTDOOR_KINDS.includes(to.kind) && (to.hours[0] === 0 && to.hours[1] === 24 ? true : isOpen(to.hours, hourOf(d.minutes)))) {
      d.view = 'inside'
      d.insideDest = to.id
    }
    useUI.setState({ panel: d.view === 'home' ? 'home' : 'building', selectedDest: to.id })
  }

  // ---- custom effects
  const fx = a.effect ?? ''
  if (fx === 'sleeprough') {
    lines.push('🥶 A cold, uncomfortable night outdoors.')
    if (Math.random() < 0.18 && d.money > 0) {
      const lost = Math.round(d.money * 0.35)
      spend(d, lost, 'Robbed while sleeping rough', 'fee')
      lines.push(`🔪 Someone went through your pockets while you slept: ${formatMoney(lost)} gone. Keep savings in the bank.`)
      tone = 'bad'
    }
  } else if (fx === 'consult' || fx === 'ward') {
    d.health.illness = null
    lines.push('💚 You are cured. Feel better!')
    title = fx === 'ward' ? 'Discharged from hospital' : 'Treatment complete'
  } else if (fx === 'meds') {
    if (d.health.illness && d.health.mild) {
      d.health.illness = null
      lines.push('💊 The medicine worked. You feel better.')
    } else if (d.health.illness) {
      lines.push('⚠️ This is too serious for pharmacy medicine. See a doctor.')
      tone = 'neutral'
    }
  } else if (fx === 'nhis') {
    d.health.nhis = true
    lines.push(`🪪 NHIS active. Doctor visits now cost ${formatMoney(HEALTH.consultNhis)}.`)
  } else if (fx === 'checkup') {
    d.health.protectedUntil = d.minutes + 7 * 1440
    lines.push('❤️ All clear. Lower sickness risk for 7 days.')
  } else if (fx.startsWith('enroll:')) {
    const pid = fx.slice(7) as ProgramId
    d.edu = { ...d.edu, program: pid, credits: 0 }
    lines.push(`🎓 Enrolled in ${PROGRAMS[pid].name}. Attend ${CLASSES_TO_GRADUATE} lectures to graduate.`)
  } else if (fx === 'lecture' && d.edu.program) {
    const credits = d.edu.credits + 1
    const pid = d.edu.program
    if (credits >= CLASSES_TO_GRADUATE) {
      d.edu = { program: null, credits: 0, degrees: [...d.edu.degrees, pid] }
      lines.push(`🎉 You graduated: ${PROGRAMS[pid].name}! +20% pay in ${CAREERS[PROGRAMS[pid].career].name}.`)
      toast(`🎓 Congratulations, graduate! ${PROGRAMS[pid].name}`, 'good')
      title = 'Graduation day!'
    } else {
      d.edu = { ...d.edu, credits }
      lines.push(`📘 Lectures: ${credits}/${CLASSES_TO_GRADUATE}`)
    }
  } else if (fx === 'wedding') {
    d.romance = { ...d.romance, stage: 'married' }
    const p = d.romance.partner ? NPC_BY_ID[d.romance.partner].name : 'your partner'
    lines.push(`💍 You married ${p}! They now support the household with ${formatMoney(ROMANCE.spouseSupport)} a day.`)
    toast(`💒 Congratulations! You married ${p}.`, 'good')
    title = 'Just married!'
  } else if (fx === 'ring') {
    d.romance = { ...d.romance, ring: true }
    lines.push('💍 Ring bought. Propose from your partner’s contact card.')
  } else if (fx === 'openaccount') {
    d.bank = { ...d.bank, open: true }
    lines.push('🏦 Account open. Use the Bank app on your phone to deposit and invest.')
  } else if (fx === 'watch') {
    d.legal.heat = Math.max(0, d.legal.heat - 40)
    lines.push('🔦 Your street reputation improved.')
  } else if (fx === 'payfine') {
    d.legal.caseDeadline = null
    lines.push('🧾 Case settled. No trial needed.')
  } else if (fx === 'date' && a.ctx.npc) {
    addFriendship(d, a.ctx.npc, 10)
    d.romance = { ...d.romance, dates: d.romance.dates + 1 }
    lines.push(`💕 ${NPC_BY_ID[a.ctx.npc].name} had a lovely time. (+10)`)
  }
  if (fx === 'permit') {
    const pid = Object.keys(d.plots).find((k) => d.plots[k].owned && d.plots[k].permit === 'none')
    if (pid) {
      d.plots[pid] = { ...d.plots[pid], permit: 'pending', permitReady: d.minutes + PERMIT.days * 1440 }
      lines.push(`📝 Permit for ${DEST_BY_ID[pid].name} submitted. Approval in ${PERMIT.days} days.`)
    }
  } else if (fx === 'permitbribe') {
    const pid = Object.keys(d.plots).find((k) => d.plots[k].owned && d.plots[k].permit === 'none')
    if (pid && Math.random() < PERMIT.bribeChance) {
      d.plots[pid] = { ...d.plots[pid], permit: 'approved', permitReady: null }
      lines.push(`🤫 The officer smiled. Permit for ${DEST_BY_ID[pid].name} approved on the spot.`)
      d.legal.heat = Math.min(100, d.legal.heat + 10)
    } else {
      spend(d, 500, 'Fine: attempted bribery', 'fee')
      d.legal.heat = Math.min(100, d.legal.heat + 25)
      lines.push('😬 A supervisor walked in. You were fined GH₵500 and nothing was approved.')
      tone = 'bad'
    }
  } else if (fx === 'drivetest') {
    if (Math.random() < DRIVING.licensePass + levelFromXp(d.skills.communication) * 0.03) {
      d.license = true
      lines.push('🪪 You passed! Your driving licence is ready.')
      title = 'Driving test passed'
    } else {
      lines.push('❌ You stalled at the hill start. Try again tomorrow.')
      tone = 'neutral'
    }
  } else if (fx === 'licensebribe') {
    if (Math.random() < DRIVING.licenseBribeChance) {
      d.license = true
      lines.push('🤫 The goro boy delivered. You have a licence… somehow.')
      d.legal.heat = Math.min(100, d.legal.heat + 10)
    } else {
      showResult(d, 'Busted!', '🚓', ['An undercover officer was in the queue.'], 'bad')
      d.event = { id: 'arrest_offer', ctx: { officer: rollOfficer(), offence: 'licence' } }
      return
    }
  }
  if (fx === 'ticket' || fx === 'ticketvip') {
    const day = dayOf(d.minutes)
    d.ticket = { day, vip: fx === 'ticketvip' }
    const act = showOn(day)
    lines.push(`🎟️ ${fx === 'ticketvip' ? 'VIP' : 'Regular'} ticket for ${act.emoji} ${act.name} (${act.genre}) tonight. Show starts at 8pm.`)
  } else if (fx === 'show') {
    const act = showOn(dayOf(d.minutes))
    const vip = !!d.ticket?.vip
    track(d, 'show')
    lines.push(`🎤 ${act.name} tore the place down. You sang every word.`)
    if (vip) {
      lines.push(`📸 Backstage meet & greet: you got a selfie with ${act.name}!`)
      d.needs.social = clamp(d.needs.social + 15)
    }
    title = `${act.emoji} ${act.name} live at the AICC`
    d.ticket = null
  } else if (fx === 'sprayartist') {
    lines.push(`💸 You climbed on stage and sprayed ${showOn(dayOf(d.minutes)).name}. The whole hall screamed your name.`)
  }
  if (fx === 'condoms') {
    d.items = { ...d.items, condoms: d.items.condoms + 3 }
    lines.push(`🛡️ You now have ${d.items.condoms} condoms.`)
  } else if (fx === 'spray') {
    track(d, 'sprayed')
    lines.push('💸 Cedi notes rain over the dancers. Everyone is cheering your name.')
  } else if (fx === 'hookup' || fx === 'hookup_m') {
    const traits: string[] = d.profile?.traits ?? []
    let chance = 0.3 + (traits.includes('charming') ? 0.15 : 0) + Math.min(0.25, (d.today['sprayed'] ?? 0) * 0.15) + (d.needs.hygiene > 60 ? 0.1 : -0.2) + (d.needs.fun > 60 ? 0.05 : 0)
    if (d.romance.stage === 'married') chance -= 0.1
    if (Math.random() < chance) {
      const guy = fx === 'hookup_m'
      const names = guy ? HOOKUP_GUYS : HOOKUP_GIRLS
      const name = names[Math.floor(Math.random() * names.length)]
      // short crop, afro or bald for guys; braids, top bun or headwrap for girls
      const hairs = guy ? [0, 1, 3] : [2, 4, 5]
      d.hookup = { name, look: { skin: Math.floor(Math.random() * 6), hair: hairs[Math.floor(Math.random() * hairs.length)], hairColor: Math.floor(Math.random() * 6), outfit: Math.floor(Math.random() * 4), outfitColor: Math.floor(Math.random() * 7), accessory: Math.floor(Math.random() * 6) } }
      d.event = { id: 'hookup_where', ctx: {} }
      lines.push(`😏 You and ${name} have chemistry.`)
    } else {
      lines.push('🙃 No luck tonight. Freshen up, dance more, or spray some money.')
      tone = 'neutral'
    }
  } else if (fx === 'intimate') {
    const who = d.hookup?.name ?? 'them'
    lines.push(`💞 You spent the night with ${who}. What happens in Accra stays in Accra.`)
    afterIntimacy(d, lines, 0.12)
    d.hookup = null
  } else if (fx === 'nightwork') {
    const traits: string[] = d.profile?.traits ?? []
    const r = Math.random()
    if (r < 0.15) {
      showResult(d, 'Police raid!', '🚨', ['The police swept the street.', 'Soliciting is illegal in Ghana.'], 'bad')
      d.event = { id: 'arrest_offer', ctx: { officer: rollOfficer(), offence: 'soliciting' } }
      return
    }
    let earned = Math.round(150 + Math.random() * 250 + (traits.includes('charming') ? 60 : 0))
    if (r < 0.25) {
      earned = Math.round(earned * 0.3)
      lines.push('🔪 A client robbed you on the way out. You kept only a little.')
      tone = 'bad'
    }
    earnDirty(d, earned, 'Night work')
    lines.push(`💰 Earned ${formatMoney(earned)} tonight.`)
    afterIntimacy(d, lines, 0.18)
  }
  if (a.kind === 'travel' && a.ctx.drive && d.drive) {
    const fare = a.reward
    earn(d, fare, `${VEHICLES[d.drive.vehicle].job}: trip fare`, 'wage')
    d.drive = { ...d.drive, trips: d.drive.trips - 1, earned: d.drive.earned + fare }
    if (d.drive.trips > 0) {
      const policeOdds = DRIVING.checkpointChance + (d.drive.vehicle === 'okada' ? DRIVING.okadaCheckpointBonus : 0)
      if (Math.random() < policeOdds) d.event = { id: 'checkpoint', ctx: { officer: rollOfficer() } }
      else startTrip(d)
      d.result = null
      return
    }
    showResult(d, 'Shift complete', VEHICLES[d.drive.vehicle].emoji, [`🚦 Trips: ${DRIVING.tripsPerShift}`, `💰 Earned ${formatMoney(d.drive.earned)} this shift`], 'good')
    d.stats.shiftsCompleted++
    d.drive = null
    return
  }
  if (a.kind === 'crime' && a.crime) {
    let chance = a.crime.chance - d.legal.heat / 400
    if (friendPoints(d, 'nii') >= NPC_BY_ID.nii.perk.friendAt) chance += 0.15
    if (friendPoints(d, 'boateng') >= NPC_BY_ID.boateng.perk.friendAt) chance += 0.1
    chance += Math.min(0.2, d.rep.street / 500) // the streets know you: lookouts, fences, fewer mistakes
    if (a.ctx.street) {
      const hr = hourOf(d.minutes)
      if (hr >= 20 || hr < 5) chance += 0.1 // darkness helps
      if (a.defId === 'phonesnatch') chance += skillLevel(d, 'fitness') * 0.03
      chance -= (a.ctx.cops ?? 0) * 0.3 // patrol officers close by
    }
    if (Math.random() < chance) {
      const got = Math.round(a.crime.min + Math.random() * (a.crime.max - a.crime.min))
      earnDirty(d, got, a.label)
      const big = a.defId === 'streetrob' || a.defId === 'alleyrob'
      addRep(d, big ? 6 : 3, -1)
      d.legal.heat = Math.min(100, d.legal.heat + 15)
      lines.push(`💰 Got away with ${formatMoney(got)} in dirty cash. Heat is rising.`)
      title = 'You got away with it'
      tone = 'neutral'
    } else {
      const charge = a.ctx.street ? STREET_CHARGE[a.defId as keyof typeof STREET_CHARGE] : undefined
      const seen = a.ctx.street && (a.ctx.cops ?? 0) > 0
      showResult(d, 'Caught!', '🚓', [seen ? '👮 The patrol officer saw everything and tackled you.' : a.ctx.street ? '📢 They shouted “Thief!” and a police officer grabbed you.' : '👮 A police officer grabbed your arm.', '“Where do you think you are going?”'], 'bad')
      d.legal.heat = Math.min(100, d.legal.heat + 10)
      addRep(d, 2, -8)
      d.event = { id: 'arrest_offer', ctx: { officer: rollOfficer(), ...(charge ? { offence: charge } : {}) } }
      return
    }
  }
  if (a.kind === 'custody') {
    if (d.money >= LEGAL.bail) {
      spend(d, LEGAL.bail, 'Police bail bond', 'fee')
      d.legal.caseDeadline = d.minutes + LEGAL.courtDays * 1440
      lines.push(`💸 You paid ${formatMoney(LEGAL.bail)} bail.`)
      lines.push(`⚖️ Released on bail. Attend your hearing at Accra High Court within ${LEGAL.courtDays} days, or pay the fine here.`)
      title = 'Released on bail'
      tone = 'neutral'
    } else {
      // no bail money: held on remand in prison until the trial
      remand(d)
      showResult(d, 'Remanded in prison', '⛓️', [`You could not pay the ${formatMoney(LEGAL.bail)} bail.`, `You stay locked up for ${LEGAL.courtDays} days until your trial.`], 'bad')
      return
    }
  }
  if (a.kind === 'jail' && a.defId === 'remand') {
    d.legal.caseDeadline = d.minutes + 1440
    title = 'Out of remand'
    lines.push('⚖️ Your trial is today. Go to Accra High Court within 24 hours, or pay the fine here. Miss it and a warrant is issued.')
    tone = 'neutral'
  } else if (a.kind === 'jail') {
    title = 'Released from prison'
    lines.push('🔓 You served your sentence. Time for a fresh start.')
    tone = 'neutral'
  }
  if (fx === 'ward') tone = 'neutral'
  // food poisoning from street food
  if (a.kind === 'meal' && ['kelewele', 'boli', 'sobolo'].includes(a.defId) && !d.health.illness && Math.random() < 0.04) {
    d.health = { ...d.health, illness: 'food', mild: true, since: d.minutes }
    lines.push('🤢 Your stomach does not feel right…')
  }
  showResult(d, title, a.icon, lines, tone)
  checkTutorial(d)
}

/* ------------------------------ life helpers ------------------------------ */
function track(d: GameState, key: string, n = 1) {
  d.today = { ...d.today, [key]: (d.today[key] ?? 0) + n }
  for (const id of d.tasks.ids) {
    if (d.tasks.done.includes(id)) continue
    const t = TASK_BY_ID[id]
    if (!t || !t.keys.includes(key)) continue
    if (taskProgress(d, t) >= t.target) {
      d.tasks = { ...d.tasks, done: [...d.tasks.done, id] }
      d.money += t.reward
      pushTx(d, `Task: ${t.text}`, t.reward, 'bonus')
      d.needs.fun = clamp(d.needs.fun + 8)
      toast(`✅ Task done: ${t.text} (+${formatMoney(t.reward)})`, 'good')
    }
  }
}

function addChat(d: GameState, chatId: string, from: string, text: string, unread = true) {
  const list = [...(d.chats[chatId] ?? []), { id: d.nextId++, from, text, at: d.minutes }].slice(-50)
  d.chats = { ...d.chats, [chatId]: list }
  if (unread && from !== 'me') d.chatUnread = { ...d.chatUnread, [chatId]: (d.chatUnread[chatId] ?? 0) + 1 }
}

function enterPlace(d: GameState, destId: string) {
  d.view = 'inside'
  d.insideDest = destId
  d.nearDest = destId
  const dd = DEST_BY_ID[destId]
  d.player = { x: dd.door.x + 0.5, z: dd.door.z + 0.5, rot: 0 }
  teleport(d.player.x, d.player.z)
  cancelPath()
  useUI.setState({ panel: 'building', selectedDest: destId })
}

/** Pick the officer who deals with you. */
export function rollOfficer(): Officer {
  const r = Math.random()
  return r < 0.45 ? 'greedy' : r < 0.8 ? 'cautious' : 'honest'
}

/** Remember a big life event so goals can react to it. */
function lifeEvent(d: GameState, key: string) {
  d.lifeFlags = { ...d.lifeFlags, [key]: d.minutes }
  if (key === 'evicted') addRep(d, 0, -8)
}

function arrest(d: GameState, charge: keyof typeof CHARGES = 'theft') {
  lifeEvent(d, 'trouble')
  addRep(d, 3, -10)
  seizeDirty(d, 1)
  d.legal.heat = 0
  d.legal = { ...d.legal, charge: CHARGES[charge].name, fine: CHARGES[charge].fine }
  enterPlace(d, 'police')
  d.activity = {
    uid: d.nextId++, defId: 'custody', label: 'Held in police custody', icon: '🚓', kind: 'custody', ctx: { dest: 'police' },
    total: LEGAL.custodyMinutes, done: 0, scale: LEGAL.custodyScale, needs: { fun: -15, social: -10, hygiene: -10 }, appliedFrac: 0,
    reward: 0, skillXp: {}, careerXp: 0, cost: 0, startedAt: d.minutes,
  }
  toast('🚓 You have been arrested!', 'bad')
}

function sendToJail(d: GameState, days: number, reason: string) {
  lifeEvent(d, 'trouble')
  d.legal.caseDeadline = null
  d.legal.record++
  addRep(d, 10, -15)
  enterPlace(d, 'police')
  d.activity = {
    uid: d.nextId++, defId: 'jail', label: `Serving ${days} days in prison`, icon: '⛓️', kind: 'jail', ctx: { dest: 'police' },
    total: days * 1440, done: 0, scale: LEGAL.jailScale, needs: { fun: -25, social: -20, hygiene: -20, energy: 20, hunger: 20 }, appliedFrac: 0,
    reward: 0, skillXp: {}, careerXp: 0, cost: 0, startedAt: d.minutes,
  }
  if (days >= 2 && d.employment) {
    toast(`💼 You lost your ${CAREERS[d.employment].name} job while in prison.`, 'bad')
    d.employment = null
  }
  toast(`⛓️ ${reason} Sentenced to ${days} days.`, 'bad')
}

/** Held in prison awaiting trial (could not make bail). Not a conviction. */
function remand(d: GameState) {
  enterPlace(d, 'police')
  d.activity = {
    uid: d.nextId++, defId: 'remand', label: 'On remand awaiting trial', icon: '⛓️', kind: 'jail', ctx: { dest: 'police' },
    total: LEGAL.courtDays * 1440, done: 0, scale: LEGAL.jailScale, needs: { fun: -20, social: -15, hygiene: -15, energy: 15, hunger: 15 }, appliedFrac: 0,
    reward: 0, skillXp: {}, careerXp: 0, cost: 0, startedAt: d.minutes,
  }
}

function hospitalize(d: GameState, why: string) {
  const bill = d.health.nhis ? HEALTH.wardNhis : HEALTH.ward
  spend(d, bill, 'Hospital bill (ward)', 'service')
  enterPlace(d, 'hospital')
  d.activity = {
    uid: d.nextId++, defId: 'ward', label: 'Admitted at Korle Bu', icon: '🏥', kind: 'hospital', ctx: { dest: 'hospital' },
    total: 1440, done: 0, scale: 240, needs: { energy: 60, hunger: 30, hygiene: 30, fun: -10 }, appliedFrac: 0,
    reward: 0, skillXp: {}, careerXp: 0, cost: bill, startedAt: d.minutes, effect: 'ward',
  }
  toast(`🏥 ${why} You were admitted to Korle Bu (${formatMoney(bill)}).`, 'bad')
}

export const loanLimit = (s: Pick<GameState, 'credit'>) => Math.round((LOAN.baseLimit + s.credit * LOAN.perCredit) / 10) * 10

const HOOKUP_GIRLS = ['Akua', 'Adjoa', 'Esi', 'Afia', 'Dzifa', 'Naa', 'Ekua', 'Abla', 'Efia', 'Selasie']
const HOOKUP_GUYS = ['Kwabena', 'Kojo', 'Kwame', 'Edem', 'Fiifi', 'Nii', 'Kweku', 'Selasi', 'Yaw Boakye', 'Ato']

/** Shared consequences of a night together: protection, infection risk, and being found out. */
function afterIntimacy(d: GameState, lines: string[], riskNoCondom: number) {
  const protectedSex = d.items.condoms > 0
  if (protectedSex) {
    d.items = { ...d.items, condoms: d.items.condoms - 1 }
    lines.push(`🛡️ Used protection (${d.items.condoms} left).`)
  } else lines.push('⚠️ No protection used.')
  if (!d.health.illness && Math.random() < (protectedSex ? 0.01 : riskNoCondom)) {
    d.health = { ...d.health, illness: 'sti', mild: false, since: d.minutes }
    lines.push('🦠 A few days later you feel unwell. See a doctor.')
  }
  const pid = d.romance.partner
  if (pid && Math.random() < 0.3) {
    addFriendship(d, pid, -40)
    lines.push(`💔 ${NPC_BY_ID[pid].name} found out and ended things.`)
    lifeEvent(d, 'breakup')
    d.romance = { partner: null, stage: null, dates: 0, ring: d.romance.ring, askedDay: dayOf(d.minutes) }
  }
}

/** Begin the next passenger trip of a driving shift. */
function startTrip(d: GameState) {
  if (!d.drive) return
  const v = VEHICLES[d.drive.vehicle]
  const here = { x: d.player.x, z: d.player.z }
  const options = Object.values(DEST_BY_ID).filter((x) => {
    const t = Math.hypot(x.door.x - here.x, x.door.z - here.z)
    return t > 25 && t < 95
  })
  const to = options[Math.floor(Math.random() * options.length)] ?? DEST_BY_ID.market
  const path = roadRoute(d.player.x, d.player.z, to.door.x, to.door.z)
  let len = 0
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z)
  const km = len * 0.12
  const fare = Math.round(v.base + v.payPerKm * km)
  const minutes = Math.round(4 + km * (v.id === 'okada' ? 1.2 : v.id === 'trotro' ? 2.6 : 1.6))
  runtime.ride = { mode: v.ride, path, driver: true }
  d.activity = {
    uid: d.nextId++, defId: `drive:${v.id}`, label: `${v.emoji} Passenger to ${to.name}`, icon: v.emoji, kind: 'travel', ctx: { ride: v.ride, drive: true },
    total: minutes, done: 0, scale: minutes / Math.min(16, Math.max(6, len / 6.5)), needs: { energy: -5, fun: 2, social: 3 },
    appliedFrac: 0, reward: fare, skillXp: { communication: 2 }, careerXp: 0, cost: 0, travelTo: to.id, startedAt: d.minutes,
  }
  cancelPath()
}

function squadMembers(d: GameState) {
  return NPCS.filter((n) => friendPoints(d, n.id) >= 15).map((n) => n.id)
}

const BANTER = [
  'Who dey go Labadi this weekend? 🏖️',
  'Charley the traffic at Circle today 😩',
  'Ghana jollof > everything. No debate 🍛',
  'Dumsor again in my area 🕯️',
  'Who wants kelewele? I am buying 😋',
  'Black Stars play tonight ⚽🇬🇭',
  'Payday vibes 💸',
  'Rain don come, stay safe o 🌧️',
]
const REPLIES: Record<number, string[]> = {
  0: ['I dey o! You? 😄', 'Fine fine. How far?', 'Hey hey! 👋'],
  1: ['Sure! Where?', 'Let’s do Labadi 🏖️', 'If you’re buying 😂'],
  2: ['Come out then! 😄', 'Go and dance small 💃', 'Me too o'],
  3: ['Anytime! 🙏', 'You are welcome 💛', 'Ah, it’s nothing'],
  4: ['😂😂😂', 'Stop it 🤣', 'You dey craze 😂'],
  5: ['Good morning! ☀️', 'Morning o, have a blessed day', 'Mornin’ 😴'],
}
/** Keyword replies for free-text chat. First match wins. */
const KEYWORD_REPLIES: [RegExp, string[]][] = [
  [/\b(thank|thanks|tnx|medaase|medase)\b/i, ['Anytime! 🙏', 'You are welcome 💛', 'No wahala 👊🏾']],
  [/how (are|r) (you|u)|how far|how body|wassup|what'?s up/i, ['I dey fine o, you? 😄', 'By His grace 🙏 You?', 'Chilling small. You?']],
  [/where (are|r) (you|u)|wya|where you dey/i, ['I dey house 🏠', 'Stuck in traffic at Circle 😩', 'At work. Talk later?']],
  [/\b(hi|hello|hey|yo|hiya|morning|evening|afternoon)\b/i, ['Hey hey! 👋', 'Chale! How far?', 'Hello o 😄']],
  [/\b(money|borrow|loan|momo|cash|cedis|pay)\b/i, ['Charley money no dey 😩', 'Hmm, how much? 👀', 'Payday no reach yet o', 'Send me your MoMo, I go check 😂']],
  [/\b(love|miss|date|cute|babe|baby|darling|kiss)\b/i, ['Awww 🥰', 'Stop making me blush 🙈', 'Haha you dey try 😏']],
  [/\b(food|chop|eat|hungry|waakye|jollof|kenkey|banku|kelewele|fufu)\b/i, ['Waakye with shito 🤤', 'I am hungry too 😩', 'Let’s go to the chop bar!', 'Ghana jollof is life 🍛']],
  [/\b(party|club|show|concert|dance|vibe|turn up|night out)\b/i, ['I am in! 🔥', 'Labadi this Friday? 🎶', 'Who is performing? 👀']],
  [/\b(work|job|boss|shift|office|hustle)\b/i, ['Work is hard o 😮‍💨', 'Hustle no dey stop 💪🏾', 'My boss dey worry me 😂']],
  [/\b(sad|bored|tired|stress|vex)\b/i, ['Sorry o 🫂', 'Come out, let’s chill', 'Take it easy 🙏']],
  [/\b(lol|haha|lmao|😂|🤣)/i, ['😂😂😂', 'You dey craze 🤣', 'Stop it 😂']],
  [/\?\s*$/, ['Hmm, let me think 🤔', 'Maybe o 😄', 'Ask me again later 😂', 'Why do you ask? 👀']],
]
const FLIRTY = ['Miss you 💛', 'Thinking about you 😘', 'Come and see me 🥰', 'You make me smile 💕']
const GENERIC = ['👍', 'Haha okay', 'Sure sure', 'Ehen 😄', 'True talk', 'I hear you 👂🏾']

function chatReply(d: GameState, who: string, text: string): string {
  const npc = NPC_BY_ID[who]
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
  if (d.romance.partner === who && Math.random() < 0.4) return pick(FLIRTY)
  const qi = QUICK_MESSAGES.indexOf(text)
  if (qi >= 0 && REPLIES[qi]) return pick([...REPLIES[qi], ...(Math.random() < 0.2 ? npc?.chat ?? [] : [])])
  const hit = KEYWORD_REPLIES.find(([re]) => re.test(text))
  if (hit) return pick(hit[1])
  return pick([...GENERIC, ...(npc?.chat ?? [])])
}

/** Members who can answer in a chat thread. */
function chatMembers(d: GameState, chatId: string): string[] {
  if (chatId === 'squad') return squadMembers(d)
  const g = d.groups[chatId]
  if (g) return g.members
  return NPC_BY_ID[chatId] ? [chatId] : []
}

const WELCOME = ['Thanks for adding me 🙌', 'Ei, group chat! 😂', 'Hello everyone 👋', 'Who else is here? 👀']

export const QUICK_MESSAGES = ['Hey! How far? 👋', 'Let’s hang out this weekend', 'I’m bored 😩', 'Thank you for everything 🙏', '😂😂😂', 'Good morning ☀️']

/** Display name for a rent-out key. */
export function rentOutName(key: string) {
  return key.startsWith('plot:') ? DEST_BY_ID[key.slice(5)]?.name ?? 'House' : HOMES[key as HomeTier]?.name ?? key
}

/** Whether a property can be let right now: you own it, it is finished and you do not live there. */
export function canRentOut(s: Pick<GameState, 'owned' | 'plots' | 'housing'>, key: string): boolean {
  if (key.startsWith('plot:')) {
    const id = key.slice(5)
    const p = s.plots[id]
    if (!p?.owned || p.stage < projectStages(p.project).length || !RENT_OUT.house[p.project ?? 'bungalow']) return false
    return !(s.housing.tier === 'house' && s.housing.plotId === id)
  }
  const t = key as HomeTier
  return t !== 'house' && t in HOMES && s.owned.includes(t) && s.housing.tier !== t
}

/** Daily rent range for a property you could let. */
export function rentOutRange(s: Pick<GameState, 'plots' | 'upgrades'>, key: string): [number, number] {
  if (key.startsWith('plot:')) return RENT_OUT.house[s.plots[key.slice(5)]?.project ?? 'bungalow'] ?? [0, 0]
  const t = key as HomeTier
  const v = Math.round(HOMES[t].rent * RENT_OUT.homeShare * (1 + 0.15 * extCount(s.upgrades[t])))
  return [v, v]
}

/** Who you owe rent to: the compound landlady for a basic room, the letting agent otherwise. */
export function landlordName(s: Pick<GameState, 'housing'>): string {
  if (s.housing.tier !== 'room') return 'The letting agent'
  return ROOM_LANDLORD[s.housing.roomDest ?? 'home_room'] ?? 'Your landlady'
}

/** Thrown out of the basic room: the landlady keeps belongings to cover the debt; you sleep rough until you rent again. */
function evictFromRoom(d: GameState, owed: number) {
  const who = landlordName(d)
  lifeEvent(d, 'evicted')
  repositionFurniture(d)
  // most valuable things go first until the debt is covered
  const items = [...d.inventory].sort((a, b) => FURNITURE[b.type].price - FURNITURE[a.type].price)
  const kept: string[] = []
  let covered = 0
  for (const it of items) {
    if (covered >= owed) break
    covered += Math.round(FURNITURE[it.type].price * SELL_BACK.furniture)
    kept.push(FURNITURE[it.type].name)
    d.inventory = d.inventory.filter((o) => o.uid !== it.uid)
  }
  d.housing = { ...d.housing, homeless: true, overdueSince: null, nextRentDue: d.minutes + 365 * 1440 }
  d.view = 'world'
  d.insideDest = null
  const door = DEST_BY_ID[homeDestId(d)].door
  d.player = { x: door.x + 0.5, z: door.z + 0.5, rot: 0 }
  teleport(d.player.x, d.player.z)
  showResult(d, 'Evicted!', '🧳', [
    `🚪 ${who} changed the locks. You have nowhere to live.`,
    kept.length ? `📦 Kept to cover your debt: ${kept.join(', ')}.` : '📦 You had nothing worth keeping. Your bag is on the street.',
    '🪑 Sleep on a park bench or the beach, or pay for a guest house.',
    '🏠 Rent a room again from Home → Move in.',
  ], 'bad')
}

/** Daily tenant life: late rent, damage, and leaving on the agreed date. Returns rent collected. */
function tenantDay(d: GameState, rand: (r: [number, number]) => number): number {
  let total = 0
  for (const key of d.rentedOut) {
    const t = { ...(d.tenants[key] ?? {}) }
    const name = rentOutName(key)
    if (t.until !== undefined) {
      if (d.minutes >= t.until) {
        d.rentedOut = d.rentedOut.filter((k) => k !== key)
        const { [key]: _gone, ...rest } = d.tenants
        void _gone
        d.tenants = rest
        toast(t.court ? `⚖️ Bailiffs removed the tenants from ${name}. It is empty again.` : `🔑 Your tenants handed back the keys to ${name}.`, 'info')
      }
      continue
    }
    const got = rentOutIncome(d, key, rand)
    if (!got) continue
    if (Math.random() < 0.1) {
      t.owed = (t.owed ?? 0) + got
      toast(`🏠 Tenants at ${name} are late with rent. They owe ${formatMoney(t.owed)}.`, 'warn')
    } else {
      const pay = got + (t.owed ?? 0)
      if (t.owed) toast(`🏠 Tenants at ${name} paid their arrears.`, 'good')
      t.owed = 0
      earn(d, pay, `Rent from tenants: ${name}`, 'bonus')
      total += pay
    }
    if (Math.random() < 0.04) {
      const cost = Math.round(got * (1 + Math.random() * 2))
      spend(d, cost, `Repairs: ${name}`, 'fee')
      toast(`🔧 Tenants at ${name} broke something. Repairs cost ${formatMoney(cost)}.`, 'warn')
    }
    d.tenants = { ...d.tenants, [key]: t }
  }
  return total
}

function rentOutIncome(d: GameState, key: string, rand: (r: [number, number]) => number) {
  return canRentOut(d, key) ? rand(rentOutRange(d, key)) : 0
}

function dayChange(d: GameState) {
  const day = dayOf(d.minutes)
  // business profits
  let bizTotal = 0
  for (const [id, own] of Object.entries(d.businesses)) {
    const b = BUSINESS_BY_ID[id]
    if (!b) continue
    const mult = 1 + (own.level - 1) * BIZ.upgradeIncome
    let profit = Math.round((b.income[0] + Math.random() * (b.income[1] - b.income[0])) * mult)
    if (Math.random() < BIZ.badDayChance) {
      profit = -Math.round(profit * 0.4)
      toast(`${b.emoji} Bad day at your ${b.name}: a worker stole from the till.`, 'warn')
    }
    d.businesses = { ...d.businesses, [id]: { ...own, lastProfit: profit } }
    if (profit >= 0) earn(d, profit, `Profit: ${b.name}`, 'bonus')
    else spend(d, -profit, `Loss: ${b.name}`, 'fee')
    bizTotal += profit
  }
  // rent from finished income buildings on your land
  for (const [pid, p] of Object.entries(d.plots)) {
    const proj = PROJECTS[p.project ?? 'bungalow']
    if (!p.owned || !proj.income || p.stage < projectStages(p.project).length) continue
    const got = Math.round(proj.income[0] + Math.random() * (proj.income[1] - proj.income[0]))
    earn(d, got, `${proj.name} income: ${DEST_BY_ID[pid].name}`, 'bonus')
    bizTotal += got
  }
  // tenants in homes you own
  const rand = (r: [number, number]) => Math.round(r[0] + Math.random() * (r[1] - r[0]))
  bizTotal += tenantDay(d, rand)
  // notice to quit while your own rent is overdue
  if (d.housing.overdueSince !== null && !d.housing.homeless) {
    const left = Math.max(1, Math.ceil((d.housing.overdueSince + BALANCE.rentGraceHours * 60 - d.minutes) / 60))
    const owe = HOMES[d.housing.tier].rent + BALANCE.lateFee
    toast(`📜 Notice to quit from ${landlordName(d)}: pay ${formatMoney(owe)} within ${left}h or you will be evicted.`, 'bad')
  }
  for (const t of Object.keys(d.upgrades) as HomeTier[]) {
    if (!(d.upgrades[t] ?? []).includes('flat') || !d.owned.includes(t)) continue
    const got = rand(RENT_OUT.flat)
    earn(d, got, `Rent from tenants: boys’ quarters (${HOMES[t].name})`, 'bonus')
    bizTotal += got
  }
  if (bizTotal > 0) toast(`🏪 Your businesses and buildings made ${formatMoney(bizTotal)} yesterday`, 'good')
  // bank interest
  if (d.bank.open && d.bank.balance > 0) {
    const rate = FINANCE.bankDailyRate * (friendPoints(d, 'kwesi') >= NPC_BY_ID.kwesi.perk.friendAt ? 1.5 : 1)
    const interest = Math.round(d.bank.balance * rate * 100) / 100
    if (interest >= 0.01) d.bank = { ...d.bank, balance: Math.round((d.bank.balance + interest) * 100) / 100 }
  }
  // stock prices
  const prices = { ...d.invest.prices }
  for (const st of STOCKS) {
    const hist = prices[st.id] ?? [st.start]
    const last = hist[hist.length - 1]
    const next = Math.max(0.05, last * (1 + st.drift + (Math.random() * 2 - 1) * st.vol))
    prices[st.id] = [...hist, Math.round(next * 100) / 100].slice(-30)
  }
  d.invest = { ...d.invest, prices }
  // spouse support
  if (d.romance.stage === 'married' && d.romance.partner) {
    earn(d, ROMANCE.spouseSupport, `Household support from ${NPC_BY_ID[d.romance.partner].name}`, 'bonus')
  }
  // sickness
  if (!d.health.illness) {
    const ups = d.upgrades[d.housing.tier] ?? []
    let p = 0.04 + (d.needs.hygiene < 30 ? 0.08 : 0) + (ups.includes('net') ? 0 : 0.04)
    if (d.minutes < d.health.protectedUntil) p -= 0.05
    if (Math.random() < p) {
      const ill: IllnessId = !ups.includes('net') && Math.random() < 0.55 ? 'malaria' : 'flu'
      const mild = Math.random() < 0.6
      d.health = { ...d.health, illness: ill, mild, since: d.minutes }
      toast(`${ILLNESSES[ill].emoji} You woke up with ${ILLNESSES[ill].name.toLowerCase()}${mild ? '' : ' (serious)'}. ${mild ? 'Pharmacy medicine should help.' : 'See a doctor at Korle Bu.'}`, 'bad')
    }
  }
  // new tasks
  d.today = {}
  d.tasks = { day, ids: pickTasks(d, day), done: [] }
  if (d.tutorial.done) toast(`📋 New day, new tasks! ${isSunday(day) ? 'It is Sunday.' : ''}`, 'info')
}

/** Life goals follow your life: new ones appear, finished ones pay out, irrelevant ones drop away. */
function checkGoals(d: GameState) {
  // first run (new game or an older save): fill the list quietly
  const quiet = d.lifeFlags.goalsInit === undefined
  let active = d.goalsActive.filter((id) => GOAL_BY_ID[id])
  let done = d.goals
  for (const id of [...active]) {
    const g = GOAL_BY_ID[id]
    if (g.test(d)) {
      active = active.filter((x) => x !== id)
      if (!g.repeat && !done.includes(id)) done = [...done, id]
      if (g.repeat) lifeEvent(d, `done:${id}`)
      if (g.id === 's_newjob') d.lifeFlags = Object.fromEntries(Object.entries(d.lifeFlags).filter(([k]) => k !== 'fired'))
      if (g.id === 's_lovelost') d.lifeFlags = Object.fromEntries(Object.entries(d.lifeFlags).filter(([k]) => k !== 'breakup'))
      if (g.id === 's_moveup') d.lifeFlags = Object.fromEntries(Object.entries(d.lifeFlags).filter(([k]) => k !== 'evicted'))
      d.money += g.reward
      pushTx(d, `Life goal: ${g.name}`, g.reward, 'bonus')
      if (!quiet) toast(`🏆 Life goal achieved: ${g.name} (+${formatMoney(g.reward)})`, 'good')
    } else if (g.drop?.(d)) {
      active = active.filter((x) => x !== id)
      if (!quiet) toast(`🔄 Life changed: “${g.name}” is no longer a goal.`, 'info')
    }
  }
  for (const g of GOALS) {
    if (active.includes(g.id) || (!g.repeat && done.includes(g.id)) || !goalFits(d, g)) continue
    if (g.appear && !g.appear(d)) continue
    // repeatable goals wait a little before coming back
    if (g.repeat && d.lifeFlags[`done:${g.id}`] !== undefined && d.minutes - d.lifeFlags[`done:${g.id}`] < 60) continue
    // already true the moment it would appear: count it as achieved straight away (once), but never for repeat goals
    if (g.test(d)) {
      if (g.repeat || quiet) {
        if (!g.repeat) done = [...done, g.id]
        continue
      }
    }
    active = [...active, g.id]
    if (!quiet) toast(`🎯 New life goal: ${g.name}${g.why ? `. ${g.why}` : ''}`, 'info')
  }
  d.goalsActive = active
  d.goals = done
  if (quiet) d.lifeFlags = { ...d.lifeFlags, goalsInit: d.minutes }
}

function timeEffects(d: GameState, prev: number) {
  const now = d.minutes
  if (dayOf(now) !== dayOf(prev)) dayChange(d)
  // construction and permits on every plot
  for (const [pid, p] of Object.entries(d.plots)) {
    if (p.permit === 'pending' && p.permitReady !== null && now >= p.permitReady) {
      d.plots[pid] = { ...p, permit: 'approved', permitReady: null }
      toast(`📜 Building permit approved for ${DEST_BY_ID[pid].name}.`, 'good')
    }
    const q = d.plots[pid]
    if (q.until !== null && now >= q.until) {
      const stage = q.stage + 1
      const stages = projectStages(q.project)
      const proj = PROJECTS[q.project ?? 'bungalow']
      d.plots[pid] = { ...q, stage, until: null }
      if (stage >= stages.length) {
        if (proj.livable) {
          if (!d.owned.includes('house')) d.owned = [...d.owned, 'house']
          toast(`${proj.emoji} Your ${proj.name.toLowerCase()} at ${DEST_BY_ID[pid].name} is complete! Move in from the plot.`, 'good')
        } else toast(`${proj.emoji} Your ${proj.name.toLowerCase()} at ${DEST_BY_ID[pid].name} is open! It earns ${formatMoney(proj.income![0])}–${formatMoney(proj.income![1])} a day.`, 'good')
      } else {
        toast(`🏗️ ${stages[stage - 1].name} finished at ${DEST_BY_ID[pid].name}.`, 'good')
        if (q.noPermit && q.permit !== 'approved' && !d.event && Math.random() < PERMIT.noPermitRisk) d.event = { id: 'demolition', ctx: { plot: pid } }
      }
    }
  }
  // land guards show up when you visit contested land
  if (!d.event && !d.activity && d.view === 'world' && d.nearDest && d.plots[d.nearDest]?.guards === 'active') {
    d.event = { id: 'landguards', ctx: { plot: d.nearDest } }
  }
  // MoMo quick loan: auto-collect on the due date, penalties after
  if (d.loan && now >= d.loan.due) {
    const pay = Math.min(d.money, d.loan.owed)
    if (pay > 0) {
      spend(d, pay, 'QwikCash loan repayment (auto)', 'fee')
      d.loan = { ...d.loan, owed: Math.round((d.loan.owed - pay) * 100) / 100 }
    }
    if (d.loan.owed <= 0.009) {
      d.loan = null
      d.credit = Math.min(100, d.credit + 8)
      toast('✅ QwikCash loan repaid. Your credit limit grew.', 'good')
    } else if (Math.floor(now / 1440) !== Math.floor(prev / 1440) || prev < d.loan.due) {
      if (prev < d.loan.due) {
        d.credit = Math.max(0, d.credit - 15)
        toast(`⚠️ QwikCash: ${formatMoney(d.loan.owed)} overdue. 1% penalty per day until repaid.`, 'bad')
      } else {
        d.loan = { ...d.loan, owed: Math.round(d.loan.owed * (1 + LOAN.lateDaily) * 100) / 100 }
        d.credit = Math.max(0, d.credit - 2)
      }
    }
  }
  // T-bills
  if (d.invest.tbills.some((t) => now >= t.matures)) {
    let back = 0
    const keep = d.invest.tbills.filter((t) => {
      if (now < t.matures) return true
      back += Math.round(t.amount * (1 + FINANCE.tbillReturn) * 100) / 100
      return false
    })
    d.invest = { ...d.invest, tbills: keep }
    d.bank = { ...d.bank, balance: Math.round((d.bank.balance + back) * 100) / 100 }
    toast(`📈 T-bill matured: ${formatMoney(back)} paid into your bank account.`, 'good')
  }
  // court date missed
  if (d.legal.caseDeadline !== null && now > d.legal.caseDeadline && !d.activity) {
    sendToJail(d, LEGAL.jailWarrant, 'You missed your court date. A bench warrant was issued.')
  }
  // untreated illness
  if (d.health.illness && !d.activity && now - d.health.since > HEALTH.untreatedDays * 1440) {
    hospitalize(d, `Your ${ILLNESSES[d.health.illness].name.toLowerCase()} got worse.`)
  }
  // group chat banter every 6 hours
  if (Math.floor(now / 360) !== Math.floor(prev / 360)) {
    const squad = squadMembers(d)
    if (squad.length >= 2 && Math.random() < 0.6) {
      const who = squad[Math.floor(Math.random() * squad.length)]
      addChat(d, 'squad', who, BANTER[Math.floor(Math.random() * BANTER.length)])
    }
    for (const g of Object.values(d.groups)) {
      if (!g.members.length || Math.random() > 0.35) continue
      addChat(d, g.id, g.members[Math.floor(Math.random() * g.members.length)], BANTER[Math.floor(Math.random() * BANTER.length)])
    }
  }
  checkGoals(d)
  const h = d.housing
  const rent = d.owned.includes(h.tier) || h.homeless ? 0 : HOMES[h.tier].rent
  // rent warning (owned homes and the homeless pay nothing)
  if (rent === 0) {
    h.overdueSince = null
    h.nextRentDue = Math.max(h.nextRentDue, now + 1440)
  } else if (h.overdueSince === null && now >= h.nextRentDue - BALANCE.rentWarnHours * 60 && now < h.nextRentDue && d.rentWarnedFor !== h.nextRentDue) {
    d.rentWarnedFor = h.nextRentDue
    toast(`🏠 Rent of ${formatMoney(rent)} is due tomorrow. You have ${formatMoney(d.money)}.`, d.money >= rent ? 'warn' : 'bad')
  }
  if (rent === 0) {
    /* no rent */
  } else if (now >= h.nextRentDue && h.overdueSince === null) {
    if (d.money >= rent) {
      spend(d, rent, `Rent: ${HOMES[h.tier].name}`, 'rent')
      h.nextRentDue += BALANCE.rentDays * 1440
      toast(`🏠 Rent paid: ${formatMoney(rent)}`, 'info')
    } else {
      h.overdueSince = now
      showResult(d, 'Rent overdue', '📜', [
        `${landlordName(d)} served you a notice to quit.`,
        `Pay ${formatMoney(rent)} plus a late fee within ${Math.round(BALANCE.rentGraceHours / 24)} days or you will be evicted.`,
        'Odd jobs at Makola Market and the chop bar pay quickly.',
      ], 'bad')
    }
  } else if (h.overdueSince !== null) {
    // Auntie Akosua waives the late fee for good friends (only at her own compound)
    const waived = h.tier === 'room' && (h.roomDest ?? 'home_room') === 'home_room' && friendPoints(d, 'akosua') >= NPC_BY_ID.akosua.perk.friendAt
    const fee = waived ? 0 : BALANCE.lateFee
    if (d.money >= rent + fee) {
      spend(d, rent, `Rent: ${HOMES[h.tier].name}`, 'rent')
      if (fee) spend(d, fee, 'Late rent fee', 'fee')
      h.overdueSince = null
      h.nextRentDue = Math.max(h.nextRentDue + BALANCE.rentDays * 1440, now + BALANCE.rentDays * 1440 - 3 * 1440)
      toast(`🏠 Overdue rent paid${fee ? ` with ${formatMoney(fee)} late fee` : ''}. The notice is withdrawn.`, 'good')
    } else if (now - h.overdueSince >= BALANCE.rentGraceHours * 60) {
      if (h.tier !== 'room') {
        lifeEvent(d, 'evicted')
        h.tier = 'room'
        h.overdueSince = null
        h.nextRentDue = now + BALANCE.rentDays * 1440
        repositionFurniture(d)
        d.view = 'world'
        d.insideDest = null
        const door = DEST_BY_ID[homeDestId(d)].door
        d.player = { x: door.x + 0.5, z: door.z + 0.5, rot: 0 }
        teleport(d.player.x, d.player.z)
        showResult(d, 'Evicted!', '🧳', ['🏚️ The letting agent changed the locks.', 'You moved back to a basic room. Your furniture is in storage.', `First week's rent is due in ${BALANCE.rentDays} days.`], 'bad')
      } else evictFromRoom(d, rent + fee)
    }
  }
  // closing time: staff politely show you out
  if (d.view === 'inside' && d.insideDest && !d.activity) {
    const dd = DEST_BY_ID[d.insideDest]
    if (dd.hours[1] !== 24 || dd.hours[0] !== 0) {
      if (!isOpen(dd.hours, hourOf(now))) {
        d.view = 'world'
        d.insideDest = null
        d.player = { x: dd.door.x + 0.5, z: dd.door.z + 0.5, rot: 0 }
        teleport(d.player.x, d.player.z)
        useUI.setState({ panel: 'none', selectedDest: null })
        toast(`🔒 ${dd.name} is closing. You head back outside.`, 'info')
      }
    }
  }
  // need warnings
  for (const k of Object.keys(d.needs) as NeedId[]) {
    if (d.needs[k] < BALANCE.lowNeed && !d.lowFlags[k]) {
      d.lowFlags[k] = true
      toast(`${NEED_META[k].emoji} ${NEED_META[k].label} is low (${Math.round(d.needs[k])})`, 'warn')
    } else if (d.needs[k] > 35 && d.lowFlags[k]) d.lowFlags[k] = false
  }
  // collapse
  if (!d.activity && d.needs.energy <= 0) {
    d.activity = {
      uid: d.nextId++, defId: 'collapse', label: 'Passed out from exhaustion', icon: '😵', kind: 'collapse', ctx: {},
      total: BALANCE.collapse.minutes, done: 0, scale: BALANCE.sleepMinutesPerSecond, needs: { energy: BALANCE.collapse.energyRestored, hunger: -10 },
      appliedFrac: 0, reward: 0, skillXp: {}, careerXp: 0, cost: 0, startedAt: now,
    }
    cancelPath()
    toast('😵 You were too exhausted and passed out.', 'bad')
  }
  // random events
  const crossed = Math.floor(now / BALANCE.eventCheckMinutes) !== Math.floor(prev / BALANCE.eventCheckMinutes)
  if (crossed && !d.activity && !d.event && now >= d.eventCooldownUntil && d.tutorial.step >= 4 && !useUI.getState().dialog && Math.random() < BALANCE.eventChance) {
    const hr = hourOf(now)
    const pool: { id: string; w: number }[] = []
    const inWorld = d.view === 'world'
    if (inWorld && districtAt(d.player.x, d.player.z) === 'residential' && hr >= 16 && hr < 22) pool.push({ id: 'celebration', w: EVENTS.celebration.weight })
    if (skillLevel(d, 'technology') >= 1 && hr >= 9 && hr < 20) pool.push({ id: 'freelance', w: EVENTS.freelance.weight })
    if (friendPoints(d, 'yaw') >= 15 && hr >= 10 && hr < 21) pool.push({ id: 'friend_invite', w: EVENTS.friend_invite.weight })
    if (inWorld && districtAt(d.player.x, d.player.z) === 'commercial' && hr >= 8 && hr < 19) pool.push({ id: 'market_sale', w: EVENTS.market_sale.weight })
    // known on the streets: small-time robbers leave you alone
    if (inWorld && (hr >= 20 || hr < 5) && d.money >= 60 && d.rep.street < 50) pool.push({ id: 'mugged', w: 9 })
    // known to the police: patrols stop and search you
    if (inWorld && d.legal.heat >= 25) pool.push({ id: 'police_stop', w: Math.round(d.legal.heat / 8) })
    if (d.view === 'home' && hr >= 18 && hr < 23 && !(d.upgrades[d.housing.tier] ?? []).includes('generator')) pool.push({ id: 'dumsor', w: 3 })
    if (d.romance.partner && hr >= 10 && hr < 21) pool.push({ id: 'partner_call', w: 2 })
    const total = pool.reduce((a, b) => a + b.w, 0)
    if (total > 0) {
      let r = Math.random() * total
      const pick = pool.find((p) => (r -= p.w) <= 0) ?? pool[0]
      d.event = { id: pick.id, ctx: pick.id === 'police_stop' ? { officer: rollOfficer(), offence: 'suspicion' } : {} }
      d.eventCooldownUntil = now + BALANCE.eventCooldownMinutes
    }
  }
}

function applyEffect(d: GameState, eff: EventEffect, npcFallback?: string): string[] {
  const lines: string[] = []
  if (eff.money) {
    if (eff.money < 0) spend(d, -eff.money, 'Event expense', 'service')
    else earn(d, eff.money, 'Event income', 'bonus')
    lines.push(`${eff.money < 0 ? '💸' : '💰'} ${formatMoney(Math.abs(eff.money))}`)
  }
  if (eff.needs) applyNeeds(d, eff.needs)
  if (eff.skillXp) for (const [k, v] of Object.entries(eff.skillXp) as [SkillId, number][]) addXp(d, k, v)
  if (eff.friendship) addFriendship(d, eff.friendship.npc, eff.friendship.pts)
  if (eff.minutes) advance(d, eff.minutes)
  void npcFallback
  return lines
}

/* ------------------------------------------------------------------ */

/** A random compound house in the chosen area, so new games do not all start in the same room. */
function pickRoomHome(area: string): string {
  const list = ROOM_HOMES_ALL[area] ?? []
  return list[Math.floor(Math.random() * list.length)] ?? ROOM_HOMES[area] ?? 'home_room'
}

/** Police events you cannot walk away from. */
const POLICE_EVENTS = new Set(['arrest_offer', 'police_stop', 'checkpoint'])
/** Why the player cannot go anywhere right now (an open event, custody, any activity), or null. */
export function busyReason(s: Pick<GameState, 'activity' | 'event'>): string | null {
  if (s.event) return POLICE_EVENTS.has(s.event.id) ? '👮 You cannot leave. Deal with the police first.' : 'Deal with what is happening first'
  if (s.activity?.kind === 'custody') return '🚓 You are in police custody. Wait for bail.'
  if (s.activity?.kind === 'jail') return '⛓️ You are serving a prison sentence.'
  if (s.activity) return 'Finish your current activity first'
  return null
}

export const useGame = create<GameState>((set, get) => ({
  screen: 'menu',
  nearDest: null,
  ...freshGame(null),

  startNewGame: (profile, start = { lifestyle: 'worker', area: 'nima' }) => {
    const g = freshGame({ ...profile, lifestyle: start.lifestyle })
    const life = LIFESTYLES[start.lifestyle]
    g.money = life.money
    g.housing = { tier: life.tier, nextRentDue: g.minutes + BALANCE.rentDays * 1440 * life.prepaidWeeks, overdueSince: null, roomDest: pickRoomHome(start.area) }
    if (start.lifestyle === 'hustler') g.skills = { ...g.skills, fitness: 30, communication: 30 }
    if (start.lifestyle === 'dadaba') {
      g.vehicles = ['car']
      g.license = true
    }
    const home = DEST_BY_ID[homeDestId(g)]
    g.player = { x: home.door.x + 0.5, z: home.door.z + 0.5, rot: 0 }
    teleport(g.player.x, g.player.z)
    runtime.cam.zoom = defaultZoom()
    set({ ...g, screen: 'game', nearDest: home.id })
    useUI.setState({ panel: 'none', selectedDest: null, editMode: false, holdingUid: null, dialog: null, paused: false, trackedDest: null, toasts: [], inbox: [], unread: 0 })
    const where = AREA_BY_ID[home.area]?.name ?? 'Accra'
    toast(`Akwaaba to ${where}, ${profile.name}! ${start.lifestyle === 'dadaba' ? 'Your parents set you up nicely.' : start.lifestyle === 'hustler' ? 'Time to hustle.' : ''} Follow the objective to get started.`, 'good')
  },

  loadFromSave: (saved) => {
    teleport(saved.player.x, saved.player.z)
    set({ ...saved, screen: 'game', nearDest: null })
    useUI.setState({ panel: saved.view === 'home' ? 'home' : saved.view === 'inside' ? 'building' : 'none', selectedDest: saved.view === 'inside' ? saved.insideDest : null, editMode: false, holdingUid: null, dialog: null, paused: false, trackedDest: null, toasts: [] })
    get().syncPlayer()
    toast('Welcome back! Your progress was restored.', 'good')
  },

  toMenu: () => {
    cancelPath()
    set({ screen: 'menu' })
    useUI.setState({ panel: 'none', selectedDest: null, dialog: null })
  },

  updateAppearance: (a) => {
    const p = get().profile
    if (p) set({ profile: { ...p, appearance: a } })
  },

  syncPlayer: () => {
    const s = get()
    const p = runtime.player
    let near: string | null = null
    if (s.view === 'world') {
      let best = BALANCE.doorRadius
      for (const dd of Object.values(DEST_BY_ID)) {
        const dist = Math.hypot(p.x - (dd.door.x + 0.5), p.z - (dd.door.z + 0.5))
        if (dist <= best) { best = dist; near = dd.id }
      }
    } else near = s.nearDest
    if (s.view === 'home') near = s.viewing ? HOME_DEST[s.viewing] : homeDestId(s)
    if (s.view === 'inside') near = s.insideDest
    const moved = Math.abs(s.player.x - p.x) > 0.01 || Math.abs(s.player.z - p.z) > 0.01
    if (moved || near !== s.nearDest) {
      const d = draft(s)
      d.player = { x: p.x, z: p.z, rot: p.rot }
      d.nearDest = near
      checkTutorial(d)
      set({ player: d.player, nearDest: d.nearDest, tutorial: d.tutorial })
    }
  },

  tick: (dt) => {
    const s0 = get()
    if (s0.screen !== 'game') return
    const ui = useUI.getState()
    if (ui.paused || ui.panel === 'settings' || s0.event || ui.dialog) return
    const d = draft(s0)
    const prev = d.minutes
    if (d.activity) {
      const a = { ...d.activity }
      // rides wait at red lights: the trip pauses but the clock keeps running
      const held = a.kind === 'travel' && !!runtime.ride?.holding
      const add = held ? 0 : Math.min(a.total - a.done, dt * a.scale)
      if (held) advance(d, dt * BALANCE.clockMinutesPerSecond)
      a.done += add
      const frac = a.done / a.total
      applyNeeds(d, a.needs, frac - a.appliedFrac)
      a.appliedFrac = frac
      d.minutes += add
      d.activity = a.shift ? stepShift(d, a) : a
      if (d.activity && d.activity.done >= d.activity.total - 1e-6) finishActivity(d)
    } else {
      advance(d, dt * BALANCE.clockMinutesPerSecond)
    }
    timeEffects(d, prev)
    set(d)
  },

  startActivity: (defId, ctx) => {
    const s = get()
    const def = findDef(s, defId, ctx)
    if (!def) return { ok: false, reason: 'Unknown activity' }
    const r = resolve(def, ctx, s)
    if (!r.ok) {
      toast(r.reason ?? 'Not available right now', 'warn')
      return { ok: false, reason: r.reason }
    }
    const d = draft(s)
    if (r.cost > 0) {
      const cat: TxCategory = def.kind === 'meal' ? 'food' : def.kind === 'travel' ? 'transport' : 'service'
      spend(d, r.cost, def.label, cat)
    }
    if (def.dailyLimit) d.daily[def.id] = { day: dayOf(d.minutes), n: dailyUsed(s, def.id) + 1 }
    d.activity = makeActivity(d, def, ctx, r)
    cancelPath()
    set(d)
    // fold the place/home sheet away so the player can watch the activity (tap the place or Home to reopen)
    const ui = useUI.getState()
    if (ui.panel === 'building' || ui.panel === 'home') useUI.setState({ panel: 'none', selectedFurniture: null })
    return { ok: true }
  },

  cancelActivity: () => {
    const s = get()
    if (!s.activity) return
    if (['travel', 'collapse', 'custody', 'jail', 'hospital'].includes(s.activity.kind)) return
    const d = draft(s)
    const a = d.activity!
    d.activity = null
    if (a.shift && a.shift.earned + a.shift.tips > 0 && !CAREERS[a.ctx.career!]?.illegal) {
      const got = a.shift.earned + a.shift.tips
      earn(d, got, `Part shift: ${a.label.replace('Work shift: ', '')}`, 'wage')
      showResult(d, 'You left work early', a.icon, [`💰 Paid ${formatMoney(got)} for ${a.shift.done} tasks done.`, 'No base pay or career XP for a part shift.'], 'neutral')
    } else showResult(d, `${a.label} stopped early`, a.icon, [`Partial effects kept. No wages, XP or refunds.`], 'neutral')
    set(d)
  },

  buyBusiness: (id) => {
    const s = get()
    const b = BUSINESS_BY_ID[id]
    if (!b || s.businesses[id]) return
    if (s.nearDest !== 'realty') return toast('Buy businesses in person at Accra Realty', 'warn')
    if (s.money < b.price) return toast(`Need ${formatMoney(b.price - s.money)} more for the ${b.name}`, 'warn')
    const d = draft(s)
    const dirtyMsg = needClean(d, b.price)
    if (dirtyMsg) return toast(dirtyMsg, 'warn')
    spend(d, b.price, `Bought business: ${b.name}`, 'purchase', true)
    d.businesses = { ...d.businesses, [id]: { level: 1, paid: b.price, since: d.minutes, lastProfit: 0 } }
    toast(`${b.emoji} You now own the ${b.name}! Profit lands in your wallet every morning.`, 'good')
    set(d)
  },

  upgradeBusiness: (id) => {
    const s = get()
    const b = BUSINESS_BY_ID[id]
    const own = s.businesses[id]
    if (!b || !own || own.level >= BIZ.maxLevel) return
    const cost = Math.round(b.price * BIZ.upgradeCost)
    if (s.money < cost) return toast(`Need ${formatMoney(cost - s.money)} more to upgrade`, 'warn')
    const d = draft(s)
    const dirtyMsg = needClean(d, cost)
    if (dirtyMsg) return toast(dirtyMsg, 'warn')
    spend(d, cost, `Upgrade: ${b.name}`, 'purchase', true)
    d.businesses = { ...d.businesses, [id]: { ...own, level: own.level + 1, paid: own.paid + cost } }
    toast(`${b.emoji} ${b.name} upgraded to level ${own.level + 1}. More customers!`, 'good')
    set(d)
  },

  sellBusiness: (id) => {
    const s = get()
    const b = BUSINESS_BY_ID[id]
    const own = s.businesses[id]
    if (!b || !own) return
    const d = draft(s)
    const got = Math.round(own.paid * BIZ.sellBack)
    earn(d, got, `Sold business: ${b.name}`, 'bonus')
    const next = { ...d.businesses }
    delete next[id]
    d.businesses = next
    toast(`${b.emoji} Sold the ${b.name} for ${formatMoney(got)}`, 'info')
    set(d)
  },

  doShiftTask: (taskId) => {
    const s = get()
    const a = s.activity
    if (!a?.shift) return
    if (a.shift.current) return toast(`Finish "${a.shift.current.label}" first`, 'warn')
    const t = a.shift.queue.find((q) => q.id === taskId)
    if (!t) return
    const shift: ShiftState = { ...a.shift, queue: a.shift.queue.filter((q) => q.id !== taskId), current: { ...t, startedAt: a.done, until: a.done + SHIFT.doing * a.scale } }
    set({ activity: { ...a, shift } })
  },

  dismissResult: () => set({ result: null }),

  launder: (method, amount, bizId) => {
    const s = get()
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    amount = Math.floor(Math.min(amount, s.dirty))
    if (amount <= 0) return toast('You have no dirty cash to launder', 'info')
    const d = draft(s)
    const day = dayOf(d.minutes)
    if (method === 'business') {
      const b = bizId ? BUSINESS_BY_ID[bizId] : undefined
      const own = bizId ? d.businesses[bizId] : undefined
      if (!b || !own) return toast('You need to own that business', 'warn')
      const cap = launderCap(d, bizId!)
      if (cap <= 0) return toast(`The ${b.name} till cannot take any more today. Try tomorrow.`, 'warn')
      amount = Math.min(amount, cap)
      const fee = Math.round(amount * LAUNDER.business.fee)
      spend(d, fee, `Laundering costs: ${b.name}`, 'fee')
      d.dirty = Math.max(0, d.dirty - amount + fee)
      d.dirty = Math.min(d.dirty, d.money)
      const prev = d.laundered[bizId!]
      d.laundered = { ...d.laundered, [bizId!]: { day, amount: (prev?.day === day ? prev.amount : 0) + amount } }
      if (Math.random() < LAUNDER.business.auditChance) {
        const fine = Math.round(amount * LAUNDER.business.auditFine)
        spend(d, Math.min(fine, d.money), `GRA tax audit: ${b.name}`, 'fee')
        d.legal.heat = Math.min(100, d.legal.heat + 10)
        addRep(d, 0, -5)
        showResult(d, 'Tax audit!', '🧾', [`The Ghana Revenue Authority questioned the ${b.name} books.`, `💸 Fined ${formatMoney(fine)}. People are talking.`], 'bad')
      } else toast(`🧼 ${formatMoney(amount - fee)} now clean, booked as ${b.name} sales (fee ${formatMoney(fee)}).`, 'good')
    } else {
      const here = d.view === 'inside' ? d.insideDest : d.nearDest
      if (here !== LAUNDER.forex.dest) return toast('The forex boys work at Makola Market. Go there.', 'warn')
      amount = Math.min(amount, LAUNDER.forex.max)
      if (Math.random() < LAUNDER.forex.stingChance + d.legal.heat / 500) {
        // undercover sting: the cash is taken and you are arrested
        d.money -= amount
        d.dirty -= amount
        pushTx(d, 'Seized in a police sting', -amount, 'fee')
        showResult(d, 'Police sting!', '🚨', ['The “forex boy” was an undercover officer.', `👮 ${formatMoney(amount)} seized as evidence.`], 'bad')
        d.event = { id: 'arrest_offer', ctx: { officer: rollOfficer(), offence: 'laundering' } }
      } else {
        const rate = d.rep.street >= 40 ? LAUNDER.forex.streetFee : LAUNDER.forex.fee
        const fee = Math.round(amount * rate)
        spend(d, fee, 'Forex boys commission', 'fee')
        d.dirty = Math.max(0, Math.min(d.dirty - amount + fee, d.money))
        d.legal.heat = Math.min(100, d.legal.heat + 5)
        toast(`💱 Swapped through the forex boys: ${formatMoney(amount - fee)} clean (commission ${formatMoney(fee)}).`, 'good')
      }
    }
    set(d)
  },

  applyForJob: (career) => {
    const s = get()
    const c = CAREERS[career]
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    if (s.nearDest !== c.workplace) return toast(`Walk to ${DEST_BY_ID[c.workplace].name} to apply`, 'warn')
    if (s.employment === career) return toast('You already work here', 'info')
    const prog = s.careers[career]
    const levelIdx = (prog?.level ?? 1) - 1
    const missing = missingRequirements(s, career, levelIdx)
    if (missing.length) return toast(`Not eligible yet: needs ${missing.join(', ')}`, 'warn')
    const needStreet = STREET_REQ[career] ?? 0
    if (s.rep.street < needStreet) return toast(`🕶️ They do not trust you yet. Needs street cred ${needStreet} (you have ${Math.round(s.rep.street)}).`, 'warn')
    const needRespect = RESPECT_REQ[career] ?? 0
    if (s.rep.respect < needRespect) return toast(`📋 Failed the background check. Needs respect ${needRespect} (you have ${Math.round(s.rep.respect)}). Church, volunteering and honest work help.`, 'warn')
    const d = draft(s)
    d.careers[career] = prog ?? { level: 1, xp: 0, shifts: 0 }
    d.employment = career
    toast(`✅ You are now a ${c.levels[levelIdx].title} at ${DEST_BY_ID[c.workplace].name}!`, 'good')
    checkTutorial(d)
    set(d)
  },

  quitJob: () => {
    const s = get()
    if (!s.employment || s.activity) return
    toast(`You left your ${CAREERS[s.employment].name} job. Progress is saved if you return.`, 'info')
    set({ employment: null })
  },

  requestTravel: (fromDest, toDest) => {
    const s = get()
    const def = travelDef(fromDest, toDest)
    if (!def) return
    const r = resolve(def, { dest: fromDest }, s)
    if (!r.ok) return toast(r.reason ?? 'Not available', 'warn')
    if (Math.random() < BALANCE.transportDelayChance) {
      set({ event: { id: 'transport_delay', ctx: { travelTo: toDest } }, nearDest: s.nearDest })
      return
    }
    const d = draft(s)
    beginTravel(d, fromDest, toDest, 0, true)
    set(d)
  },

  chooseEvent: (i) => {
    const s = get()
    if (!s.event) return
    const def = EVENTS[s.event.id]
    const choice = def.choices[i]
    if (!choice) return
    if (choice.cost && s.money < choice.cost) return toast(`Need ${formatMoney(choice.cost - s.money)} more`, 'warn')
    const d = draft(s)
    const ctx = d.event!.ctx
    d.event = null
    const eff = choice.effect
    const lines = [eff.text, ...applyEffect(d, eff)]
    // stopped by police with a fat wad of unexplained cash
    if ((s.event.id === 'police_stop' || s.event.id === 'checkpoint') && d.dirty >= 300 && Math.random() < 0.4) {
      lines.push('🔦 The officer pats you down and finds the cash.')
      seizeDirty(d, 0.5, lines)
      d.legal.heat = Math.min(100, d.legal.heat + 10)
    }
    if (eff.custom) {
      const fit = levelFromXp(d.skills.fitness)
      if (eff.custom === 'tenant_cash' || eff.custom === 'tenant_court' || eff.custom === 'tenant_stay') {
        const key = ctx.lease ?? ''
        const name = rentOutName(key)
        const t = d.tenants[key] ?? {}
        const weekly = rentOutRange(d, key)[1] * 7
        if (eff.custom === 'tenant_cash') {
          const pay = weekly * 2
          if (d.money < pay) lines.push(`You need ${formatMoney(pay)} for cash for keys. They stay for now.`)
          else {
            spend(d, pay, `Cash for keys: ${name}`, 'fee')
            d.tenants = { ...d.tenants, [key]: { until: d.minutes + 1440 } }
            lines.push(`💸 Paid ${formatMoney(pay)}. They will be out of ${name} by tomorrow. Unpaid rent is forgiven.`)
          }
        } else if (eff.custom === 'tenant_court') {
          if (d.money < 350) lines.push('You cannot afford the GH₵350 court fee. They stay for now.')
          else {
            spend(d, 350, `Rent tribunal: ${name}`, 'fee')
            d.tenants = { ...d.tenants, [key]: { ...t, until: d.minutes + 4 * 1440, court: true } }
            lines.push(`⚖️ The tribunal granted an eviction order. Bailiffs remove them from ${name} on Day ${dayOf(d.minutes + 4 * 1440)}.`)
            if (t.owed) lines.push(`🧾 Their ${formatMoney(t.owed)} of unpaid rent is written off.`)
          }
        } else lines.push(`🏠 The lease on ${name} continues.`)
      } else if (eff.custom === 'mug_hand') {
        const lost = Math.round(d.money * 0.4)
        spend(d, lost, 'Robbed at night', 'fee')
        lines.push(`💸 You lost ${formatMoney(lost)}. Keep savings in the bank.`)
      } else if (eff.custom === 'mug_run') {
        if (Math.random() < 0.5 + fit * 0.05) lines.push('🏃 You escaped into a busy street!')
        else {
          const lost = Math.round(d.money * 0.6)
          spend(d, lost, 'Robbed at night', 'fee')
          lines.push(`💸 They caught you and took ${formatMoney(lost)}.`)
        }
      } else if (eff.custom?.startsWith('guards_') && ctx.plot && d.plots[ctx.plot]) {
        const p = d.plots[ctx.plot]
        const price = PLOT_BY_ID[ctx.plot]?.price ?? 5000
        if (eff.custom === 'guards_pay') {
          const cost = Math.round(price * GUARDS.settleShare)
          if (d.money < cost) { lines.push(`You only have ${formatMoney(d.money)}. They laugh and stay.`) }
          else { spend(d, cost, 'Land guards: settlement', 'fee'); d.plots[ctx.plot] = { ...p, guards: 'settled' }; lines.push(`💸 Paid ${formatMoney(cost)}. They shake your hand and leave.`) }
        } else if (eff.custom === 'guards_police') {
          const cost = Math.round(price * GUARDS.policeShare)
          if (d.money < cost) lines.push('You cannot afford to “motivate” the police.')
          else {
            spend(d, cost, 'Police “mobilisation fee”', 'fee')
            d.legal.heat = Math.min(100, d.legal.heat + 5)
            if (Math.random() < GUARDS.policeChance) { d.plots[ctx.plot] = { ...p, guards: 'settled' }; lines.push('🚓 A police pickup arrived. The land guards scattered.') }
            else lines.push('🚓 The police came, chatted with the guards… and left. They are still there.')
          }
        } else if (eff.custom === 'guards_report') {
          if (Math.random() < GUARDS.reportChance) { d.plots[ctx.plot] = { ...p, guards: 'settled' }; lines.push('📄 Your official complaint worked. The guards were arrested.') }
          else lines.push('📄 Your complaint is “being processed”. The guards are still there.')
        } else if (eff.custom === 'guards_fight') {
          const fit = levelFromXp(d.skills.fitness)
          if (Math.random() < 0.25 + fit * 0.07) { d.plots[ctx.plot] = { ...p, guards: 'settled' }; lines.push('🥊 You stood your ground. They will not be back.') }
          else { d.health = { ...d.health, illness: 'injury', mild: false, since: d.minutes }; lines.push('🤕 There were too many of them. You are badly hurt.') }
        }
      } else if (eff.custom === 'demo_pay' && ctx.plot && d.plots[ctx.plot]) {
        if (d.money >= PERMIT.demolitionFine) {
          spend(d, PERMIT.demolitionFine, 'AMA fine: no building permit', 'fee')
          d.plots[ctx.plot] = { ...d.plots[ctx.plot], permit: 'approved', noPermit: false }
          lines.push('🧾 Fine paid. Your building is now regularised.')
        } else {
          d.plots[ctx.plot] = { ...d.plots[ctx.plot], stage: 0, until: null }
          lines.push('🚜 You could not pay. The task force demolished your building.')
        }
      } else if (eff.custom === 'demo_ignore' && ctx.plot && d.plots[ctx.plot]) {
        if (Math.random() < 0.5) lines.push('😅 Nobody came back. Lucky… for now.')
        else { d.plots[ctx.plot] = { ...d.plots[ctx.plot], stage: 0, until: null }; lines.push('🚜 The bulldozers came at dawn. Your building is gone.') }
      } else if (eff.custom === 'arrest_bribe' || eff.custom === 'cp_bribe' || eff.custom === 'stop_bribe') {
        const off = ctx.officer ?? 'cautious'
        const cost = eff.custom === 'arrest_bribe' ? 150 : eff.custom === 'cp_bribe' ? DRIVING.bribe : 40
        const odds = OFFICERS[off].accept + (friendPoints(d, 'boateng') >= NPC_BY_ID.boateng.perk.friendAt && off !== 'honest' ? 0.1 : 0)
        if (d.money < cost) {
          lines.push('You fumble for money you do not have. The officer is not amused.')
          if (eff.custom === 'arrest_bribe') arrest(d, ctx.offence && ctx.offence in CHARGES ? (ctx.offence as keyof typeof CHARGES) : 'theft')
          else { spend(d, Math.min(d.money, 100), 'Traffic fine', 'fee'); lines.push('🧾 Fined instead.') }
        } else if (Math.random() < odds) {
          spend(d, cost, '“Something for the boys”', 'fee')
          d.legal.heat = Math.min(100, d.legal.heat + 8)
          lines.push(`🤫 ${OFFICERS[off].name} pocketed the money. “Go well, my friend.”`)
        } else {
          lines.push(`👮 ${OFFICERS[off].name}: “You want to bribe me?! You are under arrest.”`)
          arrest(d, 'bribery')
          d.legal.heat = Math.min(100, d.legal.heat + 20)
        }
      } else if (eff.custom === 'arrest_quiet') {
        arrest(d, ctx.offence && ctx.offence in CHARGES ? (ctx.offence as keyof typeof CHARGES) : 'theft')
      } else if ((eff.custom === 'hook_home' || eff.custom === 'hook_guest') && d.hookup) {
        const home = eff.custom === 'hook_home'
        if (home) {
          const hd = DEST_BY_ID[homeDestId(d)]
          d.view = 'home'
          d.viewing = null
          d.insideDest = null
          d.player = { x: hd.door.x + 0.5, z: hd.door.z + 0.5, rot: 0 }
          teleport(d.player.x, d.player.z)
          useUI.setState({ panel: 'none' })
          if (homeDestId(d) === 'home_room' && Math.random() < 0.3) {
            d.needs.social = clamp(d.needs.social - 5)
            lines.push('👵 Auntie Akosua raised an eyebrow as you walked in…')
          }
        } else enterPlace(d, 'guesthouse_osu')
        // at home you both end up on your bed
        const bed = home ? itemsInHome(d.housing.tier, d.inventory).find((it) => isBed(it.type)) : undefined
        d.activity = {
          uid: d.nextId++, defId: 'intimate', label: `Night with ${d.hookup.name}`, icon: '💞', kind: 'date', ctx: home ? (bed ? { furnitureUid: bed.id } : {}) : { dest: 'guesthouse_osu' },
          total: 240, done: 0, scale: 60, needs: { fun: 40, social: 35, energy: -15, hygiene: -10 }, appliedFrac: 0,
          reward: 0, skillXp: {}, careerXp: 0, cost: 0, startedAt: d.minutes, effect: 'intimate',
        }
      } else if (eff.custom === 'stop_fine') {
        const fine = ctx.offence === 'red light' ? 100 : ctx.offence === 'suspicion' ? 60 : 20
        spend(d, Math.min(d.money, fine), `Official fine: ${ctx.offence ?? 'traffic'}`, 'fee')
        lines.push(`🧾 Paid the official ${formatMoney(fine)} fine. Receipt in hand.`)
      } else if (eff.custom === 'stop_argue') {
        if (Math.random() < 0.4) lines.push('🗣️ The officer sighs and waves you on.')
        else {
          const fine = (ctx.offence === 'red light' ? 100 : ctx.offence === 'suspicion' ? 60 : 20) * 2
          spend(d, Math.min(d.money, fine), `Fine (doubled): ${ctx.offence ?? 'traffic'}`, 'fee')
          lines.push(`🧾 Arguing made it worse: ${formatMoney(fine)} fine.`)
        }
      } else if (eff.custom === 'cp_papers') {
        const legal = d.drive && (d.drive.vehicle === 'okada' ? false : d.license)
        if (legal) lines.push('✅ Papers in order. Have a nice day.')
        else { spend(d, Math.min(d.money, 150), 'Traffic fine', 'fee'); lines.push(`🧾 ${d.drive?.vehicle === 'okada' ? 'Commercial okada is banned.' : 'No licence.'} Fined GH₵150.`) }
      } else if (eff.custom === 'cp_argue') {
        advance(d, 40)
        if (Math.random() < 0.5) { spend(d, Math.min(d.money, 100), 'Traffic fine', 'fee'); lines.push('🧾 Arguing cost you 40 minutes and GH₵100.') }
        else lines.push('🗣️ After 40 minutes of arguing, they let you go.')
      } else if (eff.custom === 'partner_love' && d.romance.partner) {
        addFriendship(d, d.romance.partner, 4)
      } else if (eff.custom === 'partner_snub' && d.romance.partner) {
        addFriendship(d, d.romance.partner, -3)
      } else if (eff.custom === 'mug_fight') {
        if (Math.random() < 0.3 + fit * 0.07) {
          lines.push('🥊 You fought them off! They ran away.')
          d.needs.fun = clamp(d.needs.fun + 10)
        } else {
          const lost = Math.round(d.money)
          spend(d, lost, 'Robbed at night', 'fee')
          d.health = { ...d.health, illness: 'injury', mild: Math.random() < 0.5, since: d.minutes }
          lines.push(`🤕 You lost the fight, all your cash (${formatMoney(lost)}) and got injured.`)
        }
      }
    }
    if (!d.activity && d.drive && d.drive.trips > 0 && (def.id === 'checkpoint' || def.id === 'police_stop')) {
      startTrip(d)
    } else if (ctx.travelTo) {
      const from = d.nearDest ?? 'stop_res'
      beginTravel(d, from, ctx.travelTo, eff.travelExtraMinutes ?? 0, !choice.cost)
    } else if (eff.activity) {
      const ac = eff.activity
      // invitations take you there so you watch it happen
      if (ac.dest && DEST_BY_ID[ac.dest]) enterPlace(d, ac.dest)
      d.activity = {
        uid: d.nextId++, defId: `${ac.look ?? 'event'}:${def.id}`, label: ac.label, icon: ac.icon, kind: 'event',
        ctx: ac.dest ? { dest: ac.dest, npc: ac.npc } : {},
        total: ac.minutes, done: 0, scale: BALANCE.activityMinutesPerSecond, needs: ac.needs ?? {}, appliedFrac: 0,
        reward: ac.reward ?? 0, skillXp: ac.skillXp ?? {}, careerXp: 0, cost: 0, startedAt: d.minutes,
      }
      cancelPath()
    } else {
      showResult(d, def.title, def.emoji, lines, 'neutral')
    }
    set(d)
  },

  startTalk: (npcId) => {
    const s = get()
    const npc = NPC_BY_ID[npcId]
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    if (s.nearDest !== npc.destId) return toast(`Walk to ${DEST_BY_ID[npc.destId].name} first`, 'warn')
    const f = s.friendships[npcId]
    const today = dayOf(s.minutes)
    if (f && f.talkDay === today && f.talks >= BALANCE.friendship.talksPerDay) return toast(`${npc.name} has chatted plenty today. Come back tomorrow.`, 'info')
    const topic = npc.topics[Math.floor(Math.random() * npc.topics.length)]
    useUI.setState({ dialog: { npcId, topicId: topic.id, phase: 'prompt' } })
  },

  chooseDialog: (i) => {
    const ui = useUI.getState()
    const dlg = ui.dialog
    if (!dlg || dlg.phase !== 'prompt') return
    const npc = NPC_BY_ID[dlg.npcId]
    const topic = npc.topics.find((t) => t.id === dlg.topicId)!
    const choice = topic.choices[i]
    const d = draft(get())
    const today = dayOf(d.minutes)
    const f = d.friendships[npc.id] ?? { points: 0, talkDay: 0, talks: 0 }
    const talks = f.talkDay === today ? f.talks + 1 : 1
    const before = d.friendships[npc.id]?.points ?? 0
    d.friendships[npc.id] = { ...f, talkDay: today, talks }
    addFriendship(d, npc.id, choice.friendship)
    if (choice.needs) applyNeeds(d, choice.needs)
    d.needs.social = clamp(d.needs.social + 4)
    advance(d, 20)
    d.stats.conversations++
    set(d)
    useUI.setState({ dialog: { ...dlg, phase: 'reply', reply: choice.reply, gained: Math.round((d.friendships[npc.id].points - before) * 10) / 10 } })
  },

  enterHome: () => {
    const s = get()
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    if (s.housing.homeless) return toast(`🔒 Locked out. ${landlordName(s)} evicted you. Rent a room again from Home → Move in.`, 'bad')
    if (s.nearDest !== homeDestId(s)) return toast('Walk to your home first', 'warn')
    cancelPath()
    const d = draft(s)
    d.view = 'home'
    d.viewing = null
    checkTutorial(d)
    set(d)
    useUI.setState({ panel: 'home', editMode: false, holdingUid: null, selectedFurniture: null })
  },

  exitHome: () => {
    const s = get()
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    const destId = s.viewing ? HOME_DEST[s.viewing] : homeDestId(s)
    const door = DEST_BY_ID[destId].door
    teleport(door.x + 0.5, door.z + 0.5)
    set({ view: 'world', viewing: null, nearDest: destId, player: { x: door.x + 0.5, z: door.z + 0.5, rot: 0 } })
    useUI.setState({ panel: 'none', editMode: false, holdingUid: null, selectedFurniture: null })
  },

  buyFurniture: (type, delivered = false, hold = false) => {
    const s = get()
    const def = FURNITURE[type]
    if (!delivered && s.activity) return toast('Finish your current activity first', 'warn')
    if (!delivered && s.nearDest !== 'market') return toast('Walk to Makola Market to shop', 'warn')
    const price = Math.round(def.price * priceMultiplier(s, 'market')) + (delivered ? 20 : 0)
    if (s.money < price) return toast(`Need ${formatMoney(price - s.money)} more for the ${def.name}`, 'warn')
    const d = draft(s)
    const dirtyMsg = needClean(d, price)
    if (dirtyMsg) return toast(dirtyMsg, 'warn')
    spend(d, price, `Bought ${def.name}`, 'purchase', true)
    const uid = d.nextId++
    d.inventory = [...d.inventory, { uid, type, placed: null }]
    if (hold) {
      set(d)
      useUI.setState({ holdingUid: uid, holdRot: 0, selectedFurniture: null, editMode: true })
      return toast(`${def.emoji} Tap a green spot to place the ${def.name.toLowerCase()}. R rotates.`, 'info')
    }
    toast(delivered ? `🚚 ${def.name} delivered. Drag it into place in Decorate mode.` : `🛒 Bought ${def.name}. Place it from your home's Decorate mode.`, 'good')
    set(d)
  },

  placeFurniture: (uid, x, y, rot) => {
    const s = get()
    if (uid < 0) {
      // built-in furniture (bed, toilet, shower…) moved within this home
      const tier = s.housing.tier
      const fix = HOMES[tier].fixtures[-uid - 1]
      if (!fix) return false
      const chk = canPlace(tier, s.inventory, fix.type, x, y, rot, uid, extCount(s.upgrades[tier]))
      if (!chk.ok) {
        toast(chk.reason ?? 'Cannot place here', 'warn')
        return false
      }
      const st = s.homeStyle[tier] ?? {}
      const homeStyle = { ...s.homeStyle, [tier]: { ...st, fixtures: { ...(st.fixtures ?? {}), [String(-uid - 1)]: { x, y, rot } } } }
      homeRuntime.style = homeStyle
      set({ homeStyle })
      return true
    }
    const item = s.inventory.find((o) => o.uid === uid)
    if (!item) return false
    const chk = canPlace(s.housing.tier, s.inventory, item.type, x, y, rot, uid, extCount(s.upgrades[s.housing.tier]))
    if (!chk.ok) {
      toast(chk.reason ?? 'Cannot place here', 'warn')
      return false
    }
    set({ inventory: s.inventory.map((o) => (o.uid === uid ? { ...o, placed: { x, y, rot } } : o)) })
    return true
  },

  storeFurniture: (uid) => {
    if (uid < 0) return toast('Built-in furniture stays in the home. Move or rotate it instead.', 'info')
    set((s) => ({ inventory: s.inventory.map((o) => (o.uid === uid ? { ...o, placed: null } : o)) }))
  },

  setPaint: (wall, floor) => {
    const s = get()
    const tier = s.housing.tier
    if (!(s.upgrades[tier] ?? []).includes('paint')) return toast('Buy the Fresh paint & tiles upgrade first', 'warn')
    const homeStyle = { ...s.homeStyle, [tier]: { ...(s.homeStyle[tier] ?? {}), wall, floor } }
    homeRuntime.style = homeStyle
    set({ homeStyle })
  },

  moveHome: (tier, plotId) => {
    const s = get()
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    // a basic room can be in any compound house; remember which one
    // evicted: the old landlady will not take you back, so find another compound house
    const fresh = s.housing.homeless && tier === 'room' && !(plotId && DEST_BY_ID[plotId]?.homeTier === 'room')
      ? Object.values(ROOM_HOMES_ALL).flat().filter((id) => id !== s.housing.roomDest)
      : []
    const roomDest = tier === 'room' && plotId && DEST_BY_ID[plotId]?.homeTier === 'room' ? plotId : fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : s.housing.roomDest ?? null
    if (!s.housing.homeless && tier === s.housing.tier && (tier === 'room' ? roomDest === s.housing.roomDest : tier !== 'house' || plotId === s.housing.plotId)) return
    const home = HOMES[tier]
    const owned = s.owned.includes(tier)
    if (tier === 'house') {
      const pl = plotId ? s.plots[plotId] : undefined
      if (!pl || pl.stage < projectStages(pl.project).length) return toast('Finish building your house first', 'warn')
      if (!PROJECTS[pl.project ?? 'bungalow'].livable) return toast('You cannot live in this building. It is rented out.', 'warn')
    }
    const total = (owned ? 0 : home.rent) + BALANCE.movingFee
    if (s.money < total) return toast(`Need ${formatMoney(total - s.money)} more to move`, 'warn')
    if (!owned && (tier === 'apartment' || tier === 'premium') && s.rep.respect < 15) return toast('🏢 The letting agent checked your references and said no. Build some respect first.', 'warn')
    const d = draft(s)
    if (!owned) spend(d, home.rent, `Rent (first week): ${home.name}`, 'rent')
    spend(d, BALANCE.movingFee, 'Moving fee', 'fee')
    const lease = tier === 'house' ? `plot:${plotId}` : tier
    if (d.rentedOut.includes(lease)) {
      d.rentedOut = d.rentedOut.filter((k) => k !== lease)
      toast('🔑 Your tenants moved out so you can move in.', 'info')
    }
    d.housing = { tier, nextRentDue: d.minutes + BALANCE.rentDays * 1440, overdueSince: null, plotId: tier === 'house' ? plotId : null, roomDest }
    repositionFurniture(d)
    d.view = 'world'
    d.insideDest = null
    const destId = homeDestId(d)
    const door = DEST_BY_ID[destId].door
    d.player = { x: door.x + 0.5, z: door.z + 0.5, rot: 0 }
    d.nearDest = destId
    teleport(d.player.x, d.player.z)
    set(d)
    useUI.setState({ panel: 'none', editMode: false, holdingUid: null, selectedFurniture: null })
    toast(tier === 'room' && roomDest ? `🏡 You rented a room at ${DEST_BY_ID[roomDest]?.name ?? 'a compound house'}. ${ROOM_LANDLORD[roomDest] ?? 'The landlady'} hands you the key.` : `🏡 You moved into the ${home.name}!`, 'good')
  },

  enterBuilding: (destId) => {
    const s = get()
    const dd = DEST_BY_ID[destId]
    if (!dd) return
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    if (dd.homeTier) {
      if (destId === homeDestId(s)) return get().enterHome()
      if (dd.kind !== 'home' || s.nearDest !== destId) return useUI.getState().selectDest(destId, true)
      cancelPath()
      set({ view: 'home', viewing: dd.homeTier, nearDest: destId })
      useUI.setState({ panel: 'home', editMode: false, holdingUid: null, selectedFurniture: null })
      return
    }
    if (OUTDOOR_KINDS.includes(dd.kind)) return useUI.getState().selectDest(destId, true)
    if (s.nearDest !== destId) return toast(`Walk to ${dd.name} first`, 'warn')
    if (!(dd.hours[0] === 0 && dd.hours[1] === 24) && !isOpen(dd.hours, hourOf(s.minutes))) {
      useUI.getState().selectDest(destId, true)
      return toast(`🔒 ${dd.name} is closed. Opens at ${dd.hours[0] % 12 || 12}${dd.hours[0] >= 12 ? 'pm' : 'am'}.`, 'warn')
    }
    cancelPath()
    set({ view: 'inside', insideDest: destId, nearDest: destId })
    useUI.setState({ panel: 'building', selectedDest: destId, selectedFurniture: null })
  },

  exitBuilding: () => {
    const s = get()
    if (s.view !== 'inside' || !s.insideDest) return
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    const dd = DEST_BY_ID[s.insideDest]
    teleport(dd.door.x + 0.5, dd.door.z + 0.5)
    set({ view: 'world', insideDest: null, nearDest: dd.id, player: { x: dd.door.x + 0.5, z: dd.door.z + 0.5, rot: 0 } })
    useUI.setState({ panel: 'none', selectedDest: null })
  },

  skipTutorial: () => set({ tutorial: { step: 6, done: true } }),

  /* ------------------------------ transport ------------------------------ */
  startRide: (mode, destId) => {
    const s = get()
    const to = DEST_BY_ID[destId]
    if (!to) return
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    if (mode === 'trotro') {
      // trotros only run between stations
      const here = s.view === 'inside' ? s.insideDest : s.nearDest
      if (!here || DEST_BY_ID[here]?.kind !== 'stop') return toast('Walk to a trotro station first', 'warn')
      if (to.kind !== 'stop') return toast('Trotros only stop at stations', 'warn')
    }
    const d = draft(s)
    if (d.view !== 'world') {
      const here = DEST_BY_ID[d.view === 'home' ? homeDestId(d) : d.insideDest ?? 'home_room']
      d.view = 'world'
      d.insideDest = null
      d.player = { x: here.door.x + 0.5, z: here.door.z + 0.5, rot: 0 }
      teleport(d.player.x, d.player.z)
    }
    const q = rideQuote(d, mode, destId)
    if (d.money < q.fare) return toast(`Need ${formatMoney(q.fare - d.money)} more for the ${RIDES[mode].name.toLowerCase()}`, 'warn')
    let extra = 0
    let note = ''
    if (mode === 'trotro' && Math.random() < 0.3) {
      extra = 10 + Math.round(Math.random() * 20)
      note = `🚧 Go-slow at Circle added ${extra} min.`
    } else if (mode === 'taxi') note = '🚕 The driver argued about football the whole way.'
    else if (mode === 'ride') note = `❄️ Cool AC ride${q.surge ? ' (night surge pricing)' : ''}.`
    else note = '🚐 “Circle! Circle!” The mate packed everyone in.'
    spend(d, q.fare, `${RIDES[mode].name} to ${to.name}`, 'transport')
    d.activity = {
      uid: d.nextId++, defId: `ride:${mode}`, label: `${RIDES[mode].name} to ${to.name}`, icon: RIDES[mode].emoji, kind: 'travel', ctx: { ride: mode },
      total: q.minutes + extra, done: 0, scale: BALANCE.travelMinutesPerSecond, needs: mode === 'ride' ? { fun: 4 } : mode === 'trotro' ? { social: 4, hygiene: -3 } : { social: 2 },
      appliedFrac: 0, reward: 0, skillXp: {}, careerXp: 0, cost: q.fare, travelTo: destId, startedAt: d.minutes, meta: { note },
    }
    const path = roadRoute(d.player.x, d.player.z, to.door.x, to.door.z)
    runtime.ride = { mode, path }
    // ride in real time so you can watch the city go by
    let len = 0
    for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z)
    const secs = Math.min(18, Math.max(5, len / (mode === 'trotro' ? 5 : 6.5)))
    d.activity!.scale = d.activity!.total / secs
    cancelPath()
    set(d)
    useUI.setState({ panel: 'none', selectedDest: null, travelTo: null })
  },

  /* -------------------------------- court -------------------------------- */
  courtPlea: (plea) => {
    const s = get()
    if (s.legal.caseDeadline === null) return toast('You have no case to answer', 'info')
    if (s.nearDest !== 'court') return toast('Go to Accra High Court for your hearing', 'warn')
    if (plea === 'lawyer' && s.money < LEGAL.lawyer) return toast(`A lawyer costs ${formatMoney(LEGAL.lawyer)}`, 'warn')
    const d = draft(s)
    useUI.setState({ court: false })
    const lines: string[] = []
    const fine = () => {
      const fineAmt = d.legal.fine ?? LEGAL.fine
      if (d.money >= fineAmt) {
        spend(d, fineAmt, 'Court fine', 'fee')
        d.legal.caseDeadline = null
        d.legal.record++
        lines.push(`🧾 Fined ${formatMoney(fineAmt)} for ${d.legal.charge ?? 'theft'}. Case closed.`)
        showResult(d, 'Verdict: fined', '⚖️', lines, 'neutral')
      } else {
        lines.push(`You could not pay the ${formatMoney(fineAmt)} fine.`)
        showResult(d, 'Verdict: prison', '⚖️', lines, 'bad')
        sendToJail(d, LEGAL.jailGuilty, 'Unable to pay your fine.')
      }
    }
    if (plea === 'guilty') {
      lines.push('You pleaded guilty. The judge appreciates your honesty.')
      fine()
    } else if (plea === 'notguilty') {
      if (Math.random() < 0.45) {
        d.legal.caseDeadline = null
        showResult(d, 'Verdict: not guilty!', '⚖️', ['🎉 Not enough evidence. You walk free.'], 'good')
      } else {
        showResult(d, 'Verdict: guilty', '⚖️', ['The witnesses were convincing.'], 'bad')
        sendToJail(d, LEGAL.jailConvicted, `Convicted of ${d.legal.charge ?? 'theft'}.`)
      }
    } else {
      spend(d, LEGAL.lawyer, 'Lawyer fees', 'service')
      if (Math.random() < 0.8) {
        d.legal.caseDeadline = null
        showResult(d, 'Verdict: acquitted!', '⚖️', ['👔 Your lawyer tore the case apart. You walk free.'], 'good')
      } else {
        lines.push('Even your lawyer could not save you completely.')
        fine()
      }
    }
    set(d)
  },

  /* ------------------------------- romance ------------------------------- */
  askOut: (npcId) => {
    const s = get()
    const npc = NPC_BY_ID[npcId]
    const today = dayOf(s.minutes)
    if (!npc.datable) return
    if (s.romance.partner) return toast('You are already in a relationship', 'warn')
    if (friendPoints(s, npcId) < ROMANCE.askAt) return toast(`Become closer friends with ${npc.name} first`, 'warn')
    if (s.romance.askedDay === today) return toast('Give it a day before asking again', 'info')
    const d = draft(s)
    d.romance = { ...d.romance, askedDay: today }
    const chance = 0.7 + (d.profile?.traits.includes('charming') ? 0.15 : 0)
    if (Math.random() < chance) {
      d.romance = { partner: npcId, stage: 'dating', dates: 0, ring: d.romance.ring, askedDay: today }
      showResult(d, `${npc.name} said yes!`, '💕', [`You and ${npc.name} are now dating.`, 'Go on dates at the beach club, beach, mall or park.'], 'good')
      addChat(d, npcId, npcId, 'I’m so happy you asked 🥰')
    } else {
      addFriendship(d, npcId, -3)
      showResult(d, 'Not this time', '💔', [`${npc.name} wants to stay friends for now.`], 'neutral')
    }
    set(d)
  },

  propose: () => {
    const s = get()
    const pid = s.romance.partner
    if (!pid || s.romance.stage !== 'dating') return
    const npc = NPC_BY_ID[pid]
    if (!s.romance.ring) return toast('Buy an engagement ring at Accra Mall first', 'warn')
    if (friendPoints(s, pid) < ROMANCE.proposeAt || s.romance.dates < ROMANCE.datesToPropose) return toast(`${npc.name} is not ready yet: ${ROMANCE.proposeAt} love and ${ROMANCE.datesToPropose} dates needed`, 'warn')
    const d = draft(s)
    if (Math.random() < 0.85) {
      d.romance = { ...d.romance, stage: 'engaged', ring: false }
      showResult(d, `${npc.name} said YES! 💍`, '💍', ['You are engaged!', 'Book the wedding at Osu Community Church.'], 'good')
      toast(`💍 You are engaged to ${npc.name}!`, 'good')
    } else {
      addFriendship(d, pid, -5)
      showResult(d, '“I need more time…”', '💔', [`${npc.name} is not ready. Keep the ring and try again later.`], 'neutral')
    }
    set(d)
  },

  breakUp: () => {
    const s = get()
    const pid = s.romance.partner
    if (!pid) return
    const d = draft(s)
    addFriendship(d, pid, -20)
    lifeEvent(d, 'breakup')
    d.romance = { partner: null, stage: null, dates: 0, ring: d.romance.ring, askedDay: dayOf(d.minutes) }
    toast(`💔 You and ${NPC_BY_ID[pid].name} broke up.`, 'info')
    set(d)
  },

  /* -------------------------------- chats -------------------------------- */
  sendChat: (chatId, raw) => {
    const text = raw.trim().slice(0, 200)
    if (!text) return
    const d = draft(get())
    const today = dayOf(d.minutes)
    addChat(d, chatId, 'me', text, false)
    const members = chatMembers(d, chatId)
    const isGroup = chatId === 'squad' || !!d.groups[chatId]
    const responders = isGroup ? [...members].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * Math.min(3, members.length))) : members
    for (const who of responders) {
      if (d.chatDay[who] !== today) {
        d.chatDay = { ...d.chatDay, [who]: today }
        addFriendship(d, who, 1)
      }
    }
    d.needs.social = clamp(d.needs.social + 2)
    track(d, 'text')
    set(d)
    // replies arrive a moment later, one after another, with a typing indicator
    let delay = 0
    for (const who of responders) {
      delay += 800 + Math.random() * 1700
      const at = delay
      setTimeout(() => useUI.setState({ chatTyping: { chat: chatId, who } }), Math.max(0, at - 700))
      setTimeout(() => {
        const s2 = get()
        if (s2.screen !== 'game' || !chatMembers(s2, chatId).includes(who)) return
        const d2 = draft(s2)
        addChat(d2, chatId, who, chatReply(d2, who, text))
        set(d2)
        const t = useUI.getState().chatTyping
        if (t && t.chat === chatId && t.who === who) useUI.setState({ chatTyping: null })
      }, at)
    }
  },

  createGroup: (rawName, emoji, members) => {
    const name = rawName.trim().slice(0, 30)
    const s = get()
    const valid = [...new Set(members)].filter((m) => NPC_BY_ID[m])
    if (!name) { toast('Give your group a name', 'warn'); return null }
    if (!valid.length) { toast('Add at least one friend', 'warn'); return null }
    const d = draft(s)
    const id = `g${d.nextId++}`
    d.groups = { ...d.groups, [id]: { id, name, emoji, members: valid, createdAt: d.minutes } }
    addChat(d, id, 'system', `You created group "${name}"`, false)
    addChat(d, id, 'system', `You added ${valid.map((m) => NPC_BY_ID[m].name).join(', ')}`, false)
    set(d)
    valid.slice(0, 3).forEach((who, i) => {
      setTimeout(() => {
        const s2 = get()
        if (!s2.groups[id]?.members.includes(who)) return
        const d2 = draft(s2)
        addChat(d2, id, who, WELCOME[Math.floor(Math.random() * WELCOME.length)])
        set(d2)
      }, 900 + i * 1100)
    })
    toast(`👥 Group "${name}" created`, 'good')
    return id
  },

  addToGroup: (groupId, npcId) => {
    const s = get()
    const g = s.groups[groupId]
    const npc = NPC_BY_ID[npcId]
    if (!g || !npc || g.members.includes(npcId)) return
    const d = draft(s)
    d.groups = { ...d.groups, [groupId]: { ...g, members: [...g.members, npcId] } }
    addChat(d, groupId, 'system', `You added ${npc.name}`, false)
    set(d)
    setTimeout(() => {
      const s2 = get()
      if (!s2.groups[groupId]?.members.includes(npcId)) return
      const d2 = draft(s2)
      addChat(d2, groupId, npcId, WELCOME[Math.floor(Math.random() * WELCOME.length)])
      set(d2)
    }, 1200)
  },

  leaveGroup: (groupId) => {
    const s = get()
    const g = s.groups[groupId]
    if (!g) return
    const groups = { ...s.groups }
    delete groups[groupId]
    const chats = { ...s.chats }
    delete chats[groupId]
    const chatUnread = { ...s.chatUnread }
    delete chatUnread[groupId]
    set({ groups, chats, chatUnread })
    toast(`You left "${g.name}"`, 'info')
  },

  readChat: (chatId) => set((s) => ({ chatUnread: { ...s.chatUnread, [chatId]: 0 } })),

  sendMomo: (npcId, amount) => {
    const s = get()
    const fee = Math.ceil(amount * FINANCE.eLevy * 100) / 100
    if (amount <= 0) return
    if (s.money < amount + fee) return toast(`Need ${formatMoney(amount + fee - s.money)} more (incl. 1% E-levy)`, 'warn')
    const d = draft(s)
    const npc = NPC_BY_ID[npcId]
    spend(d, amount, `MoMo to ${npc.name}`, 'transfer')
    if (fee) spend(d, fee, 'E-levy (1%)', 'fee')
    addChat(d, npcId, 'me', `💸 Sent ${formatMoney(amount)} via MoMo`, false)
    addChat(d, npcId, npcId, amount >= 100 ? 'Ei! God bless you 🙏🙏' : 'Thank you o 🙏', false)
    const today = dayOf(d.minutes)
    const key = `momo:${npcId}`
    if (d.chatDay[key] !== today) {
      d.chatDay = { ...d.chatDay, [key]: today }
      addFriendship(d, npcId, Math.min(8, Math.round(amount / 10)))
    }
    track(d, 'momo')
    set(d)
    toast(`📲 Sent ${formatMoney(amount)} to ${npc.name}`, 'good')
  },

  /* ------------------------------ bank & invest ------------------------------ */
  bankMove: (amount, dir) => {
    const s = get()
    if (!s.bank.open) return toast('Open an account at Gold Coast Bank first', 'warn')
    if (amount <= 0) return
    const d = draft(s)
    if (dir === 'in') {
      if (d.money < amount) return toast('Not enough cash in your wallet', 'warn')
      // the teller asks about large unexplained cash: only clean money goes in
      if (cleanCash(d) < amount) return toast(`🏦 The bank only accepts clean cash. You have ${formatMoney(cleanCash(d))} clean and ${formatMoney(d.dirty)} dirty. Launder it first.`, 'warn')
      d.money -= amount
      d.dirty = Math.min(d.dirty, d.money)
      d.bank.balance = Math.round((d.bank.balance + amount) * 100) / 100
      pushTx(d, 'Deposit to bank', -amount, 'transfer')
      track(d, 'save', amount)
    } else {
      if (d.bank.balance < amount) return toast('Not enough in your bank account', 'warn')
      d.bank.balance = Math.round((d.bank.balance - amount) * 100) / 100
      d.money += amount
      pushTx(d, 'Withdrawal from bank', amount, 'transfer')
    }
    set(d)
  },

  buyTbill: (amount) => {
    const s = get()
    if (!s.bank.open) return toast('Open a bank account first', 'warn')
    if (amount < FINANCE.tbillMin) return toast(`Minimum T-bill is ${formatMoney(FINANCE.tbillMin)}`, 'warn')
    if (s.bank.balance < amount) return toast('Not enough in your bank account', 'warn')
    const d = draft(s)
    d.bank.balance = Math.round((d.bank.balance - amount) * 100) / 100
    d.invest = { ...d.invest, tbills: [...d.invest.tbills, { id: d.nextId++, amount, matures: d.minutes + FINANCE.tbillDays * 1440 }] }
    toast(`📈 Bought a ${FINANCE.tbillDays}-day T-bill: ${formatMoney(amount)}`, 'good')
    set(d)
  },

  trade: (stock, qty) => {
    const s = get()
    if (!s.bank.open) return toast('Open a bank account first', 'warn')
    const hist = s.invest.prices[stock]
    const price = hist[hist.length - 1]
    const d = draft(s)
    if (qty > 0) {
      const cost = Math.round(price * qty * 100) / 100
      if (d.bank.balance < cost) return toast('Not enough in your bank account', 'warn')
      d.bank.balance = Math.round((d.bank.balance - cost) * 100) / 100
    } else {
      if ((d.invest.shares[stock] ?? 0) < -qty) return toast('You do not own that many shares', 'warn')
      d.bank.balance = Math.round((d.bank.balance + price * -qty) * 100) / 100
    }
    d.invest.shares[stock] = (d.invest.shares[stock] ?? 0) + qty
    set(d)
  },

  /* ------------------------------ property ------------------------------ */
  buyPlot: (plotId) => {
    const s = get()
    const def = PLOT_BY_ID[plotId]
    if (!def || s.plots[plotId]?.owned) return
    if (s.nearDest !== 'realty' && s.nearDest !== plotId) return toast('Buy land at Accra Realty or on the plot itself', 'warn')
    const price = plotValue(s, plotId)
    if (s.money < price) return toast(`Need ${formatMoney(price - s.money)} more for this land`, 'warn')
    const d = draft(s)
    const dirtyMsg = needClean(d, price)
    if (dirtyMsg) return toast(dirtyMsg, 'warn')
    spend(d, price, `Land: ${DEST_BY_ID[plotId].name}`, 'purchase', true)
    const guards = Math.random() < def.guardRisk ? 'active' : 'none'
    d.plots[plotId] = { owned: true, boughtFor: price, permit: 'none', permitReady: null, noPermit: false, stage: 0, until: null, guards, project: null }
    showResult(d, 'You own land!', '🗺️', [`${DEST_BY_ID[plotId].name} is yours for ${formatMoney(price)}.`, 'Choose a project on the plot (house, villa, guesthouse, flats or shops), get a permit at the Lands Commission, then build.', ...(guards === 'active' ? ['⚠️ Rumour says land guards claim this plot…'] : [])], 'good')
    set(d)
  },

  sellPlot: (plotId) => {
    const s = get()
    const p = s.plots[plotId]
    if (!p?.owned) return
    if (s.housing.tier === 'house' && s.housing.plotId === plotId) return toast('Move out before selling your home', 'warn')
    if (p.until !== null) return toast('Wait for the builders to finish first', 'warn')
    const d = draft(s)
    const value = plotValue(s, plotId)
    earn(d, value, `Sold: ${DEST_BY_ID[plotId].name}`, 'bonus')
    d.rentedOut = d.rentedOut.filter((k) => k !== `plot:${plotId}`)
    const rest = { ...d.plots }
    delete rest[plotId]
    d.plots = rest
    if (!Object.values(rest).some((x) => x.stage >= projectStages(x.project).length && PROJECTS[x.project ?? 'bungalow'].livable)) d.owned = d.owned.filter((t) => t !== 'house')
    const profit = value - p.boughtFor
    showResult(d, 'Property sold', '🤝', [`Sold for ${formatMoney(value)}.`, profit >= 0 ? `📈 Profit ${formatMoney(profit)} on the land price.` : `📉 Loss ${formatMoney(-profit)}.`], profit >= 0 ? 'good' : 'neutral')
    set(d)
  },

  buildNext: (plotId, withoutPermit = false) => {
    const s = get()
    const p = s.plots[plotId]
    if (!p?.owned) return toast('Buy this land first', 'warn')
    if (s.nearDest !== plotId) return toast('Go to the plot to direct the builders', 'warn')
    if (p.guards === 'active') {
      set({ event: { id: 'landguards', ctx: { plot: plotId } } })
      return
    }
    if (p.until !== null) return toast('Builders are still working', 'info')
    if (!p.project) return toast('Choose what to build first', 'warn')
    const stage = projectStages(p.project)[p.stage]
    if (!stage) return
    if (p.permit !== 'approved' && !withoutPermit) return toast('You need a building permit from the Lands Commission', 'warn')
    if (s.money < stage.price) return toast(`Need ${formatMoney(stage.price - s.money)} more for ${stage.name.toLowerCase()}`, 'warn')
    const d = draft(s)
    const dirtyMsg = needClean(d, stage.price)
    if (dirtyMsg) return toast(dirtyMsg, 'warn')
    spend(d, stage.price, `Construction: ${stage.name}`, 'purchase', true)
    d.plots[plotId] = { ...p, until: d.minutes + stage.days * 1440, noPermit: p.noPermit || (withoutPermit && p.permit !== 'approved') }
    toast(`${stage.emoji} Builders started the ${stage.name.toLowerCase()}. Ready in ${stage.days} day.`, 'good')
    set(d)
  },

  buyVehicle: (v) => {
    const s = get()
    const def = VEHICLES[v]
    if (s.vehicles.includes(v)) return
    if (s.nearDest !== 'dealer') return toast('Visit Spintex Motors to buy vehicles', 'warn')
    if (s.money < def.price) return toast(`Need ${formatMoney(def.price - s.money)} more`, 'warn')
    const d = draft(s)
    const dirtyMsg = needClean(d, def.price)
    if (dirtyMsg) return toast(dirtyMsg, 'warn')
    spend(d, def.price, `Bought: ${def.name}`, 'purchase', true)
    d.vehicles = [...d.vehicles, v]
    showResult(d, `You own a ${def.name.toLowerCase()}!`, def.emoji, [`Start a ${def.job.toLowerCase()} shift from the Drive app on your phone.`, 'No more daily rental fees.'], 'good')
    set(d)
  },

  startDriving: (v) => {
    const s = get()
    const def = VEHICLES[v]
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    if (def.license && !s.license) return toast('You need a driving licence from the DVLA', 'warn')
    if (s.needs.energy < 20) return toast('Too tired to drive safely', 'warn')
    const d = draft(s)
    const today = dayOf(d.minutes)
    if (!d.vehicles.includes(v) && d.rentedDay[v] !== today) {
      if (d.money < def.rent) return toast(`Daily rental is ${formatMoney(def.rent)}`, 'warn')
      spend(d, def.rent, `${def.name} rental (“work and pay”)`, 'fee')
      d.rentedDay = { ...d.rentedDay, [v]: today }
    }
    if (d.view !== 'world') {
      const here = DEST_BY_ID[d.view === 'home' ? homeDestId(d) : d.insideDest ?? 'home_room']
      d.view = 'world'
      d.insideDest = null
      d.player = { x: here.door.x + 0.5, z: here.door.z + 0.5, rot: 0 }
      teleport(d.player.x, d.player.z)
    }
    d.drive = { vehicle: v, trips: DRIVING.tripsPerShift, earned: 0 }
    startTrip(d)
    set(d)
    useUI.setState({ panel: 'none', selectedDest: null })
    toast(`${def.emoji} Shift started. ${DRIVING.tripsPerShift} trips to go.`, 'good')
  },

  takeLoan: (amount) => {
    const s = get()
    if (s.loan) return toast('Repay your current QwikCash loan first', 'warn')
    if (s.credit < LOAN.minCredit) return toast('Your credit score is too low. Repay on time to rebuild it.', 'warn')
    const limit = loanLimit(s)
    if (amount <= 0 || amount > limit) return toast(`You can borrow up to ${formatMoney(limit)}`, 'warn')
    const d = draft(s)
    const owed = Math.round(amount * (1 + LOAN.fee) * 100) / 100
    d.loan = { owed, principal: amount, due: d.minutes + LOAN.days * 1440 }
    d.money += amount
    pushTx(d, 'QwikCash loan received', amount, 'transfer')
    toast(`📲 QwikCash: ${formatMoney(amount)} received. Repay ${formatMoney(owed)} by Day ${dayOf(d.loan.due)}.`, 'good')
    set(d)
  },

  repayLoan: () => {
    const s = get()
    if (!s.loan) return
    if (s.money < s.loan.owed) return toast(`You need ${formatMoney(s.loan.owed - s.money)} more to repay in full`, 'warn')
    const d = draft(s)
    spend(d, d.loan!.owed, 'QwikCash loan repayment', 'fee')
    const onTime = d.minutes <= d.loan!.due
    d.loan = null
    d.credit = Math.min(100, d.credit + (onTime ? 10 : 3))
    toast(onTime ? '✅ Loan repaid on time. Credit limit up!' : '✅ Loan repaid.', 'good')
    set(d)
  },

  policeStop: (offence) => {
    const s = get()
    if (s.event) return
    cancelPath()
    set({ event: { id: 'police_stop', ctx: { officer: rollOfficer(), offence } } })
  },

  runRedLight: () => {
    const s = get()
    if (!s.activity || s.activity.kind !== 'travel' || !runtime.ride?.holding) return
    const j = nearestJunction(runtime.player.x, runtime.player.z, 3)
    runtime.runRedAt = j
    runtime.ride.holding = false
    if (Math.random() < 0.35) {
      toast('🚨 Whistle! Police saw you run the red light.', 'bad')
      setTimeout(() => {
        const g = get()
        if (!g.event) set({ event: { id: 'police_stop', ctx: { officer: rollOfficer(), offence: 'red light' } } })
      }, 1200)
    } else toast('🚦 You ran the red light… nobody saw.', 'warn')
  },

  stopDriving: () => {
    const s = get()
    if (!s.drive) return
    set({ drive: { ...s.drive, trips: 1 } })
    toast('Last trip. The shift ends when you drop this passenger.', 'info')
  },

  buyHome: (tier) => {
    const s = get()
    const h = HOMES[tier]
    if (!h.buy || s.owned.includes(tier)) return
    if (s.nearDest !== 'realty') return toast('Visit Accra Realty to buy property', 'warn')
    if (s.money < h.buy) return toast(`Need ${formatMoney(h.buy - s.money)} more`, 'warn')
    const d = draft(s)
    const dirtyMsg = needClean(d, h.buy)
    if (dirtyMsg) return toast(dirtyMsg, 'warn')
    spend(d, h.buy, `Bought: ${h.name}`, 'purchase', true)
    d.owned = [...d.owned, tier]
    showResult(d, `You bought the ${h.name}!`, '🏡', ['No more rent for this home.', d.housing.tier === tier ? 'You already live here.' : 'Move in from the Home tab.'], 'good')
    set(d)
  },

  sellHome: (tier) => {
    const s = get()
    const h = HOMES[tier]
    if (tier === 'house') return toast('Sell a built house by selling its plot', 'info')
    if (!s.owned.includes(tier) || !h.buy) return
    if (s.housing.tier === tier) return toast('Move out first: rent or move into another home, then sell this one', 'warn')
    const busy = busyReason(s)
    if (busy) return toast(busy, 'warn')
    const d = draft(s)
    const price = Math.round(h.buy * HOME_SELL_BACK)
    earn(d, price, `Sold: ${h.name}`, 'bonus')
    d.owned = d.owned.filter((t) => t !== tier)
    d.rentedOut = d.rentedOut.filter((k) => k !== tier)
    const up = { ...d.upgrades }
    delete up[tier]
    d.upgrades = up
    showResult(d, `Sold the ${h.name}`, '🤝', [`💰 You received ${formatMoney(price)} (${Math.round(HOME_SELL_BACK * 100)}% of the price).`, 'Upgrades stay with the house.'], 'good')
    set(d)
  },

  toggleRentOut: (key) => {
    const s = get()
    if (s.rentedOut.includes(key)) {
      const t = s.tenants[key] ?? {}
      if (t.until !== undefined) return toast(`🔑 Your tenants are already leaving ${rentOutName(key)} on Day ${dayOf(t.until)}.`, 'info')
      const busy = busyReason(s)
      if (busy) return toast(busy, 'warn')
      // tenants who owe rent, and some others, dig in
      if ((t.owed ?? 0) > 0 || Math.random() < 0.35) {
        set({ event: { id: 'tenant_refuse', ctx: { lease: key } } })
        return
      }
      set({ tenants: { ...s.tenants, [key]: { ...t, until: s.minutes + 2 * 1440 } } })
      return toast(`📜 Notice served. Your tenants will leave ${rentOutName(key)} within 2 days. No rent meanwhile.`, 'info')
    }
    if (!canRentOut(s, key)) return toast('You can only rent out a finished home you own and do not live in', 'warn')
    const [lo, hi] = rentOutRange(s, key)
    set({ rentedOut: [...s.rentedOut, key], tenants: { ...s.tenants, [key]: {} } })
    toast(`🏠 ${rentOutName(key)} is let! Rent of ${lo === hi ? formatMoney(lo) : `${formatMoney(lo)}–${formatMoney(hi)}`} a day lands every morning.`, 'good')
  },

  sellVehicle: (v) => {
    const s = get()
    if (!s.vehicles.includes(v)) return
    if (s.drive?.vehicle === v) return toast('Stop driving before you sell it', 'warn')
    const d = draft(s)
    const price = Math.round(VEHICLES[v].price * SELL_BACK.vehicle)
    earn(d, price, `Sold: ${VEHICLES[v].name}`, 'bonus')
    d.vehicles = d.vehicles.filter((x) => x !== v)
    toast(`${VEHICLES[v].emoji} Sold your ${VEHICLES[v].name.toLowerCase()} for ${formatMoney(price)}`, 'good')
    set(d)
  },

  sellFurniture: (uid) => {
    const s = get()
    if (uid < 0) return toast('Built-in furniture comes with the home', 'info')
    const item = s.inventory.find((o) => o.uid === uid)
    if (!item) return
    const d = draft(s)
    const def = FURNITURE[item.type]
    const price = Math.round(def.price * SELL_BACK.furniture)
    if (price > 0) earn(d, price, `Sold: ${def.name}`, 'bonus')
    d.inventory = d.inventory.filter((o) => o.uid !== uid)
    toast(`${def.emoji} Sold the ${def.name.toLowerCase()} for ${formatMoney(price)}`, 'good')
    set(d)
  },

  chooseProject: (plotId, project) => {
    const s = get()
    const p = s.plots[plotId]
    if (!p?.owned) return
    if (p.stage > 0 || p.until !== null) return toast('Building has started. The project is fixed now.', 'warn')
    const d = draft(s)
    d.plots[plotId] = { ...p, project }
    toast(`${PROJECTS[project].emoji} Project set: ${PROJECTS[project].name}. Total ${formatMoney(projectStages(project).reduce((a, b) => a + b.price, 0))}.`, 'good')
    set(d)
  },

  buyUpgrade: (id) => {
    const s = get()
    const u = UPGRADES.find((x) => x.id === id)
    if (!u) return
    const have = s.upgrades[s.housing.tier] ?? []
    if (have.includes(id)) return
    if (id === 'flat' && !canExtend(s)) return toast('Only homes you own can have a boys’ quarters flat', 'warn')
    const ei = EXTENSIONS.indexOf(id as (typeof EXTENSIONS)[number])
    if (ei >= 0) {
      if (!canExtend(s)) return toast('Only homes you own can be extended. Buy or build a house.', 'warn')
      if (ei > 0 && !have.includes(EXTENSIONS[ei - 1])) return toast(`Buy the ${UPGRADES.find((x) => x.id === EXTENSIONS[ei - 1])?.name.toLowerCase()} first`, 'warn')
    }
    if (s.money < u.price) return toast(`Need ${formatMoney(u.price - s.money)} more`, 'warn')
    const d = draft(s)
    const dirtyMsg = needClean(d, u.price)
    if (dirtyMsg) return toast(dirtyMsg, 'warn')
    spend(d, u.price, `Upgrade: ${u.name}`, 'purchase', true)
    d.upgrades = { ...d.upgrades, [d.housing.tier]: [...have, id] }
    toast(`${u.emoji} ${u.name} installed!`, 'good')
    set(d)
  },
}))

clockRef.now = () => useGame.getState().minutes

// keep layout helpers in sync with moved fixtures and paint (also after loading a save)
homeRuntime.style = useGame.getState().homeStyle
useGame.subscribe((s) => {
  if (s.homeStyle !== homeRuntime.style) homeRuntime.style = s.homeStyle
})

// dev-only handle for debugging in the browser console
if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || new URLSearchParams(window.location.search).has('debug'))) (window as unknown as { __game: typeof useGame }).__game = useGame

export { efficiency, activitiesForDest }

// freeze the player while an event (police stop, arrest, robbery…) or custody/jail is on screen
useGame.subscribe((s) => {
  const frozen = !!s.event || s.activity?.kind === 'custody' || s.activity?.kind === 'jail'
  if (frozen && !runtime.frozen) {
    cancelPath()
    runtime.insideTarget = null
  }
  runtime.frozen = frozen
})
