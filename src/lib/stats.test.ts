import { describe, expect, it } from 'vitest'
import { initialState } from './defaults'
import { exerciseHistory, nextProgramDayIndex, previousSession, referenceE1RM } from './stats'
import type { AppState, Program, Workout } from './types'

function makeState(): AppState {
  const s = initialState()
  const bench = s.exercises.find((e) => e.name === 'ベンチプレス')!.id
  const w = (date: string, weight: number, reps: number, rpe: number | null, extra: Partial<Workout> = {}): Workout => ({
    id: date,
    date,
    note: '',
    bodyWeight: null,
    exercises: [
      {
        id: 'we' + date,
        exerciseId: bench,
        note: '',
        sets: [
          { id: 'a', weight, reps, rpe, done: true },
          { id: 'b', weight: null, reps: null, rpe: null, done: false },
        ],
      },
    ],
    ...extra,
  })
  s.workouts = {
    '2026-09-01': w('2026-09-01', 80, 5, 8),
    '2026-09-05': w('2026-09-05', 85, 5, 9),
  }
  return s
}

describe('exerciseHistory', () => {
  it('未入力セットを除いて日付順に集計する', () => {
    const s = makeState()
    const bench = s.exercises.find((e) => e.name === 'ベンチプレス')!.id
    const h = exerciseHistory(s, bench)
    expect(h.map((x) => x.date)).toEqual(['2026-09-01', '2026-09-05'])
    expect(h[0].sets).toHaveLength(1)
    expect(h[0].volume).toBe(400)
  })
})

describe('previousSession / referenceE1RM', () => {
  it('指定日より前の直近セッションを返す', () => {
    const s = makeState()
    const bench = s.exercises.find((e) => e.name === 'ベンチプレス')!.id
    expect(previousSession(s, bench, '2026-09-05')?.date).toBe('2026-09-01')
    expect(previousSession(s, bench, '2026-09-01')).toBeNull()
    expect(referenceE1RM(s, bench, '2026-09-10')).toBeGreaterThan(100)
  })
})

describe('nextProgramDayIndex', () => {
  it('最後に行った Day の次を返し、末尾で先頭に戻る', () => {
    const s = makeState()
    const p: Program = {
      id: 'p',
      name: 'P',
      description: '',
      days: [
        { id: 'd1', name: '1', exercises: [] },
        { id: 'd2', name: '2', exercises: [] },
      ],
    }
    expect(nextProgramDayIndex(s, p)).toBe(0)
    s.workouts['2026-09-05'].programId = 'p'
    s.workouts['2026-09-05'].programDayId = 'd1'
    expect(nextProgramDayIndex(s, p)).toBe(1)
    s.workouts['2026-09-05'].programDayId = 'd2'
    expect(nextProgramDayIndex(s, p)).toBe(0)
  })
})
