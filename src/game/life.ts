import { formatMoney, hourOf } from './config'
import { CAREERS, DESTINATIONS, DEST_BY_ID, KM_PER_TILE, PROGRAMS, PROJECTS, RIDES, projectStages, type Lifestyle, type RideMode } from './content'
import type { GameState } from './store'

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Day 1 is a Monday. */
export const weekday = (day: number) => WEEKDAYS[day % 7]
export const isSunday = (day: number) => day % 7 === 0

/* ------------------------------ daily tasks ------------------------------ */
export interface TaskDef {
  id: string
  text: string
  icon: string
  keys: string[]
  target: number
  reward: number
  req?: 'employed' | 'dating' | 'bank' | 'sunday'
}
export const TASKS: TaskDef[] = [
  { id: 'eat_banku', text: 'Eat banku & tilapia', icon: '🐟', keys: ['act:banku'], target: 1, reward: 20 },
  { id: 'eat_waakye', text: 'Have waakye', icon: '🍛', keys: ['act:waakye'], target: 1, reward: 15 },
  { id: 'work', text: 'Work a shift', icon: '💼', keys: ['kind:work'], target: 1, reward: 30, req: 'employed' },
  { id: 'chat2', text: 'Chat with 2 people in person', icon: '💬', keys: ['chat'], target: 2, reward: 20 },
  { id: 'dance', text: 'Go to Labadi Beach Club', icon: '💃', keys: ['dest:lounge'], target: 1, reward: 25 },
  { id: 'beach', text: 'Enjoy Labadi Beach', icon: '🏖️', keys: ['dest:beach'], target: 1, reward: 20 },
  { id: 'gym', text: 'Get some exercise', icon: '🏋️', keys: ['act:workout', 'act:boxing', 'act:beachfootball', 'act:swim', 'act:yoga'], target: 1, reward: 20 },
  { id: 'learn', text: 'Study or attend a class', icon: '📚', keys: ['kind:study'], target: 1, reward: 25 },
  { id: 'save', text: 'Save GH₵100 in the bank', icon: '🏦', keys: ['save'], target: 100, reward: 30, req: 'bank' },
  { id: 'earn', text: 'Earn GH₵150 today', icon: '💰', keys: ['earn'], target: 150, reward: 30 },
  { id: 'shower', text: 'Take a shower', icon: '🚿', keys: ['act:h_shower', 'act:washshower', 'act:gymshower'], target: 1, reward: 10 },
  { id: 'park', text: 'Visit Kwame Nkrumah Memorial Park', icon: '🗿', keys: ['dest:park'], target: 1, reward: 25 },
  { id: 'momo', text: 'Send MoMo to a friend', icon: '📲', keys: ['momo'], target: 1, reward: 15 },
  { id: 'text', text: 'Text friends on your phone', icon: '✉️', keys: ['text'], target: 2, reward: 10 },
  { id: 'date', text: 'Go on a date', icon: '💕', keys: ['act:date'], target: 1, reward: 40, req: 'dating' },
  { id: 'jamestown', text: 'Visit Jamestown', icon: '🗼', keys: ['dest:jamestown'], target: 1, reward: 25 },
  { id: 'movie', text: 'Catch a movie at Accra Mall', icon: '🎬', keys: ['act:cinema'], target: 1, reward: 25 },
  { id: 'hustle', text: 'Do a side hustle', icon: '🤑', keys: ['kind:oddjob'], target: 1, reward: 20 },
  { id: 'church', text: 'Attend Sunday service', icon: '⛪', keys: ['act:service'], target: 1, reward: 30, req: 'sunday' },
  { id: 'cook', text: 'Cook a meal at home', icon: '🍳', keys: ['act:cook'], target: 1, reward: 15 },
  { id: 'trotro', text: 'Take a trotro somewhere', icon: '🚐', keys: ['ride:trotro'], target: 1, reward: 10 },
]
export const TASK_BY_ID: Record<string, TaskDef> = Object.fromEntries(TASKS.map((t) => [t.id, t]))

export function taskProgress(s: Pick<GameState, 'today'>, t: TaskDef): number {
  return Math.min(t.target, t.keys.reduce((a, k) => a + (s.today[k] ?? 0), 0))
}

