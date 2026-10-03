import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconSearch } from '../components/Icons'
import { WordEntry } from '../components/WordEntry'
import { WORD_BY_ID, WORDS } from '../data/words'
import { db } from '../lib/db'
import { strength } from '../lib/srs'
import type { Lexi } from '../hooks/useLexi'
import './Pages.css'

export function Dots({ n }: { n: number }) {
  return (
    <span className="dots" aria-label={`Strength ${n} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={i <= n ? 'on' : ''} />
      ))}
    </span>
  )
}

export function Words({ lexi }: { lexi: Lexi }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const learned = useMemo(
    () =>
      [...lexi.cards]
        .sort((a, b) => b.introducedOn.localeCompare(a.introducedOn))
        .map((c) => ({ c, w: WORD_BY_ID.get(c.wordId)! }))
        .filter((x) => x.w),
    [lexi.cards],
  )
  const query = q.trim().toLowerCase()
  const shown = query ? learned.filter(({ w }) => w.word.includes(query) || w.definition.toLowerCase().includes(query)) : learned

  return (
    <main className="page">
      <div className="topline">
        <span className="eyebrow">Your words</span>
        <span className="hint">
          {learned.length} of {WORDS.length}
        </span>
      </div>

      {learned.length === 0 ? (
        <section className="empty rise">
          <h1 className="display empty-title">A blank page.</h1>
          <p className="serif muted">Every word you learn lands here, along with the sentences you write with it.</p>
        </section>
      ) : (
        <>
          <label className="search">
            <IconSearch size={18} />
            <span className="sr-only">Search your words</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" type="search" />
          </label>
          <ul className="word-list">
            {shown.map(({ c, w }) => (
              <li key={w.id}>
                <button className="word-row" onClick={() => setOpen(w.id)}>
                  <span className="word-row-main">
                    <span className="serif word-row-word">{w.word}</span>
                    <span className="word-row-def">{w.definition}</span>
                  </span>
                  <Dots n={strength(c.card)} />
                </button>
              </li>
            ))}
          </ul>
          {shown.length === 0 && <p className="hint">No match for “{q}”.</p>}
        </>
      )}

      {open && <WordSheet id={open} onClose={() => setOpen(null)} />}
    </main>
  )
}

function WordSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const word = WORD_BY_ID.get(id)!
  const sentences = useLiveQuery(() => db.sentences.where('wordId').equals(id).reverse().sortBy('at'), [id])
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal aria-label={word.word} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn sheet-close" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
        <WordEntry word={word} size="full" />
        {sentences && sentences.length > 0 && (
          <section className="entry-section">
            <h2 className="eyebrow">Your sentences</h2>
            <ul className="my-sentences">
              {sentences.map((s) => (
                <li key={s.id} className="serif">
                  {s.text}
                  {s.feedback && s.feedback.improved && s.feedback.improved !== s.text && (
                    <span className="my-improved">→ {s.feedback.improved}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>,
    document.body,
  )
}
