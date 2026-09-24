import { useState } from 'react'
import { getState, mutate, useAppState } from '../lib/store'
import { uid } from '../lib/id'
import { formatDateJa, todayKey } from '../lib/date'
import { templatePrograms } from '../lib/defaults'
import { RPE_OPTIONS } from '../lib/rpe'
import { nextProgramDayIndex } from '../lib/stats'
import type { Program, ProgramDay, ProgramExercise, SetTarget } from '../lib/types'
import { NumInput } from '../components/NumInput'
import { ExercisePicker } from '../components/ExercisePicker'
import { emptyWorkout } from './WorkoutView'

/** プログラムの Day を指定日のワークアウトに展開する */
export function startProgramDay(programId: string, dayId: string, date: string) {
  const existing = getState().workouts[date]
  if (existing?.exercises.length && !confirm(`${formatDateJa(date)}には既に記録があります。種目を追加しますか？`)) return false
  mutate((s) => {
    const program = s.programs.find((p) => p.id === programId)
    const day = program?.days.find((d) => d.id === dayId)
    if (!program || !day) return
    const w = s.workouts[date] ?? emptyWorkout(date)
    w.programId = programId
    w.programDayId = dayId
    for (const pe of day.exercises) {
      w.exercises.push({
        id: uid(),
        exerciseId: pe.exerciseId,
        note: pe.note,
        sets: pe.sets.map((t) => ({ id: uid(), weight: null, reps: null, rpe: null, done: false, target: { ...t } })),
      })
    }
    s.workouts[date] = w
  })
  return true
}

function newProgram(): Program {
  return { id: uid(), name: '新しいプログラム', description: '', days: [{ id: uid(), name: 'Day 1', exercises: [] }] }
}

export function ProgramsView({ onOpenDate }: { onOpenDate: (date: string) => void }) {
  const state = useAppState()
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = state.programs.find((p) => p.id === editingId)

  if (editing) return <ProgramEditor program={editing} onClose={() => setEditingId(null)} />

  const create = () => {
    const p = newProgram()
    mutate((s) => void s.programs.push(p))
    setEditingId(p.id)
  }
  const addTemplate = () => mutate((s) => void s.programs.push(...templatePrograms(s.exercises)))

  return (
    <div className="view">
      <header className="topbar">
        <span className="icon-btn" />
        <h1>プログラム</h1>
        <span className="icon-btn" />
      </header>

      {state.programs.length === 0 && (
        <div className="card">
          <p>トレーニングプログラムを作成すると、Day ごとの種目・セット・目標回数・目標RPE（または%1RM）をまとめて記録に展開できます。</p>
          <p className="muted small">目標RPEと過去の推定1RMから、その日の推奨重量を自動計算します。</p>
        </div>
      )}

      {state.programs.map((p) => {
        const active = p.id === state.activeProgramId
        const nextIdx = nextProgramDayIndex(state, p)
        return (
          <section key={p.id} className={`card ${active ? 'accent' : ''}`}>
            <div className="row">
              <h3>{p.name}</h3>
              {active && <span className="badge push-right">使用中</span>}
            </div>
            {p.description && <p className="muted small">{p.description}</p>}
            <ul className="day-list">
              {p.days.map((d, i) => (
                <li key={d.id}>
                  <div>
                    <b>{d.name}</b>
                    {i === nextIdx && active && <span className="badge small">次回</span>}
                    <div className="muted small">
                      {d.exercises.map((e) => state.exercises.find((x) => x.id === e.exerciseId)?.name).join('・') || '種目なし'}
                    </div>
                  </div>
                  <button
                    className="btn small"
                    disabled={!d.exercises.length}
                    onClick={() => {
                      const date = todayKey()
                      if (startProgramDay(p.id, d.id, date)) onOpenDate(date)
                    }}
                  >
                    今日開始
                  </button>
                </li>
              ))}
            </ul>
            <div className="row gap wrap">
              <button className="btn small" onClick={() => setEditingId(p.id)}>
                編集
              </button>
              <button
                className="btn small"
                onClick={() => mutate((s) => void (s.activeProgramId = active ? null : p.id))}
              >
                {active ? '使用をやめる' : '使用する'}
              </button>
              <button
                className="btn small"
                onClick={() =>
                  mutate((s) => {
                    const copy = structuredClone(p)
                    copy.id = uid()
                    copy.name = `${p.name} のコピー`
                    copy.days.forEach((d) => {
                      d.id = uid()
                      d.exercises.forEach((e) => (e.id = uid()))
                    })
                    s.programs.push(copy)
                  })
                }
              >
                複製
              </button>
              <button
                className="btn small danger push-right"
                onClick={() => {
                  if (!confirm(`「${p.name}」を削除しますか？（過去の記録は残ります）`)) return
                  mutate((s) => {
                    s.programs = s.programs.filter((x) => x.id !== p.id)
                    if (s.activeProgramId === p.id) s.activeProgramId = null
                  })
                }}
              >
                削除
              </button>
            </div>
          </section>
        )
      })}

      <button className="btn block primary" onClick={create}>
        ＋ 新しいプログラムを作成
      </button>
      <button className="btn block" onClick={addTemplate}>
        テンプレート（RPE式 BIG3 週3回）を追加
      </button>
    </div>
  )
}

