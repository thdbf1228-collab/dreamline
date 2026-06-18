import { useOpportunities } from '../data/useOpportunities'
import { kpis, funnel } from '../data/aggregate'
import { Card, KpiCard, Funnel, StatusPill } from '../components/ui'
import { won, num, pct } from '../lib/format'

export default function Overview() {
  const { rows, error, loading } = useOpportunities()
  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const k = kpis(rows)
  const f = funnel(rows)
  const stale = rows.filter((r) => r.is_stale).sort((a, b) => (b.changed_at || '').localeCompare(a.changed_at || ''))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-ink-900">전체 현황</h1>
        <p className="text-sm text-ink-500">영업기회 {k.total}건 기준</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="진행 파이프라인" value={won(k.pipelineAmount)} sub={`${num(k.pipelineCount)}건 진행중`} />
        <KpiCard label="확정 매출" value={won(k.confirmedAmount)} sub={`${num(k.wonCount)}건 성공`} />
        <KpiCard label="전환율" value={pct(k.winRate, 1)} sub={`성공 ${k.wonCount} / 실패 ${k.lostCount}`} />
        <KpiCard label="정체 딜" value={`${num(k.staleCount)}건`} sub="진행중·14일+ 무변동" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">단계별 파이프라인</h2>
          <Funnel data={f} />
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">정체 딜 (14일+ 무변동)</h2>
          {stale.length === 0 ? (
            <p className="text-sm text-ink-400">정체된 딜이 없습니다.</p>
          ) : (
            <div className="divide-y divide-line max-h-72 overflow-auto">
              {stale.slice(0, 30).map((r) => (
                <div key={r.id} className="py-2 flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate text-sm text-ink-700" title={r.title}>
                    {r.title}
                  </span>
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
