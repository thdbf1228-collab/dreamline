import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { byMonth, bySalesType } from '../data/aggregate'
import { Card, Segment } from '../components/ui'
import { won, pct } from '../lib/format'
import { Loading, ErrorBox } from './Overview'

const SALES = [
  { value: 'all', label: '전체' },
  { value: '기업', label: '기업' },
  { value: '글로벌', label: '글로벌' },
]

export default function Monthly() {
  const { rows, error, loading } = useOpportunities()
  const [sales, setSales] = useState('all')
  const frows = useMemo(() => (rows ? bySalesType(rows, sales) : []), [rows, sales])
  const months = useMemo(() => byMonth(frows), [frows])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const maxAmt = Math.max(1, ...months.map((m) => m.amount))
  const fmtMonth = (m) => `${m.slice(0, 4)}.${m.slice(5, 7)}`

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">월별 현황</h1>
          <p className="text-sm text-ink-500">시작월 기준</p>
        </div>
        <Segment value={sales} onChange={setSales} options={SALES} />
      </header>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-4">월별 금액</h2>
        {months.length === 0 ? (
          <p className="text-sm text-ink-400">데이터가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {months.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm font-medium text-ink-700 tnum">{fmtMonth(m.month)}</span>
                <div className="flex-1 h-7 rounded bg-canvas overflow-hidden">
                  <div className="h-full rounded bg-brand" style={{ width: `${(m.amount / maxAmt) * 100}%`, minWidth: m.amount ? 8 : 0 }} />
                </div>
                <span className="w-14 shrink-0 text-right text-xs text-ink-400 tnum">{m.total}건</span>
                <span className="w-20 shrink-0 text-right text-sm text-ink-700 tnum">{won(m.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-400 border-b border-line">
              <th className="px-4 py-2.5 font-medium">월</th>
              <th className="px-4 py-2.5 font-medium text-right">건수</th>
              <th className="px-4 py-2.5 font-medium text-right">전체 금액</th>
              <th className="px-4 py-2.5 font-medium text-right">진행</th>
              <th className="px-4 py-2.5 font-medium text-right">확정매출</th>
              <th className="px-4 py-2.5 font-medium text-right">전환율</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {months.map((m) => (
              <tr key={m.month} className="hover:bg-canvas">
                <td className="px-4 py-2.5 font-medium text-ink-900 tnum">{fmtMonth(m.month)}</td>
                <td className="px-4 py-2.5 text-right text-ink-700 tnum">{m.total}</td>
                <td className="px-4 py-2.5 text-right text-ink-700 tnum">{won(m.amount)}</td>
                <td className="px-4 py-2.5 text-right text-ink-500 tnum">{won(m.pipelineAmount)}</td>
                <td className="px-4 py-2.5 text-right text-ink-500 tnum">{won(m.confirmedAmount)}</td>
                <td className="px-4 py-2.5 text-right text-ink-500 tnum">{pct(m.winRate, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
