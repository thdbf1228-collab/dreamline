import { useEffect, useMemo, useState } from 'react'
import { won, num } from '../lib/format'

// 실제 DB(업로드 엑셀) 저장 컬럼 기준
const COLUMNS = {
  opp: [
    { key: 'external_id', label: '영업기회ID', w: '7em' },
    { key: 'title', label: '영업기회', w: '24em' },
    { key: 'account_name', label: '고객사', w: '12em' },
    { key: 'rep_name', label: '담당자', w: '6em' },
    { key: 'group_name', label: '그룹', w: '5em' },
    { key: 'status', label: '진행상태', w: '7em' },
    { key: 'stage_label', label: '단계', w: '7em' },
    { key: 'product', label: '제품', w: '10em' },
    { key: 'sales_type', label: '매출구분', w: '6em' },
    { key: 'est_amount', label: '예상매출', w: '8em', money: true, right: true },
    { key: 'confirmed_amount', label: '계약금액', w: '8em', money: true, right: true },
    { key: 'win_prob', label: '성공확률', w: '6em', right: true },
    { key: 'lost_reason', label: '실패구분', w: '8em' },
    { key: 'channel', label: '인지경로', w: '8em' },
    { key: 'start_date', label: '시작일', w: '7em' },
    { key: 'end_date', label: '종료일', w: '7em' },
    { key: 'registered_at', label: '등록일', w: '7em' },
    { key: 'note', label: '비고', w: '18em' },
  ],
  act: [
    { key: 'external_id', label: '영업활동ID', w: '7em' },
    { key: 'activity_date', label: '활동일시', w: '7em' },
    { key: 'activity_type', label: '활동분류', w: '7em' },
    { key: 'activity_purpose', label: '활동목적', w: '26em' },
    { key: 'rep_name', label: '담당자', w: '6em' },
    { key: 'group_name', label: '그룹', w: '5em' },
    { key: 'account_name', label: '고객사', w: '12em' },
    { key: 'opportunity_external_id', label: '영업기회ID', w: '7em' },
    { key: 'opportunity_title', label: '영업기회명', w: '20em', alt: '_opp_title' },
    { key: 'activity_content', label: '활동내용', w: '34em', wrap: true },
    { key: 'plan_content', label: '계획내용', w: '28em', wrap: true },
    { key: 'related_product', label: '연관제품', w: '10em' },
    { key: 'start_time', label: '시작시간', w: '6em' },
    { key: 'end_time', label: '종료시간', w: '6em' },
    { key: 'customer_name', label: '고객', w: '7em' },
    { key: 'companion', label: '동반', w: '10em' },
    { key: 'participants', label: '참가자', w: '10em' },
    { key: 'registered_by', label: '등록자', w: '6em' },
  ],
  con: [
    { key: 'external_id', label: '계약ID', w: '6em' },
    { key: 'contract_date', label: '계약일', w: '7em' },
    { key: 'title', label: '계약명', w: '26em' },
    { key: 'account_name', label: '고객사', w: '12em' },
    { key: 'rep_name', label: '담당자', w: '6em' },
    { key: 'group_name', label: '그룹', w: '5em' },
    { key: 'contract_type', label: '계약구분', w: '7em' },
    { key: 'supply_amount', label: '공급가액', w: '8em', money: true, right: true },
    { key: 'tax_amount', label: '세액', w: '7em', money: true, right: true },
    { key: 'total_amount', label: '합계금액', w: '8em', money: true, right: true },
    { key: 'start_date', label: '시작일', w: '7em' },
    { key: 'end_date', label: '종료일', w: '7em' },
    { key: 'renewal_date', label: '갱신예정일', w: '8em' },
    { key: 'opportunity_external_id', label: '영업기회ID', w: '7em' },
    { key: '_opp_title', label: '영업기회명', w: '20em' },
    { key: 'note', label: '비고', w: '16em' },
  ],
}
const KIND_LABEL = { opp: '영업기회', act: '영업활동', con: '계약' }
const SUM_KEY = { opp: 'est_amount', con: 'supply_amount' }

