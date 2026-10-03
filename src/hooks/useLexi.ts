import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { WORDS } from '../data/words'
import { dayKey } from '../lib/dates'
import { db, DEFAULT_SETTINGS, getSettings, type DayRecord, type Settings } from '../lib/db'
import { planSession, type Plan, type StoredCard } from '../lib/session'
import { computeStreak, type StreakState } from '../lib/streak'

export interface Lexi {
  ready: boolean
  today: string
  settings: Settings
  cards: StoredCard[]
  days: DayRecord[]
  doneToday: boolean
  plan: Plan
  streak: StreakState
}

/** Re-renders when the calendar day changes, so leaving the app open overnight rolls over. */
function useToday(): string {
  const [today, setToday] = useState(dayKey)
  useEffect(() => {
    const tick = () => setToday(dayKey())
    const id = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return today
}

export function useLexi(): Lexi {
  const today = useToday()
  const settings = useLiveQuery(getSettings, [], undefined)
  const cards = useLiveQuery(() => db.cards.toArray(), [], undefined)
  const days = useLiveQuery(() => db.days.toArray(), [], undefined)

  return useMemo(() => {
    const s = settings ?? DEFAULT_SETTINGS
    const c = cards ?? []
    const d = days ?? []
    const active = d.filter((x) => x.day < today && (x.done || x.reviews > 0 || x.newWords.length > 0))
    const lastActive = active.length ? active.map((x) => x.day).sort().at(-1)! : null
    return {
      ready: settings !== undefined && cards !== undefined && days !== undefined,
      today,
      settings: s,
      cards: c,
      days: d,
      doneToday: d.some((x) => x.day === today && x.done),
      plan: planSession({ words: WORDS, cards: c, today, lastActive, newPerDay: s.newPerDay }),
      streak: computeStreak(
        d.filter((x) => x.done).map((x) => x.day),
        today,
        s.restWeekday,
      ),
    }
  }, [settings, cards, days, today])
}
