import { useEffect, useState, useSyncExternalStore } from 'react'

let endAt: number | null = null
let total = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function startRest(seconds: number) {
  endAt = Date.now() + seconds * 1000
  total = seconds
  emit()
}

function stopRest() {
  endAt = null
  emit()
}

function addRest(seconds: number) {
  if (endAt == null) return
  endAt = Math.max(Date.now(), endAt + seconds * 1000)
  total = Math.max(total + seconds, 1)
  emit()
}

function beep() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      g.gain.value = 0.2
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.15)
    })
  } catch {
    // 音が出せない環境は無視
  }
  navigator.vibrate?.([200, 100, 200])
}

export function RestTimer() {
  const end = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => endAt,
  )
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (end == null) return
    const t = setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= end) {
        beep()
        stopRest()
      }
    }, 250)
    return () => clearInterval(t)
  }, [end])

  if (end == null) return null
  const remain = Math.max(0, Math.ceil((end - now) / 1000))
  const ratio = total ? remain / total : 0
  return (
    <div className="rest-timer" role="timer">
      <div className="rest-progress" style={{ width: `${ratio * 100}%` }} />
      <span className="rest-label">休憩</span>
      <span className="rest-time">
        {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')}
      </span>
      <button className="btn small ghost" onClick={() => addRest(-15)}>
        −15
      </button>
      <button className="btn small ghost" onClick={() => addRest(15)}>
        +15
      </button>
      <button className="btn small" onClick={stopRest}>
        終了
      </button>
    </div>
  )
}
