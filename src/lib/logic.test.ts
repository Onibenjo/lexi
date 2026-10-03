import { describe, expect, it } from 'vitest'
import type { Word } from '../types'
import { addDays, parseDay } from './dates'
import { checkTyped, collocationPrompt, pickExercise } from './exercises'
import { planSession, type StoredCard } from './session'
import { grade, newCard, Rating } from './srs'
import { computeStreak } from './streak'

const run = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i))

describe('computeStreak', () => {
  it('counts consecutive days and does not break on an unfinished today', () => {
    const s = computeStreak(run('2026-09-01', 5), '2026-09-06', null)
    expect(s.current).toBe(5)
  })

  it('resets after a missed day with no freezes', () => {
    const done = [...run('2026-09-01', 3), ...run('2026-09-05', 2)]
    const s = computeStreak(done, '2026-09-06', null)
    expect(s).toMatchObject({ current: 2, best: 3 })
  })

  it('earns a freeze every 7 days and spends it on a missed day', () => {
    const done = [...run('2026-09-01', 7), ...run('2026-09-09', 2)] // missed 09-08
    const s = computeStreak(done, '2026-09-10', null)
    expect(s.frozenDays).toEqual(['2026-09-08'])
    expect(s.current).toBe(9)
    expect(s.freezes).toBe(0)
  })

  it('caps freezes at 2', () => {
    expect(computeStreak(run('2026-01-01', 50), '2026-02-19', null).freezes).toBe(2)
  })

  it('skips the weekly rest day without spending a freeze', () => {
    const start = '2026-09-07' // a Monday
    expect(parseDay(start).getDay()).toBe(1)
    const done = [...run(start, 6), addDays(start, 7)] // Sunday 09-13 skipped
    const s = computeStreak(done, addDays(start, 7), 0)
    expect(s).toMatchObject({ current: 7, restDays: ['2026-09-13'], frozenDays: [] })
  })
})

const word = (id: string, extra: Partial<Word> = {}): Word => ({
  id,
  word: id,
  ipa: '/x/',
  pos: 'adjective',
  level: 'advanced',
  definition: 'd',
  examples: ['a', 'b'],
  collocations: [`${id} attention`, 'x y'],
  family: [],
  pattern: { rule: 'r', example: 'e' },
  forms: [id],
  cloze: { sentence: '___', answer: id },
  formDrill: { sentence: '___', base: id, answer: `${id}ly` },
  fix: { wrong: 'w', right: 'r', why: 'y' },
  distractors: ['1', '2', '3'],
  ...extra,
})

const words = ['alpha', 'bravo', 'charlie', 'delta'].map((id) => word(id))
const today = '2026-10-03'
const cardDueOn = (wordId: string, day: string, introducedOn = '2026-09-01'): StoredCard => ({
  wordId,
  introducedOn,
  card: { ...newCard(parseDay(introducedOn)), due: parseDay(day), stability: 5, reps: 2, state: 2 },
})

describe('planSession', () => {
  it('teaches the next unlearned word in order, then due reviews', () => {
    const plan = planSession({ words, cards: [cardDueOn('alpha', today)], today, lastActive: '2026-10-02', newPerDay: 1 })
    expect(plan.todaysWords).toEqual(['bravo'])
    expect(plan.steps.map((s) => `${s.wordId}:${s.kind}`)).toEqual([
      'bravo:learn',
      'bravo:meaning',
      'bravo:cloze',
      'bravo:write',
      'alpha:collocation',
    ])
  })

  it('resumes: a word learned today is not taught again', () => {
    const cards = [cardDueOn('alpha', '2026-10-05', today)]
    const plan = planSession({ words, cards, today, lastActive: today, newPerDay: 1 })
    expect(plan.todaysWords).toEqual(['alpha'])
    expect(plan.steps).toEqual([])
  })

  it('pauses new words when too many reviews are waiting', () => {
    const many = Array.from({ length: 25 }, (_, i) => word(`w${i}`))
    const cards = many.map((w) => cardDueOn(w.id, '2026-10-01'))
    const plan = planSession({ words: [...many, ...words], cards, today, lastActive: '2026-10-02', newPerDay: 2 })
    expect(plan).toMatchObject({ paused: true, todaysWords: [], dueCount: 25 })
  })

  it('serves a short, easy set after a break', () => {
    const many = Array.from({ length: 12 }, (_, i) => word(`w${i}`))
    const cards = many.map((w) => cardDueOn(w.id, '2026-09-20'))
    const plan = planSession({ words: [...many, ...words], cards, today, lastActive: '2026-09-25', newPerDay: 1 })
    expect(plan.gentle).toBe(true)
    expect(plan.steps.filter((s) => s.phase === 'review')).toHaveLength(5)
  })
})

describe('exercises', () => {
  it('accepts any listed form and flags one-letter slips as close', () => {
    const accepted = ['mitigate', 'mitigates', 'mitigated']
    expect(checkTyped(' Mitigated. ', accepted)).toBe('right')
    expect(checkTyped('mitigatd', accepted)).toBe('close')
    expect(checkTyped('reduce', accepted)).toBe('wrong')
    expect(checkTyped('', accepted)).toBe('wrong')
  })

  it('blanks the word inside a collocation', () => {
    expect(collocationPrompt(word('robust', { collocations: ['a robust system'] }))).toEqual({
      prompt: 'a ___ system',
      answer: 'robust',
    })
  })

  it('climbs the ladder as reviews accumulate and drops back after a lapse', () => {
    const w = word('alpha')
    let card = grade(newCard(), Rating.Good)
    expect(pickExercise(w, card)).toBe('cloze')
    card = grade(card, Rating.Again, new Date(+card.due + 1))
    expect(pickExercise(w, card, Rating.Again)).toBe('meaning')
  })
})
