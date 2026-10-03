import { IconArrow } from '../components/Icons'
import { saveSettings } from '../lib/db'
import './Pages.css'

const POINTS = [
  ['One word a day', 'A useful one: words people actually say at work, in messages, and at home.'],
  ['Use it, don’t just read it', 'You’ll recall it, fill it in, fix a sentence, and write your own.'],
  ['It comes back right before you forget', 'Short reviews, spaced out so words stick for good.'],
  ['Streaks that bend', 'Freezes and a rest day cover the days life gets in the way.'],
]

export function Welcome() {
  return (
    <main className="page welcome">
      <p className="eyebrow rise">A word a day</p>
      <h1 className="display welcome-mark rise rise-1">Lexi</h1>
      <p className="serif welcome-lede rise rise-2">Three minutes a day to a sharper, more confident English.</p>
      <ol className="welcome-points rise rise-3">
        {POINTS.map(([title, body]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span>{body}</span>
          </li>
        ))}
      </ol>
      <div className="welcome-cta rise rise-4">
        <button className="btn btn-primary btn-block" onClick={() => saveSettings({ onboarded: true })}>
          See today’s word <IconArrow size={20} />
        </button>
      </div>
    </main>
  )
}
