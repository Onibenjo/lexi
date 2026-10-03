import Dexie, { type EntityTable } from 'dexie'
import type { StoredCard } from './session'
import type { ExerciseKind } from './exercises'

export interface ReviewLog {
  id?: number
  wordId: string
  day: string
  at: number
  kind: ExerciseKind
  rating: number
}

export interface DayRecord {
  day: string
  done: boolean
  newWords: string[]
  reviews: number
}

export interface Sentence {
  id?: number
  wordId: string
  text: string
  feedback?: Feedback
  at: number
}

export interface Feedback {
  verdict: 'great' | 'good' | 'needs-work'
  notes: string[]
  improved: string
}

export type Theme = 'system' | 'light' | 'dark'
export interface Settings {
  newPerDay: number // 1–3
  restWeekday: number | null // 0 = Sunday
  theme: Theme
  passcode: string // unlocks the AI endpoints
  reminderTime: string // "HH:MM"
  onboarded: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 1,
  restWeekday: null,
  theme: 'system',
  passcode: '',
  reminderTime: '08:00',
  onboarded: false,
}

export const db = new Dexie('lexi') as Dexie & {
  cards: EntityTable<StoredCard, 'wordId'>
  reviews: EntityTable<ReviewLog, 'id'>
  days: EntityTable<DayRecord, 'day'>
  sentences: EntityTable<Sentence, 'id'>
  kv: EntityTable<{ key: string; value: unknown }, 'key'>
}

db.version(1).stores({
  cards: 'wordId, introducedOn',
  reviews: '++id, wordId, day',
  days: 'day',
  sentences: '++id, wordId, at',
  kv: 'key',
})

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings')
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<Settings> | undefined) }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await db.kv.put({ key: 'settings', value: { ...current, ...patch } })
}

export async function touchDay(day: string, update: (d: DayRecord) => void): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const rec = (await db.days.get(day)) ?? { day, done: false, newWords: [], reviews: 0 }
    update(rec)
    await db.days.put(rec)
  })
}

/** The most recent day with any activity before `today`, used to detect a break. */
export async function lastActiveBefore(today: string): Promise<string | null> {
  const prev = await db.days.where('day').below(today).last()
  return prev?.day ?? null
}

export async function exportAll(): Promise<string> {
  const [cards, reviews, days, sentences, kv] = await Promise.all([
    db.cards.toArray(),
    db.reviews.toArray(),
    db.days.toArray(),
    db.sentences.toArray(),
    db.kv.toArray(),
  ])
  return JSON.stringify({ app: 'lexi', version: 1, exportedAt: new Date().toISOString(), cards, reviews, days, sentences, kv })
}

export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json)
  if (data.app !== 'lexi') throw new Error('This file is not a Lexi backup.')
  // Dates come back as strings from JSON; ts-fsrs needs Date objects.
  const cards = (data.cards as StoredCard[]).map((c) => ({
    ...c,
    card: { ...c.card, due: new Date(c.card.due), last_review: c.card.last_review ? new Date(c.card.last_review) : undefined },
  }))
  await db.transaction('rw', [db.cards, db.reviews, db.days, db.sentences, db.kv], async () => {
    await Promise.all([db.cards.clear(), db.reviews.clear(), db.days.clear(), db.sentences.clear(), db.kv.clear()])
    await db.cards.bulkPut(cards)
    await db.reviews.bulkPut(data.reviews)
    await db.days.bulkPut(data.days)
    await db.sentences.bulkPut(data.sentences)
    await db.kv.bulkPut(data.kv)
  })
}
