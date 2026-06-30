import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { useActivities } from '../data/useActivities'
import { useReps } from '../data/useReps'
import { Card } from '../components/ui'
import { num } from '../lib/format'

const mLabel = (k) => `${k.slice(0, 4)}.${k.slice(5, 7)}`

// 영업사원 × 월 매트릭스 (미배정 제외, 합계순)
function matrix(rows, dateField, year, rosterReps = []) {
  const filtered = rows.filter((r) => r.group_name && r.rep_name && (year === 'all' || (r[dateField] || '').slice(0, 4) === year))
  const periods = [...new Set(filtered.map((r) => (r[dateField] || '').slice(0, 7)).filter(Boolean))].sort()
  const pset = new Set(periods)
  const map = new Map()
  for (const rr of rosterReps) if (!map.has(rr.rep)) map.set(rr.rep, { group: rr.group, by: {} }) // 명단 전원 시드(0건 표기)
  for (const r of filtered) {
    const p = (r[dateField] || '').slice(0, 7); if (!pset.has(p)) continue
    if (!map.has(r.rep_name)) map.set(r.rep_name, { group: r.group_name, by: {} })
    const o = map.get(r.rep_name); o.by[p] = (o.by[p] || 0) + 1
  }
  const reps = [...map.entries()].map(([rep, v]) => ({ rep, group: v.group, by: v.by, total: Object.values(v.by).reduce((s, n) => s + n, 0) })).sort((a, b) => b.total - a.total)
  const colTotals = periods.map((p) => reps.reduce((s, r) => s + (r.by[p] || 0), 0))
  return { periods, reps, colTotals, grand: colTotals.reduce((s, n) => s + n, 0) }
}

function RepMatrix({ m }) {
  if (!m.reps.length) return <p className="px-5 pb-5 text-sm text-ink-400">데이터 없음</p>
  const cell = (n) => (n ? <span className="text-ink-800 tnum">{n}</span> : <span className="text-ink-300">·</span>)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[460px]">
        <thead>
          <tr className="bg-canvas text-xs text-ink-500">
            <th className="px-4 py-2 text-left font-medium whitespace-nowrap">영업사원</th>
            {m.periods.map((p) => <th key={p} className="px-2 py-2 text-right font-medium tnum whitespace-nowrap">{mLabel(p)}</th>)}
            <th className="px-4 py-2 text-right font-medium">합계</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {m.reps.map((r) => (
            <tr key={r.rep} className="hover:bg-canvas">
              <td className="px-4 py-2 font-medium text-ink-800 whitespace-nowrap">{r.rep}{r.group ? <span className="text-ink-400 font-normal text-xs"> · {r.group}</span> : ''}</td>
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
  const { rows: opps } = useOpportunities()
  const { rows: acts } = useActivities()
  const { reps: repList } = useReps()
  const [year, setYear] = useState('all')
  const [grp, setGrp] = useState('all')

  const years = useMemo(() => {
    const s = new Set()
    for (const r of opps || []) if (r.start_date) s.add(r.start_date.slice(0, 4))
    for (const a of acts) if (a.activity_date) s.add(a.activity_date.slice(0, 4))
    return [...s].sort().reverse()
  }, [opps, acts])
  const groups = useMemo(() => {
    const s = new Set()
    for (const r of repList || []) if (r.group_name) s.add(r.group_name)
    for (const r of opps || []) if (r.group_name) s.add(r.group_name)
    for (const a of acts) if (a.group_name) s.add(a.group_name)
    return [...s].sort()
  }, [repList, opps, acts])
  const byGrp = (arr) => (grp === 'all' ? arr : arr.filter((r) => r.group_name === grp))
  const rosterReps = useMemo(() => (repList || [])
    .filter((r) => r.group_name && (grp === 'all' || r.group_name === grp))
    .map((r) => ({ rep: r.rep_name, group: r.group_name })), [repList, grp])

  const oppM = useMemo(() => matrix(byGrp(opps || []), 'start_date', year, rosterReps), [opps, year, grp, rosterReps])
  const actM = useMemo(() => matrix(byGrp(acts), 'activity_date', year, rosterReps), [acts, year, grp, rosterReps])

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">영업사원별 현황</h1>
          <p className="text-sm text-ink-500">월별 · 합계순 · 미배정 제외</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={grp} onChange={(e) => setGrp(e.target.value)} className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink-700 focus:border-brand">
            <option value="all">그룹 전체</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink-700 focus:border-brand">
            <option value="all">전체 (년도)</option>
            {years.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>
      </header>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 text-base font-bold text-ink-900">영업사원별 영업기회 <span className="text-xs font-normal text-ink-400">(시작일 기준)</span></div>
        <RepMatrix m={oppM} />
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 text-base font-bold text-ink-900">영업사원별 영업활동 <span className="text-xs font-normal text-ink-400">(활동일시 기준)</span></div>
        <RepMatrix m={actM} />
      </Card>
    </div>
  )
}
