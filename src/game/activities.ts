import { BALANCE, dayOf, formatMoney, hourOf } from './config'
import { isSunday, weekday } from './life'
import { useUI } from './ui'
import {
  CAREERS,
  DATE_ACT,
  DEGREE_WAGE_BONUS,
  DEST_ACTIVITIES,
  GOV_ACTIVITIES,
  KIND_ACTIVITIES,
  HEALTH,
  PROGRAMS,
  DEST_BY_ID,
  FARES,
  FURNITURE,
  FURNITURE_ACTIVITIES,
  STREET_CRIMES,
  PERMIT,
  PET_ACTIVITIES,
  PETS,
  HANGOUT,
  HOMES,
  NPCS,
  NPC_BY_ID,
  SKILLS,
  TRAITS,
} from './content'
import { sleepMultiplier } from './home'
import type { GameState } from './store'
import type { ActivityContext, ActivityDef, CareerId, FurnitureType, NeedId, Needs, SkillId } from './types'

export const NEED_META: Record<NeedId, { label: string; emoji: string }> = {
  hunger: { label: 'Hunger', emoji: '🍽️' },
  energy: { label: 'Energy', emoji: '⚡' },
  hygiene: { label: 'Hygiene', emoji: '🧼' },
  bladder: { label: 'Bladder', emoji: '🚻' },
  fun: { label: 'Fun', emoji: '🎈' },
  social: { label: 'Social', emoji: '💬' },
}

export function levelFromXp(xp: number): number {
  let l = 0
  for (const t of BALANCE.skillLevelXp) if (xp >= t) l++
  return l
}
export const skillLevel = (s: Pick<GameState, 'skills'>, id: SkillId) => levelFromXp(s.skills[id] ?? 0)

export function friendIndex(points: number): number {
  let idx = 0
  BALANCE.friendship.levels.forEach((l, i) => {
    if (points >= l.at) idx = i
  })
  return idx
}
export const friendName = (points: number) => BALANCE.friendship.levels[friendIndex(points)].name
export const friendPoints = (s: Pick<GameState, 'friendships'>, npc: string) => s.friendships[npc]?.points ?? 0

export function friendDiscount(s: Pick<GameState, 'friendships'>, destId: string): number {
  let d = 0
  for (const n of NPCS) {
    if (n.perk.destId === destId && n.perk.discount && friendPoints(s, n.id) >= n.perk.friendAt) d = Math.max(d, n.perk.discount)
  }
  return d
}

export function priceMultiplier(s: Pick<GameState, 'profile' | 'friendships'>, destId?: string): number {
  let m = 1
  for (const t of s.profile?.traits ?? []) m *= TRAITS[t].price ?? 1
  if (destId) m *= 1 - friendDiscount(s, destId)
  return m
}

