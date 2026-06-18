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

// 세그먼트 토글 (전체/기업/글로벌 등)
export function Segment({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={[
            'px-3 py-1.5 text-sm rounded-md transition-colors',
            value === o.value ? 'bg-brand text-white font-medium' : 'text-ink-500 hover:text-ink-900',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Select({ value, onChange, children, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm focus:border-brand ${className}`}
    >
      {children}
    </select>
  )
}

const DEAL_BORDER = {
  '진행중': 'border-l-brand',
  '종료(성공)': 'border-l-won',
  '종료(실패)': 'border-l-lost',
  '보류/연기': 'border-l-stale',
}

// 파이프라인 카드 (거래 1건)
export function DealCard({ deal }) {
  const border = DEAL_BORDER[deal.status] || 'border-l-ink-400'
  return (
    <div className={`bg-paper rounded-lg border border-line border-l-4 ${border} shadow-card p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-900 truncate" title={deal.account_name}>
            {deal.account_name || '미상'}
          </div>
          <div className="text-xs text-ink-500 truncate" title={deal.title}>
            {deal.title}
          </div>
        </div>
        {deal.is_stale && (
          <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-stale">정체</span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-ink-400">
          {deal.stage_label} · {deal.rep_name}
        </span>
        <span className="text-sm font-semibold text-ink-900 tnum">{won(deal.display_amount)}</span>
      </div>
    </div>
  )
}
