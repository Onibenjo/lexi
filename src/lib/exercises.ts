import type { Word } from '../types'
import { Rating, State, type Card } from './srs'

export type ExerciseKind = 'meaning' | 'cloze' | 'collocation' | 'form' | 'fix' | 'write'

/**
 * Picks a review exercise that matches how well the word is known: recognition first,
 * then recall, then grammar and production. A word you just forgot drops back to meaning.
 */
export function pickExercise(word: Word, card: Card, lastRating?: number): ExerciseKind {
  if (card.state === State.Relearning || lastRating === Rating.Again) return 'meaning'
  const ladder: ExerciseKind[] = ['meaning', 'cloze', 'collocation', 'form', 'fix']
  if (card.reps < ladder.length) return usable(word, ladder[card.reps])
  const rotation: ExerciseKind[] = ['cloze', 'fix', 'collocation', 'form', 'write']
  return usable(word, rotation[card.reps % rotation.length])
}

function usable(word: Word, kind: ExerciseKind): ExerciseKind {
  if (kind === 'collocation' && !collocationPrompt(word)) return 'cloze'
  if (kind === 'form' && !word.formDrill) return 'cloze'
  return kind
}

/** The first collocation with the word blanked out, e.g. "___ attention". */
export function collocationPrompt(word: Word): { prompt: string; answer: string } | null {
  const forms = [...word.forms].sort((a, b) => b.length - a.length)
  for (const c of word.collocations) {
    for (const f of forms) {
      const re = new RegExp(`\\b${escape(f)}\\b`, 'i')
      if (re.test(c)) return { prompt: c.replace(re, '___'), answer: f }
    }
  }
  return null
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type Verdict = 'right' | 'close' | 'wrong'

/** A one-letter slip on a longer word counts as "close" (graded Hard, not Again). */
export function checkTyped(input: string, accepted: string[]): Verdict {
  const a = normalize(input)
  if (!a) return 'wrong'
  const targets = accepted.map(normalize)
  if (targets.includes(a)) return 'right'
  if (targets.some((t) => t.length >= 5 && levenshtein(a, t) <= 1)) return 'close'
  return 'wrong'
}

export function sameSentence(a: string, b: string): boolean {
  return normalize(a) === normalize(b)
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

export function shuffle<T>(items: T[], rand = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Word choices for a collocation blank: the answer plus three other words of the same part of speech. */
export function wordChoices(word: Word, answer: string, pool: Word[], rand = Math.random): string[] {
  const others = shuffle(pool.filter((w) => w.id !== word.id && w.pos === word.pos), rand)
    .slice(0, 3)
    .map((w) => w.word)
  return shuffle([answer, ...others], rand)
}