export function pickTasks(s: Pick<GameState, 'employment' | 'romance' | 'bank'>, day: number): string[] {
  const ok = TASKS.filter((t) => {
    if (t.req === 'employed') return !!s.employment
    if (t.req === 'dating') return !!s.romance.partner
    if (t.req === 'bank') return s.bank.open
    if (t.req === 'sunday') return isSunday(day)
    return true
  })
  // deterministic shuffle per day
  let seed = day * 9301 + 49297
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const pool = [...ok].sort(() => rnd() - 0.5)
  const sunday = ok.find((t) => t.req === 'sunday')
  const picks = pool.slice(0, 3).map((t) => t.id)
  if (sunday && !picks.includes(sunday.id)) picks[0] = sunday.id
  return picks
}

/* ------------------------------ life goals ------------------------------ */
/**
 * Life goals follow your life. Each goal can
 *  - appear when your situation calls for it (base goals appear at the start),
 *  - be achieved (cash reward), or
 *  - drop away when life changes and it no longer makes sense.
 * Repeatable goals can come back (e.g. getting well every time you fall sick).
 */
export interface GoalDef {
  id: string
  name: string
  icon: string
  reward: number
  /** Why this goal is on your list (shown under it). */
  why?: string
  /** Only for these lifestyles (default: everyone). */
  for?: Lifestyle[]
  /** When it shows up (default: from the start). */
  appear?: (s: GameState) => boolean
  test: (s: GameState) => boolean
  /** Life moved on: quietly remove it without a reward. */
  drop?: (s: GameState) => boolean
  repeat?: boolean
}
const careerLevels = (s: GameState) => Object.values(s.careers).map((c) => c?.level ?? 0)
const wealth = (s: GameState) => s.money + s.bank.balance
const flag = (s: GameState, k: string) => (s.lifeFlags ?? {})[k] !== undefined
const daysSince = (s: GameState, k: string) => (flag(s, k) ? (s.minutes - s.lifeFlags[k]) / 1440 : 0)
const builtPlot = (s: GameState) => Object.values(s.plots).some((p) => p.owned && p.stage >= projectStages(p.project).length)
const earningProperty = (s: GameState) =>
  s.rentedOut.length > 0 || Object.values(s.plots).some((p) => p.owned && p.stage >= projectStages(p.project).length && !!PROJECTS[p.project ?? 'bungalow'].income)
const NOT_RICH: Lifestyle[] = ['hustler', 'worker']

