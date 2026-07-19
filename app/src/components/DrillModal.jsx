import { useEffect, useMemo, useState } from 'react'
import { won, num } from '../lib/format'

// 실제 DB(업로드 엑셀) 저장 컬럼 기준
const COLUMNS = {
  opp: [
    { key: 'external_id', label: '영업기회ID', w: '7em' },
    { key: 'title', label: '영업기회', w: '22em', long: true },
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
    { key: 'lost_reason', label: '실패구분', w: '14em', long: true },
    { key: 'channel', label: '인지경로', w: '8em' },
    { key: 'start_date', label: '시작일', w: '7em' },
    { key: 'end_date', label: '종료일', w: '7em' },
    { key: 'registered_at', label: '등록일', w: '7em' },
    { key: 'note', label: '비고', w: '22em', long: true },
  ],
  act: [
    { key: 'external_id', label: '영업활동ID', w: '7em' },
    { key: 'activity_date', label: '활동일시', w: '7em' },
    { key: 'activity_type', label: '활동분류', w: '7em' },
    { key: 'activity_purpose', label: '활동목적', w: '9em' },
    { key: 'rep_name', label: '담당자', w: '6em' },
    { key: 'group_name', label: '그룹', w: '5em' },
    { key: 'account_name', label: '고객사', w: '12em' },
    { key: 'opportunity_external_id', label: '영업기회ID', w: '7em' },
    { key: 'opportunity_title', label: '영업기회명', w: '22em', alt: '_opp_title', long: true },
    { key: 'plan_content', label: '계획내용', w: '22em', long: true, multiline: true },
    { key: 'activity_content', label: '활동내용', w: '22em', long: true, multiline: true },
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
    { key: 'title', label: '계약명', w: '22em', long: true },
    { key: 'account_name', label: '고객사', w: '12em' },
    { key: 'rep_name', label: '담당자', w: '6em' },
    { key: 'group_name', label: '그룹', w: '5em' },
    { key: 'related_product', label: '연관제품', w: '11em' },
    { key: 'supply_amount', label: '공급가액', w: '8em', money: true, right: true },
    { key: 'tax_amount', label: '세액', w: '7em', money: true, right: true },
    { key: 'total_amount', label: '합계금액', w: '8em', money: true, right: true },
    { key: 'start_date', label: '시작일', w: '7em' },
    { key: 'end_date', label: '종료일', w: '7em' },
    { key: 'opportunity_external_id', label: '영업기회ID', w: '7em' },
    { key: 'opportunity_title', label: '영업기회명', w: '22em', alt: '_opp_title', long: true },
    { key: 'note', label: '비고', w: '22em', long: true },
  ],
}
const KIND_LABEL = { opp: '영업기회', act: '영업활동', con: '계약' }
const SUM_KEY = { opp: 'est_amount', con: 'supply_amount' }

const valOf = (r, c) => r[c.key] ?? (c.alt ? r[c.alt] : null)

function Cell({ v, c }) {
  const [open, setOpen] = useState(false)
  if (v == null || v === '') return <span className="text-ink-300">-</span>
  if (c.money) return won(v)
  const text = String(v)
  if (!c.long) return text

  // 한글 1자 ≈ 1em, 영문/숫자 ≈ 0.5em 로 표시 폭 추정
  let em = 0
  for (const ch of text) em += ch.charCodeAt(0) > 127 ? 1 : 0.5
  const limit = 21 // 컬럼 폭(22em)보다 살짝 작게
  const overflow = em > limit || text.includes('\n')
  if (!overflow) return <span className="whitespace-pre-line">{text}</span>

  return (
    <span className="inline-block w-full">
      <span className={open ? 'block whitespace-pre-line' : 'block truncate'}>{text}</span>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="mt-0.5 text-[11px] text-brand hover:underline">{open ? '접기' : '펼치기'}</button>
    </span>
  )
}

const colsFor = (kind, hide = []) => (COLUMNS[kind] || COLUMNS.opp).filter((c) => !hide.includes(c.key))

function Section({ kind, rows, hide, q, rep, single }) {
  const cols = useMemo(() => colsFor(kind, hide), [kind, hide])
  const list = useMemo(() => {
    let out = rows
    if (rep !== 'all') out = out.filter((r) => r.rep_name === rep)
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      out = out.filter((r) => cols.some((c) => String(valOf(r, c) ?? '').toLowerCase().includes(s)))
    }
    return out
  }, [rows, q, rep, cols])
  const sumKey = SUM_KEY[kind]
  const total = sumKey && cols.some((c) => c.key === sumKey) ? list.reduce((s, r) => s + (Number(r[sumKey]) || 0), 0) : null

  return (
    <div className="mb-5">
      {!single && (
        <div className="flex items-baseline gap-2 border-b border-line bg-paper px-4 py-2">
          <span className="text-sm font-bold text-ink-900">{KIND_LABEL[kind]}</span>
          <span className="text-xs text-ink-500">{num(list.length)}건{total ? <> · 합계 <b className="text-ink-700">{won(total)}</b></> : null}</span>
        </div>
      )}
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400">해당 데이터 없음</p>
      ) : (
        <div>
          <table className="w-max min-w-full text-sm">
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
                    const v = valOf(r, c)
                    return (
                      <td key={c.key}
                        className={`px-3 py-2 text-xs leading-relaxed ${c.right ? 'text-right tnum font-semibold text-ink-800' : 'text-ink-700'} ${c.long ? 'align-top' : 'whitespace-nowrap align-top'}`}
                        style={c.long ? { maxWidth: c.w, width: c.w } : undefined}>
                        <Cell v={v} c={c} />
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

// sections: [{ kind:'opp'|'act'|'con', rows:[], hide:['키'] }]
export default function DrillModal({ open, onClose, title, subtitle, sections = [] }) {
  const [q, setQ] = useState('')
  const [rep, setRep] = useState('all')
  useEffect(() => { if (open) { setQ(''); setRep('all') } }, [open])
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const repOptions = useMemo(() => {
    const s = new Set()
    for (const sec of sections) for (const r of sec.rows || []) if (r.rep_name) s.add(r.rep_name)
    return [...s].sort()
  }, [sections])

  function download() {
    const parts = []
    for (const sec of sections) {
      const cols = colsFor(sec.kind, sec.hide)
      let rows = sec.rows || []
      if (rep !== 'all') rows = rows.filter((r) => r.rep_name === rep)
      if (sections.length > 1) parts.push(`[${KIND_LABEL[sec.kind]}]`)
      parts.push(cols.map((c) => c.label).join(','))
      parts.push(...rows.map((r) => cols.map((c) => `"${String(valOf(r, c) ?? '').replaceAll('"', '""')}"`).join(',')))
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
  const shown = sections.filter((s) => (s.rows || []).length > 0 || sections.length === 1)
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
            {repOptions.length > 1 && (
              <select value={rep} onChange={(e) => setRep(e.target.value)}
                className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink-700 focus:border-brand">
                <option value="all">담당자 전체</option>
                {repOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
            <button onClick={download} className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-600 hover:bg-canvas">엑셀 다운로드</button>
            <button onClick={onClose} className="rounded-lg bg-canvas px-2.5 py-1.5 text-sm text-ink-600 hover:bg-line">닫기</button>
          </div>
        </div>
        <div className="drill-scroll min-h-0 flex-1 overflow-auto">
          {shown.map((sec, i) => (
            <Section key={i} kind={sec.kind} rows={sec.rows || []} hide={sec.hide || []} q={q} rep={rep} single={shown.length === 1} />
          ))}
        </div>
      </div>
    </div>
  )
}
