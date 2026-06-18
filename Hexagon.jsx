import { won, num, pct } from '../lib/format'

export function Card({ children, className = '' }) {
  return <div className={`bg-paper rounded-xl border border-line shadow-card ${className}`}>{children}</div>
}

export function KpiCard({ label, value, sub }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink-900 tnum">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-400">{sub}</div>}
    </Card>
  )
}

const STATUS_STYLE = {
  '진행중': 'bg-brand-soft text-brand',
  '종료(성공)': 'bg-emerald-50 text-won',
  '종료(실패)': 'bg-red-50 text-lost',
  '보류/연기': 'bg-amber-50 text-stale',
}

export function StatusPill({ status }) {
  const cls = STATUS_STYLE[status] || 'bg-canvas text-ink-500'
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{status || '-'}</span>
}

const STAGE_COLOR = ['', '#C5DBF6', '#93B8EC', '#5C93DE', '#2E6FCC', '#14479A']

// 가로 깔때기. data = [{id,label,count,amount}]
export function Funnel({ data, showAmount = true }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.id} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs text-ink-500">{d.label}</span>
          <div className="flex-1 h-6 rounded bg-canvas overflow-hidden">
            <div
              className="h-full rounded flex items-center justify-end pr-2"
              style={{ width: `${(d.count / max) * 100}%`, background: STAGE_COLOR[d.id], minWidth: d.count ? 28 : 0 }}
            >
              <span className="text-[11px] font-semibold text-white tnum">{d.count}</span>
            </div>
          </div>
          {showAmount && <span className="w-20 shrink-0 text-right text-xs text-ink-500 tnum">{won(d.amount)}</span>}
        </div>
      ))}
    </div>
  )
}
