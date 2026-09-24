const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function formatDateJa(key: string): string {
  const d = parseDateKey(key)
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`
}

export function formatDateShort(key: string): string {
  const d = parseDateKey(key)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export { WEEKDAYS }
