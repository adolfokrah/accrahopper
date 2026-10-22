import { BALANCE, GAME_CONFIG, clamp } from './config'
import { CAREERS, DEST_BY_ID, EVENTS, FURNITURE, HOMES, ILLNESSES, OFFICERS, OUTDOOR_KINDS, PETS, PLOT_BY_ID, PROJECTS, homeDestId } from './content'
import { freshGame, useGame, type SavedGame } from './store'
import { MAP_H, MAP_W, walkable } from './world'
import type { NeedId, Profile } from './types'

const KEY = GAME_CONFIG.save.key
/** Bump when the city layout changes so saved positions are reset. */
const MAP_VERSION = 4

export interface SaveEnvelope {
  version: number
  savedAt: string
  game: SavedGame
}

const SAVE_KEYS: (keyof SavedGame)[] = [
  'profile', 'minutes', 'money', 'needs', 'skills', 'careers', 'employment', 'housing', 'inventory', 'friendships',
  'transactions', 'player', 'view', 'insideDest', 'viewing', 'tutorial', 'stats', 'daily', 'activity', 'event', 'result', 'eventCooldownUntil',
  'rentWarnedFor', 'lowFlags', 'nextId', 'health', 'legal', 'romance', 'edu', 'owned', 'plots', 'license', 'vehicles', 'rentedDay', 'upgrades', 'rentedOut', 'tenants', 'dirty', 'rep', 'laundered', 'dreamStep', 'pet', 'homeStyle', 'bank',
  'invest', 'tasks', 'today', 'goals', 'goalsActive', 'lifeFlags', 'visited', 'chats', 'chatUnread', 'chatDay', 'groups', 'loan', 'credit', 'items', 'ticket', 'businesses',
]

export function serialize(): SaveEnvelope {
  const s = useGame.getState()
  const game: Record<string, unknown> = {}
  for (const k of SAVE_KEYS) game[k] = s[k as keyof typeof s]
  game.mapVersion = MAP_VERSION
  return { version: GAME_CONFIG.save.version, savedAt: new Date().toISOString(), game: game as unknown as SavedGame }
}

let inflight: Promise<boolean> | null = null
let queued = false
/** Set while the server changes this save directly (MoMo); uploads wait so they cannot undo it. */
let held: Promise<void> | null = null

/**
 * Uploads the latest life, then holds further uploads while `fn` lets the server edit the save.
 * `fn` must mirror the server's change in the local state before it returns.
 */
export async function withSaveHeld<T>(fn: () => Promise<T>): Promise<T> {
  while (held) await held
  await saveNow()
  let release = () => {}
  held = new Promise((r) => (release = r))
  try {
    return await fn()
  } finally {
    held = null
    release()
  }
}

/**
 * Uploads the current life to the signed-in player's cloud save. Overlapping calls collapse into
 * one trailing upload. `leaving` uses a keepalive request so it can finish while the page closes.
 */
export function saveNow(leaving = false): Promise<boolean> {
  if (useGame.getState().screen !== 'game') return Promise.resolve(false)
  if (held) return leaving ? Promise.resolve(false) : held.then(() => saveNow())
  if (inflight && !leaving) {
    queued = true
    return inflight
  }
  const body = JSON.stringify(serialize())
  const run = fetch('/api/save', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
    // browsers cap keepalive bodies at 64 KB
    keepalive: leaving && body.length < 60_000,
  })
    .then((r) => r.ok)
    .catch(() => false)
  if (leaving) return run
  inflight = run.finally(() => {
    inflight = null
    if (queued) {
      queued = false
      void saveNow()
    }
  })
  return inflight
}

