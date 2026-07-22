import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { useActivities } from '../data/useActivities'
import { useReps, isHiddenGroup } from '../data/useReps'
import { rates } from '../data/aggregate'
import { Card } from '../components/ui'
import { num } from '../lib/format'
import DrillModal from '../components/DrillModal'

const C_OPP = '#2F5597' // 영업기회 네이비
const C_ACT = '#D98E33' // 영업활동 앰버

function repBars(dataRows, seedNames) {
  const m = new Map()
  for (const name of seedNames) m.set(name, 0) // 명단 전원 0으로 시드 → 0건도 표기
  for (const r of dataRows) { if (!r.rep_name) continue; m.set(r.rep_name, (m.get(r.rep_name) || 0) + 1) }
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}
const countStatus = (rows, s) => rows.filter((r) => r.status === s).length

export default function Overview() {
  const { rows, error, loading } = useOpportunities()
  const { rows: acts } = useActivities()
  const { reps: repList } = useReps()
  const [month, setMonth] = useState('all')
  const [drill, setDrill] = useState(null)
  const oppTitle = (oid) => (rows || []).find((o) => String(o.external_id) === String(oid))?.title || null

  // 고정 그룹 목록(미배정 제외) — 데이터 없는 달에도 항상 표시 (6월 오류 방지)
  const allGroups = useMemo(() => {
    const s = new Set()
    for (const r of repList || []) if (r.group_name) s.add(r.group_name)
    for (const r of rows || []) if (r.group_name) s.add(r.group_name)
    return [...s].filter((g) => !isHiddenGroup(g)).sort()
  }, [repList, rows])

  const rosterByGroup = useMemo(() => {
    const m = {}
    for (const r of repList || []) { if (!r.group_name) continue; (m[r.group_name] = m[r.group_name] || new Set()).add(r.rep_name) }
    for (const r of rows || []) { if (!r.group_name || isHiddenGroup(r.group_name) || !r.rep_name) continue; (m[r.group_name] = m[r.group_name] || new Set()).add(r.rep_name) }
    return m
  }, [repList, rows])
  const rosterNames = useMemo(() => (repList || []).filter((r) => r.group_name).map((r) => r.rep_name), [repList])

  const monthsAvail = useMemo(() => {
    const s = new Set()
    for (const r of rows || []) { const k = (r.start_date || '').slice(0, 7); if (k) s.add(k) }
    for (const a of acts) { const k = (a.activity_date || '').slice(0, 7); if (k) s.add(k) }
    return [...s].sort().reverse()
  }, [rows, acts])

  const fOpp = useMemo(() => {
    let r = rows || []
    if (month !== 'all') r = r.filter((o) => (o.start_date || '').slice(0, 7) === month)
    return r
  }, [rows, month])
  const fActs = useMemo(() => (month === 'all' ? acts : acts.filter((a) => (a.activity_date || '').slice(0, 7) === month)), [acts, month])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const groups = allGroups.map((name) => {
    const gr = fOpp.filter((r) => r.group_name === name)
    return { name, rows: gr, count: gr.length, act: fActs.filter((a) => a.group_name === name).length }
  })
  const oppGroupBars = groups.map((g) => ({ name: g.name, count: g.count }))
  const actGroupBars = groups.map((g) => ({ name: g.name, count: g.act }))
  // 담당자별 — 미배정 제외
  const reps = repBars(fOpp.filter((r) => r.group_name), rosterNames)
  const actReps = repBars(fActs.filter((a) => a.group_name), rosterNames)
  const periodLabel = month === 'all' ? '2026.1~ 누적' : `${month.slice(0, 4)}.${month.slice(5, 7)}`

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">영업 현황</h1>
          <p className="text-sm text-ink-500">{periodLabel} · 영업기회 {num(fOpp.length)}건 · 영업활동 {num(fActs.length)}건</p>
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink-700 focus:border-brand">
          <option value="all">전체 (누적)</option>
          {monthsAvail.map((m) => <option key={m} value={m}>{m.slice(0, 4)}.{m.slice(5, 7)}</option>)}
        </select>
      </header>

      {/* 1. 그룹 요약 — 남는 공간 없이 균등 분할 */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, groups.length)}, minmax(0, 1fr))` }}>
        {groups.map((g) => (
          <Card key={g.name} className="p-4">
            <div className="text-base font-bold text-ink-900">{g.name} <span className="text-xs font-normal text-ink-400">({rosterByGroup[g.name]?.size || 0}명)</span></div>
            <button type="button" onClick={() => setDrill({ title: `${g.name} 영업기회`, subtitle: periodLabel, sections: [{ kind: 'opp', rows: g.rows, hide: ['external_id', 'product', 'est_amount', 'confirmed_amount', 'win_prob', 'channel'] }] })}
              className="mt-2 flex w-full items-baseline justify-between text-sm text-ink-500 hover:text-ink-800">
              <span>영업기회</span><span className="text-lg font-bold tnum underline-offset-4 hover:underline" style={{ color: C_OPP }}>{g.count}건</span>
            </button>
            <button type="button" onClick={() => setDrill({ title: `${g.name} 영업활동`, subtitle: periodLabel, sections: [{ kind: 'act', rows: (fActs.filter((a) => a.group_name === g.name)).map((x) => ({ ...x, _opp_title: oppTitle(x.opportunity_external_id) })), hide: ['external_id', 'opportunity_external_id', 'related_product', 'start_time', 'end_time', 'customer_name', 'companion', 'participants', 'registered_by'] }] })}
              className="flex w-full items-baseline justify-between text-sm text-ink-500 hover:text-ink-800">
              <span>영업활동</span><span className="text-lg font-bold tnum underline-offset-4 hover:underline" style={{ color: C_ACT }}>{g.act}건</span>
            </button>
          </Card>
        ))}
      </div>

      {/* 2. 영업기회 현황 */}
      <Card className="overflow-hidden">
        <div className="px-5 pt-5 pb-3 text-base font-bold text-ink-900">영업기회 현황 <span className="text-xs font-normal text-ink-400">(시작일 기준 · 진행+성공+실패(보류포함)=100%)</span></div>
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
                    <td className="px-3 py-2.5 text-right tnum text-ink-600 cursor-pointer hover:underline"
                      onClick={() => setDrill({ title: `${g.name} 영업기회 전체`, subtitle: periodLabel, sections: [{ kind: 'opp', rows: g.rows, hide: ['external_id', 'product', 'est_amount', 'confirmed_amount', 'win_prob', 'channel'] }] })}>{rt.total}건</td>
                    <td className="px-3 py-2.5 text-right tnum text-brand font-semibold cursor-pointer hover:underline"
                      onClick={() => setDrill({ title: `${g.name} 진행중`, subtitle: periodLabel, sections: [{ kind: 'opp', rows: g.rows.filter((r) => r.status === '진행중'), hide: ['external_id', 'product', 'est_amount', 'confirmed_amount', 'win_prob', 'channel'] }] })}>{rt.progRate.toFixed(0)}%</td>
                    <td className="px-3 py-2.5 text-right tnum font-semibold cursor-pointer hover:underline" style={{ color: C_OPP }}
                      onClick={() => setDrill({ title: `${g.name} 종료(성공)`, subtitle: periodLabel, sections: [{ kind: 'opp', rows: g.rows.filter((r) => r.status === '종료(성공)'), hide: ['external_id', 'product', 'est_amount', 'confirmed_amount', 'win_prob', 'channel'] }] })}>{rt.winRate.toFixed(0)}%</td>
                    <td className="px-5 py-2.5 text-right tnum text-lost font-semibold cursor-pointer hover:underline"
                      onClick={() => setDrill({ title: `${g.name} 실패·보류`, subtitle: periodLabel, sections: [{ kind: 'opp', rows: g.rows.filter((r) => r.status === '종료(실패)' || r.status === '보류/연기'), hide: ['external_id', 'product', 'est_amount', 'confirmed_amount', 'win_prob', 'channel'] }] })}>{rt.lostRate.toFixed(0)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. 그룹별 막대 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5"><h2 className="text-base font-bold text-ink-900 mb-4">영업기회 그룹별</h2><VBars data={oppGroupBars} color={C_OPP} onPick={(n) => setDrill({ title: `${n} 영업기회`, subtitle: periodLabel, sections: [{ kind: 'opp', rows: fOpp.filter((r) => r.group_name === n), hide: ['external_id', 'product', 'est_amount', 'confirmed_amount', 'win_prob', 'channel'] }] })} /></Card>
        <Card className="p-5"><h2 className="text-base font-bold text-ink-900 mb-4">영업활동 그룹별</h2><VBars data={actGroupBars} color={C_ACT} onPick={(n) => setDrill({ title: `${n} 영업활동`, subtitle: periodLabel, sections: [{ kind: 'act', rows: (fActs.filter((a) => a.group_name === n)).map((x) => ({ ...x, _opp_title: oppTitle(x.opportunity_external_id) })), hide: ['external_id', 'opportunity_external_id', 'related_product', 'start_time', 'end_time', 'customer_name', 'companion', 'participants', 'registered_by'] }] })} /></Card>
      </div>

      {/* 4. 담당자별 막대 (맨 아래, 미배정 제외) */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5"><h2 className="text-base font-bold text-ink-900 mb-4">영업기회 담당자별</h2><HBars data={reps} color={C_OPP} onPick={(n) => setDrill({ title: `${n} 영업기회`, subtitle: periodLabel, sections: [{ kind: 'opp', rows: fOpp.filter((r) => r.rep_name === n), hide: ['external_id', 'product', 'est_amount', 'confirmed_amount', 'win_prob', 'channel'] }] })} /></Card>
        <Card className="p-5"><h2 className="text-base font-bold text-ink-900 mb-4">영업활동 담당자별</h2><HBars data={actReps} color={C_ACT} onPick={(n) => setDrill({ title: `${n} 영업활동`, subtitle: periodLabel, sections: [{ kind: 'act', rows: (fActs.filter((a) => a.rep_name === n)).map((x) => ({ ...x, _opp_title: oppTitle(x.opportunity_external_id) })), hide: ['external_id', 'opportunity_external_id', 'related_product', 'start_time', 'end_time', 'customer_name', 'companion', 'participants', 'registered_by'] }] })} /></Card>
      </div>

      <DrillModal open={!!drill} onClose={() => setDrill(null)} title={drill?.title} subtitle={drill?.subtitle} sections={drill?.sections || []} />
    </div>
  )
}

function VBars({ data, color, onPick }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="flex items-end gap-4 h-40 px-2">
      {data.map((d) => (
        <div key={d.name} onClick={() => onPick?.(d.name)}
          className={`flex-1 flex flex-col items-center justify-end h-full ${onPick ? 'cursor-pointer hover:opacity-80' : ''}`}>
          <div className="text-sm font-bold text-ink-900 tnum mb-1">{d.count}건</div>
          <div className="w-full max-w-[64px] rounded-t" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 0, background: color }} />
          <div className="mt-2 text-xs text-ink-600">{d.name}</div>
        </div>
      ))}
    </div>
  )
}

function HBars({ data, color, onPick }) {
  if (!data.length) return <p className="text-sm text-ink-400">데이터 없음</p>
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="space-y-1.5 max-h-72 overflow-auto">
      {data.map((d) => (
        <div key={d.name} onClick={() => onPick?.(d.name)} className={`flex items-center gap-3 ${onPick ? 'cursor-pointer hover:bg-canvas/60 rounded' : ''}`}>
          <span className="w-16 shrink-0 text-sm text-ink-700 truncate">{d.name}</span>
          <div className="flex-1 h-5 rounded bg-canvas overflow-hidden">
            <div className="h-full rounded" style={{ width: `${(d.count / max) * 100}%`, minWidth: d.count ? 6 : 0, background: color }} />
          </div>
          <span className="w-10 shrink-0 text-right text-sm font-semibold text-ink-900 tnum">{d.count}건</span>
        </div>
      ))}
    </div>
  )
}

export function Loading() { return <div className="py-20 text-center text-sm text-ink-400">불러오는 중…</div> }
export function ErrorBox({ msg }) {
  return (<div className="py-20 text-center"><p className="text-sm text-lost">데이터를 불러오지 못했습니다.</p><p className="mt-1 text-xs text-ink-400">{msg}</p></div>)
}
