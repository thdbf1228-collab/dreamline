import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { won, num } from '../lib/format'

// 실제 DB(업로드 엑셀) 저장 컬럼 기준
const COLUMNS = {
  opp: [
    { key: 'external_id', label: '영업기회ID', w: '7em' },
    { key: 'title', label: '영업기회', w: '26em', long: true },
    { key: 'account_name', label: '고객사', w: '8em' },
    { key: 'rep_name', label: '담당자', w: '4em' },
    { key: 'group_name', label: '그룹', w: '3.5em' },
    { key: 'status', label: '진행상태', w: '5.5em' },
    { key: 'stage_label', label: '단계', w: '5em' },
    { key: 'product', label: '제품', w: '10em' },
    { key: 'sales_type', label: '매출구분', w: '5em' },
    { key: 'est_amount', label: '예상매출', w: '8em', money: true, right: true },
    { key: 'confirmed_amount', label: '계약금액', w: '8em', money: true, right: true },
    { key: 'win_prob', label: '성공확률', w: '6em', right: true },
    { key: 'lost_reason', label: '실패구분', w: '8em' },
    { key: 'channel', label: '인지경로', w: '8em' },
    { key: 'start_date', label: '시작일', w: '6em' },
    { key: 'end_date', label: '종료일', w: '6em' },
    { key: 'registered_at', label: '등록일', w: '6em' },
    { key: 'note', label: '비고', w: '26em', long: true },
  ],
  act: [
    { key: 'external_id', label: '영업활동ID', w: '7em' },
    { key: 'activity_date', label: '활동일시', w: '5.5em' },
    { key: 'activity_type', label: '활동분류', w: '4.5em' },
    { key: 'activity_purpose', label: '활동목적', w: '5.5em' },
    { key: 'rep_name', label: '담당자', w: '4em' },
    { key: 'group_name', label: '그룹', w: '3.5em' },
    { key: 'account_name', label: '고객사', w: '8em' },
    { key: 'opportunity_external_id', label: '영업기회ID', w: '7em' },
    { key: 'opportunity_title', label: '영업기회명', w: '28em', alt: '_opp_title', long: true },
    { key: 'plan_content', label: '계획내용', w: '28em', long: true, multiline: true },
    { key: 'activity_content', label: '활동내용', w: '32em', long: true, multiline: true },
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
    { key: 'contract_date', label: '계약일', w: '6em' },
    { key: 'title', label: '계약명', w: '26em', long: true },
    { key: 'account_name', label: '고객사', w: '8em' },
    { key: 'rep_name', label: '담당자', w: '4em' },
    { key: 'group_name', label: '그룹', w: '3.5em' },
    { key: 'related_product', label: '연관제품', w: '11em' },
    { key: 'supply_amount', label: '공급가액', w: '8em', money: true, right: true },
    { key: 'tax_amount', label: '세액', w: '7em', money: true, right: true },
    { key: 'total_amount', label: '합계금액', w: '8em', money: true, right: true },
    { key: 'start_date', label: '시작일', w: '6em' },
    { key: 'end_date', label: '종료일', w: '6em' },
    { key: 'opportunity_external_id', label: '영업기회ID', w: '7em' },
    { key: 'opportunity_title', label: '영업기회명', w: '28em', alt: '_opp_title', long: true },
    { key: 'note', label: '비고', w: '26em', long: true },
  ],
}
const KIND_LABEL = { opp: '영업기회', act: '영업활동', con: '계약' }
const SUM_KEY = { opp: 'est_amount', con: 'supply_amount' }

const valOf = (r, c) => r[c.key] ?? (c.alt ? r[c.alt] : null)

function Cell({ v, c, expandAll, session }) {
  const [open, setOpen] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const ref = useRef(null)
  // 상세화면이 바뀌면 무조건 접힘 상태로 초기화
  useEffect(() => { setOpen(false) }, [session])
  useEffect(() => { if (expandAll) setOpen(expandAll.val) }, [expandAll])
  // 실제로 2줄을 넘겨 잘렸을 때만 펼치기 노출 (글자수 추정 X)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || open) return
    const truncated = el.scrollHeight > el.clientHeight + 1
    setCanExpand((prev) => (prev === truncated ? prev : truncated))
  })

  if (v == null || v === '') return <span className="text-ink-300">-</span>
  if (c.money) return won(v)
  const text = String(v)
  if (!c.long) return text

  const clampStyle = {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
    whiteSpace: 'pre-line',
  }
  const openStyle = { display: 'block', whiteSpace: 'pre-line' }

  return (
    <span className="relative block">
      <span ref={ref} style={open ? openStyle : clampStyle}>{text}</span>
      {canExpand && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
          className={open
            ? 'mt-0.5 text-[11px] text-brand hover:underline'
            : 'absolute bottom-0 right-0 bg-paper pl-1 text-[11px] text-brand hover:underline'}>
          {open ? '접기' : '펼치기'}
        </button>
      )}
    </span>
  )
}




