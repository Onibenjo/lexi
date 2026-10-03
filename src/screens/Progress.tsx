import { IconFlame, IconSnow } from '../components/Icons'
import { WORDS } from '../data/words'
import { addDays, parseDay } from '../lib/dates'
import { isMature, strength } from '../lib/srs'
import { MAX_FREEZES } from '../lib/streak'
import type { Lexi } from '../hooks/useLexi'
import './Pages.css'

const WEEKS = 18

export function Progress({ lexi }: { lexi: Lexi }) {
  const { streak, cards, days, today, settings } = lexi
  const inUse = cards.filter((c) => isMature(c.card)).length
  const growing = cards.filter((c) => strength(c.card) >= 2).length - inUse
  const doneDays = new Set(days.filter((d) => d.done).map((d) => d.day))
  const frozen = new Set(streak.frozenDays)
  const rest = new Set(streak.restDays)

  // Grid ends on the current week's Saturday; columns are weeks, rows Sun→Sat.
  const end = addDays(today, 6 - parseDay(today).getDay())
  const start = addDays(end, -(WEEKS * 7 - 1))
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i))
  const totalDone = doneDays.size

  return (
    <main className="page">
      <div className="topline">
        <span className="eyebrow">Progress</span>
      </div>

      <section className="streak-hero rise">
        <div className="streak-big">
          <IconFlame size={30} />
          <span className="display">{streak.current}</span>
        </div>
        <p className="muted">{streak.current === 1 ? 'day' : 'days'} in a row · best {streak.best}</p>
        <p className="freezes" aria-label={`${streak.freezes} of ${MAX_FREEZES} streak freezes`}>
          {Array.from({ length: MAX_FREEZES }, (_, i) => (
            <span key={i} className={i < streak.freezes ? 'on' : ''}>
              <IconSnow size={16} />
            </span>
          ))}
          <span className="hint">
            {streak.freezes > 0 ? 'A freeze covers a missed day automatically.' : 'Earn a freeze every 7 days in a row.'}
          </span>
        </p>
      </section>

      <section className="heat rise rise-1" aria-label={`${totalDone} days practised`}>
        <div className="heat-grid">
          {cells.map((d) => {
            const state = doneDays.has(d) ? 'done' : frozen.has(d) ? 'frozen' : rest.has(d) ? 'rest' : d > today ? 'future' : ''
            return <i key={d} className={`${state} ${d === today ? 'today' : ''}`} title={d} />
          })}
        </div>
        <div className="heat-legend hint">
          <span>
            <i className="done" /> practised
          </span>
          <span>
            <i className="frozen" /> freeze
          </span>
          {settings.restWeekday !== null && (
            <span>
              <i className="rest" /> rest day
            </span>
          )}
        </div>
      </section>

      <section className="tally rise rise-2">
        <div>
          <span className="display">{inUse}</span>
          <p>in use</p>
          <span className="hint">remembered for 3+ weeks</span>
        </div>
        <div>
          <span className="display">{Math.max(0, growing)}</span>
          <p>growing</p>
          <span className="hint">getting stronger</span>
        </div>
        <div>
          <span className="display">{cards.length}</span>
          <p>met</p>
          <span className="hint">of {WORDS.length}</span>
        </div>
      </section>
    </main>
  )
}
