import { useEffect, useState } from 'react'
import { TabBar, type Tab } from './components/TabBar'
import { useLexi } from './hooks/useLexi'
import type { Step } from './lib/session'
import { Progress } from './screens/Progress'
import { Session } from './screens/Session'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import { Welcome } from './screens/Welcome'
import { Words } from './screens/Words'

export default function App() {
  const lexi = useLexi()
  const [tab, setTab] = useState<Tab>('today')
  const [session, setSession] = useState<{ steps: Step[]; id: number } | null>(null)

  useEffect(() => {
    const root = document.documentElement
    if (lexi.settings.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = lexi.settings.theme
  }, [lexi.settings.theme])

  if (!lexi.ready) return null
  if (!lexi.settings.onboarded) return <Welcome />

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
      {tab === 'settings' && <Settings lexi={lexi} />}
      <TabBar tab={tab} onChange={setTab} />
    </>
  )
}
