import { useEffect, useRef, useState } from 'react'
import { CollocationEx, FixEx, MeaningEx, TypedEx, WriteEx, type Outcome } from '../components/Exercises'
import { IconArrow, IconClose } from '../components/Icons'
import { WordEntry } from '../components/WordEntry'
import { WORD_BY_ID } from '../data/words'
import { completeDay, recordAnswer } from '../lib/actions'
import { buzz } from '../lib/device'
import type { ExerciseKind } from '../lib/exercises'
import type { Step } from '../lib/session'
import type { Lexi } from '../hooks/useLexi'
import { SessionDone } from './SessionDone'
import './Session.css'

const PRAISE = ['Exactly.', 'Yes.', 'Spot on.', 'That’s it.', 'Nicely done.']

export interface SessionStats {
  newWords: string[]
  reviewed: number
  right: number
  streakBefore: number
}

export function Session({ initial, lexi, onExit }: { initial: Step[]; lexi: Lexi; onExit: () => void }) {
  // Snapshot of the plan: answering changes the live data, but the session order must not shift.
  const [steps, setSteps] = useState(initial)
  const [index, setIndex] = useState(0)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [finished, setFinished] = useState(false)
  const retried = useRef(new Set<string>())
  const stats = useRef<SessionStats>({ newWords: [], reviewed: 0, right: 0, streakBefore: lexi.streak.current })
  const today = useRef(lexi.today).current

  const step = steps[index]
  const word = step ? WORD_BY_ID.get(step.wordId) : undefined

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [index])

  if (finished) return <SessionDone stats={stats.current} lexi={lexi} onExit={onExit} />
  if (!step || !word) return null

  const kind = step.kind
  const total = steps.length
  const progress = (index + (outcome ? 1 : 0)) / total

  async function answer(o: Outcome) {
    setOutcome(o)
    buzz(o.verdict === 'wrong' ? [10, 60, 10] : 10)
    const exKind = kind as ExerciseKind
    if (o.verdict !== 'wrong' && step.phase !== 'retry') stats.current.right++
    if (step.phase === 'review' || step.phase === 'practice') stats.current.reviewed++
    if (step.phase === 'new' && exKind === 'cloze') stats.current.newWords.push(step.wordId)
    // A miss comes back once at the end as a quick recognition check.
    if (o.verdict === 'wrong' && !retried.current.has(step.wordId)) {
      retried.current.add(step.wordId)
      setSteps((s) => [...s, { wordId: step.wordId, kind: 'meaning', phase: 'retry' }])
    }
    await recordAnswer(step, exKind, o.rating, today)
  }

  async function next() {
    setOutcome(null)
    if (index + 1 < steps.length) {
      setIndex(index + 1)
      return
    }
    await completeDay(today)
    setFinished(true)
  }

  /** Skipping the writing step: for a new word just move on; for a review swap in a gap-fill. */
  function skipWrite() {
    if (step.phase === 'new') {
      void next()
      return
    }
    setSteps((s) => s.map((x, i) => (i === index ? { ...x, kind: 'cloze' } : x)))
  }

  const isRetry = step.phase === 'retry'
  const locked = outcome !== null

  return (
    <div className="session">
      <header className="session-top">
        <button className="icon-btn" onClick={onExit} aria-label="Close. Your progress is saved">
          <IconClose />
        </button>
        <div className="session-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        <span className="session-count">
          {Math.min(index + 1, total)}/{total}
        </span>
      </header>

      <main className="session-body" key={index}>
        {isRetry && <p className="session-tag">One more look</p>}
        {step.phase === 'new' && kind !== 'learn' && <p className="session-tag">Today’s word</p>}

        {kind === 'learn' && (
          <>
            <p className="eyebrow session-learn-eyebrow">New word</p>
            <WordEntry word={word} size="full" />
          </>
        )}
        {kind === 'meaning' && <MeaningEx word={word} locked={locked} onAnswer={answer} />}
        {(kind === 'cloze' || kind === 'form') && <TypedEx word={word} locked={locked} onAnswer={answer} mode={kind} />}
        {kind === 'collocation' && <CollocationEx word={word} locked={locked} onAnswer={answer} />}
        {kind === 'fix' && <FixEx word={word} locked={locked} onAnswer={answer} />}
        {kind === 'write' && (
          <WriteEx word={word} locked={locked} onAnswer={answer} passcode={lexi.settings.passcode} onSkip={skipWrite} />
        )}
      </main>

      {kind === 'learn' && (
        <footer className="session-foot">
          <button className="btn btn-primary btn-block" onClick={next}>
            Got it. Test me <IconArrow size={20} />
          </button>
        </footer>
      )}

      {outcome && (
        <footer className={`session-sheet is-${outcome.verdict}`} role="status">
          <div className="sheet-text">
            <p className="sheet-title">
              {outcome.verdict === 'right'
                ? kind === 'write'
                  ? 'Saved to your words.'
                  : PRAISE[index % PRAISE.length]
                : outcome.verdict === 'close'
                  ? 'Almost.'
                  : 'Not this time.'}
            </p>
            {outcome.verdict !== 'right' && outcome.answer && <p className="sheet-answer">Answer: {outcome.answer}</p>}
            {outcome.note && <p className="sheet-note">{outcome.note}</p>}
          </div>
          <button className="btn btn-ink btn-block" onClick={next} autoFocus>
            Continue
          </button>
        </footer>
      )}
    </div>
  )
}
