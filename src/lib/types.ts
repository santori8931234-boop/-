export const BODY_PARTS = ['胸', '背中', '肩', '腕', '脚', '腹', 'その他'] as const
export type BodyPart = (typeof BODY_PARTS)[number]

export interface Exercise {
  id: string
  name: string
  bodyPart: BodyPart
  /** 自重種目など、重量を記録しない種目 */
  bodyweight?: boolean
}

/** プログラム上の目標値（1セット分） */
export interface SetTarget {
  reps: number | null
  rpe: number | null
  /** %1RM（例: 80 = 80%） */
  percent: number | null
}

export interface WorkSet {
  id: string
  weight: number | null
  reps: number | null
  rpe: number | null
  done: boolean
  target?: SetTarget
  /** 前回・前セットの値（プレースホルダ表示用。完了時に未入力欄へ反映） */
  hint?: { weight: number | null; reps: number | null; rpe: number | null }
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  note: string
  sets: WorkSet[]
}

export interface Workout {
  id: string
  /** YYYY-MM-DD */
  date: string
  note: string
  bodyWeight: number | null
  exercises: WorkoutExercise[]
  programId?: string
  programDayId?: string
}

export interface ProgramExercise {
  id: string
  exerciseId: string
  note: string
  sets: SetTarget[]
}

export interface ProgramDay {
  id: string
  name: string
  exercises: ProgramExercise[]
}

export interface Program {
  id: string
  name: string
  description: string
  days: ProgramDay[]
}

export interface Settings {
  restSeconds: number
  /** 推奨重量の丸め単位(kg) */
  roundTo: number
  autoRestTimer: boolean
}

export interface AppState {
  version: 1
  exercises: Exercise[]
  workouts: Record<string, Workout>
  programs: Program[]
  activeProgramId: string | null
  settings: Settings
}
