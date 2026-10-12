import { dayOf } from './config'
import { PLOT_BY_ID, PROJECTS, projectStages } from './content'
import type { GameState } from './store'

/** Market value of a plot today: land appreciates daily; completed building stages add value. */
export function plotValue(s: Pick<GameState, 'minutes' | 'plots'>, plotId: string): number {
  const def = PLOT_BY_ID[plotId]
  if (!def) return 0
  const land = def.price * Math.pow(1 + def.growth, dayOf(s.minutes) - 1)
  const p = s.plots[plotId]
  let built = 0
  if (p) {
    const st = projectStages(p.project)
    const done = p.stage >= st.length
    for (let i = 0; i < Math.min(p.stage, st.length); i++) built += st[i].price * (done ? PROJECTS[p.project ?? 'bungalow'].valueMult : 0.9)
  }
  return Math.round(land + built)
}

/** True when the plot has a finished building. */
export function plotDone(p: { stage: number; project?: string | null } | undefined) {
  return !!p && p.stage >= projectStages(p.project as never).length
}