export type LoadResult = { status: 'none' } | { status: 'ok'; env: SaveEnvelope } | { status: 'invalid'; reason: string }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Validate and repair untrusted save data. Throws on unrecoverable shape problems. */
function sanitize(raw: unknown): SavedGame {
  if (!raw || typeof raw !== 'object') throw new Error('not an object')
  const g = raw as Record<string, any>
  const base = freshGame(null)
  const p = g.profile as Profile | undefined
  if (!p || typeof p.name !== 'string' || !Array.isArray(p.traits) || p.traits.length !== 2 || !p.appearance) throw new Error('missing profile')
  const out: SavedGame = { ...base, profile: p }
  if (!isNum(g.minutes) || g.minutes < 0) throw new Error('bad clock')
  out.minutes = g.minutes
  if (!isNum(g.money)) throw new Error('bad money')
  out.money = Math.round(g.money)
  for (const k of Object.keys(base.needs) as NeedId[]) out.needs[k] = isNum(g.needs?.[k]) ? clamp(g.needs[k]) : base.needs[k]
  for (const k of Object.keys(base.skills) as (keyof typeof base.skills)[]) out.skills[k] = isNum(g.skills?.[k]) ? Math.max(0, g.skills[k]) : 0
  for (const c of Object.keys(CAREERS) as (keyof typeof CAREERS)[]) {
    const pr = g.careers?.[c]
    if (pr && isNum(pr.level) && isNum(pr.xp)) out.careers[c] = { level: Math.min(3, Math.max(1, Math.round(pr.level))), xp: Math.max(0, pr.xp), shifts: isNum(pr.shifts) ? pr.shifts : 0, warns: isNum(pr.warns) ? pr.warns : 0 }
  }
  out.employment = g.employment && out.careers[g.employment as keyof typeof CAREERS] ? g.employment : null
  const tier = g.housing?.tier
  if (!(tier in HOMES)) throw new Error('bad housing')
  out.housing = { tier, nextRentDue: isNum(g.housing.nextRentDue) ? g.housing.nextRentDue : out.minutes + BALANCE.rentDays * 1440, overdueSince: isNum(g.housing.overdueSince) ? g.housing.overdueSince : null }
  out.inventory = Array.isArray(g.inventory)
    ? g.inventory
        .filter((o: any) => o && isNum(o.uid) && o.type in FURNITURE)
        .map((o: any) => ({ uid: o.uid, type: o.type, placed: o.placed && isNum(o.placed.x) && isNum(o.placed.y) ? { x: o.placed.x, y: o.placed.y, rot: ([0, 1, 2, 3].includes(o.placed.rot) ? o.placed.rot : 0) as 0 | 1 | 2 | 3 } : null }))
    : []
  if (g.friendships && typeof g.friendships === 'object') {
    for (const [k, v] of Object.entries<any>(g.friendships)) if (v && isNum(v.points)) out.friendships[k] = { points: Math.max(0, v.points), talkDay: isNum(v.talkDay) ? v.talkDay : 0, talks: isNum(v.talks) ? v.talks : 0 }
  }
  out.transactions = Array.isArray(g.transactions) ? g.transactions.filter((t: any) => t && isNum(t.amount) && typeof t.label === 'string' && isNum(t.minute)).slice(0, BALANCE.maxTransactions) : []
  const px = isNum(g.player?.x) ? clamp(g.player.x, 0.5, MAP_W - 0.5) : base.player.x
  const pz = isNum(g.player?.z) ? clamp(g.player.z, 0.5, MAP_H - 0.5) : base.player.z
  const sameMap = g.mapVersion === MAP_VERSION
  out.player = sameMap && walkable(Math.floor(px), Math.floor(pz)) ? { x: px, z: pz, rot: isNum(g.player?.rot) ? g.player.rot : 0 } : { ...base.player }
  const insideOk = g.view === 'inside' && typeof g.insideDest === 'string' && DEST_BY_ID[g.insideDest] && !OUTDOOR_KINDS.includes(DEST_BY_ID[g.insideDest].kind) && DEST_BY_ID[g.insideDest].kind !== 'home'
  out.view = g.view === 'home' ? 'home' : insideOk ? 'inside' : 'world'
  out.insideDest = insideOk ? g.insideDest : null
  out.viewing = null
  if (out.view === 'home' && g.viewing) out.view = 'world'
  out.tutorial = { step: isNum(g.tutorial?.step) ? Math.min(6, Math.max(0, g.tutorial.step)) : 6, done: !!g.tutorial?.done }
  if (out.tutorial.step >= 6) out.tutorial.done = true
  for (const k of Object.keys(base.stats) as (keyof typeof base.stats)[]) out.stats[k] = isNum(g.stats?.[k]) ? g.stats[k] : 0
  out.daily = {}
  if (g.daily && typeof g.daily === 'object') for (const [k, v] of Object.entries<any>(g.daily)) if (v && isNum(v.day) && isNum(v.n)) out.daily[k] = { day: v.day, n: v.n }
  const a = g.activity
  out.activity = a && isNum(a.total) && isNum(a.done) && isNum(a.scale) && a.total > 0 && typeof a.label === 'string' && a.needs && typeof a.needs === 'object' ? a : null
  // a police stop or arrest survives a reload, so refreshing the page is no way out
  const ev = g.event
  const held = ev && typeof ev.id === 'string' && ['arrest_offer', 'police_stop', 'checkpoint'].includes(ev.id) && ev.id in EVENTS
  out.event = held
    ? { id: ev.id, ctx: { ...(typeof ev.ctx?.offence === 'string' ? { offence: ev.ctx.offence } : {}), ...(typeof ev.ctx?.officer === 'string' && ev.ctx.officer in OFFICERS ? { officer: ev.ctx.officer } : {}) } }
    : null
  out.result = null
  out.eventCooldownUntil = isNum(g.eventCooldownUntil) ? g.eventCooldownUntil : out.minutes + 360
  out.rentWarnedFor = isNum(g.rentWarnedFor) ? g.rentWarnedFor : 0
  out.lowFlags = {}
  out.nextId = isNum(g.nextId) ? g.nextId : 1000
  // life systems (added in v1.1): merge onto defaults so older saves still load
  const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v)
  if (obj(g.health)) out.health = { ...base.health, ...g.health, illness: typeof g.health.illness === 'string' && g.health.illness in ILLNESSES ? (g.health.illness as keyof typeof ILLNESSES) : null }
  if (obj(g.legal)) out.legal = { ...base.legal, ...g.legal }
  if (obj(g.romance)) out.romance = { ...base.romance, ...g.romance }
  if (obj(g.edu)) out.edu = { ...base.edu, ...g.edu, degrees: Array.isArray(g.edu.degrees) ? g.edu.degrees : [] }
  out.owned = Array.isArray(g.owned) ? g.owned.filter((t: unknown) => typeof t === 'string' && t in HOMES) : []
  if (obj(g.plots)) out.plots = Object.fromEntries(Object.entries<any>(g.plots).filter(([k, v]) => k in PLOT_BY_ID && obj(v)).map(([k, v]) => [k, { owned: !!v.owned, boughtFor: isNum(v.boughtFor) ? v.boughtFor : 0, permit: ['none', 'pending', 'approved'].includes(v.permit) ? v.permit : 'none', permitReady: isNum(v.permitReady) ? v.permitReady : null, noPermit: !!v.noPermit, stage: isNum(v.stage) ? v.stage : 0, until: isNum(v.until) ? v.until : null, guards: ['none', 'active', 'settled'].includes(v.guards) ? v.guards : 'none', project: typeof v.project === 'string' && v.project in PROJECTS ? v.project : isNum(v.stage) && v.stage > 0 ? 'bungalow' : null }]))
  out.license = !!g.license
  out.vehicles = Array.isArray(g.vehicles) ? g.vehicles.filter((v: unknown) => v === 'okada' || v === 'pragia' || v === 'car' || v === 'trotro') : []
  if (obj(g.rentedDay)) out.rentedDay = g.rentedDay
  out.drive = null
  if (obj(g.loan) && isNum(g.loan.owed) && isNum(g.loan.due)) out.loan = { owed: g.loan.owed, due: g.loan.due, principal: isNum(g.loan.principal) ? g.loan.principal : g.loan.owed }
  out.credit = isNum(g.credit) ? Math.min(100, Math.max(0, g.credit)) : 50
  if (obj(g.items) && isNum(g.items.condoms)) out.items = { condoms: Math.max(0, g.items.condoms) }
  out.hookup = null
  // the city was redrawn: start outside your home and drop any trip in progress
  if (!sameMap) {
    const door = DEST_BY_ID[homeDestId(out)]?.door
    if (door && walkable(door.x, door.z)) out.player = { x: door.x + 0.5, z: door.z + 0.5, rot: 0 }
    if (out.activity && ((out.activity as { kind?: string }).kind === 'travel')) out.activity = null
  }
  out.businesses = {}
  if (obj(g.businesses))
    for (const [k, v] of Object.entries<any>(g.businesses)) if (obj(v) && isNum(v.level) && isNum(v.paid)) out.businesses[k] = { level: Math.min(3, Math.max(1, v.level)), paid: v.paid, since: isNum(v.since) ? v.since : 0, lastProfit: isNum(v.lastProfit) ? v.lastProfit : 0 }
  out.ticket = obj(g.ticket) && isNum(g.ticket.day) ? { day: g.ticket.day, vip: !!g.ticket.vip } : null
  // places that no longer exist (e.g. the old airport)
  if (out.activity) {
    const ac = out.activity as { ctx?: { dest?: string }; travelTo?: string }
    if ((ac.ctx?.dest && !DEST_BY_ID[ac.ctx.dest]) || (ac.travelTo && !DEST_BY_ID[ac.travelTo])) out.activity = null
  }
  if (obj(g.housing) && typeof g.housing.plotId === 'string' && out.plots[g.housing.plotId]) out.housing.plotId = g.housing.plotId
  if (obj(g.housing) && typeof g.housing.roomDest === 'string' && DEST_BY_ID[g.housing.roomDest]?.homeTier === 'room') out.housing.roomDest = g.housing.roomDest
  if (obj(g.housing) && g.housing.homeless === true && out.housing.tier === 'room') out.housing.homeless = true
  if (out.activity && (out.activity as { ctx?: { drive?: boolean } }).ctx?.drive) out.activity = null
  if (obj(g.upgrades)) out.upgrades = g.upgrades
  out.goalsActive = Array.isArray(g.goalsActive) ? g.goalsActive.filter((k: unknown) => typeof k === 'string') : []
  out.lifeFlags = obj(g.lifeFlags) ? Object.fromEntries(Object.entries<unknown>(g.lifeFlags).filter(([, v]) => isNum(v))) as Record<string, number> : {}
  out.rentedOut = Array.isArray(g.rentedOut) ? g.rentedOut.filter((k: unknown) => typeof k === 'string') : []
  const pt = g.pet
  out.pet = obj(pt) && typeof pt.type === 'string' && pt.type in PETS && typeof pt.name === 'string'
    ? { type: pt.type as keyof typeof PETS, name: pt.name.slice(0, 14), hunger: isNum(pt.hunger) ? clamp(pt.hunger) : 80, happy: isNum(pt.happy) ? clamp(pt.happy) : 80, clean: isNum(pt.clean) ? clamp(pt.clean) : 80, health: isNum(pt.health) ? clamp(pt.health) : 100, since: isNum(pt.since) ? pt.since : 0 }
    : null
  out.dreamStep = isNum(g.dreamStep) ? Math.max(0, Math.floor(g.dreamStep)) : 0
  out.dirty = isNum(g.dirty) ? Math.max(0, Math.min(g.dirty, out.money)) : 0
  // older saves: give illegal workers the street cred their job implies
  const illegalJob = !!(out.employment && CAREERS[out.employment]?.illegal)
  out.rep = obj(g.rep) && isNum(g.rep.street) && isNum(g.rep.respect)
    ? { street: clamp(g.rep.street), respect: clamp(g.rep.respect) }
    : { street: illegalJob ? 30 : Math.min(40, (out.legal?.record ?? 0) * 10), respect: Math.max(5, 30 - (out.legal?.record ?? 0) * 10) }
  out.laundered = {}
  if (obj(g.laundered)) for (const [k, v] of Object.entries<any>(g.laundered)) if (obj(v) && isNum(v.day) && isNum(v.amount)) out.laundered[k] = { day: v.day, amount: v.amount }
  out.tenants = {}
  if (obj(g.tenants))
    for (const [k, v] of Object.entries<any>(g.tenants))
      if (obj(v) && out.rentedOut.includes(k)) out.tenants[k] = { ...(isNum(v.owed) ? { owed: v.owed } : {}), ...(isNum(v.until) ? { until: v.until } : {}), ...(v.court ? { court: true } : {}) }
  out.homeStyle = {}
  if (obj(g.homeStyle))
    for (const [tier, st] of Object.entries<any>(g.homeStyle)) {
      if (!(tier in HOMES) || !obj(st)) continue
      const fixtures: Record<string, { x: number; y: number; rot: 0 | 1 | 2 | 3; stored?: boolean }> = {}
      if (obj(st.fixtures)) for (const [k, v] of Object.entries<any>(st.fixtures)) if (obj(v) && isNum(v.x) && isNum(v.y)) fixtures[k] = { x: v.x, y: v.y, rot: ([0, 1, 2, 3].includes(v.rot) ? v.rot : 0) as 0 | 1 | 2 | 3, ...(v.stored ? { stored: true } : {}) }
      out.homeStyle[tier as keyof typeof HOMES] = { wall: typeof st.wall === 'string' ? st.wall : undefined, floor: typeof st.floor === 'string' ? st.floor : undefined, fixtures }
    }
  if (obj(g.bank) && isNum(g.bank.balance)) out.bank = { open: !!g.bank.open, balance: g.bank.balance }
  if (obj(g.invest)) out.invest = { tbills: Array.isArray(g.invest.tbills) ? g.invest.tbills : [], shares: obj(g.invest.shares) ? g.invest.shares : {}, prices: { ...base.invest.prices, ...(obj(g.invest.prices) ? g.invest.prices : {}) } }
  if (obj(g.tasks) && Array.isArray(g.tasks.ids)) out.tasks = { day: isNum(g.tasks.day) ? g.tasks.day : 1, ids: g.tasks.ids, done: Array.isArray(g.tasks.done) ? g.tasks.done : [] }
  if (obj(g.today)) out.today = g.today
  out.goals = Array.isArray(g.goals) ? g.goals : []
  out.visited = Array.isArray(g.visited) ? g.visited : []
  if (obj(g.chats)) out.chats = g.chats
  if (obj(g.chatUnread)) out.chatUnread = g.chatUnread
  if (obj(g.chatDay)) out.chatDay = g.chatDay
  out.groups = {}
  if (obj(g.groups))
    for (const [k, v] of Object.entries(g.groups as Record<string, unknown>)) {
      const gr = v as { name?: unknown; emoji?: unknown; members?: unknown; createdAt?: unknown }
      if (!obj(gr) || typeof gr.name !== 'string' || !Array.isArray(gr.members)) continue
      out.groups[k] = { id: k, name: gr.name, emoji: typeof gr.emoji === 'string' ? gr.emoji : '👥', members: gr.members.filter((m): m is string => typeof m === 'string'), createdAt: isNum(gr.createdAt) ? gr.createdAt : 0 }
    }
  if (out.housing.tier === 'house' && (!out.owned.includes('house') || !out.housing.plotId)) out.housing.tier = 'room'
  return out
}

