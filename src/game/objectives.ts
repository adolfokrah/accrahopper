import { AMBITION_BY_ID } from './life'
import { formatMoney, hourOf } from './config'
import { CAREERS, DEST_BY_ID, HOMES, homeDestId } from './content'
import { missingRequirements, type GameState } from './store'
import type { NeedId } from './types'

export interface Objective {
  title: string
  detail: string
  destId?: string
  kind: 'tutorial' | 'urgent' | 'goal'
  step?: number
  steps?: number
  progress?: { cur: number; total: number; label: string }
}

export const TUTORIAL_STEPS = 6

export function getObjective(s: GameState): Objective {
  const home = homeDestId(s)
  if (!s.tutorial.done) {
    const t = s.tutorial.step
    const base = { kind: 'tutorial' as const, step: t + 1, steps: TUTORIAL_STEPS }
    switch (t) {
      case 0: return s.view === 'home'
        ? { ...base, title: 'Step outside', detail: 'You wake up in your room. Tap the green 🚪 Exit mat by the door (or tap World) to go out into Accra.' }
        : { ...base, title: "Walk to Auntie Esi's Chop Bar", detail: 'Tap the ground to walk, or use WASD. Drag to turn the camera.', destId: 'foodstall' }
      case 1: return { ...base, title: 'Buy and eat a meal', detail: 'Go inside, pick a dish and confirm. Kelewele is cheapest.', destId: 'foodstall' }
      case 2: return { ...base, title: 'Apply for a starter job', detail: 'Makola Market is hiring Shop Assistants. No experience needed.', destId: 'market' }
      case 3: return { ...base, title: 'Complete a shift', detail: 'Go to your workplace, press ▶ Start shift, then do the tasks that pop up to earn wages and tips.', destId: s.employment ? CAREERS[s.employment].workplace : 'market' }
      case 4: return { ...base, title: 'Head home', detail: 'Walk back to your compound and go inside.', destId: home }
      default: return { ...base, title: 'Go to sleep', detail: 'Tap your bed and sleep to restore energy.', destId: home }
    }
  }
  if (s.legal.caseDeadline !== null) {
    return { kind: 'urgent', title: 'Attend your court hearing', detail: `Go to Accra High Court (weekdays 8am–5pm) or pay the fine at the police station. Miss it and a warrant is issued.`, destId: 'court' }
  }
  if (s.health.illness) {
    return { kind: 'urgent', title: s.health.mild ? 'You are unwell' : 'You are seriously ill', detail: s.health.mild ? 'Buy medicine or see a doctor at Korle Bu Hospital.' : 'See a doctor at Korle Bu Hospital before it gets worse.', destId: 'hospital' }
  }
  if (s.housing.homeless) {
    const need = HOMES.room.rent + 50
    return s.money >= need
      ? { kind: 'urgent', title: 'Rent a room again', detail: `You have ${formatMoney(s.money)}. Open Home and pick "Rent a room again" (${formatMoney(need)}).`, destId: 'market' }
      : { kind: 'urgent', title: `Save ${formatMoney(need)} for a room`, detail: 'You are homeless. Odd jobs at Makola Market pay quickly. Sleep on a park bench or the beach.', destId: 'market' }
  }
  const rent = s.owned.includes(s.housing.tier) ? 0 : HOMES[s.housing.tier].rent
  if (s.housing.overdueSince !== null && rent > 0) {
    return { kind: 'urgent', title: `Pay overdue rent (${formatMoney(rent)}) or be evicted`, detail: `You have ${formatMoney(s.money)}. Odd jobs at Makola Market and the chop bar pay quickly.`, destId: 'market' }
  }
  const critical = (Object.keys(s.needs) as NeedId[]).sort((a, b) => s.needs[a] - s.needs[b])[0]
  if (s.needs[critical] < 15) {
    const map: Record<NeedId, { t: string; d: string; dest: string }> = {
      hunger: { t: 'You are starving', d: 'Eat something at the chop bar.', dest: 'foodstall' },
      energy: { t: 'You are exhausted', d: 'Go home and sleep.', dest: home },
      hygiene: { t: 'You need a shower', d: 'Shower at home or the Wash House.', dest: home },
      bladder: { t: 'Nature is calling', d: 'Use a toilet at home or the Wash House.', dest: 'wash' },
      fun: { t: 'You need some fun', d: 'Dance it off at Labadi Beach Club.', dest: 'lounge' },
      social: { t: 'You feel lonely', d: 'Chat with someone, or visit the beach club.', dest: 'lounge' },
    }
    const m = map[critical]
    return { kind: 'urgent', title: m.t, detail: m.d, destId: m.dest }
  }
  const dueIn = s.housing.nextRentDue - s.minutes
  if (rent > 0 && dueIn < 48 * 60 && s.money < rent) {
    return { kind: 'urgent', title: `Save for rent: ${formatMoney(rent)}`, detail: `Due in ${Math.max(1, Math.round(dueIn / 60))}h. You have ${formatMoney(s.money)}.`, destId: s.employment ? CAREERS[s.employment].workplace : 'market', progress: { cur: s.money, total: rent, label: 'Rent fund' } }
  }
  // situations that take over until they are dealt with
  if (s.loan && s.minutes > s.loan.due) {
    return { kind: 'urgent', title: `Repay your loan (${formatMoney(s.loan.owed)})`, detail: 'It is overdue: it grows 1% a day and wrecks your credit. Repay in Phone → MoMo.' }
  }
  if (s.legal.heat >= 60) {
    return { kind: 'urgent', title: 'Lie low: the police are watching', detail: `Police heat ${Math.round(s.legal.heat)}. Stop crime for a while; heat falls each day. Neighbourhood watch at the police station clears your name faster.`, destId: 'police' }
  }
  if (s.dirty >= 2000) {
    return { kind: 'goal', title: `Clean ${formatMoney(s.dirty)} of dirty cash`, detail: 'Police seize unexplained cash. Launder it through a business or the Makola forex boys (Phone → MoMo).', destId: 'market' }
  }
  // your dream in life drives everything else
  const dream = s.profile?.dream ? AMBITION_BY_ID[s.profile.dream] : undefined
  if (dream && s.dreamStep < dream.steps.length) {
    const st = dream.steps[s.dreamStep]
    const tip = !s.employment && dream.id !== 'kingpin' && dream.id !== 'family' ? ' Tip: a job keeps money coming in.' : ''
    return { kind: 'goal', title: `${dream.emoji} ${st.text}`, detail: `Dream: ${dream.name} · step ${s.dreamStep + 1}/${dream.steps.length}. ${st.hint}${tip}`, destId: st.dest, progress: st.progress?.(s) }
  }
  if (!s.employment) return { kind: 'goal', title: 'Get a job', detail: 'Pick a career in your phone and apply at its workplace.', destId: 'market' }
  const c = CAREERS[s.employment]
  const prog = s.careers[s.employment]!
  const next = c.levels[prog.level]
  if (next) {
    const missing = missingRequirements(s, s.employment, prog.level)
    if (prog.xp >= next.promoteAt && missing.length) return { kind: 'goal', title: `Promotion ready: ${next.title}`, detail: `You need ${missing.join(', ')}. Study at Bright Minds Academy.`, destId: 'training' }
    return { kind: 'goal', title: `Work towards ${next.title}`, detail: `Complete shifts at ${DEST_BY_ID[c.workplace].name}.`, destId: c.workplace, progress: { cur: Math.min(prog.xp, next.promoteAt), total: next.promoteAt, label: 'Career XP' } }
  }
  if (!s.bank.open && s.money > 500) return { kind: 'goal', title: 'Open a bank account', detail: 'Cash in your wallet can be stolen at night. Gold Coast Bank keeps it safe and pays interest.', destId: 'bank' }
  const nextHome = s.housing.tier === 'room' ? HOMES.apartment : s.housing.tier === 'apartment' ? HOMES.premium : null
  if (!Object.values(s.plots).some((p) => p.owned) && s.housing.tier === 'premium') return { kind: 'goal', title: 'Buy land and build', detail: 'Land is for sale all over Accra. Visit Accra Realty.', destId: 'realty' }
  if (nextHome) return { kind: 'goal', title: `Save for the ${nextHome.name}`, detail: `Rent ${formatMoney(nextHome.rent)}/week. Check the Home tab.`, progress: { cur: Math.min(s.money, nextHome.rent + 1000), total: nextHome.rent + 1000, label: 'Move-in cost' } }
  const h = hourOf(s.minutes)
  return { kind: 'goal', title: 'Live your best life', detail: h >= 18 ? 'Catch live highlife at Labadi Beach Club.' : 'Explore the city and make friends.' }
}
