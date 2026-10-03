import { IconProgress, IconSettings, IconToday, IconWords } from './Icons'
import './TabBar.css'

export type Tab = 'today' | 'words' | 'progress' | 'settings'

const TABS = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'words', label: 'Words', Icon: IconWords },
  { id: 'progress', label: 'Progress', Icon: IconProgress },
  { id: 'settings', label: 'Settings', Icon: IconSettings },
] as const

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => onChange(id)}>
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
