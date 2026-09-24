import { useState } from 'react'
import { useAppState } from '../lib/store'
import { WEEKDAYS, formatDateJa, toDateKey, todayKey } from '../lib/date'
import { nextProgramDayIndex, workoutBodyParts } from '../lib/stats'
import { startProgramDay } from './ProgramsView'

export function CalendarView({ onOpenDate }: { onOpenDate: (date: string) => void }) {
  const state = useAppState()
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [selected, setSelected] = useState(todayKey())

  const first = new Date(ym.y, ym.m, 1)
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(ym.y, ym.m, i + 1))),
  ]
  const move = (d: number) => setYm(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }))

  const monthPrefix = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`
  const monthCount = Object.values(state.workouts).filter((w) => w.date.startsWith(monthPrefix) && w.exercises.length).length

  const sel = state.workouts[selected]
  const activeProgram = state.programs.find((p) => p.id === state.activeProgramId)
  const nextIdx = activeProgram ? nextProgramDayIndex(state, activeProgram) : -1
  const nextDay = activeProgram && nextIdx >= 0 ? activeProgram.days[nextIdx] : undefined

  return (
    <div className="view">
      <header className="topbar">
        <button className="icon-btn" onClick={() => move(-1)} aria-label="前の月">
          ‹
        </button>
        <h1>
          {ym.y}年{ym.m + 1}月
        </h1>
        <button className="icon-btn" onClick={() => move(1)} aria-label="次の月">
          ›
        </button>
      </header>

      <div className="calendar">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`cal-head ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>
            {w}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={`e${i}`} />
          const w = state.workouts[key]
          const parts = w ? workoutBodyParts(state, w) : []
          return (
            <button
              key={key}
              className={`cal-cell ${key === selected ? 'selected' : ''} ${key === todayKey() ? 'today' : ''}`}
              onClick={() => (key === selected ? onOpenDate(key) : setSelected(key))}
            >
              <span className="cal-day">{Number(key.slice(8))}</span>
              <span className="cal-dots">
                {parts.slice(0, 4).map((p) => (
                  <span key={p} className={`dot part-${p}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
      <p className="muted small center">今月のトレーニング {monthCount} 日</p>

      <section className="card">
        <div className="row">
          <h3>{formatDateJa(selected)}</h3>
          <button className="btn small primary push-right" onClick={() => onOpenDate(selected)}>
            {sel?.exercises.length ? '編集' : '記録する'}
          </button>
        </div>
        {sel?.exercises.length ? (
          <ul className="day-summary">
            {sel.exercises.map((we) => {
              const ex = state.exercises.find((e) => e.id === we.exerciseId)
              const sets = we.sets.filter((s) => s.reps)
              return (
                <li key={we.id}>
                  <span className={`dot part-${ex?.bodyPart}`} />
                  <b>{ex?.name}</b>
                  <span className="muted small">
                    {' '}
                    {sets.map((s) => `${s.weight ?? 0}×${s.reps}${s.rpe ? `@${s.rpe}` : ''}`).join(' / ')}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="muted small">記録はありません</p>
        )}
        {sel?.note && <p className="small note">📝 {sel.note}</p>}
      </section>

      {activeProgram && nextDay && (
        <section className="card accent">
          <p className="muted small">次のプログラム — {activeProgram.name}</p>
          <div className="row">
            <h3>{nextDay.name}</h3>
            <button
              className="btn small primary push-right"
              onClick={() => {
                startProgramDay(activeProgram.id, nextDay.id, selected)
                onOpenDate(selected)
              }}
            >
              {formatDateJa(selected)}に開始
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
