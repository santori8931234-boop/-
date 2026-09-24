import type { AppState, Exercise, Program, WorkSet, Workout } from './types'
import { estimate1RM } from './rpe'

/** 記録として有効なセット（回数が入っていて、重量種目なら重量も入っている） */
export function isRecorded(set: WorkSet, ex?: Exercise): boolean {
  if (!set.reps || set.reps <= 0) return false
  return ex?.bodyweight ? true : !!set.weight && set.weight > 0
}

export function setE1RM(set: WorkSet): number {
  if (!set.weight || !set.reps) return 0
  return estimate1RM(set.weight, set.reps, set.rpe)
}

export interface SessionSummary {
  date: string
  sets: WorkSet[]
  bestE1RM: number
  maxWeight: number
  volume: number
  totalReps: number
}

export function sortedWorkouts(state: AppState): Workout[] {
  return Object.values(state.workouts).sort((a, b) => a.date.localeCompare(b.date))
}

export function summarizeSets(date: string, sets: WorkSet[]): SessionSummary {
  let bestE1RM = 0
  let maxWeight = 0
  let volume = 0
  let totalReps = 0
  for (const s of sets) {
    bestE1RM = Math.max(bestE1RM, setE1RM(s))
    maxWeight = Math.max(maxWeight, s.weight ?? 0)
    volume += (s.weight ?? 0) * (s.reps ?? 0)
    totalReps += s.reps ?? 0
  }
  return { date, sets, bestE1RM, maxWeight, volume, totalReps }
}

/** 種目ごとの履歴（日付昇順） */
export function exerciseHistory(state: AppState, exerciseId: string): SessionSummary[] {
  const ex = state.exercises.find((e) => e.id === exerciseId)
  const result: SessionSummary[] = []
  for (const w of sortedWorkouts(state)) {
    const sets = w.exercises
      .filter((we) => we.exerciseId === exerciseId)
      .flatMap((we) => we.sets)
      .filter((s) => isRecorded(s, ex))
    if (sets.length) result.push(summarizeSets(w.date, sets))
  }
  return result
}

/** 指定日より前で最も新しいセッション */
export function previousSession(state: AppState, exerciseId: string, beforeDate: string): SessionSummary | null {
  const hist = exerciseHistory(state, exerciseId).filter((h) => h.date < beforeDate)
  return hist.at(-1) ?? null
}

/** 推奨重量計算に使う推定1RM（直近セッションのベスト） */
export function referenceE1RM(state: AppState, exerciseId: string, beforeDate: string): number {
  return previousSession(state, exerciseId, beforeDate)?.bestE1RM ?? 0
}

/** プログラムで次に行う Day のインデックス */
export function nextProgramDayIndex(state: AppState, program: Program): number {
  if (!program.days.length) return -1
  const last = sortedWorkouts(state)
    .filter((w) => w.programId === program.id)
    .at(-1)
  if (!last) return 0
  const idx = program.days.findIndex((d) => d.id === last.programDayId)
  return idx < 0 ? 0 : (idx + 1) % program.days.length
}

export function workoutBodyParts(state: AppState, w: Workout): string[] {
  const parts = new Set<string>()
  for (const we of w.exercises) {
    const ex = state.exercises.find((e) => e.id === we.exerciseId)
    if (ex) parts.add(ex.bodyPart)
  }
  return [...parts]
}

/** "85×5@8" 形式（自重種目は重量を省略） */
export function formatSet(s: Pick<WorkSet, 'weight' | 'reps' | 'rpe'>, bodyweight = false): string {
  const w = bodyweight ? (s.weight ? `+${s.weight}×` : '') : `${s.weight ?? 0}×`
  return `${w}${s.reps ?? '-'}${s.rpe ? `@${s.rpe}` : ''}`
}

/** 指定日より前で最も新しい（種目の入った）ワークアウト */
export function previousWorkout(state: AppState, beforeDate: string): Workout | null {
  return sortedWorkouts(state).filter((w) => w.date < beforeDate && w.exercises.length).at(-1) ?? null
}

/** 種目を含む過去のワークアウト（新しい順） */
export function recentWorkoutsWith(state: AppState, exerciseId: string, beforeDate: string, limit: number): Workout[] {
  return sortedWorkouts(state)
    .filter((w) => w.date < beforeDate && w.exercises.some((e) => e.exerciseId === exerciseId))
    .reverse()
    .slice(0, limit)
}
