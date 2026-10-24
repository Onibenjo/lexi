import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { deleteCloudCopy, enableSync, getSyncState, stopSync, syncLink, syncNow, type SyncState } from '../lib/sync'
import { SyncJoin } from './SyncJoin'

function ago(t: number, now: number): string {
  const m = Math.round((now - t) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  const d = Math.round(h / 24)
  return `${d} ${d === 1 ? 'day' : 'days'} ago`
}

function status(st: SyncState, now: number): string {
  const when = st.lastSyncAt ? `Synced ${ago(st.lastSyncAt, now)}` : 'Not synced yet'
  if (st.error === 'offline') return `${when} · offline`
  if (st.error) return `${when} · ${st.error}`
  return when
}

/** The "Sync across devices" section of Settings. */
export function SyncSettings({
  passcode,
  linkCode,
  onLinkUsed,
  onMessage,
}: {
  passcode: string
  linkCode?: string
  onLinkUsed: () => void
  onMessage: (m: string) => void
}) {
  const st = useLiveQuery(getSyncState, [], undefined)
  const [busy, setBusy] = useState(false)
  const [joining, setJoining] = useState(Boolean(linkCode))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (st === undefined) return null

  async function run(fn: () => Promise<unknown>, done?: string) {
    setBusy(true)
    try {
      await fn()
      if (done) onMessage(done)
    } catch (e) {
      onMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!st) {
    return (
      <section className="setting">
        <h2>Sync across devices</h2>
        <p className="hint">Keep your streak and words on your phone and computer. You get a code to enter on the other device.</p>
        {joining ? (
          <>
            <SyncJoin
              initialCode={linkCode}
              onLinkUsed={onLinkUsed}
              onJoined={() => {
                setJoining(false)
                onMessage('Synced. This device is linked.')
              }}
            />
            <button className="btn-text" onClick={() => setJoining(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <div className="setting-row">
              <button
                className="btn btn-ghost"
                disabled={busy || !passcode}
                onClick={() => run(() => enableSync(passcode), 'Sync is on.')}
              >
                {busy ? 'Turning on…' : 'Turn on sync'}
              </button>
              <button className="btn btn-ghost" onClick={() => setJoining(true)}>
                I have a code
              </button>
            </div>
            {!passcode && <p className="hint sync-note">Turning sync on needs the passcode. Enter it under AI feedback first.</p>}
          </>
        )}
      </section>
    )
  }

  return (
    <section className="setting">
      <h2>Sync across devices</h2>
      <p className="hint">Enter this code on another device, or send yourself the link.</p>
      <p className="sync-code">{st.code}</p>
      <p className="hint sync-status" role="status">
        {status(st, now)}
      </p>
      <div className="setting-row">
        <button
          className="btn btn-ghost"
          onClick={() =>
            run(async () => {
              await navigator.clipboard.writeText(syncLink(st.code))
            }, 'Link copied.')
          }
        >
          Copy sync link
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => run(syncNow)}>
          Sync now
        </button>
      </div>
      <div className="sync-leave">
        <button className="btn-text" disabled={busy} onClick={() =>
            run(async () => {
              await stopSync()
              setJoining(false)
            }, 'This device stopped syncing. Your progress stays here.')
          }>
          Stop syncing on this device
        </button>
        {confirmDelete ? (
          <span className="sync-confirm">
            <span>Erase the cloud copy?</span>
            <button className="btn-text sync-danger" disabled={busy} onClick={() =>
                run(async () => {
                  await deleteCloudCopy()
                  setJoining(false)
                  setConfirmDelete(false)
                }, 'Cloud copy deleted.')
              }>
              Erase
            </button>
            <button className="btn-text" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button className="btn-text" onClick={() => setConfirmDelete(true)}>
            Delete cloud copy
          </button>
        )}
      </div>
    </section>
  )
}