export const GOALS: GoalDef[] = [
  /* ---- everyone ---- */
  { id: 'job', name: 'Land your first job', icon: '💼', reward: 50, appear: (s) => !flag(s, 'fired'), test: (s) => !!s.employment },
  { id: 'promo', name: 'Get promoted', icon: '📈', reward: 150, appear: (s) => !!s.employment, test: (s) => careerLevels(s).some((l) => l >= 2) },
  { id: 'top', name: 'Reach the top of a career', icon: '🏆', reward: 800, appear: (s) => careerLevels(s).some((l) => l >= 2), test: (s) => careerLevels(s).some((l) => l >= 3) },
  { id: 'bank', name: 'Open a bank account', icon: '🏦', reward: 30, test: (s) => s.bank.open },
  { id: 'friends', name: 'Make 3 good friends', icon: '🤝', reward: 150, test: (s) => Object.values(s.friendships).filter((f) => f.points >= 40).length >= 3 },
  { id: 'love', name: 'Find love', icon: '💕', reward: 100, appear: (s) => !flag(s, 'breakup'), test: (s) => !!s.romance.partner },
  { id: 'tourist', name: 'See Accra: beach, park, Jamestown & club', icon: '📸', reward: 150, test: (s) => ['beach', 'park', 'jamestown', 'lounge'].every((d) => s.visited.includes(d)) },
  { id: 'land', name: 'Buy land', icon: '🗺️', reward: 300, appear: (s) => wealth(s) >= 2000, why: 'You have some money now. Land only gets dearer.', test: (s) => Object.values(s.plots).some((p) => p.owned) },
  { id: 'house', name: 'Own a house', icon: '🏡', reward: 1500, appear: (s) => wealth(s) >= 5000 || Object.values(s.plots).some((p) => p.owned), test: (s) => s.owned.length > 0 },
  { id: 'graduate', name: 'Graduate from Legon', icon: '🎓', reward: 400, appear: (s) => !!s.edu.program, why: 'You enrolled. Finish what you started.', test: (s) => s.edu.degrees.length > 0, drop: (s) => !s.edu.program && !s.edu.degrees.length },
  { id: 'investor', name: 'Make your first investment', icon: '📊', reward: 80, appear: (s) => s.bank.open, test: (s) => s.invest.tbills.length > 0 || Object.values(s.invest.shares).some((n) => n > 0) },

  /* ---- hustler: from the bottom ---- */
  { id: 'h_1k', name: 'From nothing to GH₵1,000', icon: '💪', reward: 150, for: ['hustler'], test: (s) => wealth(s) >= 1000 },
  { id: 'h_moveout', name: 'Move out of the compound', icon: '🚪', reward: 250, for: ['hustler'], appear: (s) => wealth(s) >= 800, why: 'You can almost afford better. Time to level up.', test: (s) => s.housing.tier !== 'room' },
  { id: 'h_biz', name: 'Start your own business', icon: '🏪', reward: 400, for: ['hustler'], appear: (s) => wealth(s) >= 1500, test: (s) => Object.keys(s.businesses).length > 0 },

  /* ---- working class ---- */
  { id: 'saver', name: 'Save GH₵5,000 in the bank', icon: '💎', reward: 300, for: NOT_RICH, appear: (s) => s.bank.open, test: (s) => s.bank.balance >= 5000 },
  { id: 'licence', name: 'Get a driving licence', icon: '🪪', reward: 100, for: NOT_RICH, test: (s) => s.license },
  { id: 'wheels', name: 'Own a vehicle', icon: '🚗', reward: 300, for: NOT_RICH, appear: (s) => s.license || wealth(s) >= 3000, test: (s) => s.vehicles.length > 0 },

  /* ---- dada ba: prove yourself ---- */
  { id: 'd_work', name: 'Work 10 shifts like everyone else', icon: '🧹', reward: 300, for: ['dadaba'], why: 'Prove you are more than your parents’ money.', test: (s) => s.stats.shiftsCompleted >= 10 },
  { id: 'd_rent', name: 'Pay your own rent', icon: '🧾', reward: 400, for: ['dadaba'], appear: (s) => s.minutes > s.housing.nextRentDue - 3 * 1440, why: 'Your parents’ prepaid rent runs out soon.', test: (s) => s.transactions.some((t) => t.category === 'rent') },
  { id: 'd_landlord', name: 'Become a landlord', icon: '🏘️', reward: 800, for: ['dadaba'], test: (s) => earningProperty(s) },
  { id: 'd_saver', name: 'Grow your money to GH₵20,000', icon: '💎', reward: 1000, for: ['dadaba'], test: (s) => wealth(s) >= 20000 },

  /* ---- life happens ---- */
  { id: 's_well', name: 'Get well again', icon: '🩺', reward: 20, repeat: true, appear: (s) => !!s.health.illness, why: 'You are sick. See a doctor or a pharmacy.', test: (s) => !s.health.illness },
  { id: 's_loan', name: 'Pay off your loan', icon: '🧾', reward: 50, repeat: true, appear: (s) => !!s.loan, why: 'Debt is heavy. Clear it before it grows.', test: (s) => !s.loan },
  { id: 's_newjob', name: 'Find a new job', icon: '🔍', reward: 60, repeat: true, appear: (s) => flag(s, 'fired') && !s.employment, why: 'You lost your job. Get back on your feet.', test: (s) => !!s.employment },
  { id: 's_broke', name: 'Get back on your feet (GH₵300)', icon: '🪙', reward: 40, repeat: true, appear: (s) => wealth(s) < 30 && s.minutes > 1440, why: 'Money is very tight right now.', test: (s) => wealth(s) >= 300 },
  { id: 's_clean', name: 'Stay out of trouble for a week', icon: '😇', reward: 150, appear: (s) => s.legal.record > 0, why: 'You have a criminal record. Keep your head down.', test: (s) => s.legal.heat < 15 && daysSince(s, 'trouble') >= 7 },
  { id: 's_engaged', name: 'Get engaged', icon: '💍', reward: 200, appear: (s) => !!s.romance.partner && s.romance.dates >= 2, test: (s) => s.romance.stage === 'engaged' || s.romance.stage === 'married', drop: (s) => !s.romance.partner },
  { id: 'married', name: 'Get married', icon: '💒', reward: 1000, appear: (s) => s.romance.stage === 'engaged', test: (s) => s.romance.stage === 'married', drop: (s) => !s.romance.partner },
  { id: 's_lovelost', name: 'Find love again', icon: '❤️‍🩹', reward: 100, repeat: true, appear: (s) => flag(s, 'breakup') && !s.romance.partner, why: 'Heartbreak hurts. Time heals.', test: (s) => !!s.romance.partner },
  { id: 's_family', name: 'Build a home for your family', icon: '👨‍👩‍👧', reward: 600, appear: (s) => s.romance.stage === 'married', test: (s) => s.owned.length > 0, drop: (s) => s.romance.stage !== 'married' },
  { id: 's_build', name: 'Build on your land', icon: '🏗️', reward: 400, appear: (s) => Object.values(s.plots).some((p) => p.owned), test: (s) => builtPlot(s), drop: (s) => !Object.values(s.plots).some((p) => p.owned) },
  { id: 's_rent', name: 'Earn rent from a property', icon: '🔑', reward: 300, for: NOT_RICH, appear: (s) => builtPlot(s) || s.owned.some((t) => t !== 'house' && t !== s.housing.tier), test: (s) => earningProperty(s) },
  { id: 's_field', name: 'Work in your field', icon: '🎯', reward: 200, appear: (s) => s.edu.degrees.length > 0, why: 'Your degree pays more in the right job.', test: (s) => !!s.employment && s.edu.degrees.some((p) => PROGRAMS[p].career === s.employment) },
  { id: 's_bizup', name: 'Grow a business to level 3', icon: '📈', reward: 400, appear: (s) => Object.keys(s.businesses).length > 0, test: (s) => Object.values(s.businesses).some((b) => b.level >= 3), drop: (s) => Object.keys(s.businesses).length === 0 },
  { id: 's_moveup', name: 'Move back up', icon: '⬆️', reward: 150, repeat: true, appear: (s) => flag(s, 'evicted') && s.housing.tier === 'room', why: 'You lost your home over rent. Climb back.', test: (s) => s.housing.tier !== 'room' },
]
/* ------------------------------ dreams in life ------------------------------ */
/** One step towards a dream: a test, an optional progress bar and where to go. */
export interface DreamStep {
  text: string
  hint: string
  test: (s: GameState) => boolean
  progress?: (s: GameState) => { cur: number; total: number; label: string }
  dest?: string
}
export interface DreamDef {
  id: string
  name: string
  emoji: string
  blurb: string
  /** Clean or crooked: shown on the card. */
  path: 'clean' | 'crooked' | 'either'
  steps: DreamStep[]
}
/** Cash rewards for each step of a dream, smallest first. */
export const DREAM_REWARDS = [100, 250, 500, 1000, 3000]
const worth = (n: number) => (s: GameState) => ({ cur: Math.min(wealth(s), n), total: n, label: 'Net worth' })
const properties = (s: GameState) => s.owned.length + Object.values(s.plots).filter((p) => p.owned && p.stage >= projectStages(p.project).length).length
const legitTop = (s: GameState) => Object.entries(s.careers).some(([k, c]) => (c?.level ?? 0) >= 3 && !CAREERS[k as keyof typeof CAREERS]?.illegal)
const legitJob = (s: GameState) => !!s.employment && !CAREERS[s.employment]?.illegal
export const AMBITIONS: DreamDef[] = [
  {
    id: 'tycoon', name: 'Business tycoon', emoji: '🏢', path: 'clean', blurb: 'Build an empire of businesses across Accra.',
    steps: [
      { text: 'Save GH₵5,000', hint: 'Work shifts and hustles. Spend wisely.', test: (s) => wealth(s) >= 5000, progress: worth(5000) },
      { text: 'Buy your first business', hint: 'Businesses are sold at Accra Realty.', test: (s) => Object.keys(s.businesses).length > 0, dest: 'realty' },
      { text: 'Grow a business to level 3', hint: 'Upgrade it from the Assets app.', test: (s) => Object.values(s.businesses).some((b) => b.level >= 3) },
      { text: 'Own 3 businesses', hint: 'Profits land every morning. Reinvest them.', test: (s) => Object.keys(s.businesses).length >= 3, progress: (s) => ({ cur: Math.min(3, Object.keys(s.businesses).length), total: 3, label: 'Businesses' }), dest: 'realty' },
      { text: 'Be worth GH₵100,000', hint: 'Cash plus savings. You are almost a tycoon.', test: (s) => wealth(s) >= 100000, progress: worth(100000) },
    ],
  },
  {
    id: 'landlord', name: 'Property mogul', emoji: '🏘️', path: 'clean', blurb: 'Land, houses and tenants paying you rent.',
    steps: [
      { text: 'Save GH₵10,000', hint: 'Land is the first big buy.', test: (s) => wealth(s) >= 10000, progress: worth(10000) },
      { text: 'Buy a plot of land', hint: 'Accra Realty lists plots all over the city.', test: (s) => Object.values(s.plots).some((p) => p.owned), dest: 'realty' },
      { text: 'Build on your land', hint: 'Get a permit and build stage by stage.', test: (s) => builtPlot(s) },
      { text: 'Earn rent from a property', hint: 'Let a home you own, or build a rental.', test: (s) => earningProperty(s) },
      { text: 'Own 3 properties', hint: 'Homes you bought plus houses you built.', test: (s) => properties(s) >= 3, progress: (s) => ({ cur: Math.min(3, properties(s)), total: 3, label: 'Properties' }), dest: 'realty' },
    ],
  },
  {
    id: 'professional', name: 'Respected professional', emoji: '🎓', path: 'clean', blurb: 'Education, an honest career and a good name.',
    steps: [
      { text: 'Get an honest job', hint: 'Start anywhere. Makola Market is hiring.', test: legitJob, dest: 'market' },
      { text: 'Earn a degree', hint: 'Enrol at the University of Ghana, Legon.', test: (s) => s.edu.degrees.length > 0, dest: 'university' },
      { text: 'Get promoted', hint: 'Work shifts and build your skills.', test: (s) => Object.entries(s.careers).some(([k, c]) => (c?.level ?? 0) >= 2 && !CAREERS[k as keyof typeof CAREERS]?.illegal) },
      { text: 'Reach respect 70', hint: 'Church, volunteering and honest work raise it.', test: (s) => s.rep.respect >= 70, progress: (s) => ({ cur: Math.min(70, Math.round(s.rep.respect)), total: 70, label: 'Respect' }) },
      { text: 'Reach the top of an honest career', hint: 'Senior level, clean hands.', test: legitTop },
    ],
  },
  {
    id: 'baller', name: 'Living large', emoji: '💎', path: 'either', blurb: 'The big life: villa, luxury car, money to spray.',
    steps: [
      { text: 'Save GH₵20,000', hint: 'Any way you can.', test: (s) => wealth(s) >= 20000, progress: worth(20000) },
      { text: 'Live in a premium home', hint: 'Move into a premium home or your own house.', test: (s) => !s.housing.homeless && (s.housing.tier === 'premium' || s.housing.tier === 'house') },
      { text: 'Own a luxury car', hint: 'A Prado, sports car or S-Class from Spintex Motors.', test: (s) => s.vehicles.some((v) => v === 'suv' || v === 'sports' || v === 'luxury'), dest: 'dealer' },
      { text: 'Be worth GH₵250,000', hint: 'Now you are living large.', test: (s) => wealth(s) >= 250000, progress: worth(250000) },
    ],
  },
  {
    id: 'kingpin', name: 'Street king', emoji: '🕶️', path: 'crooked', blurb: 'Rule the streets. Big risk, big money.',
    steps: [
      { text: 'Earn street cred 25', hint: 'Crime builds a name. Police build a file.', test: (s) => s.rep.street >= 25, progress: (s) => ({ cur: Math.min(25, Math.round(s.rep.street)), total: 25, label: 'Street cred' }) },
      { text: 'Work an illegal hustle', hint: 'Sakawa, galamsey or smuggling.', test: (s) => !!s.employment && !!CAREERS[s.employment]?.illegal },
      { text: 'Launder GH₵10,000', hint: 'Through a business or the Makola forex boys.', test: (s) => (s.stats.laundered ?? 0) >= 10000, progress: (s) => ({ cur: Math.min(10000, s.stats.laundered ?? 0), total: 10000, label: 'Laundered' }) },
      { text: 'Own a business as a front', hint: 'Its till cleans your money every day.', test: (s) => Object.keys(s.businesses).length > 0, dest: 'realty' },
      { text: 'Street cred 80 and GH₵100,000', hint: 'Untouchable.', test: (s) => s.rep.street >= 80 && wealth(s) >= 100000, progress: worth(100000) },
    ],
  },
  {
    id: 'family', name: 'Family first', emoji: '👨‍👩‍👧', path: 'clean', blurb: 'Love, marriage and a home of your own.',
    steps: [
      { text: 'Find love', hint: 'Make friends and ask someone out.', test: (s) => !!s.romance.partner },
      { text: 'Get engaged', hint: 'Buy a ring at the mall and propose.', test: (s) => s.romance.stage === 'engaged' || s.romance.stage === 'married' },
      { text: 'Get married', hint: 'Plan the wedding together.', test: (s) => s.romance.stage === 'married' },
      { text: 'Own your family home', hint: 'Buy a home or build a house.', test: (s) => s.owned.length > 0 },
      { text: 'Save GH₵30,000 for the family', hint: 'In the bank, for the children’s future.', test: (s) => s.bank.balance >= 30000, progress: (s) => ({ cur: Math.min(30000, s.bank.balance), total: 30000, label: 'Savings' }), dest: 'bank' },
    ],
  },
]
export const AMBITION_BY_ID: Record<string, DreamDef> = Object.fromEntries(AMBITIONS.map((a) => [a.id, a]))
/** Which dreams a life event makes harder: suggest a rethink then. */
export const DREAM_SETBACKS: Record<string, string[]> = { trouble: ['professional', 'family'], evicted: ['baller', 'landlord'], breakup: ['family'], fired: ['professional', 'tycoon'] }

