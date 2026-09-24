import type { AppState, BodyPart, Exercise, Program, SetTarget } from './types'
import { uid } from './id'

const DEFAULT_EXERCISES: [BodyPart, string[], string[]?][] = [
  ['胸', ['ベンチプレス', 'インクラインベンチプレス', 'ダンベルプレス', 'インクラインダンベルプレス', 'ダンベルフライ', 'ケーブルクロスオーバー', 'チェストプレス'], ['ディップス', '腕立て伏せ']],
  ['背中', ['デッドリフト', 'ラットプルダウン', 'ベントオーバーロウ', 'シーテッドロウ', 'ワンハンドロウ', 'Tバーロウ'], ['懸垂']],
  ['肩', ['オーバーヘッドプレス', 'ダンベルショルダープレス', 'サイドレイズ', 'リアレイズ', 'フェイスプル', 'アップライトロウ']],
  ['腕', ['バーベルカール', 'ダンベルカール', 'ハンマーカール', 'トライセプスプッシュダウン', 'スカルクラッシャー', 'ナローベンチプレス']],
  ['脚', ['スクワット', 'フロントスクワット', 'レッグプレス', 'ルーマニアンデッドリフト', 'ブルガリアンスクワット', 'レッグエクステンション', 'レッグカール', 'カーフレイズ']],
  ['腹', ['ケーブルクランチ'], ['クランチ', 'レッグレイズ', 'アブローラー']],
]

export function defaultExercises(): Exercise[] {
  const list: Exercise[] = []
  let n = 0
  for (const [bodyPart, weighted, bw = []] of DEFAULT_EXERCISES) {
    for (const name of weighted) list.push({ id: `ex${n++}`, name, bodyPart })
    for (const name of bw) list.push({ id: `ex${n++}`, name, bodyPart, bodyweight: true })
  }
  return list
}

const t = (reps: number | null, rpe: number | null, percent: number | null = null): SetTarget => ({ reps, rpe, percent })
const repeat = (n: number, s: SetTarget) => Array.from({ length: n }, () => ({ ...s }))

/** テンプレート: RPE ベースのBIG3 週3回プログラム */
export function templatePrograms(exercises: Exercise[]): Program[] {
  const byName = (name: string) => exercises.find((e) => e.name === name)?.id
  const pe = (name: string, sets: SetTarget[], note = '') => {
    const exerciseId = byName(name)
    return exerciseId ? [{ id: uid(), exerciseId, note, sets }] : []
  }
  return [
    {
      id: uid(),
      name: 'RPE式 BIG3 週3回',
      description: 'トップセットを目標RPEで行い、そこから重量を落としてバックオフセットを行うオートレギュレーション型プログラム。',
      days: [
        {
          id: uid(),
          name: 'Day 1 スクワット / ベンチ',
          exercises: [
            ...pe('スクワット', [t(3, 8), ...repeat(3, t(5, 7))], 'トップ3回@8 → 5回@7を3セット'),
            ...pe('ベンチプレス', [t(5, 8), ...repeat(3, t(8, 7))]),
            ...pe('ワンハンドロウ', repeat(3, t(10, 8))),
          ],
        },
        {
          id: uid(),
          name: 'Day 2 デッドリフト / OHP',
          exercises: [
            ...pe('デッドリフト', [t(3, 8), ...repeat(2, t(5, 7))]),
            ...pe('オーバーヘッドプレス', repeat(4, t(6, 8))),
            ...pe('ラットプルダウン', repeat(3, t(10, 8))),
          ],
        },
        {
          id: uid(),
          name: 'Day 3 ベンチ / スクワット',
          exercises: [
            ...pe('ベンチプレス', [t(2, 8.5), ...repeat(4, t(4, 7.5))]),
            ...pe('フロントスクワット', repeat(3, t(6, 7))),
            ...pe('ルーマニアンデッドリフト', repeat(3, t(8, 7))),
          ],
        },
      ],
    },
  ]
}

export function initialState(): AppState {
  return {
    version: 1,
    exercises: defaultExercises(),
    workouts: {},
    programs: [],
    activeProgramId: null,
    settings: { restSeconds: 120, roundTo: 2.5, autoRestTimer: true },
  }
}
