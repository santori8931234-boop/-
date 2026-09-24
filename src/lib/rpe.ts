/**
 * RPE（主観的運動強度）と %1RM の対応表（RTS / Tuchscherer 表）。
 * RPE10 で n 回 = 限界まで n 回。RPE が 0.5 下がるごとに「余力 0.5 回」とみなし、
 * 「実質レップ数 = 回数 + (10 - RPE)」で 1 本の表として扱う。
 */
const PERCENT_BY_EFFECTIVE_REPS: Record<number, number> = {
  1: 100, 1.5: 97.8, 2: 95.5, 2.5: 93.9, 3: 92.2, 3.5: 90.7, 4: 89.2, 4.5: 87.8,
  5: 86.3, 5.5: 85.0, 6: 83.7, 6.5: 82.4, 7: 81.1, 7.5: 79.9, 8: 78.6, 8.5: 77.4,
  9: 76.2, 9.5: 75.1, 10: 73.9, 10.5: 72.3, 11: 70.7, 11.5: 69.4, 12: 68.0, 12.5: 66.7,
  13: 65.3, 13.5: 64.0, 14: 62.6, 14.5: 61.3, 15: 59.9, 15.5: 58.6, 16: 57.4,
}

export const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

export const RPE_DESCRIPTIONS: Record<number, string> = {
  10: '限界。これ以上は不可能',
  9.5: 'もう1回は無理だが重量は少し上げられた',
  9: 'あと1回できた',
  8.5: 'あと1〜2回できた',
  8: 'あと2回できた',
  7.5: 'あと2〜3回できた',
  7: 'あと3回できた・スピードが出る',
  6.5: 'あと3〜4回できた',
  6: 'あと4回以上できた・ウォームアップ程度',
}

/** 回数と RPE から %1RM（0〜1）を求める。RPE 未入力時は RPE10 とみなす。 */
export function percentOf1RM(reps: number, rpe: number | null = null): number {
  const r = rpe ?? 10
  const eff = Math.round((reps + (10 - r)) * 2) / 2
  if (eff < 1) return 1
  const table = PERCENT_BY_EFFECTIVE_REPS[eff]
  if (table !== undefined) return table / 100
  // 表の範囲外は 16 回の値に接続した Epley 式で近似
  return (0.574 * (1 + 16 / 30)) / (1 + eff / 30)
}

/** 推定1RM */
export function estimate1RM(weight: number, reps: number, rpe: number | null = null): number {
  if (weight <= 0 || reps <= 0) return 0
  return weight / percentOf1RM(reps, rpe)
}

export function roundWeight(w: number, step: number): number {
  if (step <= 0) return Math.round(w * 10) / 10
  return Math.round(w / step) * step
}

/** 目標回数・RPE を満たす推奨重量 */
export function suggestWeight(
  e1rm: number,
  target: { reps: number | null; rpe: number | null; percent: number | null },
  step: number,
): number | null {
  if (e1rm <= 0) return null
  if (target.percent) return roundWeight((e1rm * target.percent) / 100, step)
  if (target.reps) return roundWeight(e1rm * percentOf1RM(target.reps, target.rpe), step)
  return null
}

export function formatRpe(rpe: number | null): string {
  return rpe == null ? '' : `@${rpe}`
}
