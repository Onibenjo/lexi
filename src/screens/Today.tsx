import { useState } from 'react'
import { WordEntry } from '../components/WordEntry'
import { IconArrow, IconFlame, IconSnow } from '../components/Icons'
import { WORD_BY_ID, WORDS, wordNumber } from '../data/words'
import { getExample } from '../lib/ai'
import { parseDay } from '../lib/dates'
import { practiceSteps, type Step } from '../lib/session'
import type { Lexi } from '../hooks/useLexi'
import './Today.css'

const longDate = (key: string) => parseDay(key).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

export function Today({ lexi, onStart }: { lexi: Lexi; onStart: (steps: Step[], practice: boolean) => void }) {
  const { plan, streak, doneToday, today, cards, settings } = lexi
  const heroId = plan.todaysWords[0]
  const hero = heroId ? WORD_BY_ID.get(heroId) : undefined
  const reviewCount = plan.steps.filter((s) => s.phase === 'review').length
  const [extra, setExtra] = useState<string | null>(null)
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  async function moreExample() {
    if (!hero) return
    setLoadingExtra(true)
    setAiError(null)
    try {
      const { sentence } = await getExample(settings.passcode, hero, [...hero.examples, ...(extra ? [extra] : [])])
      setExtra(sentence)
    } catch (e) {
      setAiError((e as Error).message)
    } finally {
      setLoadingExtra(false)
    }
  }

  const header = (
    <div className="topline">
      <span className="eyebrow">{longDate(today)}</span>
      {(streak.current > 0 || streak.freezes > 0) && <span className="streak-chip" title={`${streak.current}-day streak`}>
        <IconFlame size={16} />
        {streak.current}
        {streak.freezes > 0 && (
          <span className="streak-freeze" aria-label={`${streak.freezes} streak freeze${streak.freezes > 1 ? 's' : ''}`}>
            <IconSnow size={13} />
            {streak.freezes}
          </span>
        )}
      </span>}
    </div>
  )

  if (doneToday) {
    return (
      <main className="page today">
        {header}
        <DoneForToday lexi={lexi} onPractice={() => onStart(practiceSteps(WORDS, cards), true)} />
      </main>
    )
  }

  const canStart = plan.steps.length > 0
  return (
    <main className="page today">
      {header}

      {plan.gentle && (
        <p className="today-note rise">
          <strong>Welcome back.</strong> Here’s a short, easy set to ease you in. No catching up required.
        </p>
      )}
      {plan.paused && (
        <p className="today-note rise">
          New words are resting while you review. Clear a few and tomorrow’s word will be waiting.
        </p>
      )}

      {hero ? (
        <>
          <p className="eyebrow today-eyebrow rise">
            Word of the day <span className="today-no">Nº {wordNumber(hero.id)}</span>
          </p>
          <WordEntry
            word={hero}
            extraExample={extra}
            onMoreExample={settings.passcode ? moreExample : undefined}
            loadingExample={loadingExtra}
          />
          {aiError && <p className="hint">{aiError}</p>}
        </>
      ) : canStart ? (
        <section className="today-review rise">
          <p className="eyebrow">Review day</p>
          <h1 className="display today-big">
            {plan.gentle ? 'A gentle set' : `${reviewCount} words`}
          </h1>
          <p className="serif today-sub">are ready to come back to you. Reviewing right before you forget is what makes them stick.</p>
        </section>
      ) : (
        <section className="today-review rise">
          <p className="eyebrow">All caught up</p>
          <h1 className="display today-big">Nothing due.</h1>
          <p className="serif today-sub">
            {cards.length >= WORDS.length ? `You’ve met all ${WORDS.length} words. ` : ''}
            A short practice round still counts toward your streak.
          </p>
        </section>
      )}

      <div className="today-cta">
        {canStart ? (
          <>
            <button className="btn btn-primary btn-block" onClick={() => onStart(plan.steps, false)}>
              {hero && !cards.some((c) => c.wordId === hero.id) ? 'Practice it' : 'Start'} <IconArrow size={20} />
            </button>
            <p className="hint today-then">
              {hero && reviewCount > 0 && !plan.gentle ? `Then ${reviewCount} to review · about ${Math.max(3, Math.round(reviewCount * 0.4 + 2))} min` : 'About 3 minutes'}
            </p>
          </>
        ) : (
          <button className="btn btn-primary btn-block" disabled={cards.length === 0} onClick={() => onStart(practiceSteps(WORDS, cards), false)}>
            Practice round <IconArrow size={20} />
          </button>
        )}
      </div>
    </main>
  )
}

function DoneForToday({ lexi, onPractice }: { lexi: Lexi; onPractice: () => void }) {
  const { plan, streak } = lexi
  const words = plan.todaysWords.map((id) => WORD_BY_ID.get(id)!).filter(Boolean)
  return (
    <section className="done-today">
      <div className="done-seal rise" aria-hidden>
        <span>done</span>
      </div>
      <h1 className="display today-big rise rise-1">That’s today.</h1>
      <p className="serif today-sub rise rise-2">
        {streak.current > 1 ? `${streak.current} days in a row. ` : ''}Come back tomorrow for a new word. Until then, use what you learned.
      </p>

      {words.length > 0 && (
        <div className="card use-it rise rise-3">
          <p className="eyebrow">Use it today</p>
          {words.map((w) => (
            <p key={w.id} className="serif use-it-line">
              Try <em>{w.word}</em> in a message or conversation. <span className="muted">{w.pattern.rule}</span>
            </p>
          ))}
        </div>
      )}

      <button className="btn btn-ghost btn-block rise rise-4" onClick={onPractice} disabled={lexi.cards.length === 0}>
        A little extra practice
      </button>
    </section>
  )
}
