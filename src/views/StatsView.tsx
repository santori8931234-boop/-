import { useMemo, useState } from 'react'
import { useAppState } from '../lib/store'
import { formatDateJa, toDateKey } from '../lib/date'
import { RPE_OPTIONS, estimate1RM, percentOf1RM, roundWeight } from '../lib/rpe'
import { exerciseHistory, sortedWorkouts } from '../lib/stats'
import { LineChart } from '../components/LineChart'
import { NumInput } from '../components/NumInput'

type Metric = 'e1rm' | 'max' | 'volume'
const METRICS: { key: Metric; label: string }[] = [
  { key: 'e1rm', label: '推定1RM' },
  { key: 'max', label: '最大重量' },
  { key: 'volume', label: 'ボリューム' },
]

export function StatsView({ onOpenDate }: { onOpenDate: (date: string) => void }) {
  const [tab, setTab] = useState<'exercise' | 'body' | 'calc'>('exercise')
  return (
    <div className="view">
      <header className="topbar">
        <span className="icon-btn" />
        <h1>分析</h1>
        <span className="icon-btn" />
      </header>
      <div className="segmented">
        <button className={tab === 'exercise' ? 'active' : ''} onClick={() => setTab('exercise')}>
          種目
        </button>
        <button className={tab === 'body' ? 'active' : ''} onClick={() => setTab('body')}>
          体重・頻度
        </button>
        <button className={tab === 'calc' ? 'active' : ''} onClick={() => setTab('calc')}>
          RPE計算機
        </button>
      </div>
      {tab === 'exercise' && <ExerciseStats onOpenDate={onOpenDate} />}
      {tab === 'body' && <BodyStats />}
      {tab === 'calc' && <RpeCalculator />}
    </div>
  )
}

