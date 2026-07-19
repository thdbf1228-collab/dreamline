import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useOpportunities } from '../data/useOpportunities'
import { won } from '../lib/format'
import { Card } from '../components/ui'
import { Loading, ErrorBox } from './Overview'

const FONT = { fontFamily: "'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',sans-serif" }
const mk = (d) => (d || '').slice(0, 7)
const label = (k) => `${k.slice(0, 4)}년 ${Number(k.slice(5, 7))}월`
const isWon = (r) => r.status === '종료(성공)'
const sum = (rs) => rs.reduce((a, r) => a + (Number(r.display_amount) || 0), 0)
const N = ({ children }) => <b className="text-brand">{children}</b>

function rankBy(rows, key) {
  const m = new Map()
  for (const r of rows) {
    const k = r[key] || (key === 'group_name' ? '미배정' : '미상')
    const e = m.get(k) || { name: k, count: 0, amount: 0 }
    e.count++; e.amount += Number(r.display_amount) || 0; m.set(k, e)
  }
  return [...m.values()].sort((a, b) => b.count - a.count || b.amount - a.amount)
}

export default function Monthly() {
  const { rows, error, loading } = useOpportunities()
  const [groupList, setGroupList] = useState([])
  useEffect(() => { supabase.from('groups').select('name').order('sort_order').then(({ data }) => setGroupList((data || []).map((g) => g.name))) }, [])

  // 신규=시작월 / 계약=종료(성공)을 성사월(변경일) 기준
  const keys = useMemo(() => {
    if (!rows) return []
    const s = rows.map((r) => mk(r.start_date))
    const w = rows.filter(isWon).map((r) => mk(r.changed_at))
    return [...new Set([...s, ...w].filter(Boolean))].sort()
  }, [rows])
  const [sel, setSel] = useState('')
  useEffect(() => { if (keys.length && !sel) setSel(keys[keys.length - 1]) }, [keys])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />
  if (!keys.length) return <p className="py-16 text-center text-sm text-ink-400">데이터가 없습니다.</p>

  const newOf = (k) => (rows || []).filter((r) => mk(r.start_date) === k)
  const conOf = (k) => (rows || []).filter((r) => isWon(r) && mk(r.changed_at) === k)

  const idx = keys.indexOf(sel)
  const prevKey = idx > 0 ? keys[idx - 1] : null
  const curNew = newOf(sel), curCon = conOf(sel)
  const prevNew = prevKey ? newOf(prevKey) : null
  const prevCon = prevKey ? conOf(prevKey) : null

  const gname = (r) => r.group_name || '미배정'
  const hasUnassigned = (rows || []).some((r) => !r.group_name)
  const allGroups = [...groupList, ...(hasUnassigned ? ['미배정'] : [])]

  const repsCon = rankBy(curCon, 'rep_name')
  const topRep = repsCon[0]
  const accCon = rankBy(curCon, 'account_name').slice(0, 6)

  const dNew = prevNew ? curNew.length - prevNew.length : null
  const dCon = prevCon ? curCon.length - prevCon.length : null
  const dAmt = prevCon ? sum(curCon) - sum(prevCon) : null

  return (
    <div className="space-y-5" style={FONT}>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {keys.map((k) => (
          <button key={k} onClick={() => setSel(k)}
            className={['shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors', k === sel ? 'bg-brand text-white font-bold' : 'bg-paper border border-line text-ink-700 hover:text-ink-900'].join(' ')}>
            {label(k)}
          </button>
        ))}
      </div>

      <div className="text-center border-b-2 border-ink-900 pb-3">
        <h1 className="text-2xl font-bold text-ink-900">{label(sel)} 영업 월간 리포트</h1>
        <div className="mt-1 text-sm text-ink-600">계약 <N>{curCon.length}건</N> · 신규 <N>{curNew.length}건</N>{prevKey ? <> · 전월({label(prevKey)}) 대비</> : ' · (전월 데이터 없음)'}</div>
      </div>

      {/* 스탯 — 계약 중심 */}
      <div className="grid grid-cols-3 gap-4">
        <StatDelta label="계약 건수" value={`${curCon.length}건`} delta={dCon} unit="건" />
        <StatDelta label="계약 금액" value={won(sum(curCon))} delta={dAmt} money />
        <StatDelta label="신규(영업기회)" value={`${curNew.length}건`} delta={dNew} unit="건" />
      </div>

      {/* 요약 */}
      <Card className="p-6">
        <div className="text-[15px] text-ink-800 leading-loose space-y-2.5">
          <p>· {label(sel)} <b>계약</b> <N>{curCon.length}건</N>, 금액 <N>{won(sum(curCon))}</N>{prevCon && (dCon >= 0 ? <> (전월보다 <span className="text-won font-bold">{Math.abs(dCon)}건 증가</span>)</> : <> (전월보다 <span className="text-lost font-bold">{Math.abs(dCon)}건 감소</span>)</>)}</p>
          <p>· 신규 영업기회 <N>{curNew.length}건</N>{prevNew && (dNew >= 0 ? <> (전월 <span className="text-won font-bold">+{Math.abs(dNew)}</span>)</> : <> (전월 <span className="text-lost font-bold">-{Math.abs(dNew)}</span>)</>)} — 컨택 시작 기준</p>
          {topRep ? <p>· 이 달 계약 최다 담당자: <b>{topRep.name}</b> (<N>{topRep.count}건</N>, {won(topRep.amount)})</p>
            : <p>· 이 달 성사된 계약이 아직 없습니다.</p>}
        </div>
      </Card>

      {/* 그룹 동향 — 모든 그룹 항상 표기 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-base font-bold text-ink-900 mb-3 pb-2 border-b border-ink-300">그룹 동향</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[320px]">
            <thead><tr className="text-xs text-ink-500 text-left"><th className="pb-1 font-medium">그룹</th><th className="pb-1 font-medium text-right">계약</th><th className="pb-1 font-medium text-right">계약금액</th><th className="pb-1 font-medium text-right">신규</th><th className="pb-1 font-medium text-right">계약 전월비</th></tr></thead>
            <tbody>
              {allGroups.map((g) => {
                const c = curCon.filter((r) => gname(r) === g)
                const nw = curNew.filter((r) => gname(r) === g)
                const pc = prevCon ? prevCon.filter((r) => gname(r) === g).length : null
                const d = pc == null ? null : c.length - pc
                return (
                  <tr key={g} className="border-t border-line">
                    <td className="py-2 font-medium text-ink-800">{g}</td>
                    <td className="py-2 text-right tnum text-brand font-bold">{c.length || '-'}</td>
                    <td className="py-2 text-right tnum text-ink-600">{c.length ? won(sum(c)) : '-'}</td>
                    <td className="py-2 text-right tnum text-ink-500">{nw.length || '-'}</td>
                    <td className={`py-2 text-right tnum font-bold ${d == null ? 'text-ink-300' : d > 0 ? 'text-won' : d < 0 ? 'text-lost' : 'text-ink-400'}`}>{d == null ? '–' : d > 0 ? `▲${d}` : d < 0 ? `▼${Math.abs(d)}` : '0'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-bold text-ink-900 mb-3 pb-2 border-b border-ink-300">이 달의 담당자 (계약 기준)</h3>
          {!topRep ? <p className="text-sm text-ink-400">이 달 성사된 계약이 없습니다.</p> : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ink-900">{topRep.name}</span>
                <span className="text-xs text-ink-500">계약 최다</span>
              </div>
              <p className="mt-1 text-sm text-ink-700">계약 <N>{topRep.count}건</N> · {won(topRep.amount)}</p>
              <div className="mt-4 space-y-2">
                {repsCon.slice(0, 5).map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-center text-xs font-bold text-ink-400">{i + 1}</span>
                    <span className="w-16 text-ink-800">{r.name}</span>
                    <div className="flex-1 h-4 rounded-full bg-canvas overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(r.count / repsCon[0].count) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right tnum text-brand font-bold">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 이 달 계약 거래처 */}
      <Card className="p-5">
        <h3 className="text-base font-bold text-ink-900 mb-3 pb-2 border-b border-ink-300">이 달 계약 거래처</h3>
        {accCon.length === 0 ? <p className="text-sm text-ink-400">이 달 성사된 계약이 없습니다.</p> : (
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {accCon.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-bold text-ink-400 tnum">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-medium text-ink-800" title={a.name}>{a.name}</span>
                <span className="text-sm font-bold text-brand tnum">{won(a.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function StatDelta({ label, value, delta, unit, money }) {
  const up = delta != null && delta > 0
  const down = delta != null && delta < 0
  const fmtD = money ? won(Math.abs(delta || 0)) : `${Math.abs(delta || 0)}${unit || ''}`
  return (
    <Card className="p-4">
      <div className="text-sm text-ink-600">{label}</div>
      <div className="mt-1 text-3xl font-bold text-brand tnum">{value}</div>
      <div className={`mt-1 text-sm tnum font-medium ${delta == null ? 'text-ink-300' : up ? 'text-won' : down ? 'text-lost' : 'text-ink-400'}`}>
        {delta == null ? '전월 데이터 없음' : `${up ? '▲' : down ? '▼' : ''} 전월 대비 ${fmtD}`}
      </div>
    </Card>
  )
}
