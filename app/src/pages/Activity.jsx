import { useMemo } from 'react'
import { useActivities } from '../data/useActivities'
import { weekStart } from '../data/aggregate'
import { Card } from '../components/ui'
import { num } from '../lib/format'

const TYPES = ['메일', '전화', '방문', '온라인 미팅', '기타', '미분류']
const COLOR = { '메일': '#3BA9C4', '전화': '#4FA97E', '방문': '#E89B4B', '온라인 미팅': '#8B7FD0', '기타': '#9AA3AF', '미분류': '#CBD5E1' }
const mLabel = (k) => `${k.slice(2, 4)}.${k.slice(5, 7)}`
const wLabel = (k) => `${k.slice(5, 7)}.${k.slice(8, 10)}`

function bucket(rows, keyFn) {
  const m = new Map()
  for (const r of rows) {
    const k = keyFn(r); if (!k) continue
    if (!m.has(k)) m.set(k, {})
    const o = m.get(k); const t = TYPES.includes(r.activity_type) ? r.activity_type : '미분류'
    o[t] = (o[t] || 0) + 1
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, counts]) => ({ label, counts, total: Object.values(counts).reduce((s, n) => s + n, 0) }))
}

function StackedBars({ data, label }) {
  if (!data.length) return <p className="text-sm text-ink-400">데이터 없음</p>
  const max = Math.max(1, ...data.map((d) => d.total))
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-xs text-ink-500 tnum">{label(d.label)}</span>
          <div className="flex-1 h-5 rounded bg-canvas overflow-hidden flex" style={{ width: `${(d.total / max) * 100}%`, minWidth: 2 }}>
            {TYPES.map((t) => d.counts[t] ? <div key={t} title={`${t} ${d.counts[t]}`} style={{ width: `${(d.counts[t] / d.total) * 100}%`, background: COLOR[t] }} /> : null)}
          </div>
          <span className="w-9 shrink-0 text-right text-sm font-semibold text-ink-900 tnum">{d.total}</span>
        </div>
      ))}
    </div>
  )
}

export default function Activity() {
  const { rows } = useActivities()
  const byMonth = useMemo(() => bucket(rows, (r) => (r.activity_date || '').slice(0, 7)), [rows])
  const byWeek = useMemo(() => bucket(rows, (r) => weekStart(r.activity_date)).slice(-12), [rows])
  const typeTotals = useMemo(() => {
    const m = {}; for (const r of rows) { const t = TYPES.includes(r.activity_type) ? r.activity_type : '미분류'; m[t] = (m[t] || 0) + 1 }
    return m
  }, [rows])

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-ink-900">영업활동 상세</h1>
        <p className="text-sm text-ink-500">활동일시 기준 · 총 {num(rows.length)}건 · 활동분류별</p>
      </header>

      {/* 범례 (+ 분류별 총계) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {TYPES.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 text-xs text-ink-600">
            <span className="w-3 h-3 rounded-sm" style={{ background: COLOR[t] }} />{t} <b className="tnum text-ink-900">{typeTotals[t] || 0}</b>
          </span>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-base font-bold text-ink-900 mb-4">월간 활동 (분류별)</h2>
        <StackedBars data={byMonth} label={mLabel} />
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-bold text-ink-900 mb-1">주간 활동 (분류별)</h2>
        <p className="text-xs text-ink-400 mb-4">최근 12주 · 주 시작일</p>
        <StackedBars data={byWeek} label={wLabel} />
      </Card>
    </div>
  )
}