export const GOAL_BY_ID: Record<string, GoalDef> = Object.fromEntries(GOALS.map((g) => [g.id, g]))
/** Whether a goal belongs to this character's life at all. */
export const goalFits = (s: GameState, g: GoalDef) => !g.for || g.for.includes(s.profile?.lifestyle ?? 'worker')

/* ------------------------------ transport ------------------------------ */
export interface RideQuote {
  mode: RideMode
  fare: number
  minutes: number
  km: number
  surge: boolean
}
export function rideQuote(s: Pick<GameState, 'player' | 'minutes'>, mode: RideMode, destId: string): RideQuote {
  const d = DEST_BY_ID[destId]
  const km = Math.max(0.3, Math.hypot(s.player.x - (d.door.x + 0.5), s.player.z - (d.door.z + 0.5)) * KM_PER_TILE)
  const r = RIDES[mode]
  const h = hourOf(s.minutes)
  const surge = mode === 'ride' && h >= 18 && h < 23
  const fare = Math.round((r.base + r.perKm * km) * (surge ? 1.5 : 1))
  const minutes = Math.round(r.wait + r.minPerKm * km)
  return { mode, fare, minutes, km, surge }
}
export const walkMinutes = (s: Pick<GameState, 'player'>, destId: string) => {
  const d = DEST_BY_ID[destId]
  return Math.max(1, Math.round(Math.hypot(s.player.x - d.door.x, s.player.z - d.door.z) * 1.25 / 3.8))
}

