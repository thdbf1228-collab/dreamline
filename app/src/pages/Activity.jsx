import { useMemo } from 'react'
import { useActivities } from '../data/useActivities'
import { weekStart } from '../data/aggregate'
import { Card } from '../components/ui'
import { num } from '../lib/format'

const mLabel = (k) => `${k.slice(0, 4)}.${k.slice(5, 7)}`
const wLabel = (k) => `${k.slice(5, 7)}.${k.slice(8, 10)}`

// 영업사원 × 기간 매트릭스 (미배정=타부서 발령자 제외, 합계순 정렬)
function repMatrix(rows, keyFn, limit) {
  const filtered = rows.filter((r) => r.group_name && r.rep_name)
  let periods = [...new Set(filtered.map(keyFn).filter(Boolean))].sort()
  if (limit) periods = periods.slice(-limit)
  const pset = new Set(periods)
  const map = new Map()
  for (const r of filtered) {
    const p = keyFn(r); if (!pset.has(p)) continue
    if (!map.has(r.rep_name)) map.set(r.rep_name, {})
    const o = map.get(r.rep_name); o[p] = (o[p] || 0) + 1
  }
  const reps = [...map.entries()]
    .map(([rep, by]) => ({ rep, by, total: Object.values(by).reduce((s, n) => s + n, 0) }))
    .sort((a, b) => b.total - a.total)
  const colTotals = periods.map((p) => reps.reduce((s, r) => s + (r.by[p] || 0), 0))
  const grand = colTotals.reduce((s, n) => s + n, 0)
  return { periods, reps, colTotals, grand }
}

function RepMatrix({ m, label }) {
  if (!m.reps.length) return <p className="px-5 pb-5 text-sm text-ink-400">데이터 없음</p>
  const cell = (n) => (n ? <span className="text-ink-800 tnum">{n}</span> : <span className="text-ink-300">·</span>)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="bg-canvas text-xs text-ink-500">
            <th className="px-4 py-2 text-left font-medium whitespace-nowrap">영업사원</th>
            {m.periods.map((p) => <th key={p} className="px-2 py-2 text-right font-medium tnum whitespace-nowrap">{label(p)}</th>)}
            <th className="px-4 py-2 text-right font-medium">합계</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {m.reps.map((r) => (
            <tr key={r.rep} className="hover:bg-canvas">
              <td className="px-4 py-2 font-medium text-ink-800 whitespace-nowrap">{r.rep}</td>
              {m.periods.map((p) => <td key={p} className="px-2 py-2 text-right">{cell(r.by[p] || 0)}</td>)}
              <td className="px-4 py-2 text-right font-bold text-brand tnum">{r.total}</td>
            </tr>
          ))}
          <tr className="bg-canvas font-semibold">
            <td className="px-4 py-2 text-ink-900">합계</td>
            {m.colTotals.map((t, i) => <td key={i} className="px-2 py-2 text-right text-ink-700 tnum">{t}</td>)}
            <td className="px-4 py-2 text-right text-brand tnum">{m.grand}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function Activity() {
  const { rows } = useActivities()
  const byMonth = useMemo(() => repMatrix(rows, (r) => (r.activity_date || '').slice(0, 7)), [rows])
  const byWeek = useMemo(() => repMatrix(rows, (r) => weekStart(r.activity_date), 12), [rows])

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-ink-900">영업사원별 활동</h1>
        <p className="text-sm text-ink-500">활동일시 기준 · 총 {num(rows.length)}건 · 합계순</p>
      </header>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 text-base font-bold text-ink-900">영업사원별 월간 활동</div>
        <RepMatrix m={byMonth} label={mLabel} />
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 text-base font-bold text-ink-900">영업사원별 주간 활동 <span className="text-xs font-normal text-ink-400">(최근 12주)</span></div>
        <RepMatrix m={byWeek} label={wLabel} />
      </Card>
    </div>
  )
}
