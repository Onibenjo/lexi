import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs'

export { Rating, State }
export type { Card, Grade }

// No same-day learning steps: this is a once-a-day app, so even a fresh or failed card
// comes back on a later day rather than in ten minutes.
const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_short_term: false, enable_fuzz: true }))

export function newCard(now = new Date()): Card {
  return createEmptyCard(now)
}

export function grade(card: Card, rating: Grade, now = new Date()): Card {
  return scheduler.next(card, now, rating).card
}

/** Strength 0–4 for the dot meter, from how long the word is currently remembered for. */
export function strength(card: Card | undefined): number {
  if (!card || card.state === State.New) return 0
  if (card.state === State.Relearning) return 1
  const s = card.stability
  return s < 3 ? 1 : s < 10 ? 2 : s < 30 ? 3 : 4
}

/** A word you can actually use: it has stuck for three weeks or more. */
export const isMature = (card: Card) => card.state === State.Review && card.stability >= 21
