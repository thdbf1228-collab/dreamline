import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { useActivities } from '../data/useActivities'
import { kpis, byGroup, bySalesType, rates } from '../data/aggregate'
import { Card, KpiCard, Segment } from '../components/ui'
import { num, pct } from '../lib/format'

const SALES = [
  { value: 'all', label: '전체' },
  { value: '기업', label: '기업' },
  { value: '글로벌', label: '글로벌' },
]

function repsOf(rows) {
  const m = new Map()
  for (const r of rows) { if (!r.rep_name) continue; m.set(r.rep_name, (m.get(r.rep_name) || 0) + 1) }
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

export default function Overview() {
  const { rows, error, loading } = useOpportunities()
  const [sales, setSales] = useState('all')
  const frows = useMemo(() => (rows ? bySalesType(rows, sales) : []), [rows, sales])
  const { rows: acts } = useActivities()

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const k = kpis(frows)
  const groups = byGroup(frows).map((g) => ({ name: g.name, count: g.total, rows: g.rows }))
  const reps = repsOf(frows)
  const actGroups = groups.map((g) => ({ name: g.name, count: acts.filter((a) => (a.group_name || '미배정') === g.name).length }))
  const actReps = repsOf(acts)
  const hasAct = acts.length > 0

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">영업 현황</h1>
          <p className="text-sm text-ink-500">영업기회 {num(k.total)}건 (단위: 건)</p>
        </div>
        <Segment value={sales} onChange={setSales} options={SALES} />
      </header>

      {/* KPI (건수 중심) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="영업기회" value={`${num(k.total)}건`} />
        <KpiCard label="진행중" value={`${num(k.pipelineCount)}건`} />
        <KpiCard label="성공(계약)" value={`${num(k.wonCount)}건`} />
        <KpiCard label="전환율" value={pct(k.winRate, 0)} sub={`성공 ${k.wonCount}/실패 ${k.lostCount}`} />
      </div>

      {/* 그룹별 / 담당자별 (영업기회) */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-base font-bold text-ink-900 mb-4">영업기회 그룹별</h2>
          <VBars data={groups} />
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-bold text-ink-900 mb-4">영업기회 담당자별</h2>
          <HBars data={reps} />
        </Card>
      </div>

      {/* 그룹별 지표 */}
      <Card className="overflow-hidden">
        <div className="px-5 pt-5 pb-3 text-base font-bold text-ink-900">그룹별 지표</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="bg-canvas text-left text-xs text-ink-500">
                <th className="px-5 py-2 font-medium">그룹</th>
                <th className="px-3 py-2 font-medium text-right">건수</th>
                <th className="px-3 py-2 font-medium text-right">진행률</th>
                <th className="px-3 py-2 font-medium text-right">성공률</th>
                <th className="px-5 py-2 font-medium text-right">실패률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {groups.map((g) => {
                const rt = rates(g.rows)
                return (
                  <tr key={g.name}>
                    <td className="px-5 py-2.5 font-semibold text-ink-900">{g.name}</td>
                    <td className="px-3 py-2.5 text-right tnum text-ink-600">{rt.total}</td>
                    <td className="px-3 py-2.5 text-right tnum text-brand font-semibold">{rt.progRate.toFixed(0)}%</td>
                    <td className="px-3 py-2.5 text-right tnum text-won font-semibold">{rt.winRate.toFixed(0)}%</td>
                    <td className="px-5 py-2.5 text-right tnum text-lost font-semibold">{rt.lostRate.toFixed(0)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 영업활동 */}
      {hasAct ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="text-base font-bold text-ink-900 mb-1">영업활동 그룹별</h2>
            <p className="text-xs text-ink-400 mb-4">총 {num(acts.length)}건 · 매출구분 무관</p>
            <VBars data={actGroups} />
          </Card>
          <Card className="p-5">
            <h2 className="text-base font-bold text-ink-900 mb-4">영업활동 담당자별</h2>
            <HBars data={actReps} />
          </Card>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Placeholder title="영업활동 그룹별" />
          <Placeholder title="영업활동 담당자별" />
        </div>
      )}

      {/* 그룹별·담당자별 표 */}
      <Card className="overflow-hidden">
        <div className="px-5 pt-5 pb-3 text-base font-bold text-ink-900">영업기회 그룹별 · 담당자별</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-canvas text-left text-xs text-ink-500">
                <th className="px-5 py-2 font-medium">그룹</th>
                <th className="px-3 py-2 font-medium">담당자</th>
                <th className="px-3 py-2 font-medium text-right">건수</th>
                <th className="px-5 py-2 font-medium text-right">그룹 합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {groups.map((g) => {
                const rg = repsOf(g.rows)
                return (
                  <tr key={g.name}>
                    <td className="px-5 py-2.5 font-semibold text-ink-900 whitespace-nowrap">{g.name}</td>
                    <td className="px-3 py-2.5 text-ink-600">{rg.map((r) => r.name).join(' / ') || '-'}</td>
                    <td className="px-3 py-2.5 text-right text-ink-600 tnum whitespace-nowrap">{rg.map((r) => r.count).join(' / ') || '-'}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-brand tnum">{g.count}</td>
                  </tr>
                )
              })}
              <tr className="bg-canvas">
                <td className="px-5 py-2.5 font-bold text-ink-900" colSpan={3}>합계</td>
                <td className="px-5 py-2.5 text-right font-bold text-brand tnum">{num(k.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// 세로 막대 (그룹별)
function VBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="flex items-end gap-4 h-44 px-2">
      {data.map((d) => (
        <div key={d.name} className="flex-1 flex flex-col items-center justify-end h-full">
          <div className="text-sm font-bold text-ink-900 tnum mb-1">{d.count}</div>
          <div className="w-full max-w-[64px] rounded-t bg-brand" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 0 }} />
          <div className="mt-2 text-xs text-ink-600">{d.name}</div>
        </div>
      ))}
    </div>
  )
}

// 가로 막대 (담당자별)
function HBars({ data }) {
  if (!data.length) return <p className="text-sm text-ink-400">데이터 없음</p>
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-sm text-ink-700 truncate">{d.name}</span>
          <div className="flex-1 h-5 rounded bg-canvas overflow-hidden">
            <div className="h-full rounded bg-brand" style={{ width: `${(d.count / max) * 100}%`, minWidth: d.count ? 6 : 0 }} />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-semibold text-ink-900 tnum">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

function Placeholder({ title }) {
  return (
    <Card className="p-5 border-dashed">
      <h2 className="text-base font-bold text-ink-400 mb-2">{title}</h2>
      <div className="h-32 flex items-center justify-center rounded-lg bg-canvas text-sm text-ink-400">
        영업활동 데이터를 업로드하면 표시됩니다
      </div>
    </Card>
  )
}

export function Loading() {
  return <div className="py-20 text-center text-sm text-ink-400">불러오는 중…</div>
}
export function ErrorBox({ msg }) {
  return (
    <div className="py-20 text-center">
      <p className="text-sm text-lost">데이터를 불러오지 못했습니다.</p>
      <p className="mt-1 text-xs text-ink-400">{msg}</p>
    </div>
  )
}
