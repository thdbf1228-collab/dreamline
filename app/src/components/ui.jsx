import { useState } from 'react'
import { won, num, pct } from '../lib/format'
import { STAGE_SHORT, STAGE_FILL, isOverdue } from '../data/aggregate'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

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
  '진행중': 'bg-[#2563EB] text-white',
  '종료(성공)': 'bg-[#2F5597] text-white',
  '종료(실패)': 'bg-[#DC2626] text-white',
  '보류/연기': 'bg-[#EC6FA6] text-white',
}
export function StatusPill({ status }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status] || 'bg-ink-400 text-white'}`}>{status || '-'}</span>
}

export function Segment({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={['px-3 py-1.5 text-sm rounded-md transition-colors', value === o.value ? 'bg-brand text-white font-medium' : 'text-ink-500 hover:text-ink-900'].join(' ')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Select({ value, onChange, children, className = '' }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm focus:border-brand ${className}`}>
      {children}
    </select>
  )
}

// 단계별 깔때기 (집계 뷰) — 거래처별 5색 통일
export function Funnel({ data, showAmount = true }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.id} className="flex items-center gap-3">
          <span className="w-12 sm:w-16 shrink-0 text-xs text-ink-500 truncate">{d.label}</span>
          <div className="flex-1 h-6 rounded bg-canvas overflow-hidden">
            <div className="h-full rounded flex items-center justify-end pr-2"
              style={{ width: `${(d.count / max) * 100}%`, background: STAGE_FILL[d.id], minWidth: d.count ? 28 : 0 }}>
              <span className="text-[11px] font-semibold text-white tnum">{d.count}</span>
            </div>
          </div>
          {showAmount && <span className="w-14 sm:w-20 shrink-0 text-right text-xs text-ink-500 tnum">{won(d.amount)}</span>}
        </div>
      ))}
    </div>
  )
}

function StageBar({ stageId }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => {
        const done = i < stageId
        const on = i <= stageId
        return (
          <div key={i} className="flex-1 rounded py-1 text-center text-[11px] font-medium"
            style={{ background: on ? STAGE_FILL[i] : '#EEF0F3', color: on ? '#fff' : '#A4ABB5' }}>
            {done ? '✓ ' : ''}{STAGE_SHORT[i]}
          </div>
        )
      })}
    </div>
  )
}

const GROUP_BADGE = 'text-ink-900 font-bold'
// 파이프라인 카드 — 모든 카드 동일 높이(제목 2줄·사유 2줄 고정), 날짜·금액 맨 아래
export function DealCard({ deal }) {
  const { isAdmin } = useAuth()
  const reason = deal.note || deal.lost_reason
  const showReason = (deal.status === '보류/연기' || deal.status === '종료(실패)') && reason
  const [memo, setMemo] = useState(deal.admin_memo || '')
  const saveMemo = async () => {
    const v = memo.trim()
    if (v === (deal.admin_memo || '')) return
    await supabase.from('opportunities').update({ admin_memo: v || null }).eq('id', deal.id)
    deal.admin_memo = v
  }
  return (
    <Card className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <StatusPill status={deal.status} />
        {deal.group_name && <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${GROUP_BADGE}`}>{deal.group_name}</span>}
        {deal.is_stale && <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-amber-100 text-stale">정체</span>}
      </div>
      {isAdmin ? (
        <input value={memo} onChange={(e) => setMemo(e.target.value)} onBlur={saveMemo} placeholder="＋ 관리자 메모"
          className="mb-2 w-full rounded-md border border-dashed border-line bg-canvas px-2 py-1 text-xs text-ink-800 focus:border-brand focus:bg-paper" />
      ) : (deal.admin_memo ? (
        <div className="mb-2 rounded-md px-2 py-1 text-xs font-bold memo-flash">{deal.admin_memo}</div>
      ) : null)}
      <div className="text-sm font-semibold text-ink-900 leading-snug line-clamp-2 min-h-[2.5rem]" title={deal.title}>{deal.title}</div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-ink-500 truncate">{deal.account_name}</span>
        <span className="text-ink-400 shrink-0 ml-2">{deal.rep_name}</span>
      </div>
      <div className="mt-3">
        <StageBar stageId={deal.stage_id} />
      </div>
      <div className="mt-2 min-h-[2.4rem]">
        {showReason && <div className="rounded bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 line-clamp-2">사유: {reason}</div>}
      </div>
      <div className="mt-auto pt-1 flex items-center justify-between border-t border-line/60">
        <span className="text-[11px] text-ink-400 tnum">
          {(deal.start_date || '').replaceAll('-', '.')} ~ {(deal.end_date || '').replaceAll('-', '.')}
        </span>
        <span className="text-xs text-ink-600">
          {deal.product ? deal.product + ' ' : ''}
          <span className="font-semibold text-ink-600 tnum">{won(deal.display_amount)}</span>
        </span>
      </div>
    </Card>
  )
}
