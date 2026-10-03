import { db, touchDay } from './db'
import type { ExerciseKind } from './exercises'
import type { Step } from './session'
import { grade, newCard, type Grade } from './srs'

/**
 * Records one answer. A new word enters the schedule on its first recall (the cloze);
 * the recognition step right after reading the definition is too easy to grade.
 * Retries of a missed word inside the same session are practice only.
 */
export async function recordAnswer(step: Step, kind: ExerciseKind, rating: Grade, today: string): Promise<void> {
  const now = new Date()
  const log = { wordId: step.wordId, day: today, at: +now, kind, rating }

  if (step.phase === 'new') {
    await db.reviews.add(log)
    if (kind !== 'cloze') return
    await db.cards.put({ wordId: step.wordId, card: grade(newCard(now), rating, now), introducedOn: today, lastRating: rating })
    await touchDay(today, (d) => {
      if (!d.newWords.includes(step.wordId)) d.newWords.push(step.wordId)
    })
    return
  }

  if (step.phase === 'retry') return

  const stored = await db.cards.get(step.wordId)
  if (!stored) return
  await db.cards.put({ ...stored, card: grade(stored.card, rating, now), lastRating: rating })
  await db.reviews.add(log)
  await touchDay(today, (d) => {
    d.reviews++
  })
}

export async function completeDay(today: string): Promise<void> {
  await touchDay(today, (d) => {
    d.done = true
  })
}
