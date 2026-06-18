import { useMemo, useState, useEffect } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { won } from '../lib/format'
import { Card } from '../components/ui'
import { Loading, ErrorBox } from './Overview'

const monthKey = (r) => (r.start_date || '').slice(0, 7)
const label = (k) => `${k.slice(0, 4)}년 ${Number(k.slice(5, 7))}월`

function metrics(rows) {
  const won_ = rows.filter((r) => r.status === '종료(성공)').length
  const lost = rows.filter((r) => r.status === '종료(실패)').length
  return {
    rows,
    count: rows.length,
    amount: rows.reduce((a, r) => a + (Number(r.display_amount) || 0), 0),
    won: won_,
    lost,
    winRate: won_ + lost ? (won_ / (won_ + lost)) * 100 : 0,
  }
}
function agg(rows, key) {
  const m = new Map()
  for (const r of rows) {
    const k = r[key] || (key === 'group_name' ? '미배정' : '미상')
    const e = m.get(k) || { name: k, count: 0, amount: 0 }
    e.count++; e.amount += Number(r.display_amount) || 0
    m.set(k, e)
  }
  return [...m.values()].sort((a, b) => b.count - a.count || b.amount - a.amount)
}

export default function Monthly() {
  const { rows, error, loading } = useOpportunities()
  const keys = useMemo(() => {
    if (!rows) return []
    return [...new Set(rows.map(monthKey).filter(Boolean))].sort()
  }, [rows])
  const [sel, setSel] = useState('')
  useEffect(() => { if (keys.length && !sel) setSel(keys[keys.length - 1]) }, [keys])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />
  if (!keys.length) return <p className="py-16 text-center text-sm text-ink-400">데이터가 없습니다.</p>

  const idx = keys.indexOf(sel)
  const cur = metrics((rows || []).filter((r) => monthKey(r) === sel))
  const prevKey = idx > 0 ? keys[idx - 1] : null
  const prev = prevKey ? metrics((rows || []).filter((r) => monthKey(r) === prevKey)) : null

  const groups = agg(cur.rows, 'group_name')
  const topGroup = groups[0]
  const topGroupReps = topGroup ? agg(cur.rows.filter((r) => (r.group_name || '미배정') === topGroup.name), 'rep_name') : []
  const topRepOverall = agg(cur.rows, 'rep_name')[0]
  const wonAcc = agg(cur.rows.filter((r) => r.status === '종료(성공)'), 'account_name')
  const topAcc = (wonAcc.length ? wonAcc : agg(cur.rows, 'account_name')).slice(0, 6)

  const dCount = prev ? cur.count - prev.count : null
  const dWin = prev ? cur.winRate - prev.winRate : null
  const dAmt = prev ? cur.amount - prev.amount : null

  return (
    <div className="space-y-5">
      {/* 월 선택 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {keys.map((k) => (
          <button key={k} onClick={() => setSel(k)}
            className={['shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors', k === sel ? 'bg-brand text-white font-medium' : 'bg-paper border border-line text-ink-500 hover:text-ink-900'].join(' ')}>
            {label(k)}
          </button>
        ))}
      </div>

      {/* 신문 헤더 */}
      <div className="text-center border-y-2 border-ink-900 py-3">
        <div className="text-[10px] tracking-[0.3em] text-ink-400">DREAMLINE SALES MONTHLY</div>
        <h1 className="font-serif text-2xl font-bold text-ink-900">영업 월간 리포트</h1>
        <div className="text-xs text-ink-500">{label(sel)} · 신규 {cur.count}건{prevKey ? ` · 전월 ${label(prevKey)} 대비` : ' · (전월 데이터 없음)'}</div>
      </div>

      {/* 헤드라인 */}
      <h2 className="font-serif text-xl md:text-2xl font-bold text-center text-ink-900 leading-snug">
        {label(sel)}, 신규 거래 {cur.count}건
        {dCount != null && <> · 전월 대비 {dCount >= 0 ? '▲' : '▼'}{Math.abs(dCount)}건</>}
      </h2>

      {/* 리드 기사 (2단) */}
      <Card className="p-6">
        <div className="md:columns-2 md:gap-8 text-[13.5px] text-ink-700 leading-relaxed [&>p]:mb-3 [&>p]:break-inside-avoid">
          <p>
            <span className="font-serif font-bold text-ink-900">{label(sel)}</span>에는 신규 거래 <b>{cur.count}건</b>(금액 {won(cur.amount)})이 시작됐다.
            {prev && (dCount >= 0
              ? ` 전월 ${prev.count}건보다 ${Math.abs(dCount)}건 늘며 회복세를 보였다.`
              : ` 전월 ${prev.count}건 대비 ${Math.abs(dCount)}건 줄었다.`)}
          </p>
          <p>
            이 달 전환율은 <b>{cur.winRate.toFixed(0)}%</b>(성공 {cur.won} / 실패 {cur.lost})를 기록했다.
            {prev && dWin != null && (Math.abs(dWin) < 0.5
              ? ' 전월과 비슷한 수준이다.'
              : ` 전월 대비 ${dWin >= 0 ? '+' : ''}${dWin.toFixed(0)}%p ${dWin >= 0 ? '상승' : '하락'}했다.`)}
          </p>
          {topGroup && (
            <p>
              신규 거래가 가장 많았던 그룹은 <b>{topGroup.name}</b>으로, {topGroup.count}건·{won(topGroup.amount)}를 올렸다.
              {topGroupReps[0] && ` ${topGroup.name} 안에서는 ${topGroupReps[0].name}가 신규 ${topGroupReps[0].count}건으로 최다 유치자였다.`}
            </p>
          )}
          {topRepOverall && (
            <p>
              전체 신규건 최다 담당자는 <b>{topRepOverall.name}</b>({topRepOverall.count}건·{won(topRepOverall.amount)})였다.
            </p>
          )}
        </div>
      </Card>

      {/* 스탯 스트립 */}
      <div className="grid grid-cols-3 gap-4">
        <StatDelta label="신규 건수" value={`${cur.count}건`} delta={dCount} unit="건" />
        <StatDelta label="신규 금액" value={won(cur.amount)} delta={dAmt} money />
        <StatDelta label="전환율" value={`${cur.winRate.toFixed(0)}%`} delta={dWin} unit="%p" round />
      </div>

      {/* 그룹 동향 + 이 달의 담당자 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-serif text-base font-bold text-ink-900 mb-3 pb-2 border-b border-ink-900">그룹 동향</h3>
          {groups.length === 0 ? <p className="text-sm text-ink-400">데이터 없음</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-ink-400 text-left"><th className="pb-1 font-medium">그룹</th><th className="pb-1 font-medium text-right">신규건</th><th className="pb-1 font-medium text-right">금액</th><th className="pb-1 font-medium text-right">전월대비</th></tr></thead>
              <tbody>
                {groups.map((g) => {
                  const pg = prev ? agg(prev.rows, 'group_name').find((x) => x.name === g.name) : null
                  const d = pg ? g.count - pg.count : null
                  return (
                    <tr key={g.name} className="border-t border-line">
                      <td className="py-1.5 font-medium text-ink-800">{g.name}</td>
                      <td className="py-1.5 text-right tnum text-ink-700">{g.count}</td>
                      <td className="py-1.5 text-right tnum text-ink-500">{won(g.amount)}</td>
                      <td className={`py-1.5 text-right tnum ${d == null ? 'text-ink-300' : d > 0 ? 'text-won' : d < 0 ? 'text-lost' : 'text-ink-400'}`}>
                        {d == null ? '–' : d > 0 ? `▲${d}` : d < 0 ? `▼${Math.abs(d)}` : '0'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-base font-bold text-ink-900 mb-3 pb-2 border-b border-ink-900">이 달의 담당자</h3>
          {!topRepOverall ? <p className="text-sm text-ink-400">데이터 없음</p> : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ink-900">{topRepOverall.name}</span>
                <span className="text-xs text-ink-400">신규건 최다</span>
              </div>
              <p className="mt-1 text-sm text-ink-600">신규 {topRepOverall.count}건 · {won(topRepOverall.amount)}</p>
              <div className="mt-4 space-y-1.5">
                {agg(cur.rows, 'rep_name').slice(0, 5).map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-center text-xs font-bold text-ink-300">{i + 1}</span>
                    <span className="w-16 text-ink-700">{r.name}</span>
                    <div className="flex-1 h-3.5 rounded-full bg-canvas overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(r.count / agg(cur.rows, 'rep_name')[0].count) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right tnum text-ink-500">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 하단: 이 달 주요 성공 거래처 */}
      <Card className="p-5">
        <h3 className="font-serif text-base font-bold text-ink-900 mb-3 pb-2 border-b border-ink-900">이 달 주요 {wonAcc.length ? '성공 ' : ''}거래처</h3>
        {topAcc.length === 0 ? <p className="text-sm text-ink-400">데이터 없음</p> : (
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {topAcc.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-bold text-ink-300 tnum">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-medium text-ink-700" title={a.name}>{a.name}</span>
                <span className="text-sm font-semibold text-ink-900 tnum">{won(a.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function StatDelta({ label, value, delta, unit, money, round }) {
  const up = delta != null && delta > 0
  const down = delta != null && delta < 0
  const fmtD = money ? won(Math.abs(delta || 0)) : round ? `${Math.abs(delta || 0).toFixed(0)}${unit}` : `${Math.abs(delta || 0)}${unit || ''}`
  return (
    <Card className="p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink-900 tnum">{value}</div>
      <div className={`mt-0.5 text-xs tnum ${delta == null ? 'text-ink-300' : up ? 'text-won' : down ? 'text-lost' : 'text-ink-400'}`}>
        {delta == null ? '전월 데이터 없음' : `${up ? '▲' : down ? '▼' : ''} 전월 대비 ${fmtD}`}
      </div>
    </Card>
  )
}
