import { useState } from 'react'
import { CalendarView } from './views/CalendarView'
import { WorkoutView } from './views/WorkoutView'
import { ProgramsView } from './views/ProgramsView'
import { StatsView } from './views/StatsView'
import { SettingsView } from './views/SettingsView'
import { RestTimer } from './components/RestTimer'
import { todayKey } from './lib/date'

type Tab = 'calendar' | 'workout' | 'programs' | 'stats' | 'settings'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'calendar', label: 'カレンダー', icon: '📅' },
  { key: 'workout', label: '記録', icon: '✏️' },
  { key: 'programs', label: 'プログラム', icon: '📋' },
  { key: 'stats', label: '分析', icon: '📈' },
  { key: 'settings', label: '設定', icon: '⚙️' },
]

export function App() {
  const [tab, setTab] = useState<Tab>('calendar')
  const [date, setDate] = useState(todayKey())
  const [prevTab, setPrevTab] = useState<Tab>('calendar')

  const openDate = (d: string) => {
    setDate(d)
    if (tab !== 'workout') setPrevTab(tab)
    setTab('workout')
    window.scrollTo(0, 0)
  }

  return (
    <div className="app">
      <main>
        {tab === 'calendar' && <CalendarView onOpenDate={openDate} />}
        {tab === 'workout' && <WorkoutView date={date} onBack={() => setTab(prevTab)} />}
        {tab === 'programs' && <ProgramsView onOpenDate={openDate} />}
        {tab === 'stats' && <StatsView onOpenDate={openDate} />}
        {tab === 'settings' && <SettingsView />}
      </main>
      <RestTimer />
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => {
              if (t.key === 'workout') openDate(todayKey())
              else setTab(t.key)
            }}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