const colsFor = (kind, hide = []) => (COLUMNS[kind] || COLUMNS.opp).filter((c) => !hide.includes(c.key))

function Section({ kind, rows, hide, rep, single, expandAll, session }) {
  const cols = useMemo(() => colsFor(kind, hide), [kind, hide])
  const list = useMemo(() => {
    let out = rows
    if (rep !== 'all') out = out.filter((r) => r.rep_name === rep)
    return out
  }, [rows, rep])
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
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-canvas text-xs text-ink-500 shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                {cols.map((c) => (
                  <th key={c.key} className={`whitespace-nowrap px-3 py-2 font-medium ${c.right ? 'text-right' : 'text-left'}`} style={c.long ? { width: c.w, minWidth: c.w, maxWidth: c.w } : { minWidth: c.w }}>{c.label}</th>
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
                        style={c.long ? { width: c.w, minWidth: c.w, maxWidth: c.w } : undefined}>
                        <Cell v={v} c={c} expandAll={expandAll} session={session} />
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
// 열릴 때마다 새로 마운트되는 본문 — 펼침/필터 상태가 자동 초기화됨
function DrillBody({ onClose, title, subtitle, sections }) {
  const session = `${title}|${subtitle}`
  const [rep, setRep] = useState('all')
  const [expandAll, setExpandAll] = useState(null)
  useEffect(() => { setExpandAll(null); setRep('all') }, [session])
  const seq = () => ({ seq: Date.now() })

  const repOptions = useMemo(() => {
    const set = new Set()
    for (const sec of sections) for (const r of sec.rows || []) if (r.rep_name) set.add(r.rep_name)
    return [...set].sort()
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

  const shown = sections.filter((x) => (x.rows || []).length > 0 || sections.length === 1)
  const totalRows = sections.reduce((acc, x) => acc + (x.rows?.length || 0), 0)

  return (
    <div className="relative flex max-h-[90vh] w-full max-w-[98vw] flex-col rounded-xl bg-paper shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-ink-900">{title}</h3>
          <p className="mt-0.5 text-xs text-ink-500">{subtitle ? subtitle + ' · ' : ''}총 {num(totalRows)}건</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {repOptions.length > 1 && (
            <select value={rep} onChange={(e) => setRep(e.target.value)}
              className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink-700 focus:border-brand">
              <option value="all">담당자 전체</option>
              {repOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
          <div className="flex overflow-hidden rounded-lg border border-line">
            <button onClick={() => setExpandAll({ val: true, ...seq() })}
              className={`px-2.5 py-1.5 text-sm ${expandAll?.val === true ? 'bg-ink-900 font-semibold text-white' : 'text-ink-600 hover:bg-canvas'}`}>모두 펼치기</button>
            <button onClick={() => setExpandAll({ val: false, ...seq() })}
              className={`border-l border-line px-2.5 py-1.5 text-sm ${expandAll?.val === false ? 'bg-ink-900 font-semibold text-white' : 'text-ink-600 hover:bg-canvas'}`}>모두 접기</button>
          </div>
          <button onClick={download} className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-600 hover:bg-canvas">엑셀 다운로드</button>
          <button onClick={onClose} className="rounded-lg bg-canvas px-2.5 py-1.5 text-sm text-ink-600 hover:bg-line">닫기</button>
        </div>
      </div>
      <div className="drill-scroll min-h-0 flex-1 overflow-auto">
        {shown.map((sec, i) => (
          <Section key={i} kind={sec.kind} rows={sec.rows || []} hide={sec.hide || []} rep={rep} single={shown.length === 1} expandAll={expandAll} session={session} />
        ))}
      </div>
    </div>
  )
}

export default function DrillModal({ open, onClose, title, subtitle, sections = [] }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/40" />
      <DrillBody key={`${title}|${subtitle}|${sections.length}`} onClose={onClose} title={title} subtitle={subtitle} sections={sections} />
    </div>
  )
}
