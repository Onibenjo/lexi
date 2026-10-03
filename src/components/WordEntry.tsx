import { useState } from 'react'
import type { Word } from '../types'
import { canSpeak, speak } from '../lib/device'
import { IconRefresh, IconSpeaker } from './Icons'
import './WordEntry.css'

const POS_SHORT: Record<Word['pos'], string> = { noun: 'noun', verb: 'verb', adjective: 'adjective', adverb: 'adverb' }

/** Emphasise the word (any listed form) inside an example sentence. */
export function Highlight({ text, word }: { text: string; word: Word }) {
  const forms = [...word.forms].sort((a, b) => b.length - a.length).map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`\\b(${forms.join('|')})\\b`, 'i'))
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <em key={i}>{p}</em> : p))}
    </>
  )
}

interface Props {
  word: Word
  size?: 'hero' | 'full'
  extraExample?: string | null
  onMoreExample?: () => void
  loadingExample?: boolean
}

/** A dictionary entry: headword, pronunciation, sense, examples, then usage notes. */
export function WordEntry({ word, size = 'hero', extraExample, onMoreExample, loadingExample }: Props) {
  const [showAll, setShowAll] = useState(size === 'full')
  const examples = extraExample ? [...word.examples, extraExample] : word.examples

  return (
    <article className={`entry entry--${size}`}>
      <header className="entry-head rise">
        <h1 className="display entry-word">{word.word}</h1>
        <div className="entry-meta">
          <span className="entry-pos serif">{POS_SHORT[word.pos]}</span>
          <span className="entry-ipa">{word.ipa}</span>
          {canSpeak() && (
            <button className="icon-btn entry-say" onClick={() => speak(word.word)} aria-label={`Hear “${word.word}”`}>
              <IconSpeaker size={20} />
            </button>
          )}
        </div>
      </header>

      <p className="entry-def serif rise rise-1">{word.definition}</p>

      <ul className="entry-examples rise rise-2">
        {(showAll ? examples : examples.slice(0, 1)).map((ex) => (
          <li key={ex} className="serif">
            <Highlight text={ex} word={word} />
          </li>
        ))}
      </ul>

      {showAll ? (
        <div className="entry-more rise">
          {onMoreExample && (
            <button className="btn-text entry-another" onClick={onMoreExample} disabled={loadingExample}>
              <IconRefresh size={16} /> {loadingExample ? 'Writing one…' : 'Another example'}
            </button>
          )}

          <section className="entry-section">
            <h2 className="eyebrow">Goes with</h2>
            <p className="entry-collocations">
              {word.collocations.map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
            </p>
          </section>

          <section className="entry-section">
            <h2 className="eyebrow">Grammar</h2>
            <p className="entry-pattern">
              <strong>{word.pattern.rule}</strong>
              <span className="serif"> — {word.pattern.example}</span>
            </p>
          </section>

          {word.family.length > 0 && (
            <section className="entry-section">
              <h2 className="eyebrow">Family</h2>
              <p className="muted">{word.family.join('  ·  ')}</p>
            </section>
          )}

          {word.tip && (
            <aside className="entry-tip">
              <span className="eyebrow">Note</span>
              <p>{word.tip}</p>
            </aside>
          )}
        </div>
      ) : (
        <button className="btn-text entry-reveal rise rise-3" onClick={() => setShowAll(true)}>
          More examples, grammar &amp; usage
        </button>
      )}
    </article>
  )
}
