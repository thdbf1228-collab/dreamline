import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { byGroup, funnel, bySalesType } from '../data/aggregate'
import { Card, Funnel, Segment } from '../components/ui'
import { won, num, pct } from '../lib/format'
import { Loading, ErrorBox } from './Overview'

const SALES = [
  { value: 'all', label: '전체' },
  { value: '기업', label: '기업' },
  { value: '글로벌', label: '글로벌' },
]

export default function Groups() {
  const { rows, error, loading } = useOpportunities()
  const [sales, setSales] = useState('all')
  const frows = useMemo(() => (rows ? bySalesType(rows, sales) : []), [rows, sales])
  const groups = useMemo(() => byGroup(frows), [frows])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const maxPipe = Math.max(1, ...groups.map((g) => g.pipelineAmount))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">그룹별 비교</h1>
          <p className="text-sm text-ink-500">{groups.length}개 그룹</p>
        </div>
        <Segment value={sales} onChange={setSales} options={SALES} />
      </header>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-4">진행 파이프라인 금액</h2>
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.name} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm font-medium text-ink-700">{g.name}</span>
              <div className="flex-1 h-7 rounded bg-canvas overflow-hidden">
                <div className="h-full rounded bg-brand" style={{ width: `${(g.pipelineAmount / maxPipe) * 100}%`, minWidth: g.pipelineAmount ? 8 : 0 }} />
              </div>
              <span className="w-20 shrink-0 text-right text-sm text-ink-700 tnum">{won(g.pipelineAmount)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <Card key={g.name} className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-base font-bold text-ink-900">{g.name}</h3>
              <span className="text-xs text-ink-400">{g.total}건</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Mini label="파이프라인" value={won(g.pipelineAmount)} />
              <Mini label="확정매출" value={won(g.confirmedAmount)} />
              <Mini label="전환율" value={pct(g.winRate, 1)} />
              <Mini label="정체" value={`${g.staleCount}건`} />
            </div>
            <Funnel data={funnel(g.rows)} showAmount={false} />
          </Card>
        ))}
      </div>
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg bg-canvas px-3 py-2">
      <div className="text-[11px] text-ink-400">{label}</div>
      <div className="text-sm font-semibold text-ink-900 tnum">{value}</div>
    </div>
  )
}
