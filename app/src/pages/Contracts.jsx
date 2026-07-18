import { useMemo, useState } from 'react'
import { useContracts } from '../data/useContracts'
import { Card, Select } from '../components/ui'
import { won, num } from '../lib/format'
import DrillModal from '../components/DrillModal'
import { Loading } from './Overview'

const FROM = '2026-01-01'
const monthLabel = (k) => `${k.slice(0, 4)}년 ${Number(k.slice(5, 7))}월`

export default function Contracts() {
  const { rows } = useContracts()
  const [year, setYear] = useState('all')
  const [mon, setMon] = useState('all')
  const [grp, setGrp] = useState('all')
  const [drill, setDrill] = useState(null)

  const base = useMemo(() => rows.filter((c) => c.contract_date && c.contract_date >= FROM), [rows])
  const years = useMemo(() => [...new Set(base.map((c) => c.contract_date.slice(0, 4)))].sort().reverse(), [base])
  const groups = useMemo(() => [...new Set(base.map((c) => c.group_name).filter(Boolean))].sort(), [base])
  const monthsInData = useMemo(() => [...new Set(base.map((c) => c.contract_date.slice(5, 7)))].sort(), [base])

  const valid = useMemo(() => base.filter((c) =>
    (year === 'all' || c.contract_date.slice(0, 4) === year) &&
    (mon === 'all' || c.contract_date.slice(5, 7) === mon) &&
    (grp === 'all' || c.group_name === grp)
  ), [base, year, mon, grp])

  // (B) 영업기회당 1건 — 같은 영업기회 계약은 금액 합산 + 최신 계약일 1줄. 영업기회 없는 건은 개별 유지.
  const merged = useMemo(() => {
    const byOpp = new Map(); const out = []
    for (const c of valid) {
      const oid = c.opportunity_external_id
      if (oid == null || oid === '') { out.push({ ...c }); continue }
      if (!byOpp.has(oid)) byOpp.set(oid, [])
      byOpp.get(oid).push(c)
    }
    for (const [, list] of byOpp) {
      const latest = list.reduce((a, b) => ((a.contract_date || '') >= (b.contract_date || '') ? a : b))
      const sum = list.reduce((s, c) => s + (Number(c.supply_amount) || 0), 0)
      out.push({ ...latest, supply_amount: sum, _merged: list.length })
    }
    return out
  }, [valid])

  const accEm = useMemo(() => Math.min(16, Math.max(6, ...merged.map((c) => (c.account_name || '').length))) + 1, [merged])

  const months = useMemo(() => {
    const m = new Map()
    for (const c of merged) { const k = c.contract_date.slice(0, 7); if (!m.has(k)) m.set(k, []); m.get(k).push(c) }
    return [...m.entries()].map(([month, list]) => ({
      month,
      list: list.sort((a, b) => (Number(b.supply_amount) || 0) - (Number(a.supply_amount) || 0)),
      sum: list.reduce((s, c) => s + (Number(c.supply_amount) || 0), 0),
    })).sort((a, b) => b.month.localeCompare(a.month))
  }, [merged])

  if (rows === null) return <Loading />

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-ink-900">계약</h1>
        <p className="text-sm text-ink-500">계약일 {FROM.replaceAll('-', '.')} 이후 · 영업기회당 1건 · {num(merged.length)}건 · 금액순</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={year} onChange={setYear}><option value="all">년도 전체</option>{years.map((y) => <option key={y} value={y}>{y}년</option>)}</Select>
        <Select value={mon} onChange={setMon}><option value="all">월 전체</option>{monthsInData.map((m) => <option key={m} value={m}>{Number(m)}월</option>)}</Select>
        <Select value={grp} onChange={setGrp}><option value="all">그룹 전체</option>{groups.map((g) => <option key={g} value={g}>{g}</option>)}</Select>
        <button onClick={() => { setYear('all'); setMon('all'); setGrp('all') }} className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-500 hover:bg-canvas">초기화</button>
      </div>

      {months.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-400">조건에 맞는 계약이 없습니다.</p>
      ) : (
        months.map((m) => (
          <Card key={m.month} className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-canvas">
              <span className="text-base font-bold text-ink-900">{monthLabel(m.month)}</span>
              <span className="text-sm text-ink-500 cursor-pointer hover:underline"
                onClick={() => setDrill({ title: `${monthLabel(m.month)} 계약`, subtitle: '합산 전 원본', kind: 'con', rows: valid.filter((c) => (c.contract_date || '').slice(0, 7) === m.month) })}>
                {m.list.length}건 · <b className="text-brand tnum">{won(m.sum)}</b></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed min-w-[600px]">
                <colgroup>
                  <col style={{ width: `${accEm}em` }} /><col /><col style={{ width: '8em' }} /><col style={{ width: '6.5em' }} /><col style={{ width: '8em' }} />
                </colgroup>
                <thead>
                  <tr className="text-left text-xs text-ink-400">
                    <th className="px-5 py-2 font-medium">거래처</th><th className="px-3 py-2 font-medium">계약명</th>
                    <th className="px-3 py-2 font-medium">담당자</th><th className="px-3 py-2 font-medium">계약일</th>
                    <th className="px-5 py-2 font-medium text-right">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {m.list.map((c) => (
                    <tr key={c.id} className="hover:bg-canvas cursor-pointer"
                      onClick={() => setDrill({
                        title: c.title || '계약',
                        subtitle: c._merged > 1 ? `${c._merged}건 합산 · 원본 계약` : '원본 계약',
                        kind: 'con',
                        rows: c.opportunity_external_id
                          ? valid.filter((x) => x.opportunity_external_id === c.opportunity_external_id)
                          : valid.filter((x) => x.id === c.id),
                      })}>
                      <td className="px-5 py-2.5 font-medium text-ink-800 truncate" title={c.account_name}>{c.account_name || '-'}</td>
                      <td className="px-3 py-2.5 text-ink-600 truncate" title={c.title}>{c.title}{c._merged > 1 ? <span className="ml-1 rounded bg-canvas px-1 text-[10px] text-ink-400">{c._merged}건 합산</span> : ''}</td>
                      <td className="px-3 py-2.5 text-ink-500 truncate">{c.rep_name || '-'}{c.group_name ? <span className="text-ink-400 text-xs"> · {c.group_name}</span> : ''}</td>
                      <td className="px-3 py-2.5 text-ink-400 tnum">{(c.contract_date || '').replaceAll('-', '.')}</td>
                      <td className="px-5 py-2.5 text-right font-bold text-ink-900 tnum">{won(c.supply_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}

      <DrillModal open={!!drill} onClose={() => setDrill(null)} title={drill?.title} subtitle={drill?.subtitle} kind={drill?.kind} rows={drill?.rows || []} />
    </div>
  )
}