function ProgramEditor({ program, onClose }: { program: Program; onClose: () => void }) {
  const [pickingDay, setPickingDay] = useState<string | null>(null)

  const edit = (fn: (p: Program) => void) =>
    mutate((s) => {
      const p = s.programs.find((x) => x.id === program.id)
      if (p) fn(p)
    })
  const editDay = (dayId: string, fn: (d: ProgramDay) => void) =>
    edit((p) => {
      const d = p.days.find((x) => x.id === dayId)
      if (d) fn(d)
    })

  return (
    <div className="view">
      <header className="topbar">
        <button className="icon-btn" onClick={onClose} aria-label="戻る">
          ‹
        </button>
        <h1>プログラム編集</h1>
        <span className="icon-btn" />
      </header>

      <div className="card">
        <label className="field column">
          <span>名前</span>
          <input value={program.name} onChange={(e) => edit((p) => void (p.name = e.target.value))} />
        </label>
        <label className="field column">
          <span>説明</span>
          <textarea rows={2} value={program.description} onChange={(e) => edit((p) => void (p.description = e.target.value))} />
        </label>
      </div>

      {program.days.map((day, di) => (
        <section key={day.id} className="card day-card">
          <div className="row gap">
            <input className="day-name" value={day.name} onChange={(e) => editDay(day.id, (d) => void (d.name = e.target.value))} />
            <button
              className="icon-btn small"
              disabled={di === 0}
              aria-label="Dayを上へ"
              onClick={() =>
                edit((p) => {
                  const [x] = p.days.splice(di, 1)
                  p.days.splice(di - 1, 0, x)
                })
              }
            >
              ↑
            </button>
            <button
              className="icon-btn small"
              aria-label="Dayを複製"
              title="複製"
              onClick={() =>
                edit((p) => {
                  const copy = structuredClone(day)
                  copy.id = uid()
                  copy.name = `${day.name} (コピー)`
                  copy.exercises.forEach((e) => (e.id = uid()))
                  p.days.splice(di + 1, 0, copy)
                })
              }
            >
              ⧉
            </button>
            <button
              className="icon-btn small danger"
              aria-label="Dayを削除"
              onClick={() => {
                if (confirm(`${day.name} を削除しますか？`)) edit((p) => void (p.days = p.days.filter((d) => d.id !== day.id)))
              }}
            >
              ✕
            </button>
          </div>

          {day.exercises.map((pe, ei) => (
            <ProgramExerciseEditor
              key={pe.id}
              pe={pe}
              isFirst={ei === 0}
              isLast={ei === day.exercises.length - 1}
              onChange={(fn) =>
                editDay(day.id, (d) => {
                  const x = d.exercises.find((e) => e.id === pe.id)
                  if (x) fn(x)
                })
              }
              onMove={(delta) =>
                editDay(day.id, (d) => {
                  const [x] = d.exercises.splice(ei, 1)
                  d.exercises.splice(ei + delta, 0, x)
                })
              }
              onDelete={() => editDay(day.id, (d) => void (d.exercises = d.exercises.filter((e) => e.id !== pe.id)))}
            />
          ))}

          <button className="btn small block" onClick={() => setPickingDay(day.id)}>
            ＋ 種目を追加
          </button>
        </section>
      ))}

      <button
        className="btn block"
        onClick={() => edit((p) => void p.days.push({ id: uid(), name: `Day ${p.days.length + 1}`, exercises: [] }))}
      >
        ＋ Day を追加
      </button>
      <button className="btn block primary" onClick={onClose}>
        完了
      </button>

      {pickingDay && (
        <ExercisePicker
          onClose={() => setPickingDay(null)}
          onPick={(exerciseId) => {
            const target: SetTarget = { reps: 8, rpe: 8, percent: null }
            editDay(pickingDay, (d) =>
              void d.exercises.push({ id: uid(), exerciseId, note: '', sets: [0, 1, 2].map(() => ({ ...target })) }),
            )
            setPickingDay(null)
          }}
        />
      )}
    </div>
  )
}

