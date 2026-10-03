import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { Word } from '../types'
import { WORDS } from '../data/words'
import { getFeedback } from '../lib/ai'
import { db, type Feedback } from '../lib/db'
import { checkTyped, collocationPrompt, sameSentence, shuffle, wordChoices, type Verdict } from '../lib/exercises'
import { Rating, type Grade } from '../lib/srs'
import { Highlight } from './WordEntry'
import { IconSparkle } from './Icons'

export interface Outcome {
  verdict: Verdict
  rating: Grade
  answer?: ReactNode // shown in the feedback bar when not right
  note?: string
}

interface ExProps {
  word: Word
  locked: boolean
  onAnswer: (o: Outcome) => void
}

/** Renders a sentence with its "___" as a styled blank, optionally filled in. */
function Blank({ sentence, fill, state }: { sentence: string; fill?: string; state?: Verdict }) {
  const [before, after] = sentence.split('___')
  return (
    <p className="ex-sentence serif">
      {before}
      <span className={`ex-blank ${state ? `is-${state}` : ''}`}>{fill || ' '}</span>
      {after}
    </p>
  )
}

/* ── Recognise: what does it mean? ─────────────────── */
export function MeaningEx({ word, locked, onAnswer }: ExProps) {
  const options = useMemo(() => shuffle([word.definition, ...word.distractors]), [word])
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div className="ex">
      <p className="eyebrow">What does it mean?</p>
      <h2 className="display ex-word">{word.word}</h2>
      <div className="choices">
        {options.map((o) => {
          const state = picked && (o === word.definition ? 'right' : o === picked ? 'wrong' : 'idle')
          return (
            <button
              key={o}
              className={`choice ${state ? `is-${state}` : ''}`}
              disabled={locked}
              onClick={() => {
                setPicked(o)
                const right = o === word.definition
                onAnswer({ verdict: right ? 'right' : 'wrong', rating: right ? Rating.Good : Rating.Again })
              }}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Recall: type the word into the sentence ───────── */
export function TypedEx({ word, locked, onAnswer, mode }: ExProps & { mode: 'cloze' | 'form' }) {
  const [value, setValue] = useState('')
  const [hint, setHint] = useState(false)
  const [result, setResult] = useState<Verdict>()
  const drill = mode === 'form' && word.formDrill ? word.formDrill : null
  const sentence = drill ? drill.sentence : word.cloze.sentence
  const accepted = drill ? [drill.answer] : word.forms
  const answer = drill ? drill.answer : word.cloze.answer

  function submit() {
    if (locked || !value.trim()) return
    const verdict = checkTyped(value, accepted)
    setResult(verdict)
    const rating = verdict === 'wrong' ? Rating.Again : verdict === 'close' || hint ? Rating.Hard : Rating.Good
    onAnswer({
      verdict,
      rating,
      answer: <strong className="serif">{answer}</strong>,
      note: verdict === 'close' ? 'So close. Watch the spelling.' : undefined,
    })
  }

  return (
    <div className="ex">
      <p className="eyebrow">{drill ? 'Change the form' : 'Fill the gap'}</p>
      <Blank sentence={sentence} fill={result ? value : undefined} state={result} />
      {drill ? (
        <p className="ex-cue">
          Use a form of <strong className="serif">{drill.base}</strong>
        </p>
      ) : (
        <p className="ex-cue">
          {hint ? (
            <>
              Starts with <strong className="serif">{answer.slice(0, 2)}…</strong> · {word.definition}
            </>
          ) : (
            !locked && (
              <button className="btn-text" onClick={() => setHint(true)}>
                Need a hint?
              </button>
            )
          )}
        </p>
      )}
      <form
        className="ex-type"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          className="input serif"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type the word"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          disabled={locked}
          aria-label="Your answer"
        />
        {!locked && (
          <button className="btn btn-ink" disabled={!value.trim()}>
            Check
          </button>
        )}
      </form>
    </div>
  )
}

/* ── Collocation: which word completes the phrase? ─── */
export function CollocationEx({ word, locked, onAnswer }: ExProps) {
  const col = collocationPrompt(word)!
  const options = useMemo(() => wordChoices(word, col.answer, WORDS), [word, col.answer])
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div className="ex">
      <p className="eyebrow">Which word goes here?</p>
      <Blank sentence={col.prompt} fill={picked ?? undefined} state={picked ? (picked === col.answer ? 'right' : 'wrong') : undefined} />
      <div className="choices choices--words">
        {options.map((o) => {
          const state = picked && (o === col.answer ? 'right' : o === picked ? 'wrong' : 'idle')
          return (
            <button
              key={o}
              className={`choice serif ${state ? `is-${state}` : ''}`}
              disabled={locked}
              onClick={() => {
                setPicked(o)
                const right = o === col.answer
                onAnswer({
                  verdict: right ? 'right' : 'wrong',
                  rating: right ? Rating.Good : Rating.Again,
                  answer: <strong className="serif">{col.prompt.replace('___', col.answer)}</strong>,
                })
              }}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Grammar: correct the sentence ─────────────────── */
export function FixEx({ word, locked, onAnswer }: ExProps) {
  const [value, setValue] = useState(word.fix.wrong)
  const [stage, setStage] = useState<'edit' | 'compare' | 'done'>('edit')

  function check() {
    if (sameSentence(value, word.fix.right)) {
      setStage('done')
      onAnswer({ verdict: 'right', rating: Rating.Good, note: word.fix.why })
    } else {
      setStage('compare')
    }
  }

  function selfGrade(ok: boolean) {
    setStage('done')
    onAnswer({
      verdict: ok ? 'right' : 'wrong',
      rating: ok ? Rating.Good : Rating.Again,
      answer: <strong className="serif">{word.fix.right}</strong>,
      note: word.fix.why,
    })
  }

  return (
    <div className="ex">
      <p className="eyebrow">Something’s off. Fix it.</p>
      <p className="ex-cue">
        Edit the sentence so <strong className="serif">{word.word}</strong> is used correctly.
      </p>
      <textarea
        className="input"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={stage !== 'edit' || locked}
        aria-label="Corrected sentence"
        spellCheck={false}
      />
      {stage === 'edit' && (
        <div className="ex-row">
          <button className="btn-text" onClick={() => setValue(word.fix.wrong)}>
            Reset
          </button>
          <button className="btn btn-ink" onClick={check} disabled={sameSentence(value, word.fix.wrong)}>
            Check
          </button>
        </div>
      )}
      {stage === 'compare' && (
        <div className="ex-compare rise">
          <p className="eyebrow">A correct version</p>
          <p className="serif ex-model">{word.fix.right}</p>
          <p className="hint">{word.fix.why}</p>
          <p className="ex-cue">Was yours correct too?</p>
          <div className="ex-row">
            <button className="btn btn-ghost" onClick={() => selfGrade(false)}>
              Not quite
            </button>
            <button className="btn btn-ink" onClick={() => selfGrade(true)}>
              Mine works
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Produce: write your own sentence ──────────────── */
const VERDICT_LABEL: Record<Feedback['verdict'], string> = {
  great: 'Natural and correct',
  good: 'Good, with a small tweak',
  'needs-work': 'Nearly there',
}

export function WriteEx({
  word,
  locked,
  onAnswer,
  passcode,
  onSkip,
}: ExProps & { passcode: string; onSkip: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [selfCheck, setSelfCheck] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saved = useRef(false)
  const usesWord = word.forms.some((f) => new RegExp(`\\b${f}\\b`, 'i').test(text))

  async function save(fb?: Feedback) {
    if (saved.current) return
    saved.current = true
    await db.sentences.add({ wordId: word.id, text: text.trim(), feedback: fb, at: Date.now() })
  }

  async function ask() {
    setBusy(true)
    setError(null)
    try {
      const fb = await getFeedback(passcode, word, text.trim())
      setFeedback(fb)
      await save(fb)
      onAnswer({ verdict: 'right', rating: fb.verdict === 'needs-work' ? Rating.Hard : Rating.Good })
    } catch (e) {
      setError(`${(e as Error).message} You can check it yourself instead.`)
    } finally {
      setBusy(false)
    }
  }

  async function finishSelf(ok: boolean) {
    await save()
    onAnswer({ verdict: 'right', rating: ok ? Rating.Good : Rating.Hard })
  }

  return (
    <div className="ex">
      <p className="eyebrow">Make it yours</p>
      <h2 className="ex-prompt serif">
        Write a sentence about your life using <em>{word.word}</em>.
      </h2>
      <p className="ex-cue">
        Pattern: <strong>{word.pattern.rule}</strong>
      </p>
      <textarea
        className="input"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`e.g. ${word.pattern.example}`}
        disabled={locked || busy || selfCheck}
        aria-label="Your sentence"
      />
      {text.trim().length > 8 && !usesWord && !locked && <p className="hint">Tip: include “{word.word}” (any form).</p>}

      {!locked && !selfCheck && (
        <div className="ex-row">
          <button className="btn-text" onClick={onSkip}>
            Skip
          </button>
          {passcode && !error ? (
            <button className="btn btn-ink" onClick={ask} disabled={busy || text.trim().length < 6}>
              <IconSparkle size={18} /> {busy ? 'Reading…' : 'Get feedback'}
            </button>
          ) : (
            <button className="btn btn-ink" onClick={() => setSelfCheck(true)} disabled={text.trim().length < 6}>
              Check it myself
            </button>
          )}
        </div>
      )}
      {error && <p className="hint">{error}</p>}

      {selfCheck && !locked && (
        <div className="ex-compare rise">
          <p className="eyebrow">Compare with</p>
          {word.examples.map((ex) => (
            <p key={ex} className="serif ex-model">
              <Highlight text={ex} word={word} />
            </p>
          ))}
          <p className="ex-cue">Did yours use the meaning and pattern correctly?</p>
          <div className="ex-row">
            <button className="btn btn-ghost" onClick={() => finishSelf(false)}>
              Not sure
            </button>
            <button className="btn btn-ink" onClick={() => finishSelf(true)}>
              I think so
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className={`ex-feedback rise is-${feedback.verdict}`}>
          <p className="eyebrow">{VERDICT_LABEL[feedback.verdict]}</p>
          <ul>
            {feedback.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          {!sameSentence(feedback.improved, text) && (
            <p className="serif ex-model">
              <Highlight text={feedback.improved} word={word} />
            </p>
          )}
        </div>
      )}
    </div>
  )
}