/** Nearest trotro station to a point. */
export function nearestStop(x: number, z: number): string {
  let best = ''
  let bd = Infinity
  for (const d of DESTINATIONS) {
    if (d.kind !== 'stop') continue
    const dist = Math.hypot(d.door.x - x, d.door.z - z)
    if (dist < bd) { bd = dist; best = d.id }
  }
  return best
}
export interface TrotroPlan {
  /** Station you board at and the one you get off at. */
  from: string
  to: string
  /** Minutes on foot to the first station and from the last one to the destination. */
  walkTo: number
  walkFrom: number
  ride: RideQuote
  total: number
}
/** Trotros only run between stations: walk to the nearest one, ride to the station nearest the destination, walk the rest. */
export function trotroPlan(s: Pick<GameState, 'player' | 'minutes'>, destId: string): TrotroPlan | null {
  const d = DEST_BY_ID[destId]
  if (!d) return null
  const from = nearestStop(s.player.x, s.player.z)
  const to = d.kind === 'stop' ? destId : nearestStop(d.door.x, d.door.z)
  if (!from || !to || from === to) return null
  const fromDoor = DEST_BY_ID[from].door
  const toDoor = DEST_BY_ID[to].door
  const walkTo = Math.hypot(s.player.x - fromDoor.x, s.player.z - fromDoor.z) < 2 ? 0 : walkMinutes(s, from)
  const walkFrom = to === destId ? 0 : walkMinutes({ player: { x: toDoor.x, z: toDoor.z, rot: 0 } }, destId)
  const ride = rideQuote({ player: { x: fromDoor.x, z: fromDoor.z, rot: 0 }, minutes: s.minutes }, 'trotro', to)
  return { from, to, walkTo, walkFrom, ride, total: walkTo + ride.minutes + walkFrom }
}
export { formatMoney }
