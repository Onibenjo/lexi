import type { DayRecord, Feedback } from './db'
import type { StoredCard } from './session'

/** The settings that follow you between devices. Theme and onboarding stay per device. */
export interface SyncedSettings {
  newPerDay: number
  restWeekday: number | null
  reminderTime: string
  passcode: string
  at: number // when they were last changed; the newer copy wins
}

/** [wordId, day, at, kind, rating]: compact, since review history grows every day. */
export type ReviewTuple = [string, string, number, string, number]

export interface SyncSentence {
  wordId: string
  text: string
  feedback?: Feedback
  at: number
}

/** Everything one device knows, as plain JSON. Local database ids are left out on purpose. */
export interface Snapshot {
  v: 1
  cards: StoredCard[]
  reviews: ReviewTuple[]
  days: DayRecord[]
  sentences: SyncSentence[]
  settings: SyncedSettings | null
}

export const EMPTY: Snapshot = { v: 1, cards: [], reviews: [], days: [], sentences: [], settings: null }

const time = (d: Date | string | undefined) => (d ? new Date(d).getTime() : 0)
export const reviewKey = (r: ReviewTuple) => `${r[0]}|${r[2]}|${r[3]}`
export const sentenceKey = (s: { wordId: string; at: number }) => `${s.wordId}|${s.at}`

/**
 * Combines two devices' progress. Nothing that happened on either device is lost:
 * completed days, reviews and sentences are unions. For each word's schedule the copy
 * reviewed most recently wins, and the newer settings win. The output is sorted, so the
 * same inputs always serialise to the same JSON.
 */
export function merge(a: Snapshot, b: Snapshot): Snapshot {
  const cards = new Map(a.cards.map((c) => [c.wordId, c]))
  for (const c of b.cards) {
    const mine = cards.get(c.wordId)
    if (!mine || time(c.card.last_review) > time(mine.card.last_review)) cards.set(c.wordId, c)
  }

  const reviews = new Map(a.reviews.map((r) => [reviewKey(r), r]))
  for (const r of b.reviews) if (!reviews.has(reviewKey(r))) reviews.set(reviewKey(r), r)

  const days = new Map(a.days.map((d) => [d.day, d]))
  for (const d of b.days) {
    const mine = days.get(d.day)
    days.set(
      d.day,
      mine
        ? {
            day: d.day,
            done: mine.done || d.done,
            newWords: [...new Set([...mine.newWords, ...d.newWords])],
            reviews: Math.max(mine.reviews, d.reviews),
          }
        : d,
    )
  }

  const sentences = new Map(a.sentences.map((s) => [sentenceKey(s), s]))
  for (const s of b.sentences) {
    const mine = sentences.get(sentenceKey(s))
    if (!mine || (!mine.feedback && s.feedback)) sentences.set(sentenceKey(s), s)
  }

  const settings = !a.settings ? b.settings : !b.settings || a.settings.at >= b.settings.at ? a.settings : b.settings

  return {
    v: 1,
    cards: [...cards.values()].sort((x, y) => x.wordId.localeCompare(y.wordId)),
    reviews: [...reviews.values()].sort((x, y) => x[2] - y[2] || reviewKey(x).localeCompare(reviewKey(y))),
    days: [...days.values()].sort((x, y) => x.day.localeCompare(y.day)),
    sentences: [...sentences.values()].sort((x, y) => x.at - y.at || x.wordId.localeCompare(y.wordId)),
    settings,
  }
}
