import { formatMoney, hourOf } from './config'
import { DEST_BY_ID, KM_PER_TILE, RIDES, type RideMode } from './content'
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
export interface GoalDef {
  id: string
  name: string
  icon: string
  reward: number
  test: (s: GameState) => boolean
}
const careerLevels = (s: GameState) => Object.values(s.careers).map((c) => c?.level ?? 0)
export const GOALS: GoalDef[] = [
  { id: 'job', name: 'Land your first job', icon: '💼', reward: 50, test: (s) => !!s.employment },
  { id: 'promo', name: 'Get promoted', icon: '📈', reward: 150, test: (s) => careerLevels(s).some((l) => l >= 2) },
  { id: 'top', name: 'Reach the top of a career', icon: '🏆', reward: 800, test: (s) => careerLevels(s).some((l) => l >= 3) },
  { id: 'bank', name: 'Open a bank account', icon: '🏦', reward: 30, test: (s) => s.bank.open },
  { id: 'saver', name: 'Save GH₵5,000 in the bank', icon: '💎', reward: 300, test: (s) => s.bank.balance >= 5000 },
  { id: 'investor', name: 'Make your first investment', icon: '📊', reward: 80, test: (s) => s.invest.tbills.length > 0 || Object.values(s.invest.shares).some((n) => n > 0) },
  { id: 'graduate', name: 'Graduate from Legon', icon: '🎓', reward: 400, test: (s) => s.edu.degrees.length > 0 },
  { id: 'friends', name: 'Make 3 good friends', icon: '🤝', reward: 150, test: (s) => Object.values(s.friendships).filter((f) => f.points >= 40).length >= 3 },
  { id: 'love', name: 'Find love', icon: '💕', reward: 100, test: (s) => !!s.romance.partner },
  { id: 'married', name: 'Get married', icon: '💍', reward: 1000, test: (s) => s.romance.stage === 'married' },
  { id: 'land', name: 'Buy land', icon: '🗺️', reward: 300, test: (s) => Object.values(s.plots).some((p) => p.owned) },
  { id: 'licence', name: 'Get a driving licence', icon: '🪪', reward: 100, test: (s) => s.license },
  { id: 'wheels', name: 'Own a vehicle', icon: '🚗', reward: 300, test: (s) => s.vehicles.length > 0 },
  { id: 'house', name: 'Own a house', icon: '🏡', reward: 1500, test: (s) => s.owned.length > 0 },
  { id: 'tourist', name: 'See Accra: beach, park, Jamestown & club', icon: '📸', reward: 150, test: (s) => ['beach', 'park', 'jamestown', 'lounge'].every((d) => s.visited.includes(d)) },
]

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
export { formatMoney }
