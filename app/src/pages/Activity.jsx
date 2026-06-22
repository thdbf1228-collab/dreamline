import { useMemo } from 'react'
import { useActivities } from '../data/useActivities'
import { weekStart } from '../data/aggregate'
import { Card } from '../components/ui'
import { num } from '../lib/format'

const TYPES = ['메일', '전화', '방문', '온라인 미팅', '기타', '미분류']
const HEAD = { '메일': '메일', '전화': '전화', '방문': '방문', '온라인 미팅': '미팅', '기타': '기타', '미분류': '미분류' }
const mLabel = (k) => `${k.slice(0, 4)}.${k.slice(5, 7)}`
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

function Matrix({ data, label, firstHead }) {
  if (!data.length) return <p className="text-sm text-ink-400">데이터 없음</p>
  const totals = {}; let grand = 0
  for (const d of data) { for (const t of TYPES) totals[t] = (totals[t] || 0) + (d.counts[t] || 0); grand += d.total }
  const cell = (n) => (n ? <span className="text-ink-800 tnum">{n}</span> : <span className="text-ink-300">·</span>)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[460px]">
        <thead>
          <tr className="bg-canvas text-xs text-ink-500">
            <th className="px-4 py-2 text-left font-medium">{firstHead}</th>
            {TYPES.map((t) => <th key={t} className="px-2 py-2 text-right font-medium">{HEAD[t]}</th>)}
            <th className="px-4 py-2 text-right font-medium">합계</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((d) => (
            <tr key={d.label} className="hover:bg-canvas">
              <td className="px-4 py-2 text-ink-700 tnum whitespace-nowrap">{label(d.label)}</td>
              {TYPES.map((t) => <td key={t} className="px-2 py-2 text-right">{cell(d.counts[t] || 0)}</td>)}
              <td className="px-4 py-2 text-right font-bold text-brand tnum">{d.total}</td>
            </tr>
          ))}
          <tr className="bg-canvas font-semibold">
            <td className="px-4 py-2 text-ink-900">합계</td>
            {TYPES.map((t) => <td key={t} className="px-2 py-2 text-right text-ink-700 tnum">{totals[t] || 0}</td>)}
            <td className="px-4 py-2 text-right text-brand tnum">{grand}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function Activity() {
  const { rows } = useActivities()
  const byMonth = useMemo(() => bucket(rows, (r) => (r.activity_date || '').slice(0, 7)), [rows])
  const byWeek = useMemo(() => bucket(rows, (r) => weekStart(r.activity_date)).slice(-12), [rows])

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-ink-900">영업활동 상세</h1>
        <p className="text-sm text-ink-500">활동일시 기준 · 총 {num(rows.length)}건</p>
      </header>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 text-base font-bold text-ink-900">월간 활동 · 분류별</div>
        <Matrix data={byMonth} label={mLabel} firstHead="월" />
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 text-base font-bold text-ink-900">주간 활동 · 분류별 <span className="text-xs font-normal text-ink-400">(최근 12주)</span></div>
        <Matrix data={byWeek} label={wLabel} firstHead="주" />
      </Card>
    </div>
  )
}
