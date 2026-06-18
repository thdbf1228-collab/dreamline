import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { byMonth, bySalesType } from '../data/aggregate'
import { Card, Segment } from '../components/ui'
import { won, num } from '../lib/format'
import { Loading, ErrorBox } from './Overview'

const SALES = [
  { value: 'all', label: '전체' },
  { value: '기업', label: '기업' },
  { value: '글로벌', label: '글로벌' },
]
const METRIC = [
  { value: 'amount', label: '금액' },
  { value: 'count', label: '건수' },
]

export default function Monthly() {
  const { rows, error, loading } = useOpportunities()
  const [sales, setSales] = useState('all')
  const [metric, setMetric] = useState('amount')
  const frows = useMemo(() => (rows ? bySalesType(rows, sales) : []), [rows, sales])
  const months = useMemo(() => byMonth(frows), [frows])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const vals = months.map((m) => (metric === 'amount' ? m.amount : m.total))
  const cum = vals.reduce((acc, v) => [...acc, (acc[acc.length - 1] || 0) + v], [])
  const total = cum[cum.length - 1] || 0
  const fmt = (v) => (metric === 'amount' ? won(v) : `${num(v)}건`)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">월별 추이</h1>
          <p className="text-sm text-ink-500">시작월 기준 · 막대=월별 / 라인=누적</p>
        </div>
        <div className="flex items-center gap-2">
          <Segment value={metric} onChange={setMetric} options={METRIC} />
          <Segment value={sales} onChange={setSales} options={SALES} />
        </div>
      </header>

      <Card className="p-5">
        <div className="flex items-center gap-4 mb-4 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-brand" />월별 {metric === 'amount' ? '금액' : '건수'}</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-emerald-500" />누적</span>
          <span className="ml-auto text-ink-700">누적 합계 <b className="text-ink-900 tnum">{fmt(total)}</b></span>
        </div>
        {months.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-400">데이터가 없습니다.</p>
        ) : (
          <Chart months={months} vals={vals} cum={cum} fmt={fmt} />
        )}
      </Card>
    </div>
  )
}

function Chart({ months, vals, cum, fmt }) {
  const W = 860, H = 380
  const padL = 16, padR = 16, padT = 28, padB = 44
  const plotW = W - padL - padR, plotH = H - padT - padB
  const n = months.length
  const slot = plotW / n
  const maxBar = Math.max(1, ...vals)
  const maxCum = Math.max(1, ...cum)
  const barW = Math.min(slot * 0.55, 46)
  const yBar = (v) => padT + plotH * (1 - v / maxBar)
  const xMid = (i) => padL + slot * (i + 0.5)
  const yCum = (v) => padT + plotH * (1 - v / maxCum)
  const linePts = cum.map((v, i) => `${xMid(i)},${yCum(v)}`).join(' ')
  const fmtMonth = (m) => `${m.slice(2, 4)}.${m.slice(5, 7)}`
  const showEvery = n > 14 ? 2 : 1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="월별 추이">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + plotH * f} y2={padT + plotH * f} stroke="#EEF0F3" strokeWidth="1" />
      ))}
      {months.map((m, i) => {
        const h = plotH * (vals[i] / maxBar)
        return (
          <g key={m.month}>
            <rect x={xMid(i) - barW / 2} y={yBar(vals[i])} width={barW} height={Math.max(0, h)} rx="3" fill="#1D4ED8" opacity="0.85" />
            {vals[i] > 0 && (
              <text x={xMid(i)} y={yBar(vals[i]) - 5} textAnchor="middle" fontSize="9" fill="#64748B" className="tnum">
                {vals[i] >= 100000000 ? (vals[i] / 100000000).toFixed(1) + '억' : Math.round(vals[i] / 10000) + '만'}
              </text>
            )}
            {i % showEvery === 0 && (
              <text x={xMid(i)} y={H - padB + 16} textAnchor="middle" fontSize="10" fill="#94A3B8" className="tnum">{fmtMonth(m.month)}</text>
            )}
          </g>
        )
      })}
      <polyline points={linePts} fill="none" stroke="#10B981" strokeWidth="2.5" />
      {cum.map((v, i) => (<circle key={i} cx={xMid(i)} cy={yCum(v)} r="3" fill="#10B981" />))}
    </svg>
  )
}
