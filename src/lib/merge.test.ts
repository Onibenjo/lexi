import { describe, expect, it } from 'vitest'
import { EMPTY, merge, type Snapshot } from './merge'
import { grade, newCard, Rating } from './srs'
import { computeStreak } from './streak'

const day = (d: string, done = true) => ({ day: d, done, newWords: [], reviews: 0 })
const snap = (s: Partial<Snapshot>): Snapshot => ({ ...EMPTY, ...s })
const card = (wordId: string, at: string) => {
  const t = new Date(at)
  return { wordId, card: grade(newCard(t), Rating.Good, t), introducedOn: at.slice(0, 10) }
}

describe('merge', () => {
  it('keeps every completed day from both devices, so the streak survives', () => {
    const home = snap({ days: [day('2026-10-01'), day('2026-10-02')] })
    const travel = snap({ days: [day('2026-10-03'), day('2026-10-04'), day('2026-10-02', false)] })
    const m = merge(home, travel)
    expect(m.days.map((d) => [d.day, d.done])).toEqual([
      ['2026-10-01', true],
      ['2026-10-02', true],
      ['2026-10-03', true],
      ['2026-10-04', true],
    ])
    expect(computeStreak(m.days.filter((d) => d.done).map((d) => d.day), '2026-10-05', null).current).toBe(4)
  })

  it('unions new words for a day and keeps the larger review count', () => {
    const a = snap({ days: [{ day: '2026-10-01', done: false, newWords: ['x'], reviews: 3 }] })
    const b = snap({ days: [{ day: '2026-10-01', done: true, newWords: ['x', 'y'], reviews: 5 }] })
    expect(merge(a, b).days[0]).toEqual({ day: '2026-10-01', done: true, newWords: ['x', 'y'], reviews: 5 })
  })

  it('takes the more recently reviewed copy of a card, whichever side it is on', () => {
    const older = card('w', '2026-10-01T09:00:00Z')
    const newer = card('w', '2026-10-03T09:00:00Z')
    expect(merge(snap({ cards: [older] }), snap({ cards: [newer] })).cards[0]).toBe(newer)
    expect(merge(snap({ cards: [newer] }), snap({ cards: [older] })).cards[0]).toBe(newer)
  })

  it('compares card times even when one side came through JSON', () => {
    const newer = card('w', '2026-10-03T09:00:00Z')
    const fromJson = JSON.parse(JSON.stringify(snap({ cards: [newer] }))) as Snapshot
    const m = merge(snap({ cards: [card('w', '2026-10-01T09:00:00Z')] }), fromJson)
    expect(new Date(m.cards[0].card.last_review!).toISOString()).toBe('2026-10-03T09:00:00.000Z')
  })

  it('unions reviews and sentences without duplicates', () => {
    const r1: Snapshot['reviews'][0] = ['w', '2026-10-01', 1, 'cloze', 3]
    const r2: Snapshot['reviews'][0] = ['w', '2026-10-02', 2, 'fix', 3]
    const s = { wordId: 'w', text: 'Hi', at: 5 }
    const m = merge(snap({ reviews: [r1], sentences: [s] }), snap({ reviews: [r1, r2], sentences: [{ ...s, feedback: { verdict: 'great', notes: [], improved: 'Hi' } }] }))
    expect(m.reviews).toEqual([r1, r2])
    expect(m.sentences).toHaveLength(1)
    expect(m.sentences[0].feedback?.verdict).toBe('great')
  })

  it('newer settings win, and missing settings never override', () => {
    const old = { newPerDay: 1, restWeekday: null, reminderTime: '08:00', passcode: '', at: 1 }
    const fresh = { ...old, newPerDay: 2, at: 2 }
    expect(merge(snap({ settings: old }), snap({ settings: fresh })).settings).toBe(fresh)
    expect(merge(snap({ settings: fresh }), snap({ settings: old })).settings).toBe(fresh)
    expect(merge(snap({ settings: old }), EMPTY).settings).toBe(old)
  })

  it('is stable: merging the result again changes nothing', () => {
    const a = snap({ days: [day('2026-10-02'), day('2026-10-01')], cards: [card('b', '2026-10-01T00:00:00Z'), card('a', '2026-10-02T00:00:00Z')] })
    const b = snap({ days: [day('2026-10-03')] })
    const once = merge(a, b)
    expect(JSON.stringify(merge(once, once))).toBe(JSON.stringify(once))
    expect(JSON.stringify(merge(b, a))).toBe(JSON.stringify(once))
  })
})
