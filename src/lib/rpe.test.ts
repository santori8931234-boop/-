import { describe, expect, it } from 'vitest'
import { estimate1RM, percentOf1RM, roundWeight, suggestWeight } from './rpe'

describe('percentOf1RM', () => {
  it('1回 @10 は 100%', () => {
    expect(percentOf1RM(1, 10)).toBe(1)
  })
  it('5回 @8 は 7回 @10 と同じ', () => {
    expect(percentOf1RM(5, 8)).toBeCloseTo(0.811)
    expect(percentOf1RM(5, 8)).toBe(percentOf1RM(7, 10))
  })
  it('RPE 未入力は RPE10 扱い', () => {
    expect(percentOf1RM(3)).toBeCloseTo(0.922)
  })
  it('表の範囲外は Epley で近似し単調減少', () => {
    expect(percentOf1RM(20, 10)).toBeLessThan(percentOf1RM(16, 10))
  })
})

describe('estimate1RM', () => {
  it('100kg×5 @8 → 約123kg', () => {
    expect(estimate1RM(100, 5, 8)).toBeCloseTo(123.3, 1)
  })
  it('無効値は 0', () => {
    expect(estimate1RM(0, 5, 8)).toBe(0)
    expect(estimate1RM(100, 0, 8)).toBe(0)
  })
})

describe('suggestWeight', () => {
  it('推定1RMから目標回数・RPEの重量を求めて丸める', () => {
    // 150 × 0.811 = 121.65 → 122.5
    expect(suggestWeight(150, { reps: 5, rpe: 8, percent: null }, 2.5)).toBe(122.5)
  })
  it('%1RM 指定が優先', () => {
    expect(suggestWeight(150, { reps: 5, rpe: 8, percent: 70 }, 2.5)).toBe(105)
  })
  it('1RM 不明なら null', () => {
    expect(suggestWeight(0, { reps: 5, rpe: 8, percent: null }, 2.5)).toBeNull()
  })
})

describe('roundWeight', () => {
  it('指定単位で丸める', () => {
    expect(roundWeight(101.2, 2.5)).toBe(100)
    expect(roundWeight(101.3, 2.5)).toBe(102.5)
  })
})