/** Hours like [18, 6] run past midnight. */
export function isOpen(hours: [number, number], h: number) {
  return hours[0] <= hours[1] ? h >= hours[0] && h < hours[1] : h >= hours[0] || h < hours[1]
}
const fmtHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h >= 12 && h < 24 ? 'pm' : 'am'}`

export function lowNeedCount(needs: Needs) {
  return Object.values(needs).filter((v) => v < BALANCE.lowNeed).length
}
export const efficiency = (needs: Needs) => Math.max(0.5, 1 - BALANCE.lowNeedPayPenalty * lowNeedCount(needs))

export function furnitureTypeOf(s: Pick<GameState, 'housing' | 'inventory'>, id: number): FurnitureType | null {
  if (id < 0) return HOMES[s.housing.tier].fixtures[-id - 1]?.type ?? null
  return s.inventory.find((o) => o.uid === id)?.type ?? null
}

export interface Resolved {
  def: ActivityDef
  ctx: ActivityContext
  cost: number
  minutes: number
  needs: Partial<Needs>
  skillXp: Partial<Record<SkillId, number>>
  reward: number
  careerXp: number
  scale: number
  ok: boolean
  reason?: string
}

export function dailyUsed(s: Pick<GameState, 'daily' | 'minutes'>, id: string) {
  const d = s.daily[id]
  return d && d.day === dayOf(s.minutes) ? d.n : 0
}

export function resolve(def: ActivityDef, ctx: ActivityContext, s: GameState): Resolved {
  const traits = (s.profile?.traits ?? []).map((t) => TRAITS[t])
  const dest = ctx.dest ? DEST_BY_ID[ctx.dest] : undefined
  const hour = hourOf(s.minutes)
  const isWork = def.kind === 'work'
  const pm = def.kind === 'travel' ? 1 : priceMultiplier(s, dest?.id)
  let baseCost = def.cost ?? 0
  if (def.effect === 'consult' && s.health.nhis) baseCost = HEALTH.consultNhis
  if (def.effect === 'checkup' && friendPoints(s, 'ama') >= NPC_BY_ID.ama.perk.friendAt) baseCost = 0
  if (def.effect === 'wedding' && friendPoints(s, 'asante') >= NPC_BY_ID.asante.perk.friendAt) baseCost = baseCost / 2
  const cost = Math.round(baseCost * pm)
  const fit = skillLevel(s, 'fitness')

  const foodGain = traits.reduce((m, t) => m * (t.foodGain ?? 1), 1)
  const socialGain = traits.reduce((m, t) => m * (t.socialGain ?? 1), 1)
  const workEnergy = traits.reduce((m, t) => m * (t.workEnergy ?? 1), 1)
  const wage = traits.reduce((m, t) => m * (t.wage ?? 1), 1)

  let bedMult = 1
  if (def.kind === 'sleep' && ctx.furnitureUid !== undefined) {
    const type = furnitureTypeOf(s, ctx.furnitureUid)
    if (type) bedMult = sleepMultiplier(s.housing.tier, s.inventory, type, s.upgrades[s.housing.tier] ?? [])
  }

  const needs: Partial<Needs> = {}
  for (const [k, v] of Object.entries(def.needs ?? {}) as [NeedId, number][]) {
    let val = v
    if (v > 0) {
      if (k === 'hunger' && def.kind === 'meal') val *= foodGain
      if (k === 'social') {
        val *= socialGain
        if (s.needs.hygiene < BALANCE.lowNeed) val *= 0.5
      }
      if (k === 'energy' && def.kind === 'sleep') val *= bedMult
    } else if (k === 'energy' && isWork) {
      val *= workEnergy * (1 - 0.03 * fit)
    }
    needs[k] = Math.round(val)
  }
  if (def.skillNeedBonus) {
    const b = def.skillNeedBonus
    needs[b.need] = Math.round((needs[b.need] ?? 0) + b.perLevel * skillLevel(s, b.skill))
  }

  const skillXp: Partial<Record<SkillId, number>> = {}
  const baseXp: Partial<Record<SkillId, number>> = { ...(def.skillXp ?? {}) }
  if (def.effect === 'lecture' && s.edu.program) {
    const sk = PROGRAMS[s.edu.program].skill
    baseXp[sk] = (baseXp[sk] ?? 0) + (friendPoints(s, 'danso') >= NPC_BY_ID.danso.perk.friendAt ? 40 : 30)
  }
  for (const [k, v] of Object.entries(baseXp) as [SkillId, number][]) {
    let m = traits.reduce((a, t) => a * (t.skillXp?.[k] ?? 1), 1)
    if (isWork && k === 'technology' && friendPoints(s, 'kofi') >= NPC_BY_ID.kofi.perk.friendAt) m *= 1.2
    skillXp[k] = Math.max(1, Math.round(v * m))
  }

  let reward = def.reward ?? 0
  let careerXp = 0
  if (isWork && ctx.career) {
    const lvl = CAREERS[ctx.career].levels[(s.careers[ctx.career]?.level ?? 1) - 1]
    const degree = s.edu.degrees.some((p) => PROGRAMS[p].career === ctx.career)
    reward = Math.round(reward * wage * efficiency(s.needs) * (degree ? DEGREE_WAGE_BONUS : 1))
    careerXp = lvl.careerXp
  }

  // time scale: game minutes per real second
  const real = def.timeScale === 'sleep' ? BALANCE.sleepRealSeconds : BALANCE.activityRealSeconds
  // work shifts run longer in real time so there is time to do the shift tasks
  const secs = isWork ? BALANCE.shiftRealSeconds : Math.min(real.max, Math.max(real.min, def.minutes * real.perGameMinute))
  const scale = def.timeScale === 'travel' ? BALANCE.travelMinutesPerSecond : def.minutes / secs

  // ---- availability ------------------------------------------------
  let reason: string | undefined
  if (s.event) reason = 'Deal with what is happening first'
  else if (s.activity) reason = 'Finish your current activity first'
  else if (s.viewing && ctx.furnitureUid !== undefined) reason = 'You are only viewing this home'
  else if (dest && s.view === 'world' && s.nearDest !== dest.id) reason = `Walk to ${dest.name} first`
  else if (dest && !isOpen(dest.hours, hour) && dest.hours[0] !== 0) reason = `Closed. Opens ${fmtHour(dest.hours[0])}`
  else if (def.hours && !isOpen(def.hours, hour)) reason = `Available ${fmtHour(def.hours[0])} to ${def.hours[1] === 24 ? 'midnight' : fmtHour(def.hours[1])}`
  else if (s.money < cost) reason = `Need ${formatMoney(cost - s.money)} more`
  else {
    for (const [k, v] of Object.entries(def.minSkill ?? {}) as [SkillId, number][])
      if (skillLevel(s, k) < v) reason = `Needs ${SKILLS[k].name} level ${v}`
    for (const [k, v] of Object.entries(def.maxNeed ?? {}) as [NeedId, number][])
      if (!reason && s.needs[k] > v) reason = k === 'energy' ? 'You are not tired enough' : k === 'bladder' ? 'You do not need to go' : 'Already fresh'
    for (const [k, v] of Object.entries(def.minNeed ?? {}) as [NeedId, number][])
      if (!reason && s.needs[k] < v) reason = k === 'energy' ? 'Too exhausted to work. Rest first' : k === 'hunger' ? 'Too hungry to work. Eat first' : `${NEED_META[k].label} too low`
    if (!reason && def.dailyLimit && dailyUsed(s, def.id) >= def.dailyLimit) reason = 'Daily limit reached. Come back tomorrow'
    if (!reason && def.require) reason = specialReason(def.require, s)
    if (!reason && isWork && s.health.illness && !s.health.mild) reason = 'Too sick to work. See a doctor at Korle Bu'
  }

  return { def, ctx, cost, minutes: def.minutes, needs, skillXp, reward, careerXp, scale, ok: !reason, reason }
}

/** Activities offered at a destination: its own list, else the shared list for its kind. */
const KIND_SOURCE: Record<string, string> = { food: 'foodstall', market: 'market', mall: 'mall', lounge: 'lounge', school: 'university', hospital: 'hospital', beach: 'beach', gym: 'gym' }
export function destActs(destId: string): ActivityDef[] {
  const d = DEST_BY_ID[destId]
  if (!d) return []
  const own = DEST_ACTIVITIES[destId] ?? GOV_ACTIVITIES[destId] ?? KIND_ACTIVITIES[d.kind]
  if (own) return own
  const src = KIND_SOURCE[d.kind]
  return src ? (DEST_ACTIVITIES[src] ?? []).filter((a) => a.id !== 'dishes' && a.kind !== 'oddjob' || d.kind === 'market') : []
}

function specialReason(req: string, s: GameState): string | undefined {
  const day = dayOf(s.minutes)
  switch (req) {
    case 'sick': return s.health.illness ? undefined : 'You are not sick'
    case 'healthy': return s.health.illness ? 'You are unwell. See a doctor instead' : undefined
    case 'noNhis': return s.health.nhis ? 'Already registered' : undefined
    case 'notEnrolled': return s.edu.program ? `Already enrolled in ${PROGRAMS[s.edu.program].name}` : undefined
    case 'enrolled': return s.edu.program ? undefined : 'Enrol in a programme first'
    case 'sunday': return isSunday(day) ? undefined : `Sundays only. Today is ${weekday(day)}`
    case 'pet': return s.pet ? undefined : 'You have no pet. Buy one at Makola Market'
    case 'petwalk': return !s.pet ? 'You have no pet' : PETS[s.pet.type].walk ? undefined : `${PETS[s.pet.type].name}s do not go for walks`
    case 'engaged': return s.romance.stage === 'engaged' ? undefined : 'You need to be engaged first'
    case 'needRing': return s.romance.ring ? 'You already have a ring' : s.romance.stage !== 'dating' ? 'You need a partner to propose to' : undefined
    case 'noBank': return s.bank.open ? 'You already have an account' : undefined
    case 'hasCase': return s.legal.caseDeadline !== null ? undefined : 'You have no fine to pay'
    case 'needPermit': return Object.values(s.plots).some((p) => p.owned && p.permit === 'none') ? undefined : 'You have no land waiting for a permit'
    case 'noLicense': return s.license ? 'You already have a licence' : undefined
    case 'ticket': return s.ticket && s.ticket.day === day ? undefined : "You need a ticket for tonight's show (box office)"
    case 'noTicket': return s.ticket && s.ticket.day === day ? 'You already have a ticket for tonight' : undefined
    case 'mature': return useUI.getState().settings.mature ? undefined : 'Turn on mature content (18+) in Settings'
    default: return undefined
  }
}

export function workDef(s: Pick<GameState, 'careers'>, career: CareerId): ActivityDef | null {
  const prog = s.careers[career]
  if (!prog) return null
  const c = CAREERS[career]
  const lvl = c.levels[prog.level - 1]
  const factor = lvl.minutes / 240
  const needs: Partial<Needs> = {}
  for (const [k, v] of Object.entries(c.shiftNeeds) as [NeedId, number][]) needs[k] = Math.round(v * factor)
  return {
    id: `work:${career}`,
    label: `Work shift: ${lvl.title}`,
    blurb: `${c.name} at ${DEST_BY_ID[c.workplace].name}.`,
    icon: c.emoji,
    kind: 'work',
    minutes: lvl.minutes,
    reward: lvl.pay,
    needs,
    skillXp: { [c.skill]: c.skillXpPerShift },
    minNeed: { energy: 20, hunger: 10 },
  }
}

export function travelDef(fromId: string, toId: string): ActivityDef | null {
  const from = DEST_BY_ID[fromId]
  const to = DEST_BY_ID[toId]
  if (!from || !to) return null
  const fare = FARES[`${from.district}>${to.district}`]
  if (!fare) return null
  return { id: `travel:${toId}`, label: `Ride to ${to.name}`, blurb: `Trotro to ${to.district}.`, icon: '🚌', kind: 'travel', minutes: fare.minutes, cost: fare.fare, timeScale: 'travel' }
}

export function hangoutDef(): ActivityDef {
  return HANGOUT
}

/** Everything a player can do at a destination right now (resolved with reasons). */
export function activitiesForDest(s: GameState, destId: string): Resolved[] {
  const dest = DEST_BY_ID[destId]
  const out: Resolved[] = []
  const ctx: ActivityContext = { dest: destId }
  if (s.employment && CAREERS[s.employment].workplace === destId) {
    const w = workDef(s, s.employment)
    if (w) out.push(resolve(w, { dest: destId, career: s.employment }, s))
  }
  const mature = useUI.getState().settings.mature
  // building permits are filed per plot: one line for each plot still waiting
  const waiting = Object.keys(s.plots).filter((k) => s.plots[k].owned && s.plots[k].permit === 'none')
  for (const def of destActs(destId)) {
    if (def.require === 'mature' && !mature) continue
    if ((def.effect === 'permit' || def.effect === 'permitbribe') && waiting.length) {
      for (const pid of waiting) out.push(resolve(permitDef(def, pid), { dest: destId, plot: pid }, s))
      continue
    }
    out.push(resolve(def, ctx, s))
  }
  const partner = s.romance.partner
  if (partner && ['lounge', 'beach', 'mall', 'park', 'hotel', 'zoo', 'square'].includes(dest.kind)) {
    out.push(resolve({ ...DATE_ACT, id: `date:${partner}`, label: `Date with ${NPC_BY_ID[partner].name}`, hours: dest.hours[0] === 0 ? undefined : dest.hours }, { dest: destId, npc: partner }, s))
  }
  for (const npcId of dest.npcs) {
    if (friendPoints(s, npcId) >= BALANCE.friendship.hangoutUnlock)
      out.push(resolve({ ...HANGOUT, id: `npc_hangout:${npcId}`, label: `Hang out with ${NPC_BY_ID[npcId].name}`, hours: dest.hours[0] === 0 ? undefined : dest.hours }, { dest: destId, npc: npcId }, s))
  }
  return out
}

export function activitiesForFurniture(s: GameState, id: number): Resolved[] {
  const type = furnitureTypeOf(s, id)
  if (!type) return []
  return (FURNITURE_ACTIVITIES[type] ?? []).map((d) => resolve(d, { furnitureUid: id }, s))
}

/** Find an activity definition from its id and context (used when starting). */
/** A permit action for one particular plot. */
function permitDef(def: ActivityDef, plotId: string): ActivityDef {
  return { ...def, id: `${def.id}:${plotId}`, label: `${def.label}: ${DEST_BY_ID[plotId]?.name ?? 'your land'}`, blurb: def.effect === 'permit' ? `For ${DEST_BY_ID[plotId]?.name}. Ready in ${PERMIT.days} days.` : def.blurb, require: undefined }
}

export function findDef(s: GameState, defId: string, ctx: ActivityContext): ActivityDef | null {
  if (ctx.plot && ctx.dest && /^permit(bribe)?:/.test(defId)) {
    const base = destActs(ctx.dest).find((d) => d.id === defId.split(':')[0])
    const p = s.plots[ctx.plot]
    return base && p?.owned && p.permit === 'none' ? permitDef(base, ctx.plot) : null
  }
  if (defId.startsWith('work:')) return workDef(s, defId.slice(5) as CareerId)
  if (defId.startsWith('travel:')) return ctx.dest ? travelDef(ctx.dest, defId.slice(7)) : null
  if (defId.startsWith('date:')) {
    const npc = NPC_BY_ID[defId.slice(5)]
    return npc ? { ...DATE_ACT, id: defId, label: `Date with ${npc.name}` } : null
  }
  if (defId.startsWith('npc_hangout')) {
    const npc = ctx.npc ? NPC_BY_ID[ctx.npc] : null
    return npc ? { ...HANGOUT, id: defId, label: `Hang out with ${npc.name}` } : null
  }
  if (ctx.street) return STREET_CRIMES.find((d) => d.id === defId) ?? null
  if (ctx.pet) return PET_ACTIVITIES.find((d) => d.id === defId) ?? null
  if (ctx.dest) return destActs(ctx.dest).find((d) => d.id === defId) ?? null
  if (ctx.furnitureUid !== undefined) {
    const type = furnitureTypeOf(s, ctx.furnitureUid)
    return type ? (FURNITURE_ACTIVITIES[type] ?? []).find((d) => d.id === defId) ?? null : null
  }
  return null
}

export function describeEffects(r: Resolved): { label: string; tone: 'plus' | 'minus' | 'neutral' }[] {
  const out: { label: string; tone: 'plus' | 'minus' | 'neutral' }[] = []
  for (const [k, v] of Object.entries(r.needs) as [NeedId, number][]) if (v) out.push({ label: `${NEED_META[k].emoji} ${NEED_META[k].label} ${v > 0 ? '+' : ''}${v}`, tone: v > 0 ? 'plus' : 'minus' })
  for (const [k, v] of Object.entries(r.skillXp) as [SkillId, number][]) out.push({ label: `${SKILLS[k].emoji} ${SKILLS[k].name} +${v} XP`, tone: 'plus' })
  if (r.reward) out.push({ label: `💰 Earn ${formatMoney(r.reward)}`, tone: 'plus' })
  if (r.careerXp) out.push({ label: `⭐ Career +${r.careerXp} XP`, tone: 'plus' })
  if (r.def.crime) out.push({ label: `🎲 ~${Math.round(r.def.crime.chance * 100)}% success · ${formatMoney(r.def.crime.min)}–${formatMoney(r.def.crime.max)} · arrest if caught`, tone: 'minus' })
  return out
}
