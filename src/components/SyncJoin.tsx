import { useEffect, useRef, useState } from 'react'
import { joinSync } from '../lib/sync'

/** "Enter your sync code" form, used on the Welcome screen and in Settings. */
export function SyncJoin({
  initialCode = '',
  onJoined,
  onLinkUsed,
}: {
  initialCode?: string
  onJoined: () => void
  onLinkUsed?: () => void // a link's code is tried once, so stopping sync later doesn't rejoin
}) {
  const [code, setCode] = useState(initialCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const auto = useRef(false)

  async function join(value: string) {
    if (!value.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await joinSync(value)
      onJoined()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Opening a sync link fills the code in; join straight away (once, even in StrictMode).
  useEffect(() => {
    if (initialCode && !auto.current) {
      auto.current = true
      void join(initialCode).finally(onLinkUsed)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs once for the link's code
  }, [])

  return (
    <form
      className="sync-join"
      onSubmit={(e) => {
        e.preventDefault()
        void join(code)
      }}
    >
      <div className="setting-row">
        <input
          className="input sync-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="amber-otter-quill-maple-42"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Sync code"
        />
        <button className="btn btn-ink" disabled={busy || !code.trim()}>
          {busy ? 'Joining…' : 'Join'}
        </button>
      </div>
      {error && (
        <p className="sync-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
