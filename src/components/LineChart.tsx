import { formatDateShort } from '../lib/date'

export interface Point {
  date: string
  value: number
}

/** 依存ライブラリなしのシンプルな折れ線グラフ */
export function LineChart({ points, unit = 'kg' }: { points: Point[]; unit?: string }) {
  if (points.length === 0) return <p className="muted empty">データがありません</p>
  const W = 340
  const H = 180
  const pad = { l: 40, r: 12, t: 12, b: 24 }
  const values = points.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 5
    max += 5
  }
  const span = max - min
  min -= span * 0.1
  max += span * 0.1
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1))
  const y = (v: number) => pad.t + ((max - v) * (H - pad.t - pad.b)) / (max - min)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const ticks = [0, 0.5, 1].map((r) => min + (max - min) * r)
  const labelIdx = points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) / 2), points.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="grid" />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="axis">
            {Math.round(v)}
          </text>
        </g>
      ))}
      {[...new Set(labelIdx)].map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="axis">
          {formatDateShort(points[i].date)}
        </text>
      ))}
      <path d={path} className="line" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={3} className="pt">
          <title>
            {p.date}: {Math.round(p.value * 10) / 10}
            {unit}
          </title>
        </circle>
      ))}
    </svg>
  )
}
