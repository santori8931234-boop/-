import { useAppState } from '../lib/store'
import { formatSet } from '../lib/stats'
import type { Workout } from '../lib/types'

/** ワークアウトの種目・セットの一覧表示 */
export function WorkoutSummary({ workout }: { workout: Workout }) {
  const state = useAppState()
  return (
    <>
      <ul className="day-summary">
        {workout.exercises.map((we) => {
          const ex = state.exercises.find((e) => e.id === we.exerciseId)
          const sets = we.sets.filter((s) => s.reps)
          return (
            <li key={we.id}>
              <span className={`dot part-${ex?.bodyPart}`} />
              <b>{ex?.name}</b>
              <span className="muted small"> {sets.map((s) => formatSet(s, ex?.bodyweight)).join(' / ') || '未入力'}</span>
            </li>
          )
        })}
      </ul>
      {workout.note && <p className="small note">📝 {workout.note}</p>}
    </>
  )
}
