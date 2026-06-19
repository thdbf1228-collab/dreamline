import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useOpportunities } from '../data/useOpportunities'
import { won } from '../lib/format'
import { Card } from '../components/ui'
import { Loading, ErrorBox } from './Overview'

const FONT = { fontFamily: "'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',sans-serif" }
const ym = (s) => (s || '').slice(0, 7)
const label = (k) => `${k.slice(0, 4)}년 ${Number(k.slice(5, 7))}월`
const N = ({ children }) => <b className="text-brand">{children}</b>
const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0)

export default function Monthly() {
  const { rows, error, loading } = useOpportunities()
  const [contracts, setContracts] = useState(null)
  const [groupNames, setGroupNames] = useState([])
  const [sel, setSel] = useState('')

  useEffect(() => {
    supabase.from('v_contracts').select('contract_date, supply_amount, rep_name, group_name, account_name')
      .then(({ data }) => setContracts(data || []))
    supabase.from('groups').select('name').order('sort_order')
      .then(({ data }) => setGroupNames((data || []).map((g) => g.name)))
  }, [])

  const keys = useMemo(() => {
    const a = (rows || []).map((r) => ym(r.registered_at)).filter(Boolean)
    const b = (contracts || []).map((c) => ym(c.contract_date)).filter(Boolean)
    return [...new Set([...a, ...b])].sort()
  }, [rows, contracts])
  useEffect(() => { if (keys.length && !sel) setSel(keys[keys.length - 1]) }, [keys])

  if (loading || contracts === null) return <Loading />
  if (error) return <ErrorBox msg={error} />
  if (!keys.length) return <p className="py-16 text-center text-sm text-ink-400">데이터가 없습니다.</p>

  const idx = keys.indexOf(sel)
  const prevKey = idx > 0 ? keys[idx - 1] : null

  const newOf = (k) => (rows || []).filter((r) => ym(r.registered_at) === k)
  const conOf = (k) => (contracts || []).filter((c) => ym(c.contract_date) === k)
  const newRows = newOf(sel), conRows = conOf(sel)
  const pNew = prevKey ? newOf(prevKey) : null, pCon = prevKey ? conOf(prevKey) : null

  const conAmt = sum(conRows, (c) => c.supply_amount)
  const dNew = pNew ? newRows.length - pNew.length : null
  const dCon = pCon ? conRows.length - pCon.length : null
  const dAmt = pCon ? conAmt - sum(pCon, (c) => c.supply_amount) : null

  // 그룹: 항상 1·2·3 전부 표기 (+ 미배정 행이 있으면 추가)
  const allGroups = [...groupNames]
  if ([...newRows, ...conRows].some((x) => !x.group_name) && !allGroups.includes('미배정')) allGroups.push('미배정')
  const gname = (x) => x.group_name || '미배정'
  const groupStat = allGroups.map((g) => ({
    name: g,
    nw: newRows.filter((r) => gname(r) === g).length,
    cn: conRows.filter((c) => gname(c) === g).length,
    amt: sum(conRows.filter((c) => gname(c) === g), (c) => c.supply_amount),
  }))

  // 담당자: 계약 기준
  const repMap = new Map()
  for (const c of conRows) {
    const k = c.rep_name || '미상'
    const e = repMap.get(k) || { name: k, cn: 0, amt: 0 }
    e.cn++; e.amt += Number(c.supply_amount) || 0; repMap.set(k, e)
  }
  const repRank = [...repMap.values()].sort((a, b) => b.cn - a.cn || b.amt - a.amt)
  const topRep = repRank[0]

  // 거래처: 계약 기준
  const accMap = new Map()
  for (const c of conRows) {
    const k = c.account_name || '미상'
    accMap.set(k, (accMap.get(k) || 0) + (Number(c.supply_amount) || 0))
  }
  const topAcc = [...accMap.entries()].map(([name, amt]) => ({ name, amt })).sort((a, b) => b.amt - a.amt).slice(0, 6)

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
        <div className="mt-1 text-sm text-ink-600">계약 <N>{conRows.length}건</N> · 신규 <N>{newRows.length}건</N>{prevKey ? <> · 전월({label(prevKey)}) 대비</> : ' · (전월 데이터 없음)'}</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatDelta label="계약 건수" value={`${conRows.length}건`} delta={dCon} unit="건" />
        <StatDelta label="계약 금액" value={won(conAmt)} delta={dAmt} money />
        <StatDelta label="신규 영업기회" value={`${newRows.length}건`} delta={dNew} unit="건" />
      </div>

      <Card className="p-6">
        <div className="text-[15px] text-ink-800 leading-loose space-y-2.5">
          <p>· {label(sel)} 계약 <N>{conRows.length}건</N>, 계약 금액 <N>{won(conAmt)}</N>{pCon && (dCon >= 0 ? <> (전월보다 <span className="text-won font-bold">{Math.abs(dCon)}건 증가</span>)</> : <> (전월보다 <span className="text-lost font-bold">{Math.abs(dCon)}건 감소</span>)</>)}</p>
          <p>· 신규 영업기회 <N>{newRows.length}건</N> 등록{pNew && (dNew >= 0 ? <> (전월보다 <span className="text-won font-bold">{Math.abs(dNew)}건 증가</span>)</> : <> (전월보다 <span className="text-lost font-bold">{Math.abs(dNew)}건 감소</span>)</>)}</p>
          {topRep
            ? <p>· 이 달 계약 최다 담당자: <b>{topRep.name}</b> (<N>{topRep.cn}건</N>, {won(topRep.amt)})</p>
            : <p>· 이 달 체결된 계약이 없습니다.</p>}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-base font-bold text-ink-900 mb-3 pb-2 border-b border-ink-300">그룹 동향</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-ink-500 text-left"><th className="pb-1 font-medium">그룹</th><th className="pb-1 font-medium text-right">신규</th><th className="pb-1 font-medium text-right">계약</th><th className="pb-1 font-medium text-right">계약금액</th></tr></thead>
            <tbody>
              {groupStat.map((g) => (
                <tr key={g.name} className="border-t border-line">
                  <td className="py-2 font-medium text-ink-800">{g.name}</td>
                  <td className="py-2 text-right tnum text-ink-600">{g.nw || '-'}</td>
                  <td className="py-2 text-right tnum text-brand font-bold">{g.cn || '-'}</td>
                  <td className="py-2 text-right tnum text-ink-700">{g.amt ? won(g.amt) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-bold text-ink-900 mb-3 pb-2 border-b border-ink-300">이 달의 담당자 (계약)</h3>
          {!topRep ? <p className="text-sm text-ink-500">이 달 체결된 계약이 없습니다.</p> : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ink-900">{topRep.name}</span>
                <span className="text-xs text-ink-500">계약 최다</span>
              </div>
              <p className="mt-1 text-sm text-ink-700">계약 <N>{topRep.cn}건</N> · {won(topRep.amt)}</p>
              <div className="mt-4 space-y-2">
                {repRank.slice(0, 5).map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-center text-xs font-bold text-ink-400">{i + 1}</span>
                    <span className="w-16 text-ink-800">{r.name}</span>
                    <div className="flex-1 h-4 rounded-full bg-canvas overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(r.cn / repRank[0].cn) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right tnum text-brand font-bold">{r.cn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-base font-bold text-ink-900 mb-3 pb-2 border-b border-ink-300">이 달 주요 계약 거래처</h3>
        {topAcc.length === 0 ? <p className="text-sm text-ink-500">이 달 체결된 계약이 없습니다.</p> : (
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {topAcc.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-bold text-ink-400 tnum">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-medium text-ink-800" title={a.name}>{a.name}</span>
                <span className="text-sm font-bold text-brand tnum">{won(a.amt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function StatDelta({ label, value, delta, unit, money }) {
  const up = delta != null && delta > 0, down = delta != null && delta < 0
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
