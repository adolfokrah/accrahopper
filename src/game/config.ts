import type { Needs, NeedId } from './types'

/** Configurable identity: change the city and currency here. */
export const GAME_CONFIG = {
  title: 'City Stories',
  cityName: 'Accra',
  currency: { symbol: 'GH₵', code: 'GHS', name: 'cedis', fictional: true },
  save: { key: 'city-stories:save', settingsKey: 'city-stories:settings:v2', version: 1 },
}

/** Every balancing value in one place. Times are in game minutes unless noted. */
export const BALANCE = {
  startMoney: 300,
  startMinute: 8 * 60, // Day 1, 08:00
  startNeeds: { hunger: 62, energy: 88, hygiene: 80, bladder: 70, fun: 68, social: 60 } as Needs,

  /** Real seconds -> game minutes. */
  clockMinutesPerSecond: 1,
  activityMinutesPerSecond: 30,
  sleepMinutesPerSecond: 80,
  travelMinutesPerSecond: 24,
  /** Real-time length of activities so you can watch them happen (seconds). */
  activityRealSeconds: { min: 4, max: 20, perGameMinute: 1 / 12 },
  /** Real seconds a work shift lasts (tasks pop up during it). */
  shiftRealSeconds: 90,
  sleepRealSeconds: { min: 3, max: 8, perGameMinute: 1 / 60 },

  /** Need decay per game hour while idle/walking. */
  decayPerHour: {
    hunger: 4,
    energy: 3,
    hygiene: 2.4,
    bladder: 5,
    fun: 2.6,
    social: 2,
  } as Record<NeedId, number>,
  lowNeed: 20,
  lowNeedPayPenalty: 0.1, // per need below `lowNeed`
  starvingEnergyDrain: 1.5, // extra energy/hour while hunger is 0
  collapse: { minutes: 240, energyRestored: 45 },

  walkSpeed: 3.8, // tiles per second
  doorRadius: 2.6, // tiles from a door to count as "at the building"
  sleepMinEnergyGate: 92,

  rentDays: 7,
  rentWarnHours: 24,
  /** Notice to quit: days of overdue rent before eviction. */
  rentGraceHours: 72,
  lateFee: 25,
  movingFee: 50,
  recoveryThreshold: 20, // below this the "stuck" recovery hint appears

  eventCheckMinutes: 30,
  eventChance: 0.12,
  eventCooldownMinutes: 6 * 60,
  transportDelayChance: 0.22,

  /** Total XP needed to reach skill level 1, 2, 3 ... */
  skillLevelXp: [50, 120, 220, 360, 550, 800, 1100, 1450, 1850, 2300],

  friendship: {
    levels: [
      { name: 'Stranger', at: 0 },
      { name: 'Acquaintance', at: 15 },
      { name: 'Friend', at: 40 },
      { name: 'Close friend', at: 80 },
    ],
    talksPerDay: 2,
    hangoutUnlock: 40,
  },

  tutorialBonus: 75,
  autosaveSeconds: 12,
  maxTransactions: 80,
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}${GAME_CONFIG.currency.symbol}${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

export const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v))

export function dayOf(minutes: number): number {
  return Math.floor(minutes / 1440) + 1
}
export function hourOf(minutes: number): number {
  return (minutes % 1440) / 60
}
export function formatClock(minutes: number): string {
  const m = Math.floor(minutes % 1440)
  const h = Math.floor(m / 60)
  const mm = m % 60
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mm.toString().padStart(2, '0')} ${ap}`
}
export function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}h ${m}m` : `${h}h`
}
