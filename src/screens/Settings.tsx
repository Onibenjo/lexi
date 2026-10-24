import { useRef, useState } from 'react'
import { exportAll, importAll, saveSettings, type Theme } from '../lib/db'
import { downloadReminder } from '../lib/device'
import { SyncSettings } from '../components/SyncSettings'
import type { Lexi } from '../hooks/useLexi'
import './Pages.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function Settings({ lexi, linkCode, onLinkUsed }: { lexi: Lexi; linkCode?: string; onLinkUsed: () => void }) {
  const s = lexi.settings
  const [pass, setPass] = useState(s.passcode)
  const [msg, setMsg] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  async function backup() {
    const blob = new Blob([await exportAll()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `lexi-backup-${lexi.today}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function restore(f: File) {
    try {
      await importAll(await f.text())
      setMsg('Backup restored.')
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  return (
    <main className="page">
      <div className="topline">
        <span className="eyebrow">Settings</span>
      </div>

      <section className="setting">
        <h2>New words a day</h2>
        <p className="hint">One is plenty. Reviews are where the learning happens.</p>
        <div className="seg">
          {[1, 2, 3].map((n) => (
            <button key={n} aria-pressed={s.newPerDay === n} onClick={() => saveSettings({ newPerDay: n })}>
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="setting">
        <h2>Rest day</h2>
        <p className="hint">One day a week off that never breaks your streak.</p>
        <div className="seg seg--days">
          <button aria-pressed={s.restWeekday === null} onClick={() => saveSettings({ restWeekday: null })}>
            None
          </button>
          {WEEKDAYS.map((d, i) => (
            <button key={d} aria-pressed={s.restWeekday === i} onClick={() => saveSettings({ restWeekday: i })}>
              {d}
            </button>
          ))}
        </div>
      </section>

      <section className="setting">
        <h2>Daily reminder</h2>
        <p className="hint">Adds a repeating event to your phone’s calendar. Pick a moment you already have, like morning coffee or your commute.</p>
        <div className="setting-row">
          <input
            className="input"
            type="time"
            value={s.reminderTime}
            onChange={(e) => saveSettings({ reminderTime: e.target.value })}
            aria-label="Reminder time"
          />
          <button className="btn btn-ghost" onClick={() => downloadReminder(s.reminderTime)}>
            Add to calendar
          </button>
        </div>
      </section>

      <section className="setting">
        <h2>Appearance</h2>
        <div className="seg">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} aria-pressed={s.theme === t} onClick={() => saveSettings({ theme: t })}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="setting">
        <h2>AI feedback</h2>
        <p className="hint">Enter the passcode to get feedback on your sentences and fresh examples. Everything else works without it.</p>
        <form
          className="setting-row"
          onSubmit={(e) => {
            e.preventDefault()
            saveSettings({ passcode: pass.trim() })
            setMsg(pass.trim() ? 'Passcode saved.' : 'AI feedback turned off.')
          }}
        >
          <input
            className="input"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Passcode"
            autoComplete="off"
            aria-label="AI passcode"
          />
          <button className="btn btn-ghost">Save</button>
        </form>
      </section>

      <SyncSettings passcode={s.passcode} linkCode={linkCode} onLinkUsed={onLinkUsed} onMessage={setMsg} />

      <section className="setting">
        <h2>Backup file</h2>
        <p className="hint">A copy of your progress you keep yourself. Restoring replaces what’s on this device.</p>
        <div className="setting-row">
          <button className="btn btn-ghost" onClick={backup}>
            Export backup
          </button>
          <button className="btn btn-ghost" onClick={() => file.current?.click()}>
            Restore
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])}
          />
        </div>
      </section>

      {msg && (
        <p className="toast" role="status" onAnimationEnd={() => setMsg(null)}>
          {msg}
        </p>
      )}
      <p className="hint colophon">Lexi · {lexi.cards.length} {lexi.cards.length === 1 ? 'word' : 'words'} learned · made for practice, not perfection</p>
    </main>
  )
}