function Section({ kind, rows, q }) {
  const cols = COLUMNS[kind] || COLUMNS.opp
  const list = useMemo(() => {
    if (!q.trim()) return rows
    const s = q.trim().toLowerCase()
    return rows.filter((r) => cols.some((c) => String(r[c.key] ?? (c.alt ? r[c.alt] : '') ?? '').toLowerCase().includes(s)))
  }, [rows, q, cols])
  const sumKey = SUM_KEY[kind]
  const total = sumKey ? list.reduce((s, r) => s + (Number(r[sumKey]) || 0), 0) : null

  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-2 border-b border-line bg-paper px-4 py-2">
        <span className="text-sm font-bold text-ink-900">{KIND_LABEL[kind]}</span>
        <span className="text-xs text-ink-500">{num(list.length)}건{total ? <> · 합계 <b className="text-ink-700">{won(total)}</b></> : null}</span>
      </div>
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400">해당 데이터 없음</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-xs text-ink-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                {cols.map((c) => (
                  <th key={c.key} className={`whitespace-nowrap px-3 py-2 font-medium ${c.right ? 'text-right' : 'text-left'}`} style={{ minWidth: c.w }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.id ?? r.external_id ?? i} className="border-t border-line/70 align-top hover:bg-canvas/60">
                  <td className="px-3 py-2 tnum text-xs text-ink-400">{i + 1}</td>
                  {cols.map((c) => {
                    const v = r[c.key] ?? (c.alt ? r[c.alt] : null)
                    return (
                      <td key={c.key}
                        className={`px-3 py-2 ${c.right ? 'text-right tnum font-semibold text-ink-800' : 'text-ink-700'} ${c.wrap ? 'whitespace-pre-line text-xs leading-relaxed' : ''}`}
                        style={c.wrap ? { maxWidth: '34em' } : undefined}>
                        {v == null || v === '' ? <span className="text-ink-300">-</span> : c.money ? won(v) : String(v)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// sections: [{ kind:'opp'|'act'|'con', rows:[] }]
export default function DrillModal({ open, onClose, title, subtitle, sections = [] }) {
  const [q, setQ] = useState('')
  useEffect(() => { if (open) setQ('') }, [open])
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  function download() {
    const parts = []
    for (const sec of sections) {
      const cols = COLUMNS[sec.kind] || []
      parts.push(`[${KIND_LABEL[sec.kind]}]`)
      parts.push(cols.map((c) => c.label).join(','))
      parts.push(...(sec.rows || []).map((r) => cols.map((c) => `"${String(r[c.key] ?? (c.alt ? r[c.alt] : '') ?? '').replaceAll('"', '""')}"`).join(',')))
      parts.push('')
    }
    const blob = new Blob(['\uFEFF' + parts.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(title || 'data').replace(/[^\w가-힣]+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!open) return null
  const totalRows = sections.reduce((s, x) => s + (x.rows?.length || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/40" />
      <div className="relative flex max-h-[90vh] w-full max-w-[95rem] flex-col rounded-xl bg-paper shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-ink-900">{title}</h3>
            <p className="mt-0.5 text-xs text-ink-500">{subtitle ? subtitle + ' · ' : ''}총 {num(totalRows)}건</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색"
              className="w-40 rounded-lg border border-line px-2.5 py-1.5 text-sm focus:border-brand" />
            <button onClick={download} className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-600 hover:bg-canvas">CSV</button>
            <button onClick={onClose} className="rounded-lg bg-canvas px-2.5 py-1.5 text-sm text-ink-600 hover:bg-line">닫기</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {sections.map((sec, i) => <Section key={i} kind={sec.kind} rows={sec.rows || []} q={q} />)}
        </div>
      </div>
    </div>
  )
}
