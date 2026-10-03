import { addDays, parseDay } from './dates'

export const FREEZE_EVERY = 7
export const MAX_FREEZES = 2

export interface StreakState {
  current: number
  best: number
  freezes: number // freezes in hand right now
  frozenDays: string[] // missed days a freeze covered
  restDays: string[] // missed days skipped because they were the weekly rest day
}

/**
 * Derives the streak from the set of completed days, so nothing about the streak is
 * stored and it can never drift. A missed day is covered by the rest day if it is one,
 * otherwise by a freeze if one is held, otherwise the streak resets. Today never breaks
 * the streak: it only counts once completed.
 */
export function computeStreak(done: Iterable<string>, today: string, restWeekday: number | null): StreakState {
  const doneSet = new Set(done)
  const days = [...doneSet].filter((d) => d <= today).sort()
  const state: StreakState = { current: 0, best: 0, freezes: 0, frozenDays: [], restDays: [] }
  if (days.length === 0) return state

  for (let d = days[0]; d <= today; d = addDays(d, 1)) {
    if (doneSet.has(d)) {
      state.current++
      if (state.current % FREEZE_EVERY === 0) state.freezes = Math.min(MAX_FREEZES, state.freezes + 1)
    } else if (d === today) {
      break
    } else if (restWeekday !== null && parseDay(d).getDay() === restWeekday) {
      state.restDays.push(d)
    } else if (state.freezes > 0 && state.current > 0) {
      state.freezes--
      state.frozenDays.push(d)
    } else {
      state.current = 0
    }
    state.best = Math.max(state.best, state.current)
  }
  return state
}
