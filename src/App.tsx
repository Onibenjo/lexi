import { useEffect, useState } from 'react'
import { TabBar, type Tab } from './components/TabBar'
import { useLexi } from './hooks/useLexi'
import type { Step } from './lib/session'
import { normalizeCode, startSync } from './lib/sync'
import { Progress } from './screens/Progress'
import { Session } from './screens/Session'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import { Welcome } from './screens/Welcome'
import { Words } from './screens/Words'

/** A sync link looks like /#sync=<code>. Read it once and clear it from the address bar. */
function takeLinkCode(): string | undefined {
  const m = location.hash.match(/^#sync=(.+)$/)
  if (!m) return undefined
  history.replaceState(null, '', location.pathname + location.search)
  return normalizeCode(decodeURIComponent(m[1]))
}
// Module level, so StrictMode's double render can't read the hash after it was cleared.
const LINK_CODE = takeLinkCode()

export default function App() {
  const lexi = useLexi()
  const [linkCode, setLinkCode] = useState(LINK_CODE)
  const linkUsed = () => setLinkCode(undefined)
  const [tab, setTab] = useState<Tab>(linkCode ? 'settings' : 'today')

  useEffect(startSync, [])
  const [session, setSession] = useState<{ steps: Step[]; id: number } | null>(null)

  useEffect(() => {
    const root = document.documentElement
    if (lexi.settings.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = lexi.settings.theme
  }, [lexi.settings.theme])

  if (!lexi.ready) return null
  if (!lexi.settings.onboarded) return <Welcome linkCode={linkCode} onLinkUsed={linkUsed} />

  if (session) {
    return (
      <Session
        key={session.id}
        initial={session.steps}
        lexi={lexi}
        onExit={() => {
          setSession(null)
          setTab('today')
        }}
      />
    )
  }

  return (
    <>
      {tab === 'today' && <Today lexi={lexi} onStart={(steps) => setSession({ steps, id: Date.now() })} />}
      {tab === 'words' && <Words lexi={lexi} />}
      {tab === 'progress' && <Progress lexi={lexi} />}
      {tab === 'settings' && <Settings lexi={lexi} linkCode={linkCode} onLinkUsed={linkUsed} />}
      <TabBar tab={tab} onChange={setTab} />
    </>
  )
}
