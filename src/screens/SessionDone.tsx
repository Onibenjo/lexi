import { useEffect, useState } from 'react'
import { IconFlame, IconShare } from '../components/Icons'
import { WORD_BY_ID } from '../data/words'
import { parseDay } from '../lib/dates'
import { buzz } from '../lib/device'
import { shareWordCard } from '../lib/shareCard'
import type { Lexi } from '../hooks/useLexi'
import type { SessionStats } from './Session'

const MILESTONES = [7, 14, 30, 50, 100, 200, 365]

export function SessionDone({ stats, lexi, onExit }: { stats: SessionStats; lexi: Lexi; onExit: () => void }) {
  // The live streak updates once today's record is written; count up to it.
  const target = lexi.streak.current
  const [shown, setShown] = useState(stats.streakBefore)
  const milestone = target > stats.streakBefore && MILESTONES.includes(target)
  const word = stats.newWords.map((id) => WORD_BY_ID.get(id)).find(Boolean)
  const stampDate = parseDay(lexi.today).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  useEffect(() => {
    const t = setTimeout(() => {
      setShown(target)
      if (target > stats.streakBefore) buzz(milestone ? [15, 80, 15, 80, 30] : 18)
    }, 700)
    return () => clearTimeout(t)
  }, [target, stats.streakBefore, milestone])

  return (
    <div className="session session-done">
      {milestone && <Confetti />}
      <main className="done-body">
        <div className="stamp" aria-hidden>
          <span className="stamp-top">Lexi</span>
          <span className="stamp-mid">done</span>
          <span className="stamp-bot">{stampDate}</span>
        </div>

        <div className="done-streak rise rise-2">
          <IconFlame size={26} />
          <span className="display done-number" key={shown}>
            {shown}
          </span>
        </div>
        <p className="done-label rise rise-2">
          {milestone ? `${target} days. That’s a real habit.` : target === 1 ? 'Day one. The hardest one.' : 'days in a row'}
        </p>

        <dl className="done-stats rise rise-3">
          {stats.newWords.length > 0 && (
            <div>
              <dt>New</dt>
              <dd className="serif">{stats.newWords.length}</dd>
            </div>
          )}
          {stats.reviewed > 0 && (
            <div>
              <dt>Reviewed</dt>
              <dd className="serif">{stats.reviewed}</dd>
            </div>
          )}
          <div>
            <dt>Correct</dt>
            <dd className="serif">{stats.right}</dd>
          </div>
        </dl>

        {word && (
          <p className="serif done-nudge rise rise-4">
            Now use <em>{word.word}</em> once today, in a message, a meeting, or out loud. That’s what makes it yours.
          </p>
        )}
      </main>
      <footer className="session-foot done-foot">
        {word && (
          <button className="btn btn-ghost btn-block" onClick={() => shareWordCard(word, target)}>
            <IconShare size={20} /> Share today’s word
          </button>
        )}
        <button className="btn btn-primary btn-block" onClick={onExit}>
          Finish
        </button>
      </footer>
    </div>
  )
}

function Confetti() {
  const colors = ['var(--brick)', 'var(--gold)', 'var(--sage)', 'var(--ink-2)']
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 7) * 90}ms`,
            animationDuration: `${1400 + ((i * 53) % 900)}ms`,
            transform: `rotate(${i * 29}deg)`,
          }}
        />
      ))}
    </div>
  )
}