function parseEnvelope(parsed: any): SaveEnvelope {
  if (!parsed || typeof parsed.version !== 'number') throw new Error('missing version')
  if (parsed.version > GAME_CONFIG.save.version) throw new Error('save is from a newer version')
  // future migrations: if (parsed.version < 2) parsed = migrateV1toV2(parsed)
  return { version: parsed.version, savedAt: String(parsed.savedAt ?? ''), game: sanitize(parsed.game) }
}

/** The signed-in player's cloud save. */
export async function readCloudSave(): Promise<LoadResult> {
  let parsed: unknown
  try {
    const res = await fetch('/api/save', { cache: 'no-store' })
    if (!res.ok) return { status: 'invalid', reason: res.status === 401 ? 'not signed in' : 'server unavailable' }
    parsed = (await res.json()).save
  } catch {
    return { status: 'invalid', reason: 'could not reach the server' }
  }
  if (!parsed) return { status: 'none' }
  try {
    return { status: 'ok', env: parseEnvelope(parsed) }
  } catch (e) {
    return { status: 'invalid', reason: e instanceof Error ? e.message : 'unknown error' }
  }
}

/** Wipes the cloud save so a new character can start. */
export async function deleteCloudSave(): Promise<void> {
  await fetch('/api/save', { method: 'DELETE' }).catch(() => undefined)
}

/** A save from before accounts existed, still sitting in this browser (offered once for import). */
export function readDeviceSave(): LoadResult {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return { status: 'none' }
  }
  if (!raw) return { status: 'none' }
  try {
    return { status: 'ok', env: parseEnvelope(JSON.parse(raw)) }
  } catch (e) {
    return { status: 'invalid', reason: e instanceof Error ? e.message : 'unknown error' }
  }
}

/** Forget the device save once it lives in the cloud (a backup copy stays). */
export function retireDeviceSave() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) localStorage.setItem(`${KEY}:backup`, raw)
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
