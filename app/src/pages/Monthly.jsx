import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { byMonth, bySalesType, kpis } from '../data/aggregate'
import { Card, Segment } from '../components/ui'
import { won, num, pct } from '../lib/format'
import { Loading, ErrorBox } from './Overview'

const SALES = [
  { value: 'all', label: '전체' },
  { value: '기업', label: '기업' },
  { value: '글로벌', label: '글로벌' },
]
const fmtShort = (v) => (v >= 1e8 ? (v / 1e8).toFixed(1) + '억' : Math.round(v / 1e4) + '만')
const fmtMonth = (m) => `${m.slice(2, 4)}.${m.slice(5, 7)}`

export default function Monthly() {
  const { rows, error, loading } = useOpportunities()
  const [sales, setSales] = useState('all')
  const frows = useMemo(() => (rows ? bySalesType(rows, sales) : []), [rows, sales])
  const months = useMemo(() => byMonth(frows), [frows])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const k = kpis(frows)
  const amounts = months.map((m) => m.amount)
  const cum = amounts.reduce((a, v) => [...a, (a[a.length - 1] || 0) + v], [])
  const avg = months.length ? amounts.reduce((a, b) => a + b, 0) / months.length : 0

  // 주요 성공 거래처 (확정매출 기준 상위)
  const accMap = new Map()
  for (const r of frows) {
    if (r.status !== '종료(성공)') continue
    const key = r.account_name || '미상'
    accMap.set(key, (accMap.get(key) || 0) + (Number(r.display_amount) || 0))
  }
  const topAcc = [...accMap.entries()].map(([name, amt]) => ({ name, amt })).sort((a, b) => b.amt - a.amt).slice(0, 8)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">월별 리포트</h1>
          <p className="text-sm text-ink-500">시작월 기준 추이</p>
        </div>
        <Segment value={sales} onChange={setSales} options={SALES} />
      </header>

      {/* 상단 스탯 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={<IconTrend />} value={won(k.confirmedAmount)} label="누적 확정매출" sub={`성공 ${k.wonCount}건`} />
        <Stat icon={<IconBar />} value={won(avg)} label="월 평균 금액" sub={`${months.length}개월`} />
        <Stat icon={<IconTarget />} value={pct(k.winRate, 0)} label="전환율" sub={`성공 ${k.wonCount} / 실패 ${k.lostCount}`} />
      </div>

      {/* 월별 금액 (막대) */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-ink-900 mb-1">월별 금액</h2>
        <p className="text-xs text-ink-400 mb-5">매월 신규 거래 금액</p>
        {months.length === 0 ? <Empty /> : <BarChart months={months} vals={amounts} />}
      </Card>

      {/* 누적 추이 (라인+영역) */}
      <Card className="p-6">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-ink-900">누적 추이</h2>
            <p className="text-xs text-ink-400">월이 지날수록 쌓이는 누적 금액</p>
          </div>
          <span className="text-sm text-ink-500">누적 <b className="text-brand tnum">{won(cum[cum.length - 1] || 0)}</b></span>
        </div>
        {months.length === 0 ? <Empty /> : <AreaChart months={months} cum={cum} />}
      </Card>

      {/* 주요 성공 거래처 (지도 대체) */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-ink-900 mb-1">주요 성공 거래처</h2>
        <p className="text-xs text-ink-400 mb-5">확정매출 상위 거래처</p>
        {topAcc.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">성공(확정) 거래가 아직 없습니다.</p>
        ) : (
          <div className="space-y-2.5">
            {topAcc.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-ink-300 tnum">{i + 1}</span>
                <span className="w-28 shrink-0 truncate text-sm font-medium text-ink-700" title={a.name}>{a.name}</span>
                <div className="flex-1 h-6 rounded-full bg-canvas overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(a.amt / topAcc[0].amt) * 100}%`, background: 'linear-gradient(90deg,#6366F1,#1D4ED8)' }} />
                </div>
                <span className="w-20 shrink-0 text-right text-sm font-semibold text-ink-900 tnum">{won(a.amt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Stat({ icon, value, label, sub }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-brand flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-ink-900 tnum leading-tight">{value}</div>
        <div className="text-sm text-ink-700">{label}</div>
        <div className="text-[11px] text-ink-400">{sub}</div>
      </div>
    </Card>
  )
}

function BarChart({ months, vals }) {
  const W = 820, H = 300, padL = 16, padR = 16, padT = 28, padB = 36
  const plotW = W - padL - padR, plotH = H - padT - padB
  const n = months.length, slot = plotW / n
  const max = Math.max(1, ...vals)
  const barW = Math.min(slot * 0.6, 40)
  const x = (i) => padL + slot * (i + 0.5)
  const yTop = (v) => padT + plotH * (1 - v / max)
  const every = n > 14 ? 2 : 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <defs>
        <linearGradient id="barg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366F1" /><stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + plotH * f} y2={padT + plotH * f} stroke="#EEF0F3" />
      ))}
      {months.map((m, i) => {
        const h = plotH * (vals[i] / max)
        return (
          <g key={m.month}>
            <rect x={x(i) - barW / 2} y={yTop(vals[i])} width={barW} height={Math.max(0, h)} rx="5" fill="url(#barg)" />
            {vals[i] > 0 && <text x={x(i)} y={yTop(vals[i]) - 6} textAnchor="middle" fontSize="9.5" fill="#64748B">{fmtShort(vals[i])}</text>}
            {i % every === 0 && <text x={x(i)} y={H - padB + 18} textAnchor="middle" fontSize="10" fill="#94A3B8">{fmtMonth(m.month)}</text>}
          </g>
        )
      })}
    </svg>
  )
}

function AreaChart({ months, cum }) {
  const W = 820, H = 300, padL = 16, padR = 16, padT = 24, padB = 36
  const plotW = W - padL - padR, plotH = H - padT - padB
  const n = months.length, slot = plotW / n
  const max = Math.max(1, ...cum)
  const x = (i) => padL + slot * (i + 0.5)
  const y = (v) => padT + plotH * (1 - v / max)
  const line = cum.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const area = `${padL + slot * 0.5},${padT + plotH} ${line} ${padL + slot * (n - 0.5)},${padT + plotH}`
  const every = n > 14 ? 2 : 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <defs>
        <linearGradient id="areag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.25" /><stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + plotH * f} y2={padT + plotH * f} stroke="#EEF0F3" />
      ))}
      <polygon points={area} fill="url(#areag)" />
      <polyline points={line} fill="none" stroke="#1D4ED8" strokeWidth="2.5" strokeLinejoin="round" />
      {cum.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="3.5" fill="#fff" stroke="#1D4ED8" strokeWidth="2" />
          {i % every === 0 && <text x={x(i)} y={H - padB + 18} textAnchor="middle" fontSize="10" fill="#94A3B8">{fmtMonth(months[i].month)}</text>}
        </g>
      ))}
    </svg>
  )
}

const Empty = () => <p className="py-10 text-center text-sm text-ink-400">데이터가 없습니다.</p>
const IconTrend = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></svg>)
const IconBar = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="6" y1="20" x2="6" y2="13" /><line x1="12" y1="20" x2="12" y2="8" /><line x1="18" y1="20" x2="18" y2="4" /></svg>)
const IconTarget = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>)
