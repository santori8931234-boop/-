import { useState } from 'react'
import { mutate, useAppState } from '../lib/store'
import { uid } from '../lib/id'
import { formatDateJa } from '../lib/date'
import { RPE_DESCRIPTIONS, RPE_OPTIONS, estimate1RM, suggestWeight } from '../lib/rpe'
import { isRecorded, previousSession, referenceE1RM, setE1RM } from '../lib/stats'
import type { AppState, SetTarget, WorkSet, Workout, WorkoutExercise } from '../lib/types'
import { NumInput } from '../components/NumInput'
import { ExercisePicker } from '../components/ExercisePicker'
import { startRest } from '../components/RestTimer'

export function emptyWorkout(date: string): Workout {
  return { id: uid(), date, note: '', bodyWeight: null, exercises: [] }
}

/** 新しいセット。前のセットの値はヒント（プレースホルダ）として引き継ぐ */
function emptySet(prev?: WorkSet): WorkSet {
  const set: WorkSet = { id: uid(), weight: null, reps: null, rpe: null, done: false }
  if (prev) {
    set.hint = {
      weight: prev.weight ?? prev.hint?.weight ?? null,
      reps: prev.reps ?? prev.hint?.reps ?? null,
      rpe: prev.rpe ?? prev.hint?.rpe ?? null,
    }
  }
  if (prev?.target) set.target = { ...prev.target }
  return set
}

/** ワークアウトを取得（なければ作成）して編集する */
function editWorkout(date: string, fn: (w: Workout, s: AppState) => void) {
  mutate((s) => {
    const w = s.workouts[date] ?? emptyWorkout(date)
    fn(w, s)
    s.workouts[date] = w
  })
}

function targetLabel(t: SetTarget): string {
  const parts: string[] = []
  if (t.reps) parts.push(`${t.reps}回`)
  if (t.rpe) parts.push(`@${t.rpe}`)
  if (t.percent) parts.push(`${t.percent}%`)
  return parts.join(' ')
}

export function WorkoutView({ date, onBack }: { date: string; onBack: () => void }) {
  const state = useAppState()
  const workout = state.workouts[date]
  const [picking, setPicking] = useState(false)
  const program = workout?.programId ? state.programs.find((p) => p.id === workout.programId) : undefined
  const day = program?.days.find((d) => d.id === workout?.programDayId)

  const addExercise = (exerciseId: string) => {
    setPicking(false)
    editWorkout(date, (w, s) => {
      const prev = previousSession(s, exerciseId, date)
      const sets = prev ? prev.sets.map((ps) => emptySet(ps)) : [emptySet()]
      w.exercises.push({ id: uid(), exerciseId, note: '', sets })
    })
  }

  const deleteWorkout = () => {
    if (!confirm('この日の記録をすべて削除しますか？')) return
    mutate((s) => {
      delete s.workouts[date]
    })
    onBack()
  }

  const totalVolume = workout?.exercises.flatMap((e) => e.sets).reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0) ?? 0
  const doneSets = workout?.exercises.flatMap((e) => e.sets).filter((s) => s.done).length ?? 0

  return (
    <div className="view">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="戻る">
          ‹
        </button>
        <h1>{formatDateJa(date)}</h1>
        {workout ? (
          <button className="icon-btn danger" onClick={deleteWorkout} aria-label="削除">
            🗑
          </button>
        ) : (
          <span className="icon-btn" />
        )}
      </header>

      {program && (
        <div className="banner">
          📋 {program.name}
          {day && ` / ${day.name}`}
        </div>
      )}

      {workout && workout.exercises.length > 0 && (
        <div className="summary-row">
          <div>
            <span className="muted small">完了セット</span>
            <b>{doneSets}</b>
          </div>
          <div>
            <span className="muted small">総ボリューム</span>
            <b>{Math.round(totalVolume).toLocaleString()} kg</b>
          </div>
        </div>
      )}

      {workout?.exercises.map((we, i) => (
        <ExerciseCard key={we.id} date={date} we={we} index={i} count={workout.exercises.length} />
      ))}

      {!workout?.exercises.length && <p className="muted empty">「種目を追加」から記録を始めましょう</p>}

      <button className="btn block primary" onClick={() => setPicking(true)}>
        ＋ 種目を追加
      </button>

      <div className="card">
        <label className="field">
          <span>体重 (kg)</span>
          <NumInput
            value={workout?.bodyWeight ?? null}
            onChange={(v) => editWorkout(date, (w) => void (w.bodyWeight = v))}
            placeholder="—"
          />
        </label>
        <label className="field column">
          <span>メモ</span>
          <textarea
            rows={3}
            value={workout?.note ?? ''}
            placeholder="調子・睡眠・気づいたことなど"
            onChange={(e) => editWorkout(date, (w) => void (w.note = e.target.value))}
          />
        </label>
      </div>

      {picking && <ExercisePicker onPick={addExercise} onClose={() => setPicking(false)} />}
    </div>
  )
}

