import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { kpis, funnel, bySalesType } from '../data/aggregate'
import { Card, KpiCard, Funnel, Segment } from '../components/ui'
import { won, num, pct } from '../lib/format'

const SALES = [
  { value: 'all', label: '전체' },
  { value: '기업', label: '기업' },
  { value: '글로벌', label: '글로벌' },
]
const STATUS_COLOR = { '진행중': '#1D4ED8', '종료(성공)': '#0E9F6E', '종료(실패)': '#E02424', '보류/연기': '#C27803' }

export default function Overview() {
  const { rows, error, loading } = useOpportunities()
  const [sales, setSales] = useState('all')
  const frows = useMemo(() => (rows ? bySalesType(rows, sales) : []), [rows, sales])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const k = kpis(frows)
  const f = funnel(frows)
  const stale = frows.filter((r) => r.is_stale).sort((a, b) => (b.changed_at || '').localeCompare(a.changed_at || ''))
  const totalAmount = frows.reduce((s, r) => s + (Number(r.display_amount) || 0), 0)
  const dist = ['진행중', '종료(성공)', '종료(실패)', '보류/연기'].map((s) => ({
    s,
    n: frows.filter((r) => r.status === s).length,
  }))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">전체 현황</h1>
          <p className="text-sm text-ink-500">영업기회 {num(k.total)}건</p>
        </div>
        <Segment value={sales} onChange={setSales} options={SALES} />
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="전체 건수" value={`${num(k.total)}건`} sub={won(totalAmount)} />
        <KpiCard label="진행 파이프라인" value={won(k.pipelineAmount)} sub={`${num(k.pipelineCount)}건 진행중`} />
        <KpiCard label="확정 매출" value={won(k.confirmedAmount)} sub={`${num(k.wonCount)}건 성공`} />
        <KpiCard label="전환율" value={pct(k.winRate, 1)} sub={`성공 ${k.wonCount} / 실패 ${k.lostCount}`} />
        <KpiCard label="정체 거래" value={`${num(k.staleCount)}건`} sub="진행중·60일+ 무변동" />
      </div>

      {/* 진행상태 분포 */}
      <Card className="p-4">
        <div className="text-xs text-ink-500 mb-2">진행상태 분포</div>
        <div className="flex h-4 w-full overflow-hidden rounded">
          {dist.map((d) => (
            <div
              key={d.s}
              title={`${d.s} ${d.n}건`}
              style={{ width: `${(d.n / Math.max(1, k.total)) * 100}%`, background: STATUS_COLOR[d.s] }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
          {dist.map((d) => (
            <span key={d.s} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: STATUS_COLOR[d.s] }} />
              {d.s} {d.n}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">단계별 파이프라인</h2>
          <Funnel data={f} />
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">정체 거래 (60일+ 무변동)</h2>
          {stale.length === 0 ? (
            <p className="text-sm text-ink-400">정체된 거래가 없습니다.</p>
          ) : (
            <div className="divide-y divide-line max-h-72 overflow-auto">
              {stale.slice(0, 30).map((r) => (
                <div key={r.id} className="py-2 flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate text-sm text-ink-700" title={r.title}>{r.title}</span>
                  <span className="text-xs text-ink-400 shrink-0">{r.rep_name}</span>
                  <span className="text-xs text-ink-500 shrink-0 tnum">{won(r.display_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
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
