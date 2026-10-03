import type { Word } from '../types'
import { daysBetween, endOfDay } from './dates'
import { pickExercise, shuffle, type ExerciseKind } from './exercises'
import type { Card } from './srs'

export interface StoredCard {
  wordId: string
  card: Card
  introducedOn: string // day key the word was first learned
  lastRating?: number // ts-fsrs Rating of the latest review
}

export type Phase = 'new' | 'review' | 'retry' | 'practice'
export interface Step {
  wordId: string
  kind: 'learn' | ExerciseKind
  phase: Phase
}

export interface Plan {
  todaysWords: string[] // shown on the Today hero: learned today, then still to learn
  steps: Step[]
  dueCount: number
  paused: boolean // too many reviews waiting, so new words wait too
  gentle: boolean // returning after a break: a short, easy set
}

export const MAX_DUE_BEFORE_PAUSE = 20
export const MAX_REVIEWS = 30
export const GENTLE_REVIEWS = 5
export const GENTLE_AFTER_DAYS = 3

export const NEW_WORD_STEPS: ExerciseKind[] = ['meaning', 'cloze', 'write']

export function planSession(opts: {
  words: Word[]
  cards: StoredCard[]
  today: string
  lastActive: string | null
  newPerDay: number
}): Plan {
  const { words, cards, today, lastActive, newPerDay } = opts
  const byId = new Map(cards.map((c) => [c.wordId, c]))
  const cutoff = endOfDay(today)

  const due = cards
    .filter((c) => c.introducedOn !== today && new Date(c.card.due) <= cutoff)
    .sort((a, b) => +new Date(a.card.due) - +new Date(b.card.due))
  const gentle = lastActive !== null && daysBetween(lastActive, today) >= GENTLE_AFTER_DAYS
  const paused = !gentle && due.length > MAX_DUE_BEFORE_PAUSE

  const reviews = gentle
    ? [...due].sort((a, b) => b.card.stability - a.card.stability).slice(0, GENTLE_REVIEWS)
    : due.slice(0, MAX_REVIEWS)

  const learnedToday = words.filter((w) => byId.get(w.id)?.introducedOn === today).map((w) => w.id)
  const slots = paused ? 0 : Math.max(0, newPerDay - learnedToday.length)
  const fresh = words.filter((w) => !byId.has(w.id)).slice(0, slots).map((w) => w.id)

  const wordById = new Map(words.map((w) => [w.id, w]))
  const steps: Step[] = [
    ...fresh.flatMap((wordId) => [
      { wordId, kind: 'learn' as const, phase: 'new' as const },
      ...NEW_WORD_STEPS.map((kind) => ({ wordId, kind, phase: 'new' as const })),
    ]),
    ...reviews.flatMap((c) => {
      const word = wordById.get(c.wordId)
      return word ? [{ wordId: c.wordId, kind: pickExercise(word, c.card, c.lastRating), phase: 'review' as const }] : []
    }),
  ]

  return { todaysWords: [...learnedToday, ...fresh], steps, dueCount: due.length, paused, gentle }
}

/** Extra practice once today is done or everything is caught up: a few known words, graded normally. */
export function practiceSteps(words: Word[], cards: StoredCard[], n = 8): Step[] {
  const wordById = new Map(words.map((w) => [w.id, w]))
  return shuffle(cards)
    .slice(0, n)
    .flatMap((c) => {
      const word = wordById.get(c.wordId)
      return word ? [{ wordId: c.wordId, kind: pickExercise(word, c.card, c.lastRating), phase: 'practice' as const }] : []
    })
}