function ExerciseCard({ date, we, index, count }: { date: string; we: WorkoutExercise; index: number; count: number }) {
  const state = useAppState()
  const ex = state.exercises.find((e) => e.id === we.exerciseId)
  const prev = previousSession(state, we.exerciseId, date)
  const [showRpeHelp, setShowRpeHelp] = useState(false)

  const edit = (fn: (we: WorkoutExercise) => void) =>
    editWorkout(date, (w) => {
      const target = w.exercises.find((e) => e.id === we.id)
      if (target) fn(target)
    })

  // 推奨重量の基準: 今日の完了済みセットのうち最新のもの、なければ過去の記録
  const todayRef = [...we.sets].reverse().find((s) => s.done && s.weight && s.reps && s.rpe)
  const baseE1RM = todayRef ? setE1RM(todayRef) : referenceE1RM(state, we.exerciseId, date)
  const suggestion = (s: WorkSet) => (s.target && !ex?.bodyweight ? suggestWeight(baseE1RM, s.target, state.settings.roundTo) : null)

  const toggleDone = (s: WorkSet) => {
    const willBeDone = !s.done
    edit((e) => {
      const set = e.sets.find((x) => x.id === s.id)!
      set.done = willBeDone
      if (willBeDone) {
        // 未入力なら推奨値・目標値・ヒントで埋める
        if (set.weight == null) set.weight = suggestion(s) ?? s.hint?.weight ?? null
        if (set.reps == null) set.reps = s.target?.reps ?? s.hint?.reps ?? null
        if (set.rpe == null) set.rpe = s.target?.rpe ?? null
      }
    })
    if (willBeDone && state.settings.autoRestTimer) startRest(state.settings.restSeconds)
  }

  const best = we.sets.filter((s) => isRecorded(s, ex)).reduce((m, s) => Math.max(m, setE1RM(s)), 0)

  return (
    <section className="card exercise-card">
      <div className="exercise-head">
        <span className={`dot part-${ex?.bodyPart}`} />
        <h3>{ex?.name ?? '(削除された種目)'}</h3>
        <div className="head-actions">
          <button
            className="icon-btn small"
            disabled={index === 0}
            aria-label="上へ"
            onClick={() =>
              editWorkout(date, (w) => {
                const [x] = w.exercises.splice(index, 1)
                w.exercises.splice(index - 1, 0, x)
              })
            }
          >
            ↑
          </button>
          <button
            className="icon-btn small"
            disabled={index === count - 1}
            aria-label="下へ"
            onClick={() =>
              editWorkout(date, (w) => {
                const [x] = w.exercises.splice(index, 1)
                w.exercises.splice(index + 1, 0, x)
              })
            }
          >
            ↓
          </button>
          <button
            className="icon-btn small danger"
            aria-label="種目を削除"
            onClick={() => {
              if (confirm(`${ex?.name ?? '種目'} を削除しますか？`))
                editWorkout(date, (w) => void (w.exercises = w.exercises.filter((e) => e.id !== we.id)))
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {prev && (
        <p className="prev small">
          前回 {prev.date.slice(5).replace('-', '/')}：
          {prev.sets.map((s) => `${ex?.bodyweight ? '' : `${s.weight}×`}${s.reps}${s.rpe ? `@${s.rpe}` : ''}`).join(', ')}
        </p>
      )}

      <div className="set-table">
        <div className="set-row set-header">
          <span>#</span>
          <span>{ex?.bodyweight ? '加重kg' : 'kg'}</span>
          <span>回数</span>
          <button className="linklike" onClick={() => setShowRpeHelp((v) => !v)}>
            RPE ⓘ
          </button>
          <span>e1RM</span>
          <span />
        </div>
        {we.sets.map((s, i) => {
          const sug = suggestion(s)
          const e1 = s.weight && s.reps ? estimate1RM(s.weight, s.reps, s.rpe) : 0
          return (
            <div key={s.id} className={`set-block ${s.done ? 'done' : ''}`}>
              <div className="set-row">
                <button
                  className="set-no"
                  aria-label="セットを削除"
                  onClick={() => {
                    if (confirm(`${i + 1}セット目を削除しますか？`)) edit((e) => void (e.sets = e.sets.filter((x) => x.id !== s.id)))
                  }}
                >
                  {i + 1}
                </button>
                <NumInput
                  ariaLabel="重量"
                  value={s.weight}
                  placeholder={String(sug ?? s.hint?.weight ?? '—')}
                  onChange={(v) => edit((e) => void (e.sets.find((x) => x.id === s.id)!.weight = v))}
                />
                <NumInput
                  ariaLabel="回数"
                  decimal={false}
                  value={s.reps}
                  placeholder={String(s.target?.reps ?? s.hint?.reps ?? '—')}
                  onChange={(v) => edit((e) => void (e.sets.find((x) => x.id === s.id)!.reps = v))}
                />
                <select
                  aria-label="RPE"
                  value={s.rpe ?? ''}
                  className={s.rpe == null ? 'placeholder' : ''}
                  onChange={(ev) =>
                    edit((e) => void (e.sets.find((x) => x.id === s.id)!.rpe = ev.target.value === '' ? null : Number(ev.target.value)))
                  }
                >
                  <option value="">{s.target?.rpe ? `(${s.target.rpe})` : s.hint?.rpe ? `(${s.hint.rpe})` : '—'}</option>
                  {RPE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <span className="e1rm">{e1 ? Math.round(e1 * 10) / 10 : ''}</span>
                <button className={`check ${s.done ? 'on' : ''}`} onClick={() => toggleDone(s)} aria-label="完了">
                  ✓
                </button>
              </div>
              {s.target && (
                <div className="target small">
                  目標 {targetLabel(s.target)}
                  {sug != null && !s.done && (
                    <>
                      {' '}→ 推奨 <b>{sug}kg</b>
                    </>
                  )}
                  {s.done && s.target.rpe != null && s.rpe != null && s.rpe !== s.target.rpe && (
                    <span className={s.rpe > s.target.rpe ? 'warn' : 'good'}>
                      {' '}
                      （目標RPE{s.rpe > s.target.rpe ? '超過' : '未満'}）
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showRpeHelp && (
        <ul className="rpe-help small">
          {[...RPE_OPTIONS].reverse().map((r) => (
            <li key={r}>
              <b>{r}</b> {RPE_DESCRIPTIONS[r]}
            </li>
          ))}
        </ul>
      )}

      <div className="row gap">
        <button className="btn small" onClick={() => edit((e) => void e.sets.push(emptySet(e.sets.at(-1))))}>
          ＋ セット
        </button>
        {best > 0 && <span className="muted small push-right">本日の推定1RM {Math.round(best * 10) / 10}kg</span>}
      </div>
      <input
        className="note-input"
        placeholder="種目メモ（フォーム・セッティングなど）"
        value={we.note}
        onChange={(e) => edit((x) => void (x.note = e.target.value))}
      />
    </section>
  )
}
