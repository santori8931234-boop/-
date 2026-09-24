import { useRef, useState } from 'react'
import { getState, mutate, normalize, replaceState, useAppState } from '../lib/store'
import { initialState } from '../lib/defaults'
import { todayKey } from '../lib/date'
import { BODY_PARTS, type AppState, type BodyPart } from '../lib/types'
import { NumInput } from '../components/NumInput'

export function SettingsView() {
  const state = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [part, setPart] = useState<BodyPart>('胸')

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `training-memo-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Partial<AppState>
      if (typeof data !== 'object' || !data || !('workouts' in data)) throw new Error('形式が正しくありません')
      if (!confirm('現在のデータを読み込んだデータで置き換えます。よろしいですか？')) return
      replaceState(normalize(data))
      alert('読み込みました')
    } catch (e) {
      alert(`読み込みに失敗しました: ${(e as Error).message}`)
    }
  }

  const usedIds = new Set(Object.values(state.workouts).flatMap((w) => w.exercises.map((e) => e.exerciseId)))

  return (
    <div className="view">
      <header className="topbar">
        <span className="icon-btn" />
        <h1>設定</h1>
        <span className="icon-btn" />
      </header>

      <section className="card">
        <h3>インターバルタイマー</h3>
        <label className="field">
          <span>休憩時間（秒）</span>
          <NumInput
            decimal={false}
            value={state.settings.restSeconds}
            onChange={(v) => mutate((s) => void (s.settings.restSeconds = v ?? 0))}
          />
        </label>
        <div className="chips">
          {[60, 90, 120, 180, 240, 300].map((sec) => (
            <button
              key={sec}
              className={`chip ${state.settings.restSeconds === sec ? 'active' : ''}`}
              onClick={() => mutate((s) => void (s.settings.restSeconds = sec))}
            >
              {sec >= 60 ? `${sec / 60}分` : `${sec}秒`}
            </button>
          ))}
        </div>
        <label className="field">
          <span>セット完了時に自動スタート</span>
          <input
            type="checkbox"
            checked={state.settings.autoRestTimer}
            onChange={(e) => mutate((s) => void (s.settings.autoRestTimer = e.target.checked))}
          />
        </label>
      </section>

      <section className="card">
        <h3>推奨重量</h3>
        <label className="field">
          <span>丸め単位 (kg)</span>
          <select
            value={state.settings.roundTo}
            onChange={(e) => mutate((s) => void (s.settings.roundTo = Number(e.target.value)))}
          >
            {[0.5, 1, 1.25, 2, 2.5, 5].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card">
        <h3>種目の管理</h3>
        <div className="chips">
          {BODY_PARTS.map((p) => (
            <button key={p} className={`chip part-${p} ${p === part ? 'active' : ''}`} onClick={() => setPart(p)}>
              {p}
            </button>
          ))}
        </div>
        <ul className="exercise-admin">
          {state.exercises
            .filter((e) => e.bodyPart === part)
            .map((e) => (
              <li key={e.id}>
                <input
                  value={e.name}
                  aria-label="種目名"
                  onChange={(ev) => mutate((s) => void (s.exercises.find((x) => x.id === e.id)!.name = ev.target.value))}
                />
                <select
                  value={e.bodyPart}
                  aria-label="部位"
                  onChange={(ev) =>
                    mutate((s) => void (s.exercises.find((x) => x.id === e.id)!.bodyPart = ev.target.value as BodyPart))
                  }
                >
                  {BODY_PARTS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <label className="small nowrap">
                  <input
                    type="checkbox"
                    checked={!!e.bodyweight}
                    onChange={(ev) =>
                      mutate((s) => void (s.exercises.find((x) => x.id === e.id)!.bodyweight = ev.target.checked))
                    }
                  />
                  自重
                </label>
                <button
                  className="icon-btn small danger"
                  aria-label="削除"
                  onClick={() => {
                    if (usedIds.has(e.id)) return alert('記録で使用中の種目は削除できません')
                    if (confirm(`${e.name} を削除しますか？`)) mutate((s) => void (s.exercises = s.exercises.filter((x) => x.id !== e.id)))
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
        </ul>
        <p className="muted small">新しい種目は記録画面の「種目を追加」から作成できます。</p>
      </section>

      <section className="card">
        <h3>データ</h3>
        <p className="muted small">データはこの端末のブラウザ内に保存されます。機種変更の前にはバックアップを書き出してください。</p>
        <div className="row gap wrap">
          <button className="btn small" onClick={exportData}>
            バックアップを書き出す
          </button>
          <button className="btn small" onClick={() => fileRef.current?.click()}>
            バックアップを読み込む
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
        </div>
        <button
          className="btn small danger block"
          onClick={() => {
            if (confirm('すべてのデータを削除して初期状態に戻します。よろしいですか？')) replaceState(initialState())
          }}
        >
          全データを削除
        </button>
      </section>
    </div>
  )
}
