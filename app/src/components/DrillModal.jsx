import { useEffect, useMemo, useState } from 'react'
import { won, num } from '../lib/format'

// 데이터 종류별 컬럼 정의 — 업로드한 엑셀 원본 항목 기준
const COLUMNS = {
  opp: [
    { key: 'external_id', label: '영업기회ID', w: '7em' },
    { key: 'title', label: '영업기회', w: '22em' },
    { key: 'account_name', label: '고객사', w: '12em' },
    { key: 'rep_name', label: '담당자', w: '6em' },
    { key: 'group_name', label: '그룹', w: '5em' },
    { key: 'status', label: '진행상태', w: '7em' },
    { key: 'stage', label: '단계', w: '7em' },
    { key: 'sales_type', label: '매출구분', w: '6em' },
    { key: 'display_amount', label: '금액', w: '8em', money: true, right: true },
    { key: 'start_date', label: '시작일', w: '7em' },
    { key: 'end_date', label: '종료일', w: '7em' },
    { key: 'note', label: '비고', w: '16em' },
  ],
  act: [
    { key: 'external_id', label: '영업활동ID', w: '7em' },
    { key: 'activity_date', label: '활동일시', w: '7em' },
    { key: 'activity_type', label: '활동분류', w: '7em' },
    { key: 'rep_name', label: '담당자', w: '6em' },
    { key: 'group_name', label: '그룹', w: '5em' },
    { key: 'account_name', label: '고객사', w: '12em' },
    { key: 'opportunity_external_id', label: '영업기회ID', w: '7em' },
    { key: 'purpose', label: '활동목적', w: '20em' },
  ],
  con: [
    { key: 'external_id', label: '계약ID', w: '6em' },
    { key: 'contract_date', label: '계약일', w: '7em' },
    { key: 'title', label: '계약명', w: '26em' },
    { key: 'account_name', label: '고객사', w: '12em' },
    { key: 'rep_name', label: '담당자', w: '6em' },
    { key: 'group_name', label: '그룹', w: '5em' },
    { key: 'opportunity_external_id', label: '영업기회ID', w: '7em' },
    { key: 'supply_amount', label: '공급가액', w: '8em', money: true, right: true },
  ],
}

export default function DrillModal({ open, onClose, title, subtitle, kind = 'opp', rows = [] }) {
  const [q, setQ] = useState('')
  const cols = COLUMNS[kind] || COLUMNS.opp

  useEffect(() => { if (open) setQ('') }, [open])
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const list = useMemo(() => {
    if (!q.trim()) return rows
    const s = q.trim().toLowerCase()
    return rows.filter((r) => cols.some((c) => String(r[c.key] ?? '').toLowerCase().includes(s)))
  }, [rows, q, cols])

  const total = useMemo(() => {
    const k = kind === 'con' ? 'supply_amount' : kind === 'opp' ? 'display_amount' : null
    return k ? list.reduce((s, r) => s + (Number(r[k]) || 0), 0) : null
  }, [list, kind])

  function download() {
    const head = cols.map((c) => c.label).join(',')
    const body = list.map((r) => cols.map((c) => `"${String(r[c.key] ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + head + '\n' + body], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(title || 'data').replace(/[^\w가-힣]+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/40" />
      <div className="relative flex max-h-[88vh] w-full max-w-[92rem] flex-col rounded-xl bg-paper shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-ink-900">{title}</h3>
            <p className="mt-0.5 text-xs text-ink-500">
              {subtitle ? subtitle + ' · ' : ''}{num(list.length)}건
              {total != null && <> · 합계 <span className="font-semibold text-ink-700">{won(total)}</span></>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색"
              className="w-40 rounded-lg border border-line px-2.5 py-1.5 text-sm focus:border-brand" />
            <button onClick={download} className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-600 hover:bg-canvas">CSV</button>
            <button onClick={onClose} className="rounded-lg bg-canvas px-2.5 py-1.5 text-sm text-ink-600 hover:bg-line">닫기</button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {list.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-400">해당하는 데이터가 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-canvas text-xs text-ink-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  {cols.map((c) => (
                    <th key={c.key} className={`px-3 py-2 font-medium ${c.right ? 'text-right' : 'text-left'}`} style={{ minWidth: c.w }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={r.id ?? r.external_id ?? i} className="border-t border-line/70 hover:bg-canvas/60">
                    <td className="px-3 py-2 text-xs text-ink-400 tnum">{i + 1}</td>
                    {cols.map((c) => {
                      const v = r[c.key]
                      return (
                        <td key={c.key} className={`px-3 py-2 ${c.right ? 'text-right tnum font-semibold text-ink-800' : 'text-ink-700'}`} title={String(v ?? '')}>
                          {v == null || v === '' ? <span className="text-ink-300">-</span> : c.money ? won(v) : String(v)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