function ProgramExerciseEditor({
  pe,
  isFirst,
  isLast,
  onChange,
  onMove,
  onDelete,
}: {
  pe: ProgramExercise
  isFirst: boolean
  isLast: boolean
  onChange: (fn: (pe: ProgramExercise) => void) => void
  onMove: (delta: number) => void
  onDelete: () => void
}) {
  const state = useAppState()
  const ex = state.exercises.find((e) => e.id === pe.exerciseId)
  const setField = (i: number, key: keyof SetTarget, v: number | null) => onChange((x) => void (x.sets[i][key] = v))

  return (
    <div className="program-exercise">
      <div className="exercise-head">
        <span className={`dot part-${ex?.bodyPart}`} />
        <h4>{ex?.name ?? '(削除された種目)'}</h4>
        <div className="head-actions">
          <button className="icon-btn small" disabled={isFirst} onClick={() => onMove(-1)} aria-label="上へ">
            ↑
          </button>
          <button className="icon-btn small" disabled={isLast} onClick={() => onMove(1)} aria-label="下へ">
            ↓
          </button>
          <button className="icon-btn small danger" onClick={onDelete} aria-label="削除">
            ✕
          </button>
        </div>
      </div>
      <div className="target-table">
        <div className="target-row target-header">
          <span>#</span>
          <span>回数</span>
          <span>RPE</span>
          <span>%1RM</span>
          <span />
        </div>
        {pe.sets.map((t, i) => (
          <div key={i} className="target-row">
            <span className="muted">{i + 1}</span>
            <NumInput ariaLabel="目標回数" decimal={false} value={t.reps} onChange={(v) => setField(i, 'reps', v)} placeholder="—" />
            <select
              aria-label="目標RPE"
              value={t.rpe ?? ''}
              onChange={(e) => setField(i, 'rpe', e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">—</option>
              {RPE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <NumInput ariaLabel="%1RM" value={t.percent} onChange={(v) => setField(i, 'percent', v)} placeholder="—" />
            <button
              className="icon-btn small danger"
              aria-label="セットを削除"
              onClick={() => onChange((x) => void x.sets.splice(i, 1))}
            >
              −
            </button>
          </div>
        ))}
      </div>
      <div className="row gap">
        <button
          className="btn small"
          onClick={() => onChange((x) => void x.sets.push({ ...(x.sets.at(-1) ?? { reps: 8, rpe: 8, percent: null }) }))}
        >
          ＋ セット
        </button>
      </div>
      <input
        className="note-input"
        placeholder="メモ（例: トップセット後 −10%）"
        value={pe.note}
        onChange={(e) => onChange((x) => void (x.note = e.target.value))}
      />
    </div>
  )
}