function ExerciseStats({ onOpenDate }: { onOpenDate: (date: string) => void }) {
  const state = useAppState()
  const used = useMemo(() => {
    const ids = new Set(Object.values(state.workouts).flatMap((w) => w.exercises.map((e) => e.exerciseId)))
    return state.exercises.filter((e) => ids.has(e.id))
  }, [state])
  const [exerciseId, setExerciseId] = useState(used[0]?.id ?? '')
  const [metric, setMetric] = useState<Metric>('e1rm')

  if (!used.length) return <p className="muted empty">まだ記録がありません</p>

  const ex = state.exercises.find((e) => e.id === exerciseId) ?? used[0]
  const hist = exerciseHistory(state, ex.id)
  const points = hist.map((h) => ({
    date: h.date,
    value: metric === 'e1rm' ? h.bestE1RM : metric === 'max' ? h.maxWeight : h.volume,
  }))
  const bestE1RM = hist.reduce((m, h) => Math.max(m, h.bestE1RM), 0)
  const maxWeight = hist.reduce((m, h) => Math.max(m, h.maxWeight), 0)

  return (
    <>
      <select className="block-select" value={ex.id} onChange={(e) => setExerciseId(e.target.value)}>
        {used.map((e) => (
          <option key={e.id} value={e.id}>
            [{e.bodyPart}] {e.name}
          </option>
        ))}
      </select>

      <div className="summary-row">
        <div>
          <span className="muted small">最高推定1RM</span>
          <b>{bestE1RM ? `${Math.round(bestE1RM * 10) / 10} kg` : '—'}</b>
        </div>
        <div>
          <span className="muted small">最大重量</span>
          <b>{maxWeight ? `${maxWeight} kg` : '—'}</b>
        </div>
        <div>
          <span className="muted small">実施回数</span>
          <b>{hist.length}</b>
        </div>
      </div>

      <div className="card">
        <div className="chips">
          {METRICS.map((m) => (
            <button key={m.key} className={`chip ${metric === m.key ? 'active' : ''}`} onClick={() => setMetric(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <LineChart points={points} />
      </div>

      <section className="card">
        <h3>履歴</h3>
        <ul className="history">
          {[...hist].reverse().map((h) => (
            <li key={h.date}>
              <button className="linklike" onClick={() => onOpenDate(h.date)}>
                {formatDateJa(h.date)}
              </button>
              <span className="muted small push-right">e1RM {Math.round(h.bestE1RM * 10) / 10}</span>
              <div className="small">
                {h.sets.map((s) => `${s.weight ?? 0}×${s.reps}${s.rpe ? `@${s.rpe}` : ''}`).join(' / ')}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function BodyStats() {
  const state = useAppState()
  const workouts = sortedWorkouts(state)
  const bw = workouts.filter((w) => w.bodyWeight).map((w) => ({ date: w.date, value: w.bodyWeight! }))

  // 直近12週の週ごとのトレーニング日数
  const weeks: { label: string; count: number }[] = []
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - 7 * 11)
  for (let i = 0; i < 12; i++) {
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7)
    const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)
    const sk = toDateKey(s)
    const ek = toDateKey(e)
    weeks.push({
      label: `${s.getMonth() + 1}/${s.getDate()}`,
      count: workouts.filter((w) => w.exercises.length && w.date >= sk && w.date < ek).length,
    })
  }
  const maxCount = Math.max(7, ...weeks.map((w) => w.count))

  // 部位別セット数（直近30日）
  const since = toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30))
  const partSets: Record<string, number> = {}
  for (const w of workouts.filter((w) => w.date >= since)) {
    for (const we of w.exercises) {
      const part = state.exercises.find((e) => e.id === we.exerciseId)?.bodyPart ?? 'その他'
      partSets[part] = (partSets[part] ?? 0) + we.sets.filter((s) => s.reps).length
    }
  }
  const maxPart = Math.max(1, ...Object.values(partSets))

  return (
    <>
      <section className="card">
        <h3>体重の推移</h3>
        <LineChart points={bw} />
        {bw.length > 0 && (
          <p className="muted small">
            最新 {bw.at(-1)!.value}kg（{formatDateJa(bw.at(-1)!.date)}）
          </p>
        )}
      </section>
      <section className="card">
        <h3>週ごとのトレーニング日数</h3>
        <div className="bars">
          {weeks.map((w) => (
            <div key={w.label} className="bar-col">
              <div className="bar" style={{ height: `${(w.count / maxCount) * 100}%` }}>
                {w.count > 0 && <span>{w.count}</span>}
              </div>
              <span className="bar-label">{w.label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h3>部位別セット数（直近30日）</h3>
        {Object.keys(partSets).length === 0 && <p className="muted small">記録がありません</p>}
        {Object.entries(partSets)
          .sort((a, b) => b[1] - a[1])
          .map(([part, n]) => (
            <div key={part} className="hbar-row">
              <span className="hbar-label">{part}</span>
              <div className="hbar-track">
                <div className={`hbar part-${part}`} style={{ width: `${(n / maxPart) * 100}%` }} />
              </div>
              <span className="small">{n}</span>
            </div>
          ))}
      </section>
    </>
  )
}

function RpeCalculator() {
  const state = useAppState()
  const [weight, setWeight] = useState<number | null>(100)
  const [reps, setReps] = useState<number | null>(5)
  const [rpe, setRpe] = useState<number | null>(8)
  const e1 = weight && reps ? estimate1RM(weight, reps, rpe) : 0
  const repsList = [1, 2, 3, 4, 5, 6, 8, 10, 12]
  const rpeCols = [10, 9, 8, 7]

  return (
    <>
      <section className="card">
        <h3>推定1RM</h3>
        <div className="calc-inputs">
          <label>
            重量(kg)
            <NumInput value={weight} onChange={setWeight} />
          </label>
          <label>
            回数
            <NumInput value={reps} onChange={setReps} decimal={false} />
          </label>
          <label>
            RPE
            <select value={rpe ?? ''} onChange={(e) => setRpe(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">—</option>
              {RPE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="big-number">{e1 ? `${Math.round(e1 * 10) / 10} kg` : '—'}</p>
      </section>
      {e1 > 0 && (
        <section className="card">
          <h3>目標重量表</h3>
          <table className="rpe-table">
            <thead>
              <tr>
                <th>回数</th>
                {rpeCols.map((r) => (
                  <th key={r}>@{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repsList.map((n) => (
                <tr key={n}>
                  <td>{n}</td>
                  {rpeCols.map((r) => (
                    <td key={r}>{roundWeight(e1 * percentOf1RM(n, r), state.settings.roundTo)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">RTS式RPE表に基づく推定値です。{state.settings.roundTo}kg単位で丸めています。</p>
        </section>
      )}
    </>
  )
}

