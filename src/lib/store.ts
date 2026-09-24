import { useSyncExternalStore } from 'react'
import type { AppState } from './types'
import { initialState } from './defaults'

const STORAGE_KEY = 'training-memo:v1'

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    // 破損データは無視して初期化
  }
  return initialState()
}

/** 読み込んだデータに不足しているフィールドを補う */
export function normalize(data: Partial<AppState>): AppState {
  const base = initialState()
  return {
    ...base,
    ...data,
    version: 1,
    exercises: data.exercises?.length ? data.exercises : base.exercises,
    workouts: data.workouts ?? {},
    programs: data.programs ?? [],
    activeProgramId: data.activeProgramId ?? null,
    settings: { ...base.settings, ...data.settings },
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined

function flush() {
  clearTimeout(saveTimer)
  saveTimer = undefined
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('保存に失敗しました', e)
  }
}

function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flush, 200)
}

if (typeof window !== 'undefined') {
  // タブを閉じる直前に未保存分があれば書き出す
  window.addEventListener('pagehide', () => {
    if (saveTimer !== undefined) flush()
  })
}

export function getState(): AppState {
  return state
}

/** ドラフトを直接書き換えて状態を更新する */
export function mutate(fn: (draft: AppState) => void) {
  const draft = structuredClone(state)
  fn(draft)
  state = draft
  persist()
  listeners.forEach((l) => l())
}

export function replaceState(next: AppState) {
  state = next
  persist()
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState)
}
